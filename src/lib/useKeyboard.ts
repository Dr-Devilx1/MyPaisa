import { useEffect } from 'react';

/**
 * Tracks the on-screen keyboard and exposes its height as the `--kb` CSS
 * variable, plus a `.mp-kb-open` class on <html>.
 *
 * THE BUG THIS FIXES
 * The bottom navigation is `position: fixed`. On Android the WebView resizes
 * when the keyboard opens, so the bar was re-pinned to the new (shorter)
 * viewport bottom — which put it directly on top of the keyboard, covering the
 * very field being typed into. VisualViewport reports the real occluded height,
 * so the bar can be hidden for the duration and modals can shrink to fit.
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
      const onResize = () => {
        // How much of the layout viewport the keyboard is covering.
        const occluded = window.innerHeight - vv.height - vv.offsetTop;
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
