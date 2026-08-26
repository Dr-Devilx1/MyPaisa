# My Paisa (MP)

Offline-first personal finance manager. React 19 + Vite + Tailwind 4, wrapped
with Capacitor for Android. Your records never leave the device unless you
export them yourself.

**Version 3.1.0** — see [`AUDIT.md`](AUDIT.md) for what changed and why.

---

## Quick start

```bash
npm install
npx vite build          # static web build -> dist/
npm run dev             # dev server on http://localhost:3000
```

Want it on your phone? → [`BUILD_APK.md`](BUILD_APK.md)

---

## Features

- **Accounts** — track every bank account (e.g. Meezan Bank), digital wallet
  (NayaPay, JazzCash) and cash-in-hand as separate balances. A first-run
  wizard collects them; a grand total and a Banks/Wallets/Cash breakdown are
  always visible on the Dashboard and the dedicated Accounts screen
- **Transfers** — move money between any two accounts (e.g. bank → cash)
  without it being counted as income or expense
- Transactions, budgets, savings goals, borrow/lend ledger, fixed monthly
  bills — each with full add/edit/delete
- **Receipts** — attach a photo of the bill to any transaction (compressed
  on-device before saving)
- **Base price vs. tax/fee** — optionally record the actual item price
  separately from tax, delivery or service charges included in the total
- **Your Financial Situation** — a dashboard inside Analytics that combines
  current balance, money lent out, money owed, and unpaid fixed bills into
  one bottom-line number
- Hostel mode for per-meal daily expense tracking
- Financial memories, analytics with date-range filtering and CSV/Excel/PDF
  export
- **Real-time AI advisor** — paste your own free [Gemini API
  key](https://aistudio.google.com/apikey) in Settings and the assistant
  answers from your actual, current numbers, calling Google's API directly
  from your device (no server needed, works inside the APK). Falls back to a
  full offline rule engine when no key is set
- PIN lock, light/dark themes, 10 currencies
- Backup: download, share sheet, or email to yourself
- Works fully offline

---

## Storage

IndexedDB is the primary store with a localStorage mirror, so one layer failing
does not lose data. Writes are flushed when the app is backgrounded, and
`navigator.storage.persist()` is requested so the OS will not evict the
database.

There is no server-side account. **Uninstalling the app deletes everything** —
Settings shows how long it has been since your last backup for exactly that
reason. A Gemini API key you paste in Settings is stored the same way — only
on-device, and sent nowhere except directly to Google's API when you ask the
assistant a question.

---

## Project layout

```
src/
  database/indexed_db.ts     storage engine (IndexedDB + localStorage mirror)
  repositories/index.ts      thin data-access layer
  state/FinancialContext.tsx all app state, derived metrics, and the direct
                              Gemini client used when a user API key is set
  components/                views and modals
  components/AccountSetupModal.tsx  first-run bank/wallet/cash wizard
  components/AccountsView.tsx       accounts management + transfers
  lib/id.ts                  collision-safe IDs
  lib/image.ts                on-device receipt photo compression
  lib/backup.ts               export / share / email helpers
  lib/useKeyboard.ts           mobile keyboard-inset detection
brand/
  generate_assets.py         renders every icon + splash from the logo geometry
  android-res/               generated Android resources
scripts/
  apply-android-assets.mjs   copies assets into android/ and patches its XML
server.ts                    optional Express host: Gemini proxy + SMTP backup
```

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server (Vite middleware + API routes) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run assets` | Regenerate all icons and splash images |
| `npm run android:add` | Create `android/` and apply branding (first time) |
| `npm run android:sync` | Rebuild web, push into `android/`, reapply assets |
| `npm run android:apk` | Build the debug APK |
| `npm run android:release` | Build a release APK (needs a keystore) |

## Environment

All optional — the app runs without any of it. Each user can also paste
their own Gemini API key straight into Settings, which works without any of
the server-side variables below and is the only AI path available inside the
Android APK (there is no server there).

```
GEMINI_API_KEY=     # enables the online AI advisor (server-hosted web build only)
GEMINI_MODEL=       # defaults to gemini-3.6-flash
SMTP_HOST=          # enables server-side backup email
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
```

Note that `server.ts` is **not** part of the APK. On a phone the app uses its
offline engine, or a user-supplied Gemini key called directly from the
device; the server is only relevant if you host the web version.

---

## What's new in 3.1.0

- Multi-account tracking (banks, wallets, cash) with a first-run setup wizard
  and a dedicated Accounts screen
- Account-to-account transfers
- Transaction delete, now reachable on touch devices
- Fixed monthly bills: add and delete UI (was previously view-only)
- Receipt photo attachment and optional base-price/tax-fee breakdown on
  transactions
- "Your Financial Situation" bottom-line dashboard in Analytics
- Real-time AI chat and insights powered by a user-supplied Gemini API key,
  managed from Settings
- Fixed: Gemini calls failing after Google retired the gemini-2.5-flash
  model — the AI advisor now targets gemini-3.6-flash
- Fixed: category/amount text rendering as a vertical single-character
  column in narrow layouts (Transactions, Analytics timeframe pills, Goals,
  Memories)
- Fixed: bottom navigation bar and the keyboard's suggestion strip
  overlapping when typing on Android
- Fixed: input fields zooming the whole page in on focus

See [`AUDIT.md`](AUDIT.md) for the full history.

---

Developed by SIHFZ.
