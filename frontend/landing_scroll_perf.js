const SCROLL_END_MS = 120;

let scrollEndTimer = null;

export function isLandingScrollActive() {
  return Boolean(window.__wakuScrollActive);
}

export function notifyLandingScroll() {
  if (!window.__wakuScrollActive) {
    window.__wakuScrollActive = true;
    window.dispatchEvent(new CustomEvent("waku-scroll-active", { detail: { active: true } }));
  }

  clearTimeout(scrollEndTimer);
  scrollEndTimer = setTimeout(() => {
    window.__wakuScrollActive = false;
    window.dispatchEvent(new CustomEvent("waku-scroll-active", { detail: { active: false } }));
  }, SCROLL_END_MS);
}

export function bindLandingScrollPerf(lenis) {
  const onScroll = () => notifyLandingScroll();

  if (lenis) {
    lenis.on("scroll", onScroll);
    return;
  }

  window.addEventListener("scroll", onScroll, { passive: true });
}
