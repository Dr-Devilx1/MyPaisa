# My Paisa (MP)

Offline-first personal finance manager. React 19 + Vite + Tailwind 4, wrapped
with Capacitor for Android. Your records never leave the device unless you
export them yourself.

**Version 2.6.0** — see [`AUDIT.md`](AUDIT.md) for what changed and why.

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

- Transactions, budgets, savings goals, borrow/lend ledger, fixed monthly bills
- Hostel mode for per-meal daily expense tracking
- Financial memories, analytics with date-range filtering
- AI advisor (online via Gemini, with a full offline rule engine as fallback)
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
reason.

---

## Project layout

```
src/
  database/indexed_db.ts     storage engine (IndexedDB + localStorage mirror)
  repositories/index.ts      thin data-access layer
  state/FinancialContext.tsx all app state and derived metrics
  components/                views and modals
  lib/id.ts                  collision-safe IDs
  lib/backup.ts              export / share / email helpers
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

All optional — the app runs without any of it.

```
GEMINI_API_KEY=     # enables the online AI advisor
GEMINI_MODEL=       # defaults to gemini-2.5-flash
SMTP_HOST=          # enables server-side backup email
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
```

Note that `server.ts` is **not** part of the APK. On a phone the app uses its
offline engine; the server is only relevant if you host the web version.

---

Developed by SIHFZ.
