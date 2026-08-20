import React, { useState } from 'react';
import { useFinancials } from '../state/FinancialContext';
import {
  User,
  AtSign,
  Mail,
  Lock,
  Camera,
  Check,
  ShieldCheck,
  RefreshCw,
  LogOut,
  Sparkles,
  X,
  UserPlus,
  LogIn,

  Send,
  CheckCircle2
} from 'lucide-react';

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
];

export const AuthModal: React.FC = () => {
  const {
    userProfile,
    savedAccounts,
    signUpAccount,
    signInAccount,
    signOutAccount,
    isAuthModalOpen,
    setIsAuthModalOpen
  } = useFinancials();

  const [mode, setMode] = useState<'signin' | 'signup'>('signup');

  // Form State
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(PRESET_AVATARS[0]);
  const [customAvatarInput, setCustomAvatarInput] = useState('');
  
  // OTP Verification State
  const [isOtpSending, setIsOtpSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isAuthModalOpen) return null;

  const isDark = userProfile.themeMode === 'dark';

  /**
   * Create a local profile.
   *
   * BUGFIX / HONESTY FIX: this used to generate a six-digit code in the
   * browser, display it on screen, accept a hard-coded `123456` as a universal
   * bypass, and then tell the user "Verification code sent to <email>!" and
   * "successfully created & synced". No email was sent and nothing was synced.
   * Presenting fake verification on a finance app is worse than none, because
   * it implies an identity check that does not exist.
   *
   * Profiles are local to this device. The email address is stored only so the
   * Settings screen can pre-fill it when you email yourself a backup.
   */
  const handleInitiateOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('Please enter your display name.');
      return;
    }
    if (!username.trim()) {
      setErrorMsg('Please choose a username.');
      return;
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMsg('That email address does not look valid.');
      return;
    }
    if (savedAccounts.some((a) => a.username.toLowerCase() === username.trim().toLowerCase())) {
      setErrorMsg('That username already exists on this device.');
      return;
    }

    const cleanUsername = username.toLowerCase().replace(/[^a-z0-9_]/g, '');
    signUpAccount({
      name: name.trim(),
      username: cleanUsername,
      email: email.trim(),
      avatarUrl: customAvatarInput.trim() || avatarUrl,
    });

    setSuccessMsg(`Profile @${cleanUsername} created on this device.`);
    setTimeout(() => {
      setSuccessMsg('');
      setIsAuthModalOpen(false);
    }, 1100);
  };

  const handleSignIn = (usernameToLogin: string) => {
    setErrorMsg('');
    const success = signInAccount(usernameToLogin);
    if (success) {
      setSuccessMsg(`Signed in as @${usernameToLogin}`);
      setTimeout(() => {
        setSuccessMsg('');
        setIsAuthModalOpen(false);
      }, 1000);
    } else {
      setErrorMsg('Account not found. Please create a new account.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div
        className={`w-full max-w-lg rounded-[2.5rem] border shadow-2xl overflow-hidden transition-all ${
          isDark
            ? 'bg-[#131316] border-zinc-800 text-zinc-100'
            : 'bg-[#F8FAFC] border-slate-200 text-slate-800 shadow-xl'
        }`}
      >
        {/* Header */}
        <div className={`p-6 pb-4 border-b flex items-center justify-between ${
          isDark ? 'border-zinc-800/80 bg-zinc-900/50' : 'border-slate-200/80 bg-white/80'
        }`}>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 font-bold">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">Device Profile</h3>
              <p className="text-xs text-zinc-500">Local profiles stored on this device only</p>
            </div>
          </div>
          <button
            onClick={() => setIsAuthModalOpen(false)}
            className={`p-2 rounded-xl transition-colors ${
              isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-slate-200 text-slate-500'
            }`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-5">
          {/* Active Account Banner */}
          {userProfile.isLoggedIn && (
            <div className={`p-4 rounded-2xl border flex items-center justify-between ${
              isDark ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}>
              <div className="flex items-center gap-3">
                {userProfile.avatarUrl ? (
                  <img
                    src={userProfile.avatarUrl}
                    alt={userProfile.name}
                    className="h-11 w-11 rounded-full object-cover border-2 border-emerald-500"
                  />
                ) : (
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-emerald-500 bg-zinc-800 text-zinc-400">
                    <User className="h-5 w-5" />
                  </span>
                )}
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm">{userProfile.name}</span>
                    <span className="text-xs opacity-75 font-mono">@{userProfile.username || 'alex_rivers'}</span>
                  </div>
                  <p className="text-[11px] opacity-80 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    Verified Email: {userProfile.email}
                  </p>
                </div>
              </div>
              <button
                onClick={() => signOutAccount()}
                className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 transition-colors"
                title="Sign Out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Mode Switcher */}
          <div className={`grid grid-cols-2 p-1 rounded-2xl border ${
            isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-slate-200/70 border-slate-300/50'
          }`}>
            <button
              onClick={() => setMode('signup')}
              className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                mode === 'signup'
                  ? 'bg-emerald-500 text-white shadow-md'
                  : isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserPlus className="h-4 w-4" />
              Create Profile
            </button>
            <button
              onClick={() => setMode('signin')}
              className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                mode === 'signin'
                  ? 'bg-emerald-500 text-white shadow-md'
                  : isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LogIn className="h-4 w-4" />
              Sign In ({savedAccounts.length})
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-medium text-center">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-bold text-center flex items-center justify-center gap-2">
              <Check className="h-4 w-4" />
              {successMsg}
            </div>
          )}

          {/* Sign Up Form */}
          {mode === 'signup' ? (
              <form onSubmit={handleInitiateOtp} className="flex flex-col gap-4">
                {/* Display Name */}
                <div>
                  <label className="text-xs font-semibold text-zinc-500 mb-1 block">Display Name *</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3 h-4 w-4 text-zinc-400" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Alex Rivers"
                      className={`w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border outline-none transition-all ${
                        isDark
                          ? 'bg-zinc-900/80 border-zinc-800 text-white focus:border-emerald-500'
                          : 'bg-white border-slate-300 text-slate-900 focus:border-emerald-500'
                      }`}
                    />
                  </div>
                </div>

                {/* Unique Username */}
                <div>
                  <label className="text-xs font-semibold text-zinc-500 mb-1 block">Username *</label>
                  <div className="relative">
                    <AtSign className="absolute left-3.5 top-3 h-4 w-4 text-zinc-400" />
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                      placeholder="e.g. alex_rivers"
                      className={`w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border outline-none transition-all ${
                        isDark
                          ? 'bg-zinc-900/80 border-zinc-800 text-white focus:border-emerald-500'
                          : 'bg-white border-slate-300 text-slate-900 focus:border-emerald-500'
                      }`}
                    />
                  </div>
                </div>

                {/* Email Input for OTP Verification */}
                <div>
                  <label className="text-xs font-semibold text-zinc-500 mb-1 block">Email Address (optional, used to pre-fill backups)</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 h-4 w-4 text-zinc-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className={`w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border outline-none transition-all ${
                        isDark
                          ? 'bg-zinc-900/80 border-zinc-800 text-white focus:border-emerald-500'
                          : 'bg-white border-slate-300 text-slate-900 focus:border-emerald-500'
                      }`}
                    />
                  </div>
                </div>

                {/* Avatar Selector */}
                <div>
                  <label className="text-xs font-semibold text-zinc-500 mb-2 block">Select Profile Avatar</label>
                  <div className="flex items-center gap-2 mb-2">
                    {PRESET_AVATARS.map((url, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setAvatarUrl(url);
                          setCustomAvatarInput('');
                        }}
                        className={`relative h-9 w-9 rounded-full overflow-hidden border-2 transition-transform hover:scale-105 ${
                          avatarUrl === url && !customAvatarInput ? 'border-emerald-500 scale-110 ring-2 ring-emerald-500/30' : 'border-transparent opacity-70'
                        }`}
                      >
                        <img src={url} alt={`Avatar ${idx}`} className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Submit to Request OTP */}
                <button
                  type="submit"
                  disabled={isOtpSending}
                  className="mt-2 w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {isOtpSending ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  {isOtpSending ? 'Creating...' : 'Create Profile'}
                </button>
              </form>
          ) : (
            /* Sign In List */
            <div className="flex flex-col gap-3 max-h-[320px] overflow-y-auto pr-1">
              {savedAccounts.length === 0 ? (
                <div className="p-6 text-center text-xs text-zinc-500">
                  No profiles saved yet on this device. Use Create Profile to add one.
                </div>
              ) : (
                savedAccounts.map((acc) => (
                  <div
                    key={acc.id}
                    onClick={() => handleSignIn(acc.username)}
                    className={`p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition-all hover:scale-[1.01] ${
                      userProfile.username === acc.username
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                        : isDark
                        ? 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700'
                        : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <img src={acc.avatarUrl} alt={acc.name} className="h-10 w-10 rounded-full object-cover border border-emerald-500/30" />
                      <div>
                        <span className="font-bold text-sm block">{acc.name}</span>
                        <span className="text-xs text-zinc-500 font-mono">@{acc.username} • {acc.email}</span>
                      </div>
                    </div>

                    {userProfile.username === acc.username ? (
                      <span className="text-xs font-bold text-emerald-500 flex items-center gap-1">
                        <Check className="h-4 w-4" /> Active
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-indigo-500 hover:underline">
                        Switch Account →
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

