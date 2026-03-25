/** Must match `id` on the scroll wrapper in `app/layout.tsx`. */
export const APP_SCROLL_ROOT_ID = "app-scroll-root";

export function getAppScrollRoot(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return document.getElementById(APP_SCROLL_ROOT_ID);
}

/**
 * Locks main app scrolling (modal / drawer open). Prefers `#app-scroll-root` when present
 * so iOS scrolls the inner shell, not a “ghost” document behind it.
 */
export function pushAppScrollLock(): () => void {
  const root = getAppScrollRoot();
  if (root) {
    const prev = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = prev;
    };
  }
  const prev = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  return () => {
    document.body.style.overflow = prev;
  };
}
