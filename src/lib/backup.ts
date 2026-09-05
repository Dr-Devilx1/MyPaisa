/**
 * Backup, share and email-sync helpers.
 *
 * ---------------------------------------------------------------------------
 *  What "email sync" honestly is in this app
 * ---------------------------------------------------------------------------
 *  The previous build advertised email sync but did none of it. The signup flow
 *  generated a six-digit code *in the browser*, compared it to what you typed,
 *  and showed "Account created & synced". No email was ever sent, no data ever
 *  left the device, and `123456` was hard-coded as a universal bypass code.
 *
 *  A real send-from-the-app email sync needs a mail server (SMTP credentials or
 *  a provider API key). Shipping one inside an APK means shipping that secret
 *  to every user who installs it, so this build does NOT do that.
 *
 *  Instead it uses the device's own mail app, which is both safer and works
 *  fully offline-to-online:
 *
 *   1. Web Share (preferred on Android) - hands the real .json backup file to
 *      the system share sheet. Pick Gmail/Outlook and it arrives as a genuine
 *      attachment, sent from your own address.
 *   2. mailto: fallback - opens a pre-filled draft; the file is downloaded
 *      alongside so it can be attached manually.
 *   3. Plain download - always available as a last resort.
 *
 *  If you later host `server.ts` somewhere, `POST /api/sync/email` will send
 *  the backup server-side using your own SMTP settings. It is disabled until
 *  those environment variables are present.
 * ---------------------------------------------------------------------------
 */

import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';

export type BackupMethod = 'share' | 'mailto' | 'download' | 'server' | 'file';

export interface BackupResult {
  ok: boolean;
  method: BackupMethod;
  message: string;
}

export function backupFilename(): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').split('T');
  return `MyPaisa-Backup-${stamp[0]}_${stamp[1].slice(0, 5)}.json`;
}

function toFile(json: string, filename: string): File {
  return new File([json], filename, { type: 'application/json' });
}

/** Straight download to the device. Always works. */
export function downloadBackup(json: string, filename = backupFilename()): BackupResult {
  try {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Revoke on the next tick — revoking immediately cancels the download in
    // some Android WebViews, which is why the old Settings export silently
    // produced a 0-byte file on certain devices.
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return { ok: true, method: 'download', message: `Saved ${filename} to your Downloads folder.` };
  } catch (e) {
    return { ok: false, method: 'download', message: `Could not save the file: ${String(e)}` };
  }
}

/** True inside the Android/iOS app shell, where the Filesystem plugin exists. */
export function canSaveToDevice(): boolean {
  return Capacitor.isNativePlatform();
}

/** Folder the backup lands in, shown to the user so they can find it later. */
export const BACKUP_FOLDER = 'Documents/MyPaisa';

/**
 * Writes the backup into the phone's public Documents/MyPaisa folder, where any
 * file manager can see it. A browser download goes to a sandbox the user often
 * cannot browse, which is why restoring on a second phone used to be painful.
 */
export async function saveBackupToDevice(
  json: string,
  filename = backupFilename()
): Promise<BackupResult> {
  if (!canSaveToDevice()) {
    return downloadBackup(json, filename);
  }
  try {
    // Android 11+ scopes Documents to the app and grants this implicitly; older
    // versions need the storage permission, and a refusal must not be fatal.
    await Filesystem.requestPermissions().catch(() => undefined);
    await Filesystem.writeFile({
      path: `MyPaisa/${filename}`,
      data: json,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
      recursive: true,
    });
    return {
      ok: true,
      method: 'file',
      message: `Saved to ${BACKUP_FOLDER}/${filename} — open your file manager to find it.`,
    };
  } catch (e) {
    return {
      ok: false,
      method: 'file',
      message: `Could not write to storage (${String(e)}). Try "Choose location" instead.`,
    };
  }
}

/** True when the device can share an actual file (Android Chrome/WebView, iOS Safari). */
export function canShareFiles(): boolean {
  try {
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    if (typeof navigator.share !== 'function' || typeof nav.canShare !== 'function') return false;
    const probe = new File(['{}'], 'probe.json', { type: 'application/json' });
    return nav.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

/**
 * Send the backup through the system share sheet (Gmail, Drive, WhatsApp...).
 * Falls back to a download when sharing is unavailable or cancelled.
 */
export async function shareBackup(json: string, filename = backupFilename()): Promise<BackupResult> {
  if (canShareFiles()) {
    try {
      await navigator.share({
        files: [toFile(json, filename)],
        title: 'My Paisa Backup',
        text: `My Paisa data backup - ${new Date().toLocaleString()}`,
      });
      return { ok: true, method: 'share', message: 'Backup handed to your share sheet.' };
    } catch (e) {
      // AbortError just means the user closed the sheet — not a failure.
      if (e instanceof DOMException && e.name === 'AbortError') {
        return { ok: false, method: 'share', message: 'Sharing cancelled.' };
      }
      // Anything else: fall through to download.
    }
  }
  return downloadBackup(json, filename);
}

/**
 * Email the backup to a specific address.
 * Uses the share sheet when possible, otherwise downloads the file and opens a
 * pre-filled draft in the device mail app.
 */
export async function emailBackup(
  json: string,
  toAddress: string,
  filename = backupFilename()
): Promise<BackupResult> {
  const address = toAddress.trim();
  if (!address || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
    return { ok: false, method: 'mailto', message: 'Enter a valid email address first.' };
  }

  if (canShareFiles()) {
    const shared = await shareBackup(json, filename);
    if (shared.ok) {
      return {
        ok: true,
        method: 'share',
        message: `Pick your mail app in the share sheet and send to ${address}.`,
      };
    }
    if (shared.message === 'Sharing cancelled.') return shared;
  }

  // Download first so the user has the file, then open the draft.
  const saved = downloadBackup(json, filename);

  const subject = encodeURIComponent(`My Paisa Backup - ${new Date().toLocaleDateString()}`);
  const body = encodeURIComponent(
    [
      'My Paisa data backup.',
      '',
      `File: ${filename}`,
      `Created: ${new Date().toLocaleString()}`,
      '',
      'The backup file has been saved to your Downloads folder.',
      'Attach it to this email before sending, then keep the message so you can',
      'restore it later from Settings > Restore Backup.',
    ].join('\n')
  );

  try {
    window.location.href = `mailto:${encodeURIComponent(address)}?subject=${subject}&body=${body}`;
  } catch {
    return saved;
  }

  return {
    ok: saved.ok,
    method: 'mailto',
    message: `Draft opened for ${address}. Attach ${filename} from Downloads before sending.`,
  };
}

/**
 * Optional server-side send. Only succeeds when server.ts is running AND SMTP
 * environment variables are configured. Returns a clear message otherwise.
 */
export async function emailBackupViaServer(json: string, toAddress: string): Promise<BackupResult> {
  try {
    const res = await fetch('/api/sync/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: toAddress, backup: json, filename: backupFilename() }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.sent) {
      return { ok: true, method: 'server', message: `Backup emailed to ${toAddress}.` };
    }
    return {
      ok: false,
      method: 'server',
      message: data.error || 'Mail server is not configured. Using your device mail app instead.',
    };
  } catch {
    return {
      ok: false,
      method: 'server',
      message: 'No mail server reachable (normal for the offline APK). Using your device mail app instead.',
    };
  }
}

/** Days since the last successful backup, or null if there has never been one. */
export function daysSince(iso?: string): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / 86400000);
}
