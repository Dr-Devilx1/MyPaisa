import { useEffect, useRef } from 'react';

/**
 * Android hardware/gesture back-button routing.
 *
 * THE PROBLEM THIS SOLVES
 * Capacitor's default behaviour for the Android back button inside a WebView is
 * to exit the app immediately. So pressing back with a modal open — or from any
 * tab other than the dashboard — closed My Paisa outright instead of doing the
 * obvious thing (close the sheet, or step back a screen). That is the single
 * most jarring difference between a web page wrapped in a WebView and an app
 * that feels native.
 *
 * HOW IT WORKS
 * Every dismissible surface (modal, drawer, image lightbox) registers a close
 * handler while it is open. The handlers form a stack, so the most recently
 * opened surface is always the first to close — matching how a real Android
 * back stack unwinds. `App.tsx` owns the single platform listener and asks this
 * stack first; only when nothing is registered does it fall back to tab
 * navigation, and only from the dashboard does the app actually exit.
 */

type Handler = () => void;

const stack: Handler[] = [];

/**
 * Registers `onBack` as the active back handler while `active` is true.
 *
 * The callback is read through a ref so an inline arrow function does not
 * re-register (and therefore re-order) the stack on every render.
 */
export function useBackHandler(active: boolean, onBack: Handler): void {
  const latest = useRef(onBack);
  latest.current = onBack;

  useEffect(() => {
    if (!active) return;
    const entry: Handler = () => latest.current();
    stack.push(entry);
    return () => {
      const index = stack.lastIndexOf(entry);
      if (index !== -1) stack.splice(index, 1);
    };
  }, [active]);
}

/**
 * Runs the top-most registered handler.
 * Returns true when something consumed the press, false when nothing is open.
 */
export function runTopBackHandler(): boolean {
  const handler = stack[stack.length - 1];
  if (!handler) return false;
  handler();
  return true;
}
