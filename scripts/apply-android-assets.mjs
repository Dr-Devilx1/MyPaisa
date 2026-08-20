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

  if (xml !== before) {
    fs.writeFileSync(manifestPath, xml);
    console.log('[assets] patched AndroidManifest.xml (allowBackup=false, portrait)');
  }
}

console.log(`[assets] done — ${copied} image(s) copied into android/app/src/main/res`);
