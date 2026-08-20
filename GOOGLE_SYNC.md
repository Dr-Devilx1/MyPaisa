# Google Drive sync — setup

My Paisa can keep one backup file in a private folder inside **your own** Google
Drive, so you can restore your ledger on another device.

It is switched off until you supply an OAuth Client ID.

## Why you have to create the Client ID yourself

I cannot ship one with the app. Anything bundled into an APK — including an
OAuth client — is readable by anyone who installs it. A shared client ID would
mean every user of every copy of this app is hitting Google under the same
identity, which Google will suspend, and which would put your project quota at
the mercy of strangers.

It is free and takes about ten minutes.

## Steps

1. Go to <https://console.cloud.google.com> and create a project.
2. **APIs & Services → Library** → search "Google Drive API" → **Enable**.
3. **APIs & Services → OAuth consent screen**
   - User type: **External**
   - Fill in app name and your email
   - Under **Test users**, add the Google account you will sign in with
   - You do not need to publish or get verified for personal use
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
   - Application type: **Web application**
   - Under **Authorised JavaScript origins**, add wherever you host the app:
     - `http://localhost:3000` for local development
     - your real domain, e.g. `https://mypaisa.example.com`
5. Copy the Client ID into `.env`:

   ```
   VITE_GOOGLE_CLIENT_ID="123456789-abcdefg.apps.googleusercontent.com"
   ```

6. Rebuild: `npx vite build`

## Scope

The app requests only `drive.appdata`. That grants access to a hidden
per-application folder and **nothing else** — it cannot read, list or touch any
other file in your Drive. You can revoke it any time at
<https://myaccount.google.com/permissions>.

## The Android APK limitation — read this

Google **deliberately blocks** OAuth sign-in inside embedded WebViews, and a
Capacitor APK is an embedded WebView. Attempting it there returns
`disallowed_useragent`.

So the browser-based flow above works in:

- the hosted web version
- the installed PWA (Add to Home screen)
- desktop browsers

It does **not** work inside the APK as shipped. To get it working there you need
a native plugin as well:

```bash
npm install @codetrix-studio/capacitor-google-auth
npx cap sync android
```

…plus an **Android OAuth client** in the same Google project, registered with
your app's SHA-1 signing fingerprint:

```bash
keytool -list -v -keystore mypaisa.jks -alias mypaisa
```

That fingerprint comes from your signing key, which only you hold, so this step
cannot be done ahead of time for you.

## What works everywhere in the meantime

**Settings → Share Backup** hands the real backup file to Android's share sheet.
Pick Gmail, Drive, or WhatsApp and it goes out as a genuine attachment. It works
offline, in the APK, with no setup, and produces the identical file this Drive
sync uploads. Restoring it is **Settings → Restore Backup**.
