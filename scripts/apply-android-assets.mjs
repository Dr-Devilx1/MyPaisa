#!/usr/bin/env node
/**
 * Copies the generated brand assets into the Capacitor Android project and
 * patches the few XML files Capacitor scaffolds with defaults.
 *
 * Safe to run repeatedly — it is idempotent, and it no-ops with a clear message
 * if `android/` does not exist yet.
 *
 *   npm run android:add     (first time — creates android/ then calls this)
 *   npm run android:sync    (every time after you change the web app)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const androidRes = path.join(root, 'android', 'app', 'src', 'main', 'res');
const brandRes = path.join(root, 'brand', 'android-res');

if (!fs.existsSync(path.join(root, 'android'))) {
  console.log('[assets] No android/ folder yet. Run:  npx cap add android');
  process.exit(0);
}
if (!fs.existsSync(brandRes)) {
  console.log('[assets] brand/android-res is missing. Run:  python3 brand/generate_assets.py');
  process.exit(1);
}

/* --------------------------- copy icons + splash -------------------------- */

let copied = 0;
function copyTree(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dest = path.join(to, entry.name);
    if (entry.isDirectory()) copyTree(src, dest);
    else {
      fs.copyFileSync(src, dest);
      copied++;
    }
  }
}
copyTree(brandRes, androidRes);

// Capacitor ships vector launcher icons that would win over our PNGs.
for (const stale of ['mipmap-anydpi-v26/ic_launcher.xml', 'mipmap-anydpi-v26/ic_launcher_round.xml']) {
  const p = path.join(androidRes, stale);
  if (fs.existsSync(p)) fs.rmSync(p);
}

/* ------------------------------- write XML -------------------------------- */

function write(rel, contents) {
  const p = path.join(androidRes, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, contents.trimStart());
  console.log('[assets] wrote', rel);
}

// Adaptive launcher icon (Android 8+): gradient-dark background + our mark.
write(
  'values/ic_launcher_background.xml',
  `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#09090B</color>
</resources>
`
);

write(
  'mipmap-anydpi-v26/ic_launcher.xml',
  `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
    <monochrome android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
`
);

write(
  'mipmap-anydpi-v26/ic_launcher_round.xml',
  `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
    <monochrome android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
`
);

// Brand colours used by the splash + status bar.
write(
  'values/colors.xml',
  `<?xml version="1.0" encoding="UTF-8"?>
<resources>
    <color name="colorPrimary">#09090B</color>
    <color name="colorPrimaryDark">#09090B</color>
    <color name="colorAccent">#10B981</color>
    <color name="splash_background">#09090B</color>
</resources>
`
);

// Android 12+ uses the SplashScreen API; without this the system draws a plain
// white window behind our splash for a frame or two.
write(
  'values/styles.xml',
  `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="AppTheme" parent="Theme.AppCompat.DayNight.NoActionBar">
        <item name="android:background">@color/splash_background</item>
    </style>

    <style name="AppTheme.NoActionBar" parent="Theme.AppCompat.DayNight.NoActionBar">
        <item name="windowActionBar">false</item>
        <item name="windowNoTitle">true</item>
        <item name="android:background">@color/splash_background</item>
        <item name="android:statusBarColor">@color/splash_background</item>
        <item name="android:navigationBarColor">@color/splash_background</item>
    </style>

    <style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">
        <item name="android:background">@drawable/splash</item>
        <item name="windowSplashScreenBackground">@color/splash_background</item>
        <item name="postSplashScreenTheme">@style/AppTheme.NoActionBar</item>
    </style>
</resources>
`
);

/* --------------------------- patch the manifest --------------------------- */

const manifestPath = path.join(root, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
if (fs.existsSync(manifestPath)) {
  let xml = fs.readFileSync(manifestPath, 'utf8');
  const before = xml;

  // Personal finance data should never end up in a cloud auto-backup.
  if (!xml.includes('android:allowBackup')) {
    xml = xml.replace('<application', '<application\n        android:allowBackup="false"\n        android:fullBackupContent="false"');
  } else {
    xml = xml.replace(/android:allowBackup="true"/, 'android:allowBackup="false"');
  }

  if (!xml.includes('android:screenOrientation')) {
    xml = xml.replace(/(<activity[^>]*android:name="[^"]*MainActivity")/, '$1\n            android:screenOrientation="portrait"');
  }

  // "Save backup to phone" writes into public Documents. Android 10 and below
  // need this declared; 11+ grants it for Documents implicitly, hence maxSdk.
  if (!xml.includes('WRITE_EXTERNAL_STORAGE')) {
    xml = xml.replace(
      '<application',
      '<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="29" />\n\n    <application'
    );
  }

  if (xml !== before) {
    fs.writeFileSync(manifestPath, xml);
    console.log('[assets] patched AndroidManifest.xml (allowBackup=false, portrait, storage)');
  }
}

/* ----------------------- stable signing + app version --------------------- */

/**
 * Without this, every CI machine generates a fresh ~/.android/debug.keystore,
 * so each APK is signed by a different key. Android then refuses to install a
 * new build over the old one, and the only way forward is uninstall — which
 * takes all of the user's records with it. Signing with a keystore that lives
 * in the repo makes every build an in-place update.
 *
 * This is a *debug* key with the well-known "android" password, exactly like
 * the AOSP one it replaces: it exists to keep the app identity stable, not to
 * prove authorship. Play Store distribution would need a real release key in
 * CI secrets (see the release-apk job in .github/workflows/build-apk.yml).
 */
const keystoreSrc = path.join(root, 'android-signing', 'mypaisa-debug.keystore');
const gradlePath = path.join(root, 'android', 'app', 'build.gradle');

if (fs.existsSync(keystoreSrc) && fs.existsSync(gradlePath)) {
  fs.copyFileSync(keystoreSrc, path.join(root, 'android', 'app', 'mypaisa-debug.keystore'));

  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const [major = 0, minor = 0, patch = 0] = String(pkg.version).split('.').map(Number);
  // 3.2.0 -> 30200. Monotonic as long as minor/patch stay under 100.
  const versionCode = major * 10000 + minor * 100 + patch;

  let gradle = fs.readFileSync(gradlePath, 'utf8');
  const before = gradle;

  if (!gradle.includes('mypaisa-debug.keystore')) {
    gradle = gradle.replace(
      /^android\s*\{/m,
      `android {
    signingConfigs {
        debug {
            storeFile file('mypaisa-debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }`
    );
  }

  gradle = gradle.replace(/versionCode\s+\d+/, `versionCode ${versionCode}`);
  gradle = gradle.replace(/versionName\s+"[^"]*"/, `versionName "${pkg.version}"`);

  if (gradle !== before) {
    fs.writeFileSync(gradlePath, gradle);
    console.log(`[assets] patched build.gradle (fixed debug key, v${pkg.version} / ${versionCode})`);
  }
} else if (!fs.existsSync(keystoreSrc)) {
  console.log('[assets] WARNING: android-signing/mypaisa-debug.keystore is missing — builds will');
  console.log('[assets]          use a throwaway key and cannot update an installed app in place.');
}

console.log(`[assets] done — ${copied} image(s) copied into android/app/src/main/res`);
