import React from "react";
import { createRoot } from "react-dom/client";
import DotField from "./components/DotField.jsx";

let boundsObserver = null;

function syncDotFieldBounds() {
  const hero = document.querySelector(".landing-hero");
  const host = document.getElementById("landing-hero-dotfield");
  if (!hero || !host) {
    return;
  }

  host.style.height = `${hero.offsetHeight}px`;
}

function mountHeroDotField() {
  const host = document.getElementById("landing-hero-dotfield");
  if (!host || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  syncDotFieldBounds();

  const hero = document.querySelector(".landing-hero");
  if (hero) {
    boundsObserver = new ResizeObserver(syncDotFieldBounds);
    boundsObserver.observe(hero);
    window.addEventListener("resize", syncDotFieldBounds);
  }

  createRoot(host).render(
    <DotField
      dotRadius={2}
      dotSpacing={12}
      bulgeStrength={60}
      glowRadius={200}
      sparkle={false}
      waveAmplitude={0}
      gradientFrom="rgba(150, 225, 210, 0.55)"
      gradientTo="rgba(70, 140, 130, 0.22)"
      glowColor="#06110d"
    />
  );
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mountHeroDotField);
} else {
  mountHeroDotField();
}
