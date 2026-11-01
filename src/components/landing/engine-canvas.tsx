"use client";

import { getImageProps } from "next/image";
import { useEffect, useRef } from "react";
import type { ClockSource } from "./engine-clock";
import { drawScene, sceneSize, type Variant } from "./engine-scene";
import { text } from "./engine-timeline";

/** Rendered once by `npm run landing:rest-frames` from this same scene. They show the board before it paints, and without JavaScript. */
const restingImages = { wide: "/landing/engine-rest-wide.png", tall: "/landing/engine-rest-tall.png" } as const;

/** Largest number of canvas pixels per scene unit, so a large screen at a high pixel ratio does not allocate a huge bitmap. */
const maxPixelRatio = 3;

/** The still frame, as a <picture> so a phone gets the tall one before any script runs. Same sources pattern as the captures in sections.tsx. */
function RestingImage() {
  const props = (variant: Variant) => {
    const [width, height] = sceneSize[variant];
    return getImageProps({ src: restingImages[variant], alt: "", width: width * 2, height: height * 2, sizes: `${width}px` }).props;
  };
  const wide = props("wide");
  const tall = props("tall");
  return (
    <picture>
      <source media="(max-width: 900px)" srcSet={tall.srcSet} sizes={tall.sizes} />
      <img {...wide} alt="" aria-hidden="true" className="rest" />
    </picture>
  );
}

/** The engine scene on a canvas. The clock lives in engine.tsx. This component paints it when asked, and again when its size changes. */
export function EngineCanvas({ source, variant }: { source: ClockSource; variant: Variant }) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = canvas.current;
    const g = el?.getContext("2d");
    if (!el || !g) return undefined;
    const [width, height] = sceneSize[variant];
    const style = getComputedStyle(el);
    const fonts = { sans: style.fontFamily, mono: style.getPropertyValue("--mono").trim() || "ui-monospace, monospace" };

    const paint = () => {
      const ratio = Math.min(maxPixelRatio, (window.devicePixelRatio || 1) * Math.max(1, (el.clientWidth || width) / width));
      const pixelsWide = Math.round(width * ratio);
      if (el.width !== pixelsWide) { el.width = pixelsWide; el.height = Math.round(height * ratio); }
      g.setTransform(ratio, 0, 0, ratio, 0, 0);
      drawScene(g, source.read(), variant, fonts);
    };

    const detach = source.attach(paint);
    paint();
    const observer = new ResizeObserver(paint);
    observer.observe(el);
    let live = true;
    const repaint = () => { if (live) paint(); };
    void Promise.all([document.fonts.load(`500 12px ${fonts.mono}`), document.fonts.load(`600 14px ${fonts.sans}`)]).then(repaint, repaint);
    return () => { live = false; observer.disconnect(); detach(); };
  }, [source, variant]);

  return (
    <div className="scene">
      <RestingImage />
      <canvas ref={canvas} role="img" aria-label={text.board} />
    </div>
  );
}
