import { useEffect, useState } from 'react';

/**
 * Real connectivity state.
 *
 * THE BUG THIS FIXES
 * The AI assistant told users to "connect to internet" whenever its request to
 * `/api/ai/chat` failed. In the installed APK that request ALWAYS fails, because
 * there is no server bundled with the app — so a phone sitting on working Wi-Fi
 * was constantly told it had no connection.
 *
 * Those are two different conditions and the app now distinguishes them:
 *   isOnline    - the device has a network route
 *   hasBackend  - an AI server actually answered
 */
export function useOnline(): boolean {
  const [online, setOnline] = useState<boolean>(
    typeof navigator === 'undefined' ? true : navigator.onLine
  );

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);

  return online;
}

/** Probes once whether an AI backend is reachable. */
export function useBackendAvailable(): boolean | null {
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    fetch('/api/health', { signal: controller.signal })
      .then((r) => r.ok)
      .catch(() => false)
      .then((ok) => { if (!cancelled) setAvailable(ok); })
      .finally(() => clearTimeout(timer));

    return () => { cancelled = true; controller.abort(); };
  }, []);

  return available;
}
