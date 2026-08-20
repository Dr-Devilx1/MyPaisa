# Getting My Paisa onto your phone

Three routes, easiest first. **Route A needs nothing installed on your computer.**

---

## Route A — GitHub Actions (recommended, ~5 minutes)

GitHub's build machines already have the Android SDK. You push the code, they
build the APK, you download it.

1. Create a free GitHub account if you do not have one.
2. Create a new **private** repository (call it `mypaisa`).
3. Upload this whole folder to it. Either drag-and-drop the files into the
   GitHub web uploader, or from a terminal:

   ```bash
   git init
   git add .
   git commit -m "My Paisa v2.6"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/mypaisa.git
   git push -u origin main
   ```

4. Open the repo on GitHub → **Actions** tab → **Build Android APK** →
   **Run workflow**.
5. When the green tick appears (about 5 minutes), click into the run and
   download **My Paisa-debug-apk** from the *Artifacts* section at the bottom.
6. Unzip it, copy the `.apk` to your phone, tap it. Android will ask you to
   allow installing from unknown sources — that is expected for any APK not
   from the Play Store.

The build also runs automatically on every push, so future changes rebuild
themselves.

---

## Route B — Android Studio on your own machine

**Prerequisites:** Node.js 20+, Java JDK 21, Android Studio (which installs the
Android SDK).

```bash
npm install
npm run android:add     # creates the android/ project + copies icons & splash
npm run android:apk     # builds the debug APK
```

The APK lands at:

```
android/app/build/outputs/apk/debug/app-debug.apk
```

Every time you change the web app afterwards:

```bash
npm run android:sync    # rebuild web + push into android/
npm run android:apk
```

Or open it in the IDE and press Run:

```bash
npm run android:open
```

---

## Route C — Install it as an app without any APK

The project is a working PWA. If you host the `dist/` folder anywhere
(Netlify, Vercel, GitHub Pages, your own server):

1. Open the URL in Chrome on your phone.
2. Menu → **Add to Home screen** / **Install app**.

You get an icon, a splash screen, offline support and the same local database.
The only thing you lose versus the APK is Play Store distribution.

```bash
npx vite build          # output goes to dist/
```

> One caveat: browser-installed PWAs share storage with Chrome. If you clear
> Chrome's site data you clear My Paisa's records too. The APK has its own
> private storage. Either way, take backups.

---

## Making a Play Store build

The debug APK is signed with Android's shared debug key — fine for your own
phone, rejected by the Play Store. For a real release:

```bash
keytool -genkey -v -keystore mypaisa.jks -keyalg RSA -keysize 2048 \
        -validity 10000 -alias mypaisa
```

**Back that `.jks` file up somewhere safe.** If you lose it you can never
publish an update to the same Play Store listing — Google has no recovery path.

Then either add the four `ANDROID_*` secrets described at the bottom of
`.github/workflows/build-apk.yml` and run the workflow manually, or build
locally with `npm run android:release`.

---

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `SDK location not found` | Android SDK not installed, or `ANDROID_HOME` not set. Use Route A instead. |
| `Gradle build failed` on first local run | Gradle downloads ~500 MB on first build. Let it finish; re-run. |
| App installs but shows a white screen | `dist/` was empty. Run `npx vite build` before `npx cap sync android`. |
| Icons still show the Capacitor default | Run `node scripts/apply-android-assets.mjs` after `npx cap sync`. |
| "App not installed" on the phone | An older My Paisa with a different signing key is present. Uninstall it first. |
