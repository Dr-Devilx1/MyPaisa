import { useEffect } from 'react';

/**
 * Tracks the on-screen keyboard and exposes its height as the `--kb` CSS
 * variable, the *actual* visible viewport height as `--vvh`, plus a
 * `.mp-kb-open` class on <html>.
 *
 * THE BUG THIS FIXES
 * The bottom navigation is `position: fixed`, which pins it to the bottom of
 * the current viewport — which is exactly where the keyboard's own
 * suggestion/autocomplete strip sits once the keyboard is open. Without this
 * hook the bar just sits there covering it.
 *
 * THE BUG *IN* THE PREVIOUS FIX
 * It compared `visualViewport.height` against `window.innerHeight` to work out
 * how much space the keyboard was covering. That comparison assumes
 * `window.innerHeight` stays fixed while only the visual viewport shrinks —
 * true in a plain desktop/mobile browser tab, but NOT true in the installed
 * app. Capacitor's default Android `windowSoftInputMode` is `adjustResize`,
 * which resizes the WebView's layout viewport (`window.innerHeight`) right
 * along with the visual one. So both numbers shrank together, the "occluded"
 * gap stayed near zero, and the keyboard was never detected as open — the bar
 * never moved, which is exactly the "bottom bar sits over the keyboard" report.
 *
 * The fix: track the largest viewport height actually observed as the
 * keyboard-closed baseline, instead of trusting `window.innerHeight` to stay
 * put. The baseline resets whenever the viewport *width* changes (a rotation
 * or window resize), since opening a keyboard never changes the width.
 *
 * THE BUG *THAT FIX INTRODUCED* (modal collapsing to a sliver)
 * Once `--kb` correctly reported the keyboard height under `adjustResize`,
 * the modal CSS did `max-height: calc(100dvh - var(--kb))` to shrink itself
 * clear of the keyboard. But under `adjustResize`, `100dvh` had ALREADY
 * shrunk by the keyboard's height — the layout viewport resized, and `dvh`
 * follows it. Subtracting `--kb` again double-counted the keyboard, crushing
 * the modal down to a sliver of its real height and leaving a dead black gap
 * above the keyboard. `--vvh` (the visual viewport's own height, already
 * keyboard-adjusted, updated on every resize — not only when the keyboard's
 * open/closed state flips) gives the CSS a number that is correct as-is, so
 * nothing needs to subtract `--kb` from it a second time.
 *
 * VisualViewport is supported by Android WebView 61+ and iOS 13+. The
 * focusin/focusout fallback covers anything older.
 */
export function useKeyboardInset(): void {
  useEffect(() => {
    const root = document.documentElement;
    const vv = window.visualViewport;

    const setOpen = (open: boolean, height = 0) => {
      root.classList.toggle('mp-kb-open', open);
      root.style.setProperty('--kb', `${Math.max(0, Math.round(height))}px`);
    };

    if (vv) {
      let baselineWidth = vv.width;
      let baselineHeight = vv.height;

      const onResize = () => {
        root.style.setProperty('--vvh', `${Math.round(vv.height)}px`);

        if (vv.width !== baselineWidth) {
          // Width changed => rotation/window resize, not a keyboard. Re-baseline.
          baselineWidth = vv.width;
          baselineHeight = vv.height;
          setOpen(false);
          return;
        }
        // The viewport can grow back taller than our recorded baseline (e.g.
        // browser chrome hiding on scroll) — keep raising the baseline so
        // that never gets misread as a keyboard closing further.
        if (vv.height > baselineHeight) baselineHeight = vv.height;

        const occluded = baselineHeight - vv.height;
        // Below ~120px it is browser chrome moving, not a keyboard.
        setOpen(occluded > 120, occluded > 120 ? occluded : 0);
      };
      vv.addEventListener('resize', onResize);
      vv.addEventListener('scroll', onResize);
      onResize();
      return () => {
        vv.removeEventListener('resize', onResize);
        vv.removeEventListener('scroll', onResize);
        setOpen(false);
      };
    }

    const isField = (el: EventTarget | null) =>
      el instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);

    const onFocusIn = (e: FocusEvent) => { if (isField(e.target)) setOpen(true, 280); };
    const onFocusOut = () => setOpen(false);

    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    return () => {
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
      setOpen(false);
    };
  }, []);
}

/**
 * Keeps the focused field visible above the keyboard. Android does this on its
 * own for simple pages, but not reliably inside a scroll container that is
 * itself inside a fixed-position modal — which is every form in this app.
 */
export function useScrollFocusedIntoView(): void {
  useEffect(() => {
    const onFocusIn = (e: FocusEvent) => {
      const el = e.target;
      if (!(el instanceof HTMLElement)) return;
      if (!/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      // Wait for the keyboard animation before measuring.
      setTimeout(() => el.scrollIntoView({ block: 'center', behavior: 'smooth' }), 300);
    };
    document.addEventListener('focusin', onFocusIn);
    return () => document.removeEventListener('focusin', onFocusIn);
  }, []);
}
