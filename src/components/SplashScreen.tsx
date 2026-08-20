import React, { useEffect, useState } from 'react';
import { Logo } from './Logo';

interface SplashScreenProps {
  /** Becomes false once the storage engine has finished hydrating. */
  loading: boolean;
  /** Called once the splash has fully faded out. */
  onDone: () => void;
  /** Minimum time the splash stays up, so it never flashes. */
  minDurationMs?: number;
}

/**
 * In-app splash.
 *
 * The native Capacitor splash covers the gap between tapping the icon and the
 * WebView painting; this covers the gap between the WebView painting and the
 * database finishing its read. Without it the user briefly sees an empty
 * dashboard with zeroes — which is exactly what made the app look like it had
 * lost the data even on launches where it had not.
 */
export const SplashScreen: React.FC<SplashScreenProps> = ({
  loading,
  onDone,
  minDurationMs = 1500,
}) => {
  const [minElapsed, setMinElapsed] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMinElapsed(true), minDurationMs);
    return () => clearTimeout(t);
  }, [minDurationMs]);

  useEffect(() => {
    if (!loading && minElapsed) {
      setFading(true);
      const t = setTimeout(onDone, 420); // matches the fade duration below
      return () => clearTimeout(t);
    }
  }, [loading, minElapsed, onDone]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#09090B] transition-opacity duration-[420ms] ${
        fading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute h-[420px] w-[420px] rounded-full opacity-40 blur-[110px]"
        style={{ background: 'radial-gradient(circle, #FF751F 0%, #FFA629 60%, transparent 75%)' }}
      />

      <div className="relative flex flex-col items-center gap-6">
        <div className="mp-splash-pop">
          <Logo withTile className="h-24 w-24" />
        </div>

        <div className="mp-splash-rise flex flex-col items-center gap-1.5">
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            My<span style={{ color: '#FF9A4D' }}>Paisa</span>
          </h1>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-500">
            Track every rupee
          </p>
        </div>

        {/* Indeterminate progress rail */}
        <div className="mp-splash-rise mt-2 h-[3px] w-40 overflow-hidden rounded-full bg-zinc-800">
          <div className="mp-splash-bar h-full w-1/2 rounded-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-indigo-400" />
        </div>
      </div>

      <div className="absolute bottom-8 flex flex-col items-center gap-1">
        <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-600">
          Offline First - Your data stays on your device
        </p>
        <p className="text-[10px] font-bold tracking-wide text-zinc-700">Developed & designed by SIHFZ</p>
      </div>

      <style>{`
        @keyframes mpPop {
          0%   { opacity: 0; transform: scale(0.7) translateY(12px); }
          60%  { opacity: 1; transform: scale(1.06) translateY(0); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes mpRise {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes mpBar {
          0%   { transform: translateX(-110%); }
          100% { transform: translateX(220%); }
        }
        .mp-splash-pop  { animation: mpPop 720ms cubic-bezier(0.22, 1, 0.36, 1) both; }
        .mp-splash-rise { animation: mpRise 620ms cubic-bezier(0.22, 1, 0.36, 1) 180ms both; }
        .mp-splash-bar  { animation: mpBar 1250ms ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .mp-splash-pop, .mp-splash-rise { animation-duration: 1ms; }
          .mp-splash-bar { animation: none; width: 100%; }
        }
      `}</style>
    </div>
  );
};
