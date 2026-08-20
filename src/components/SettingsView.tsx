import React, { useMemo, useRef, useState } from 'react';
import { useFinancials } from '../state/FinancialContext';
import {
  Settings,
  Download,
  Upload,
  Globe,
  Sun,
  Moon,
  FileText,
  Lock,
  Trash2,
  Mail,
  Share2,
  Database,
  AlertTriangle,
  CheckCircle2,
  Beaker,
  KeyRound,
  HardDriveDownload,
  Cloud,
  CloudUpload,
  CloudDownload,
  ExternalLink,
} from 'lucide-react';
import { Logo } from './Logo';
import {
  signInWithGoogle,
  signOutGoogle,
  uploadBackup as driveUpload,
  downloadBackup as driveDownload,
  isGoogleConfigured,
  isEmbeddedWebView,
  currentSession,
} from '../lib/googleSync';
import {
  shareBackup,
  emailBackup,
  emailBackupViaServer,
  downloadBackup,
  backupFilename,
  canShareFiles,
  daysSince,
} from '../lib/backup';

const CURRENCIES = [
  { code: 'PKR', symbol: 'Rs', name: 'Pakistani Rupee (Rs)' },
  { code: 'USD', symbol: '$', name: 'US Dollar ($)' },
  { code: 'EUR', symbol: '\u20AC', name: 'Euro (\u20AC)' },
  { code: 'GBP', symbol: '\u00A3', name: 'British Pound (\u00A3)' },
  { code: 'INR', symbol: '\u20B9', name: 'Indian Rupee (\u20B9)' },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham (AED)' },
  { code: 'SAR', symbol: 'SAR', name: 'Saudi Riyal (SAR)' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar (CA$)' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar (A$)' },
  { code: 'JPY', symbol: '\u00A5', name: 'Japanese Yen (\u00A5)' },
];

type Banner = { tone: 'ok' | 'warn' | 'error'; text: string } | null;

export const SettingsView: React.FC = () => {
  const {
    userProfile,
    updateProfile,
    exportBackup,
    importBackup,
    resetToCleanData,
    loadDemoData,
    storageBackend,
    storageDurable,
    transactions,
    lockApp,
  } = useFinancials();

  const isDark = userProfile.themeMode !== 'light';

  const [banner, setBanner] = useState<Banner>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [emailInput, setEmailInput] = useState(userProfile.syncEmail ?? userProfile.email ?? '');
  const [googleBusy, setGoogleBusy] = useState<string | null>(null);
  const [googleOn, setGoogleOn] = useState(() => currentSession() !== null);
  const [pinDraft, setPinDraft] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const backupAge = daysSince(userProfile.lastBackupAt);
  const shareSupported = useMemo(() => canShareFiles(), []);

  /* ------------------------------ theme tokens ---------------------------- */
  const card = isDark
    ? 'bg-[#131316] border-zinc-800'
    : 'bg-white border-slate-200 shadow-sm';
  const heading = isDark ? 'text-white' : 'text-slate-900';
  const sub = isDark ? 'text-zinc-500' : 'text-slate-500';
  const field = isDark
    ? 'border-zinc-800 bg-zinc-900 text-white placeholder-zinc-600 focus:border-emerald-500'
    : 'border-slate-300 bg-slate-50 text-slate-900 placeholder-slate-400 focus:border-emerald-500';
  const softBtn = isDark
    ? 'bg-zinc-900 text-zinc-200 border-zinc-800 hover:bg-zinc-800'
    : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200';
  const inset = isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-slate-50 border-slate-200';

  const say = (tone: Banner extends null ? never : 'ok' | 'warn' | 'error', text: string) => {
    setBanner({ tone, text });
    setTimeout(() => setBanner(null), 7000);
  };

  const markBackedUp = () => updateProfile({ lastBackupAt: new Date().toISOString() });

  /* -------------------------------- actions ------------------------------- */

  const handleDownload = async () => {
    setBusy('download');
    try {
      const json = await exportBackup();
      const res = downloadBackup(json);
      if (res.ok) markBackedUp();
      say(res.ok ? 'ok' : 'error', res.message);
    } finally {
      setBusy(null);
    }
  };

  const handleShare = async () => {
    setBusy('share');
    try {
      const json = await exportBackup();
      const res = await shareBackup(json);
      if (res.ok) markBackedUp();
      say(res.ok ? 'ok' : 'warn', res.message);
    } finally {
      setBusy(null);
    }
  };

  const handleEmail = async () => {
    const address = emailInput.trim();
    setBusy('email');
    try {
      const json = await exportBackup();

      // Try a real server-side send first; fall back to the device mail app.
      const viaServer = await emailBackupViaServer(json, address);
      if (viaServer.ok) {
        updateProfile({ syncEmail: address, lastBackupAt: new Date().toISOString() });
        say('ok', viaServer.message);
        return;
      }

      const res = await emailBackup(json, address, backupFilename());
      if (res.ok) {
        updateProfile({ syncEmail: address, lastBackupAt: new Date().toISOString() });
      }
      say(res.ok ? 'ok' : 'error', res.message);
    } finally {
      setBusy(null);
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onerror = () => say('error', 'Could not read that file.');
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content !== 'string') {
        say('error', 'That file could not be read as text.');
        return;
      }
      const result = importBackup(content);
      say(result.ok ? 'ok' : 'error', result.message);
    };
    reader.readAsText(file);

    // Allow re-selecting the same file (the old version silently ignored it).
    e.target.value = '';
  };

  const handleReset = async () => {
    if (resetConfirmText.trim().toUpperCase() !== 'DELETE') {
      say('error', 'Type DELETE to confirm.');
      return;
    }
    setBusy('reset');
    try {
      await resetToCleanData();
      setShowResetConfirm(false);
      setResetConfirmText('');
      say('ok', 'All records cleared. Your settings and profile were kept.');
    } finally {
      setBusy(null);
    }
  };

  const handleSavePin = () => {
    if (!/^\d{4}$/.test(pinDraft)) {
      say('error', 'PIN must be exactly 4 digits.');
      return;
    }
    if (pinDraft !== pinConfirm) {
      say('error', 'The two PINs do not match.');
      return;
    }
    updateProfile({ pinCode: pinDraft, isPinProtected: true });
    setPinDraft('');
    setPinConfirm('');
    say('ok', 'PIN lock enabled. It will be requested next time you open the app.');
  };

  const handleDisablePin = () => {
    updateProfile({ pinCode: undefined, isPinProtected: false });
    say('ok', 'PIN lock disabled.');
  };

  /* --------------------------------- render ------------------------------- */

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className={`rounded-[2rem] border p-7 shadow-xl ${card}`}>
        <div className="mb-1 flex items-center gap-2">
          <Settings className="h-5 w-5 text-indigo-400" />
          <h2 className={`text-xl font-bold tracking-tight ${heading}`}>Settings &amp; Data Vault</h2>
        </div>
        <p className={`text-xs font-medium ${sub}`}>
          My Paisa by SIHFZ &middot; Storage, security, currency and backups.
        </p>
      </div>

      {/* Global banner */}
      {banner && (
        <div
          className={`rounded-2xl border p-4 text-xs font-semibold ${
            banner.tone === 'ok'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500'
              : banner.tone === 'warn'
              ? 'border-amber-500/30 bg-amber-500/10 text-amber-500'
              : 'border-rose-500/30 bg-rose-500/10 text-rose-500'
          }`}
        >
          {banner.text}
        </div>
      )}

      {/* Storage health */}
      <div className={`rounded-[2rem] border p-7 shadow-xl ${card}`}>
        <div className={`mb-4 flex items-center gap-2 border-b pb-3 ${isDark ? 'border-zinc-800' : 'border-slate-200'}`}>
          <Database className="h-4 w-4 text-emerald-400" />
          <h3 className={`text-sm font-bold tracking-tight ${heading}`}>Storage Health</h3>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className={`rounded-2xl border p-4 ${inset}`}>
            <span className={`block text-[10px] font-bold uppercase tracking-wider ${sub}`}>Engine</span>
            <span className={`text-sm font-bold ${heading}`}>
              {storageBackend === 'indexeddb'
                ? 'IndexedDB'
                : storageBackend === 'localstorage'
                ? 'Local Storage'
                : 'Memory only'}
            </span>
          </div>
          <div className={`rounded-2xl border p-4 ${inset}`}>
            <span className={`block text-[10px] font-bold uppercase tracking-wider ${sub}`}>Records</span>
            <span className={`text-sm font-bold ${heading}`}>{transactions.length} transactions</span>
          </div>
          <div className={`rounded-2xl border p-4 ${inset}`}>
            <span className={`block text-[10px] font-bold uppercase tracking-wider ${sub}`}>Last backup</span>
            <span className={`text-sm font-bold ${heading}`}>
              {backupAge === null ? 'Never' : backupAge === 0 ? 'Today' : `${backupAge} day(s) ago`}
            </span>
          </div>
        </div>

        {!storageDurable && (
          <div className="mt-4 flex items-start gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
            <p className="text-[11px] font-medium leading-relaxed text-rose-400">
              This device is not allowing persistent storage, so records will be lost when the app
              closes. This normally means private/incognito browsing or an embedded preview frame.
              Open the installed app directly, or export a backup before you close it.
            </p>
          </div>
        )}

        {storageDurable && backupAge !== null && backupAge >= 14 && (
          <div className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <p className="text-[11px] font-medium leading-relaxed text-amber-400">
              Your last backup was {backupAge} days ago. Uninstalling the app or clearing its data
              erases everything, so keep a recent copy.
            </p>
          </div>
        )}

        {storageDurable && backupAge === null && (
          <div className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <p className="text-[11px] font-medium leading-relaxed text-amber-400">
              You have never taken a backup. Your data lives only on this device.
            </p>
          </div>
        )}
      </div>

      {/* Backup & Email Sync */}
      <div className={`rounded-[2rem] border p-7 shadow-xl ${card}`}>
        <div className={`mb-4 flex items-center gap-2 border-b pb-3 ${isDark ? 'border-zinc-800' : 'border-slate-200'}`}>
          <Mail className="h-4 w-4 text-emerald-400" />
          <h3 className={`text-sm font-bold tracking-tight ${heading}`}>Backup &amp; Email Sync</h3>
        </div>

        <div className={`mb-5 rounded-2xl border p-4 ${inset}`}>
          <p className={`text-[11px] font-medium leading-relaxed ${sub}`}>
            My Paisa keeps everything on your device — nothing is uploaded to a server. Email sync
            works by handing the backup file to your own mail app
            {shareSupported ? ' through the system share sheet, so it arrives as a real attachment.' : '. Your device does not support file sharing, so the file is downloaded and a pre-filled draft opens for you to attach it.'}
          </p>
        </div>

        <label className={`mb-1 block text-xs font-semibold ${sub}`}>Backup email address</label>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row">
          <input
            type="email"
            inputMode="email"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            placeholder="you@example.com"
            className={`flex-1 rounded-xl border px-3.5 py-2.5 text-xs outline-none transition-colors ${field}`}
          />
          <button
            type="button"
            onClick={handleEmail}
            disabled={busy !== null}
            className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-black transition-colors hover:bg-emerald-400 disabled:opacity-50"
          >
            <Mail className="h-4 w-4" />
            {busy === 'email' ? 'Preparing...' : 'Email Backup'}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleShare}
            disabled={busy !== null}
            className={`flex items-center gap-2 rounded-2xl border px-5 py-3 text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 ${softBtn}`}
          >
            <Share2 className="h-4 w-4 text-emerald-500" />
            {busy === 'share' ? 'Opening...' : 'Share Backup'}
          </button>

          <button
            type="button"
            onClick={handleDownload}
            disabled={busy !== null}
            className={`flex items-center gap-2 rounded-2xl border px-5 py-3 text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 ${softBtn}`}
          >
            <Download className="h-4 w-4 text-indigo-400" />
            {busy === 'download' ? 'Saving...' : 'Download JSON'}
          </button>

          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className={`flex items-center gap-2 rounded-2xl border px-5 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${softBtn}`}
          >
            <Upload className="h-4 w-4 text-amber-400" />
            Restore Backup
          </button>
          <input ref={fileRef} type="file" accept=".json,application/json" onChange={handleImportFile} className="hidden" />
        </div>
      </div>

      {/* Google Drive sync */}
      <div className={`rounded-[2rem] border p-7 shadow-xl ${card}`}>
        <div className={`mb-4 flex items-center gap-2 border-b pb-3 ${isDark ? 'border-zinc-800' : 'border-slate-200'}`}>
          <Cloud className="h-4 w-4 text-emerald-400" />
          <h3 className={`text-sm font-bold tracking-tight ${heading}`}>Google Drive Sync</h3>
        </div>

        {!isGoogleConfigured() ? (
          <div className={`rounded-2xl border p-4 ${inset}`}>
            <p className={`text-[11px] font-medium leading-relaxed ${sub}`}>
              Not configured yet. Google sync needs an OAuth Client ID that only you can create —
              it cannot be shipped inside the app, because anything bundled in an APK is readable
              by everyone who installs it. Setup takes about ten minutes and is free; see
              GOOGLE_SYNC.md. Until then, Share Backup above works everywhere.
            </p>
          </div>
        ) : isEmbeddedWebView() ? (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
            <p className="text-[11px] font-medium leading-relaxed text-amber-500">
              Google blocks sign-in inside app WebViews, so this will not work in the installed
              APK without the native Google Auth plugin. It works in the hosted or installed web
              version. Share Backup works here regardless.
            </p>
          </div>
        ) : (
          <>
            <p className={`mb-4 text-[11px] leading-relaxed ${sub}`}>
              Signs in with your Google account and keeps one backup file in a private app folder
              in your own Drive. It cannot see any of your other Drive files.
            </p>
            <div className="flex flex-wrap gap-2">
              {!googleOn ? (
                <button
                  type="button"
                  disabled={googleBusy !== null}
                  onClick={async () => {
                    setGoogleBusy('in');
                    const r = await signInWithGoogle();
                    setGoogleOn(r.ok);
                    say(r.ok ? 'ok' : 'error', r.message);
                    setGoogleBusy(null);
                  }}
                  className="rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-black disabled:opacity-50"
                >
                  {googleBusy === 'in' ? 'Opening...' : 'Sign in with Google'}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={googleBusy !== null}
                    onClick={async () => {
                      setGoogleBusy('up');
                      const r = await driveUpload(await exportBackup());
                      if (r.ok) updateProfile({ lastCloudSyncAt: new Date().toISOString(), lastBackupAt: new Date().toISOString() });
                      say(r.ok ? 'ok' : 'error', r.message);
                      setGoogleBusy(null);
                    }}
                    className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold ${softBtn}`}
                  >
                    <CloudUpload className="h-3.5 w-3.5 text-emerald-500" />
                    {googleBusy === 'up' ? 'Uploading...' : 'Back up now'}
                  </button>
                  <button
                    type="button"
                    disabled={googleBusy !== null}
                    onClick={async () => {
                      setGoogleBusy('down');
                      const r = await driveDownload();
                      if (r.json) {
                        const res = importBackup(r.json);
                        say(res.ok ? 'ok' : 'error', res.message);
                      } else {
                        say('error', r.message);
                      }
                      setGoogleBusy(null);
                    }}
                    className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold ${softBtn}`}
                  >
                    <CloudDownload className="h-3.5 w-3.5 text-amber-500" />
                    {googleBusy === 'down' ? 'Restoring...' : 'Restore from Drive'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { signOutGoogle(); setGoogleOn(false); say('ok', 'Signed out of Google.'); }}
                    className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-xs font-bold text-rose-500"
                  >
                    Sign out
                  </button>
                </>
              )}
            </div>
            {userProfile.lastCloudSyncAt && (
              <p className={`mt-3 text-[11px] ${sub}`}>
                Last Drive sync: {new Date(userProfile.lastCloudSyncAt).toLocaleString()}
              </p>
            )}
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Localisation */}
        <div className={`flex flex-col gap-4 rounded-[2rem] border p-7 shadow-xl ${card}`}>
          <div className={`flex items-center gap-2 border-b pb-3 ${isDark ? 'border-zinc-800' : 'border-slate-200'}`}>
            <Globe className="h-4 w-4 text-emerald-400" />
            <h3 className={`text-sm font-bold tracking-tight ${heading}`}>Currency &amp; Appearance</h3>
          </div>

          <div>
            <label className={`mb-1 block text-xs font-medium ${sub}`}>Display currency</label>
            <select
              value={userProfile.currencyCode}
              onChange={(e) => {
                const found = CURRENCIES.find((c) => c.code === e.target.value);
                if (found) updateProfile({ currencyCode: found.code, currencySymbol: found.symbol });
              }}
              className={`w-full rounded-xl border px-3.5 py-2.5 text-xs outline-none transition-colors ${field}`}
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={`mb-1 block text-xs font-medium ${sub}`}>Theme</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => updateProfile({ themeMode: 'dark' })}
                className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all ${
                  isDark ? 'bg-indigo-600 text-white' : `border ${softBtn}`
                }`}
              >
                <Moon className="h-4 w-4" /> Dark
              </button>
              <button
                type="button"
                onClick={() => updateProfile({ themeMode: 'light' })}
                className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all ${
                  !isDark ? 'bg-amber-500 text-black' : `border ${softBtn}`
                }`}
              >
                <Sun className="h-4 w-4" /> Light
              </button>
            </div>
          </div>
        </div>

        {/* Security */}
        <div className={`flex flex-col gap-4 rounded-[2rem] border p-7 shadow-xl ${card}`}>
          <div className={`flex items-center gap-2 border-b pb-3 ${isDark ? 'border-zinc-800' : 'border-slate-200'}`}>
            <Lock className="h-4 w-4 text-indigo-400" />
            <h3 className={`text-sm font-bold tracking-tight ${heading}`}>App Lock</h3>
          </div>

          {userProfile.isPinProtected ? (
            <>
              <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                <span className="text-[11px] font-semibold text-emerald-500">
                  PIN lock is active. It is requested every time the app opens.
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={lockApp}
                  className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-bold transition-colors ${softBtn}`}
                >
                  <KeyRound className="h-3.5 w-3.5" /> Lock now
                </button>
                <button
                  type="button"
                  onClick={handleDisablePin}
                  className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs font-bold text-rose-500 transition-colors hover:bg-rose-500/20"
                >
                  Disable PIN
                </button>
              </div>
            </>
          ) : (
            <>
              <p className={`text-[11px] leading-relaxed ${sub}`}>
                Set a 4-digit PIN to lock the app on launch. This is a local device lock, not
                encryption — it stops casual access, it does not protect the stored file itself.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={pinDraft}
                  onChange={(e) => setPinDraft(e.target.value.replace(/\D/g, ''))}
                  placeholder="New PIN"
                  className={`rounded-xl border px-3.5 py-2.5 text-center text-sm tracking-[0.4em] outline-none transition-colors ${field}`}
                />
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={pinConfirm}
                  onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, ''))}
                  placeholder="Confirm"
                  className={`rounded-xl border px-3.5 py-2.5 text-center text-sm tracking-[0.4em] outline-none transition-colors ${field}`}
                />
              </div>
              <button
                type="button"
                onClick={handleSavePin}
                className="rounded-xl bg-indigo-600 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-indigo-500"
              >
                Enable PIN Lock
              </button>
            </>
          )}
        </div>
      </div>

      {/* Danger zone */}
      <div className={`rounded-[2rem] border p-7 shadow-xl ${card}`}>
        <div className={`mb-4 flex items-center gap-2 border-b pb-3 ${isDark ? 'border-zinc-800' : 'border-slate-200'}`}>
          <FileText className="h-4 w-4 text-rose-400" />
          <h3 className={`text-sm font-bold tracking-tight ${heading}`}>Sample Data &amp; Reset</h3>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              loadDemoData();
              say('ok', 'Sample data loaded. Use Clear All Records to remove it again.');
            }}
            className={`flex items-center gap-2 rounded-2xl border px-5 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${softBtn}`}
          >
            <Beaker className="h-4 w-4 text-cyan-400" /> Load Sample Data
          </button>

          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="flex items-center gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-5 py-3 text-xs font-bold uppercase tracking-wider text-rose-500 transition-colors hover:bg-rose-500/20"
          >
            <Trash2 className="h-4 w-4" /> Clear All Records
          </button>
        </div>

        {showResetConfirm && (
          <div className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5">
            <p className="text-xs font-bold text-rose-400">
              This permanently deletes every transaction, budget, goal, loan and memory on this
              device.
            </p>
            <p className={`mt-1 text-[11px] ${sub}`}>
              Your profile, currency, theme and PIN are kept. Take a backup first if you are unsure —
              this cannot be undone.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                value={resetConfirmText}
                onChange={(e) => setResetConfirmText(e.target.value)}
                placeholder='Type DELETE to confirm'
                className={`flex-1 rounded-xl border px-3.5 py-2.5 text-xs outline-none transition-colors ${field}`}
              />
              <button
                type="button"
                onClick={handleReset}
                disabled={busy === 'reset'}
                className="rounded-xl bg-rose-500 px-4 py-2.5 text-xs font-bold text-white transition-all hover:bg-rose-600 disabled:opacity-50"
              >
                {busy === 'reset' ? 'Clearing...' : 'Delete Everything'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowResetConfirm(false);
                  setResetConfirmText('');
                }}
                className={`rounded-xl border px-4 py-2.5 text-xs font-bold transition-all ${softBtn}`}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className={`rounded-[2rem] border p-7 text-center ${card}`}>
        <div className="mb-2 flex justify-center">
          <Logo className="h-10 w-10" />
        </div>
        <h4 className={`text-sm font-bold tracking-tight ${heading}`}>My Paisa</h4>
        <p className={`mt-0.5 text-xs font-medium ${sub}`}>Offline-first personal finance</p>
        <p className={`mt-1 text-xs font-medium ${sub}`}>
          Developed &amp; designed by{' '}
          <a
            href="https://www.sihfz.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-bold mp-brand-fg underline underline-offset-2"
          >
            SIHFZ <ExternalLink className="h-3 w-3" />
          </a>
        </p>
        <p className={`mt-0.5 text-[11px] ${sub}`}>www.sihfz.com</p>
        <p className={`mt-2 flex items-center justify-center gap-1.5 text-[10px] ${sub}`}>
          <HardDriveDownload className="h-3 w-3" />
          Data stored locally on this device only
        </p>
      </div>
    </div>
  );
};
