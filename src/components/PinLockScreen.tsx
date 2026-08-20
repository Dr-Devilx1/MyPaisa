import React, { useEffect, useState } from 'react';
import { Delete, ShieldCheck } from 'lucide-react';
import { Logo } from './Logo';
import { useFinancials } from '../state/FinancialContext';

/**
 * App lock screen.
 *
 * BUGFIX: Settings exposed a "PIN Protection — Require PIN code on app launch"
 * toggle, but nothing in the app ever asked for a PIN. Turning it on changed a
 * boolean and nothing else, which is worse than having no lock at all because
 * it tells the user their financial data is protected when it is not.
 *
 * This screen is now rendered ahead of the app whenever a PIN is set.
 *
 * Scope note: this is a local, offline device lock. It stops someone picking up
 * your unlocked phone and reading your ledger. It is NOT encryption — the
 * records themselves are stored unencrypted in the browser database, so it will
 * not stop anyone with physical access to the device's app data.
 */
export const PinLockScreen: React.FC = () => {
  const { unlockApp, userProfile } = useFinancials();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const PIN_LENGTH = 4;

  useEffect(() => {
    if (pin.length !== PIN_LENGTH) return;

    const ok = unlockApp(pin);
    if (!ok) {
      setAttempts((a) => a + 1);
      setError('Incorrect PIN. Try again.');
      setShake(true);
      const t1 = setTimeout(() => setShake(false), 480);
      const t2 = setTimeout(() => {
        setPin('');
        setError('');
      }, 700);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [pin, unlockApp]);

  const press = (digit: string) => {
    if (pin.length >= PIN_LENGTH) return;
    setPin((p) => p + digit);
  };

  const backspace = () => setPin((p) => p.slice(0, -1));

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  return (
    <div
      className="fixed inset-0 z-[90] flex flex-col items-center justify-center bg-[#09090B] px-6"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex flex-col items-center gap-3">
        <Logo className="h-16 w-16" />
        <h1 className="text-lg font-bold tracking-tight text-white">Welcome back{userProfile.name ? `, ${userProfile.name.split(' ')[0]}` : ''}</h1>
        <p className="flex items-center gap-1.5 text-xs font-medium text-zinc-500">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          Enter your {PIN_LENGTH}-digit PIN to unlock
        </p>
      </div>

      {/* PIN dots */}
      <div className={`mt-9 flex items-center gap-4 ${shake ? 'mp-shake' : ''}`}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <span
            key={i}
            className={`h-3.5 w-3.5 rounded-full border transition-all duration-150 ${
              i < pin.length
                ? 'scale-110 border-emerald-400 bg-emerald-400'
                : error
                ? 'border-rose-500/60 bg-transparent'
                : 'border-zinc-700 bg-transparent'
            }`}
          />
        ))}
      </div>

      <p className={`mt-4 h-4 text-xs font-semibold ${error ? 'text-rose-400' : 'text-transparent'}`}>
        {error || 'placeholder'}
      </p>

      {attempts >= 3 && (
        <p className="mb-2 max-w-xs text-center text-[11px] leading-relaxed text-zinc-500">
          Forgot your PIN? Reinstalling the app clears the lock, but it also clears your records —
          restore from your latest backup file afterwards.
        </p>
      )}

      {/* Keypad */}
      <div className="mt-4 grid w-full max-w-[264px] grid-cols-3 gap-3">
        {keys.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => press(k)}
            className="h-16 rounded-2xl border border-zinc-800 bg-zinc-900/70 text-xl font-semibold text-zinc-100 transition-all active:scale-95 active:bg-zinc-800"
          >
            {k}
          </button>
        ))}
        <span />
        <button
          type="button"
          onClick={() => press('0')}
          className="h-16 rounded-2xl border border-zinc-800 bg-zinc-900/70 text-xl font-semibold text-zinc-100 transition-all active:scale-95 active:bg-zinc-800"
        >
          0
        </button>
        <button
          type="button"
          onClick={backspace}
          aria-label="Delete last digit"
          className="flex h-16 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/40 text-zinc-400 transition-all active:scale-95 active:bg-zinc-800"
        >
          <Delete className="h-5 w-5" />
        </button>
      </div>

      <style>{`
        @keyframes mpShake {
          0%,100% { transform: translateX(0); }
          20% { transform: translateX(-9px); }
          40% { transform: translateX(9px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
        .mp-shake { animation: mpShake 460ms ease-in-out; }
      `}</style>
    </div>
  );
};
