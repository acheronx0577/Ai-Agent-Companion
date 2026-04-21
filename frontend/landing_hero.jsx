import React from "react";
import { createRoot } from "react-dom/client";
import DotField from "./components/DotField.jsx";
import LiquidChrome from "./components/LiquidChrome.jsx";

let boundsObserver = null;

function syncHeroAtmosphereBounds() {
  const hero = document.querySelector(".landing-hero");
  const dotHost = document.getElementById("landing-hero-dotfield");
  const chromeHost = document.getElementById("landing-hero-liquid-chrome");
  if (!hero) {
    return;
  }

  const heroHeight = hero.offsetHeight;
  const heightPx = `${heroHeight}px`;

  if (dotHost) {
    dotHost.style.height = heightPx;
  }

  if (chromeHost) {
    chromeHost.style.top = "0";
    chromeHost.style.height = dotHost
      ? `${dotHost.offsetHeight}px`
      : heightPx;
  }

  window.dispatchEvent(new CustomEvent("waku-hero-atmosphere-resize"));
}

function mountHeroAtmosphere() {
  const dotHost = document.getElementById("landing-hero-dotfield");
  const chromeHost = document.getElementById("landing-hero-liquid-chrome");
  if (!dotHost || !chromeHost || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  syncHeroAtmosphereBounds();

  const hero = document.querySelector(".landing-hero");
  if (hero) {
    boundsObserver = new ResizeObserver(() => {
      syncHeroAtmosphereBounds();
    });
    boundsObserver.observe(hero);
    window.addEventListener("resize", syncHeroAtmosphereBounds);
  }

  createRoot(chromeHost).render(
    <LiquidChrome
      baseColor={[45 / 255, 87 / 255, 87 / 255]}
      speed={0.18}
      amplitude={0.58}
      frequencyX={2.2}
      frequencyY={1.4}
      interactive={false}
    />
  );

  createRoot(dotHost).render(
    <DotField
      dotRadius={2}
      dotSpacing={14}
      bulgeStrength={60}
      glowRadius={220}
      sparkle={false}
      waveAmplitude={0}
      gradientFrom="rgba(195, 238, 228, 0.78)"
      gradientTo="rgba(130, 205, 188, 0.52)"
      glowColor="rgba(120, 210, 190, 0.65)"
    />
  );

  requestAnimationFrame(() => {
    syncHeroAtmosphereBounds();
    requestAnimationFrame(syncHeroAtmosphereBounds);
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mountHeroAtmosphere);
} else {
  mountHeroAtmosphere();
}
