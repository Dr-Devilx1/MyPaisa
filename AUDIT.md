# My Paisa — Code Audit

Audited version: the uploaded `moneypilot__2_.zip`
Result after fixes: `tsc --noEmit` clean, `vite build` clean.

**Baseline note:** the original code also compiled and built without a single
error. Every defect below is a *runtime or logic* fault, which is exactly why
none of them were visible until the app was actually used.

Severity key — **S1** data loss / security · **S2** feature broken ·
**S3** wrong output · **S4** polish.

---

## S1 — Data loss and false security

### 1.1 Silent destruction of all user data  *(this is your "starts from 0")*

`src/database/indexed_db.ts`

```ts
if (!txs || txs.length === 0) {
  this.saveLocalStorage('transactions', SEED_TRANSACTIONS);
  this.saveLocalStorage('budgets', SEED_BUDGETS);
  ...
  this.saveLocalStorage('profile', DEFAULT_PROFILE);
}
```

An empty transaction list triggered a rewrite of **all nine stores** — budgets,
goals, loans, memories, saved accounts and the user profile — with hard-coded
"Alex Rivers" demo data. Deleting your last transaction and reopening the app
destroyed everything else you had entered.

Three factors turned that from a bug into a guaranteed wipe:

- **The file never used IndexedDB.** Despite the name, it was localStorage
  only. localStorage is evicted by Android WebView under storage pressure and
  is blocked outright inside cross-origin preview frames. The read threw, the
  `catch` returned `null`, and `null` fed straight back into the re-seed.
- **No flush on background.** Android terminates backgrounded WebViews without
  notice; queued writes were lost.
- **Save-before-load race.** The persistence effects were gated on
  `isLoading`, but React effects also run on the first render. A slow or failed
  load could write the *empty initial state* over good data on disk.

**Fixed —** real IndexedDB as primary with a localStorage mirror (either layer
can fail without data loss); an explicit `seeded` flag in a meta record so an
empty database is a legitimate state and is never refilled; a `hydratedRef`
guard so no write is permitted before hydration completes; `flush()` bound to
`pagehide` / `visibilitychange` / `blur`; and `navigator.storage.persist()` so
the OS will not evict the database. Legacy `moneypilot_*` keys are migrated, so
anyone upgrading keeps their history.

### 1.2 PIN protection was decorative

Settings offered *"PIN Protection — Require PIN code on app launch"*. Nothing
in the codebase ever read it back or prompted for a PIN. Toggling it flipped a
boolean and did nothing else.

This is worse than having no lock, because it tells someone their financial
records are protected when they are completely open.

**Fixed —** a real keypad lock screen rendered ahead of the app whenever a PIN
is set, plus set/confirm/disable flows in Settings. Documented in the UI as a
local device lock, not encryption — the records themselves are still stored
unencrypted, and that limit is stated rather than glossed over.

### 1.3 Fake email verification

`src/components/AuthModal.tsx` generated a six-digit code **in the browser**,
displayed it on screen next to an "Auto-Fill Code" button, accepted `123456` as
a permanent universal bypass, and then reported:

> *"Verification code sent to you@example.com!"*
> *"Email Verified! Account @you successfully created & synced."*

No email was sent. No data was synced. Nothing left the device.

**Fixed —** the fake verification step is gone. Profiles are now presented
honestly as local to the device, and the email field is labelled as being used
only to pre-fill backups.

### 1.4 Financial data was eligible for Google cloud backup

Capacitor scaffolds `AndroidManifest.xml` with `allowBackup="true"`, which lets
Android upload the app's private data to the user's Google Drive.

**Fixed —** `scripts/apply-android-assets.mjs` sets `allowBackup="false"` and
`fullBackupContent="false"`.

---

## S2 — Features that did not work

### 2.1 Email sync did not exist

There was no sync of any kind. `firebaseSyncEnabled` existed on the profile
type and was never read anywhere.

**Fixed —** genuine sync built on the **Web Share API**: the real `.json`
backup file is handed to Android's share sheet, so picking Gmail attaches it
properly and sends from the user's own address. Falls back to download plus a
pre-filled `mailto:` draft where file sharing is unsupported. An optional
`POST /api/sync/email` SMTP endpoint is included for anyone hosting `server.ts`.

> Deliberate omission: no SMTP credentials are embedded in the app. Anything
> shipped inside an APK is readable by everyone who installs it, so a built-in
> mail sender would leak the account to every user.

### 2.2 Light theme was broken on four screens

`BudgetsView`, `TransactionsView`, `SettingsView` and `AiAssistantView` had
**zero** references to `isDark`. They hard-coded `bg-[#131316]`, `text-white`,
`border-zinc-800`. Switching to Light left them black — and in several places
black text on a black card, i.e. invisible.

**Fixed —** a `.mp-light` class on the root remaps the dark palette utilities
in `index.css`. One place to maintain, and it corrects screens whether or not
they check the theme flag.

### 2.3 Backup import silently dropped four stores

`importBackupJSON` restored transactions, budgets, goals, borrowLend and
profile — but not memories, saved accounts, hostel entries or fixed
obligations. It returned a bare boolean, so the UI could only say "Invalid JSON
file" regardless of the actual cause.

**Fixed —** all nine stores restore; both `userProfile` and the legacy
`profile` key are accepted; the result carries a specific message and a
restored-record count.

### 2.4 Export produced 0-byte files on some devices

```ts
a.click();
URL.revokeObjectURL(url);   // fires before the download starts
```

**Fixed —** revocation deferred, anchor attached to the DOM, and the download
path is now shared with the new share/email flows.

---

## S3 — Wrong numbers on screen

### 3.1 "Monthly" figures were lifetime totals

`Net Monthly Savings` was computed as `totalIncome - totalExpense` across
**every transaction ever recorded**. It only ever grew and never reset at month
end, and the savings-rate percentage beneath it was a lifetime average
presented as a monthly one.

The same applied to budgets: `spentAmount` summed all matching expenses since
installation, so a budget marked "monthly" sat permanently over its limit after
a few months, which in turn dragged down the health score by 8 points per
budget.

**Fixed —** month-scoped `monthlyIncome` / `monthlyExpense` / `monthlyNet`
derived values; budget spend now respects each budget's own `period`
(weekly / monthly / yearly) and excludes unconfirmed pending entries.

### 3.2 The "vs last month" comparison was invented

```ts
const lastMonthHealthScore = useMemo(() => {
  return 74;      // hard-coded
}, []);
```

Every user saw a delta measured against the number 74.

**Fixed —** computed from the previous calendar month's actual income and
spending using the same scoring rules. With no history the delta is 0 rather
than a fabricated improvement.

### 3.3 Duplicate IDs

Every record used `` `prefix-${Date.now()}` ``. Two records created in the same
millisecond — a hostel entry that also writes a transaction, or a bulk restore
— collide, after which delete and edit operate on the wrong row.

**Fixed —** `src/lib/id.ts` combines timestamp, a rolling counter and randomness.

### 3.4 Budget recalculation wrote to disk on every render

The recalculation effect called `setBudgets` with a freshly mapped array
unconditionally, so a new array identity was produced each pass, which
retriggered the persistence effect.

**Fixed —** the effect now compares values and returns the previous state
object when nothing changed.

---

## S4 — Robustness and polish

| # | Issue | Fix |
|---|---|---|
| 4.1 | AI `fetch` calls had no timeout. In the APK there is no server at all, so the spinner could hang for the platform default (~2 min). | 12-second `AbortController` timeout, then the offline analysis. |
| 4.2 | `gemini-3.6-flash` hard-coded. If that ID is not enabled on your key the endpoint 500s and it looks like "the AI is broken". | `GEMINI_MODEL` env var with a documented default. |
| 4.3 | `Logo.tsx` used fixed gradient IDs. Two logos on one page made the second render with the first's gradient. | Per-instance IDs via `useId()`. |
| 4.4 | Logo stacked a dashed ring, two blob "wings", a diamond and an 8-point star, plus a `feGaussianBlur` repainted every render. At its real 32px size it was a smudge. | Redesigned as a sharp-corner infinity (angular lemniscate) with a mitre-cut accent node at the crossing. Legible at 24px, no filters. |
| 4.5 | No splash screen; the app flashed white, then showed a dashboard of zeroes while the database was still loading — which looked exactly like data loss even when nothing was lost. | Inline pre-hydration mark in `index.html`, an animated React splash covering hydration, and a native Capacitor splash at every density. |
| 4.6 | `isMobileFrame` — state that was never set, destructured in `App.tsx`, unused. | Removed from the render path. |
| 4.7 | No indication when storage is unavailable. | Settings shows the active engine, record count, last-backup age, and warns when storage is non-durable or a backup is overdue. |
| 4.8 | "Clear All Sample Data" wiped real records behind a single button. | Requires typing `DELETE`, states plainly what is lost, keeps profile/settings. |
| 4.9 | Demo data was forced on every user. | Now opt-in via *Load Sample Data*; new installs start empty. |
| 4.10 | Number inputs showed unusable spinners on mobile; `<select>` options rendered white-on-white in dark mode on Android; the WebView rubber-banded on scroll. | Addressed in `index.css`. |

---

## Not changed — and why

- **`server.ts` is not bundled into the APK.** Capacitor ships only the static
  web build, so `/api/ai/*` cannot resolve on a phone and the app falls back to
  its offline rule engine. That is the correct behaviour for an offline-first
  app; making the AI work in the APK requires hosting `server.ts` publicly and
  pointing the app at that URL, which is a deployment decision, not a bug fix.

- **`netWorth = income - expense + lent - borrowed` double-counts** if you also
  record a loan as a transaction. This is a modelling decision rather than a
  defect, and changing it would silently move everyone's balance. Worth a
  conversation before touching.

- **Goal contributions do not create transactions**, so money moved into a
  savings goal is not deducted from the balance. Same reasoning as above.

- **Records are stored unencrypted.** Adding encryption means key management
  and a real risk of locking users out of their own data. Flagged rather than
  implemented; the PIN screen states its limits explicitly.


---

# Round 2 — My Paisa (v3.0.0)

Findings from the second pass, after you reported readability, layout and
borrow/lend problems.

## The root cause behind most of it

### R2-1 — `@types/react` was never installed  **S1**

`package.json` listed `typescript` and `@types/node`, but **not `@types/react`
or `@types/react-dom`**, and `tsconfig.json` had no `"strict"` key at all.

Consequence: every component, every prop and every value returned by
`useFinancials()` was implicitly `any`. `tsc --noEmit` passing meant almost
nothing — it was checking a codebase in which nothing had a type.

After installing the types and enabling `strict`, TypeScript immediately
reported 10 errors. **Every single one was in `BorrowLendView.tsx`** — precisely
the screen you reported as broken. They are R2-2 through R2-5 below.

## Borrow & Lend

### R2-2 — Recording a payment did nothing  **S1**

```ts
addBorrowLendEntry(activeActionId, amt, 'repayment', note)
```

The signature is `(personId, entryType, amount, notes)`. The amount and the
entry type were passed in the wrong order, *and* the string was `'repayment'`
where the union only accepts `'repaid'`. `entryType` arrived as a number, matched
none of the branches in the reducer, and no balance ever moved.

Waive-off appeared to work only because it went through a different helper that
happened to pass its arguments correctly — which is exactly the asymmetry you
described.

### R2-3 — Every history row was mislabelled  **S2**

The list compared `entry.type === 'initial'` and `=== 'repayment'`. Neither
value exists in the union. No comparison ever matched, so every row rendered
with the same fallback styling regardless of what it actually was.

### R2-4 — The reason text never appeared  **S2**

It read `entry.note`. The field is `entry.notes`. Silently `undefined`, so the
"why" behind each movement was never rendered — which is why you could not see
when and why money moved.

### R2-5 — `waivedAmount` used unguarded  **S3**

Optional field, used in three arithmetic expressions without a fallback,
producing `NaN` for any record created before the field existed.

**All rebuilt**, with the three actions you asked for on tapping a person:
**Paid**, **Waive off**, and **Lent/Borrowed again** — plus a full timeline
showing date, time, amount, direction and reason for every movement.

## Visibility and readability

### R2-6 — Half the app ignored the theme  **S2**

Views hard-coded `bg-[#131316]`, `text-white`, `border-zinc-800`. Some cards set
a dark surface but left text at a dark zinc value; in a few places text and card
were within a few percent of the same luminance.

### R2-7 — Accent icons were invisible in light mode  **S2**

Icons used the `-400` weight, which is tuned for dark surfaces. On white that
drops to roughly **1.9:1** contrast — well under the 4.5:1 minimum. Every accent
colour is now stepped to `-600` under `.theme-light`.

### R2-8 — Text below the legibility floor  **S3**

Labels at `text-[10px]` and `text-[11px]`, several with `tracking-[0.28em]`,
which shreds legibility at that size. A floor is now enforced in one place.

### R2-9 — Inputs under 16px caused viewport zoom  **S2**

Android and iOS zoom the page when a field smaller than 16px is focused — this
was the layout "jumping" when you started typing. All inputs are now 16px.

## Layout and input

### R2-10 — Modals clipped their own buttons  **S1**

`QuickLogModal` and `AddTransactionModal` used `overflow-hidden` on a
centred panel with **no max-height and no inner scroll area**. On a short screen,
and on every screen once the keyboard opened, the top and bottom of the panel
were cut off with no way to scroll to them — which is why Close and Done were
unreachable and you could not add a log.

Both now use a pinned header/footer with only the middle scrolling.

### R2-11 — Bottom nav sat on top of the keyboard  **S2**

The nav is `position: fixed`. When the keyboard opened, Android resized the
WebView and the bar was re-pinned to the new viewport bottom — directly over the
field being typed into. It now slides away while the keyboard is open, driven by
`VisualViewport`, and the focused field is scrolled into view.

### R2-12 — No tablet or large-screen handling  **S3**

Content stretched edge to edge on anything wider than a phone. A responsive
shell now caps line length at four breakpoints.

## Honesty and correctness

### R2-13 — "Connect to internet" while on Wi-Fi  **S2**

The assistant showed that message whenever its request to `/api/ai/chat` failed.
In the installed APK that request **always** fails, because no server is bundled
with the app. A phone on working Wi-Fi was therefore permanently told it had no
connection. Two distinct conditions — *device offline* and *no AI server* — are
now separated and worded accurately.

### R2-14 — The rename would have orphaned all existing data  **S1 (introduced and fixed in this pass)**

Renaming MoneyPilot → My Paisa changed the IndexedDB database name and the
localStorage key prefix. Left alone, every existing record would have become
unreachable — the exact failure this storage layer was rewritten to prevent. A
migration now reads the pre-rename database and key prefix, and copies anything
it finds forward on first launch.

## Still open — deliberately

- **Google Drive sync needs your own OAuth Client ID.** It is fully implemented
  (`src/lib/googleSync.ts`), scoped to `drive.appdata` so it cannot see any of
  your other files. It cannot ship with a client ID baked in, and Google blocks
  OAuth inside app WebViews, so it will not work in the APK without an
  additional native plugin and your signing fingerprint. Full detail in
  `GOOGLE_SYNC.md`.
- **The AI assistant panel** got the contrast and connectivity fixes but not a
  redesign. It is the next thing I would rebuild.
- **Records are still stored unencrypted.** The PIN is a device lock, not
  encryption, and the app says so rather than implying otherwise.


---

# Round 3 — logo extraction and the AI panel

## L-1 — The logo carried a white halo  **S3**

Making the white background transparent by flood-fill alone was not enough. The
anti-aliased pixels around every edge are orange blended with white; once the
white *behind* them was removed those pixels still **carried** white, so the
mark rendered with a pale outline. Measured on the previous build: **577
near-white semi-transparent pixels**, clearly visible as a light rim on the dark
theme.

Two fixes, both in `brand/generate_assets.py`:

- **Colour bleeding.** The background is cut with a hard binary mask at full
  resolution, then the foreground colour is dilated eight pixels outward into
  the transparent region. Every transparent pixel now holds orange rather than
  white, so downscaling anti-aliases the alpha channel while the RGB it samples
  is already the right hue.
- **Despill.** LANCZOS has negative lobes and can ring past the input range at a
  hard alpha edge, lifting a few boundary pixels toward white. Any pixel that is
  not fully opaque and has drifted light is pulled back to the brand orange.
  Alpha is untouched, so the silhouette is unchanged — only the colour those
  pixels carry.

Verified after the fix: **0 near-white semi-transparent pixels**, all four
corners fully transparent, and the mark composites cleanly on `#0A0A0F`.

The artwork itself is still yours, pixel for pixel. Nothing was redrawn — the
work here was extraction and fit, not design.

## L-2 — Off-balance in a square tile  **S4**

The mark is 634×593 and reads as an arrow pointing right, so its visual mass
sits left of the geometric centre. Centring it mathematically made it look
shifted. A small optical nudge (1.2% of the tile) corrects this.

## AI-1 — The assistant panel  **S2**

Rebuilt, closing the item left open in round 2. Three faults:

- It reported the device as offline whenever the AI **server** failed to answer.
  In the APK no server ships at all, so that message was permanent. Device
  connectivity and server availability are now separate signals, shown
  accurately.
- The composer sat inside the scrolling column, so once the keyboard opened it
  scrolled away behind the bottom navigation and you could not see what you were
  typing. The message list now scrolls independently and the composer is pinned.
- Bubbles used fixed dark colours with no max width, so long replies ran edge to
  edge and were unreadable in light mode. Now capped at 78% width and themed.

Also: `aiInsight` is a structured object (`summary`, `highlights`,
`suggestions`, `spendingHabitRisk`, `predictedNextMonthExpense`) but was being
rendered directly as a React child. Under the old `any`-typed setup that
silently produced nothing useful; with types installed it is a compile error.
All five fields are now displayed.
