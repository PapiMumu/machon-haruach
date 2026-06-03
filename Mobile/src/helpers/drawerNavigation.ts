/** Walk up the navigation tree to the drawer navigator (used for header option overrides). */
export function findDrawerNavigation(nav: { getParent?: () => unknown } | undefined): {
  setOptions?: (options: Record<string, unknown>) => void;
} | null {
  let cur = nav?.getParent?.() as { getParent?: () => unknown; getState?: () => { type?: string } } | undefined;
  while (cur) {
    const st = cur.getState?.();
    if (st?.type === "drawer") return cur as { setOptions?: (options: Record<string, unknown>) => void };
    cur = cur.getParent?.() as typeof cur;
  }
  return null;
}
