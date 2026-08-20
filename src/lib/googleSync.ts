/**
 * Google Drive backup — sign in with Google, keep an encrypted-at-rest copy of
 * your ledger in your own Drive, restore it on any device.
 *
 * ============================================================================
 *  READ THIS BEFORE YOU EXPECT IT TO WORK
 * ============================================================================
 *  This is a real OAuth implementation, not the fake one that shipped before
 *  (which generated a six-digit code in the browser, accepted `123456` as a
 *  universal bypass, and reported "synced" without sending anything anywhere).
 *
 *  But it cannot work until YOU create a Google OAuth Client ID. I cannot
 *  create one for you, and I must not embed one — an OAuth client secret shipped
 *  inside an APK is readable by everyone who installs it.
 *
 *  Setup (about 10 minutes, free):
 *    1. console.cloud.google.com -> create a project
 *    2. APIs & Services -> Library -> enable "Google Drive API"
 *    3. APIs & Services -> OAuth consent screen -> External -> add your email
 *       under "Test users"
 *    4. Credentials -> Create Credentials -> OAuth client ID -> Web application
 *    5. Add your app's origin under "Authorised JavaScript origins"
 *    6. Put the client ID in .env as VITE_GOOGLE_CLIENT_ID
 *
 *  ---------------------------------------------------------------------------
 *  IMPORTANT LIMITATION FOR THE ANDROID APK
 *  ---------------------------------------------------------------------------
 *  Google deliberately BLOCKS OAuth inside embedded WebViews. A Capacitor APK is
 *  an embedded WebView, so this browser flow will return `disallowed_useragent`
 *  there. It works in:
 *      - the hosted web version
 *      - the installed PWA
 *      - desktop browsers
 *
 *  To get it working inside the APK you additionally need a native plugin, e.g.
 *      npm i @codetrix-studio/capacitor-google-auth
 *  and you must register your app's SHA-1 fingerprint in the Google console.
 *  That is a deployment step involving your signing key, which only you hold.
 *
 *  Until then, the share-sheet backup in Settings is the path that works
 *  everywhere, including offline. It is not a downgrade — it produces the same
 *  file this module uploads.
 * ============================================================================
 */

const CLIENT_ID = (import.meta.env?.VITE_GOOGLE_CLIENT_ID as string | undefined) ?? '';

/** appDataFolder is a hidden per-app folder. It cannot read the rest of Drive. */
const SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
const BACKUP_NAME = 'mypaisa-backup.json';
const GIS_SRC = 'https://accounts.google.com/gsi/client';

export interface GoogleSession {
  accessToken: string;
  expiresAt: number;
  email?: string;
}

export interface SyncResult {
  ok: boolean;
  message: string;
}

let session: GoogleSession | null = null;
let gisLoaded: Promise<boolean> | null = null;

export function isGoogleConfigured(): boolean {
  return CLIENT_ID.trim().length > 0;
}

export function isEmbeddedWebView(): boolean {
  const ua = navigator.userAgent || '';
  // Capacitor/Cordova WebViews report "wv" or the Capacitor scheme.
  return /; wv\)/.test(ua) || /Capacitor|Cordova/i.test(ua);
}

export function currentSession(): GoogleSession | null {
  if (session && session.expiresAt > Date.now()) return session;
  session = null;
  return null;
}

function loadGis(): Promise<boolean> {
  if (gisLoaded) return gisLoaded;
  gisLoaded = new Promise((resolve) => {
    if (document.querySelector(`script[src="${GIS_SRC}"]`)) return resolve(true);
    const el = document.createElement('script');
    el.src = GIS_SRC;
    el.async = true;
    el.defer = true;
    el.onload = () => resolve(true);
    el.onerror = () => resolve(false);
    document.head.appendChild(el);
  });
  return gisLoaded;
}

/** Opens Google's consent screen and returns an access token. */
export async function signInWithGoogle(): Promise<SyncResult> {
  if (!isGoogleConfigured()) {
    return {
      ok: false,
      message: 'Google sync is not configured. Add VITE_GOOGLE_CLIENT_ID to .env — see GOOGLE_SYNC.md.',
    };
  }
  if (isEmbeddedWebView()) {
    return {
      ok: false,
      message:
        'Google blocks sign-in inside app WebViews. Use the hosted or installed web version, or add the native Google Auth plugin. Share-sheet backup works here in the meantime.',
    };
  }
  if (!(await loadGis())) {
    return { ok: false, message: 'Could not reach Google. Check your connection and try again.' };
  }

  return new Promise((resolve) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const google = (window as any).google;
      const client = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPE,
        callback: (resp: { access_token?: string; expires_in?: number; error?: string }) => {
          if (!resp.access_token) {
            resolve({ ok: false, message: resp.error || 'Sign-in was cancelled.' });
            return;
          }
          session = {
            accessToken: resp.access_token,
            expiresAt: Date.now() + (resp.expires_in ?? 3600) * 1000 - 60_000,
          };
          resolve({ ok: true, message: 'Signed in to Google.' });
        },
      });
      client.requestAccessToken();
    } catch (e) {
      resolve({ ok: false, message: `Google sign-in failed: ${String(e)}` });
    }
  });
}

export function signOutGoogle(): void {
  session = null;
}

async function findBackupFileId(token: string): Promise<string | null> {
  const url =
    'https://www.googleapis.com/drive/v3/files' +
    `?spaces=appDataFolder&fields=files(id,name)&q=name='${BACKUP_NAME}'`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return null;
  const data = await res.json();
  return data.files?.[0]?.id ?? null;
}

/** Uploads the backup, replacing any previous copy. */
export async function uploadBackup(json: string): Promise<SyncResult> {
  const s = currentSession();
  if (!s) return { ok: false, message: 'Sign in to Google first.' };

  try {
    const existingId = await findBackupFileId(s.accessToken);
    const metadata = existingId
      ? { name: BACKUP_NAME }
      : { name: BACKUP_NAME, parents: ['appDataFolder'] };

    const body = new FormData();
    body.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    body.append('file', new Blob([json], { type: 'application/json' }));

    const url = existingId
      ? `https://www.googleapis.com/upload/drive/v3/files/${existingId}?uploadType=multipart`
      : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

    const res = await fetch(url, {
      method: existingId ? 'PATCH' : 'POST',
      headers: { Authorization: `Bearer ${s.accessToken}` },
      body,
    });

    if (!res.ok) {
      return { ok: false, message: `Upload failed (${res.status}). Try signing in again.` };
    }
    return { ok: true, message: 'Backup saved to your Google Drive.' };
  } catch (e) {
    return { ok: false, message: `Upload failed: ${String(e)}` };
  }
}

/** Downloads the most recent backup JSON, or null when none exists yet. */
export async function downloadBackup(): Promise<{ json: string | null; message: string }> {
  const s = currentSession();
  if (!s) return { json: null, message: 'Sign in to Google first.' };

  try {
    const id = await findBackupFileId(s.accessToken);
    if (!id) return { json: null, message: 'No backup found in your Drive yet.' };

    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${id}?alt=media`, {
      headers: { Authorization: `Bearer ${s.accessToken}` },
    });
    if (!res.ok) return { json: null, message: `Download failed (${res.status}).` };

    return { json: await res.text(), message: 'Backup downloaded.' };
  } catch (e) {
    return { json: null, message: `Download failed: ${String(e)}` };
  }
}
