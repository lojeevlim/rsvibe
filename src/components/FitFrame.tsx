"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

type Inset = { t: number; l: number; r: number; b: number };
const alphaCache = new Map<string, Promise<Inset | null>>();
const alphaDone = new Map<string, Inset | null>();
/** the visible-pixel bounds of a picture if they are known already (else starts finding them, and `then` runs when they are) */
export function alphaBoundsNow(src: string, then?: () => void): Inset | null | undefined {
  if (alphaDone.has(src)) return alphaDone.get(src);
  void alphaBounds(src).then((b) => {
    alphaDone.set(src, b);
    then?.();
  });
  return undefined;
}

/** Where a picture is really drawn: the bounds of its non-see-through pixels, as fractions of the picture (0 … 1 from each edge).
 *  So a cut-out (background removed) gets a frame around the subject, not its empty corners. */
export function alphaBounds(src: string): Promise<Inset | null> {
  if (!alphaCache.has(src)) {
    alphaCache.set(
      src,
      new Promise((res) => {
        const im = new Image();
        im.crossOrigin = "anonymous";
        im.onload = () => {
          try {
            const k = Math.min(1, 200 / Math.max(im.naturalWidth, im.naturalHeight));
            const w = Math.max(1, Math.round(im.naturalWidth * k)), h = Math.max(1, Math.round(im.naturalHeight * k));
            const c = document.createElement("canvas");
            c.width = w;
            c.height = h;
            const ctx = c.getContext("2d", { willReadFrequently: true })!;
            ctx.drawImage(im, 0, 0, w, h);
            const px = ctx.getImageData(0, 0, w, h).data;
            let x0 = w, y0 = h, x1 = -1, y1 = -1;
            for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (px[(y * w + x) * 4 + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
            res(x1 < 0 ? null : { l: x0 / w, t: y0 / h, r: 1 - (x1 + 1) / w, b: 1 - (y1 + 1) / h });
          } catch {
            res(null); // a picture from elsewhere that can't be read: frame its whole box
          }
        };
        im.onerror = () => res(null);
        im.src = src;
      }),
    );
  }
  return alphaCache.get(src)!;
}

/** The editor's dashed frame (with its handles) around a sticker / illustration, fitted to what it really shows:
 *  a drawing's own outline, a picture's visible part, or the text. It sits inside the sticker's turned and stretched box,
 *  so it (and the handles) follow the angle and size. */
export default function FitFrame({ children }: { children?: ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [inset, setInset] = useState<Inset | null>(null); // px from each edge of the sticker's box
  useLayoutEffect(() => {
    const frame = ref.current;
    const content = frame?.nextElementSibling as HTMLElement | null;
    if (!frame || !content) return;
    let live = true;
    const measure = async () => {
      const W = content.offsetWidth, H = content.offsetHeight;
      if (!W || !H) return;
      const svg = content.querySelector("svg");
      const img = content.querySelector("img");
      let next: Inset = { t: 0, l: 0, r: 0, b: 0 };
      if (svg) {
        try {
          const vb = svg.viewBox.baseVal;
          const bb = svg.getBBox();
          if (vb && vb.width && bb.width) {
            const sx = W / vb.width, sy = H / vb.height;
            next = { l: (bb.x - vb.x) * sx, t: (bb.y - vb.y) * sy, r: (vb.x + vb.width - bb.x - bb.width) * sx, b: (vb.y + vb.height - bb.y - bb.height) * sy };
          }
        } catch {
          /* not drawn yet */
        }
      } else if (img && img.naturalWidth) {
        // where the picture sits in its box (letterboxed when kept whole), then its visible pixels inside that
        const fit = getComputedStyle(img).objectFit;
        const iw = img.offsetWidth, ih = img.offsetHeight, ar = img.naturalWidth / img.naturalHeight;
        let pw = iw, ph = ih;
        if (fit === "contain") {
          if (iw / ih > ar) pw = ih * ar;
          else ph = iw / ar;
        }
        const ox = img.offsetLeft + (iw - pw) / 2, oy = img.offsetTop + (ih - ph) / 2;
        const a = fit === "cover" ? null : await alphaBounds(img.currentSrc || img.src);
        const f = a ?? { l: 0, t: 0, r: 0, b: 0 };
        next = { l: ox + f.l * pw, t: oy + f.t * ph, r: W - (ox + pw) + f.r * pw, b: H - (oy + ph) + f.b * ph };
      }
      if (!live) return;
      // mirrored (flipped left ↔ right): the drawing's empty margins swap sides too, so the frame and its handles stay on it
      const m = new DOMMatrix(getComputedStyle(content).transform === "none" ? undefined : getComputedStyle(content).transform);
      if (m.a < 0) next = { ...next, l: next.r, r: next.l };
      const r = (n: number) => Math.round(Math.max(0, n) * 10) / 10;
      setInset((p) => (p && r(p.t) === r(next.t) && r(p.l) === r(next.l) && r(p.r) === r(next.r) && r(p.b) === r(next.b) ? p : { t: r(next.t), l: r(next.l), r: r(next.r), b: r(next.b) }));
    };
    void measure();
    const ro = new ResizeObserver(() => void measure());
    ro.observe(content);
    const mo = new MutationObserver(() => void measure()); // mirrored / un-mirrored, or a new picture
    mo.observe(content, { attributes: true, attributeFilter: ["style"], subtree: true, childList: true });
    const img = content.querySelector("img");
    img?.addEventListener("load", () => void measure());
    return () => {
      live = false;
      ro.disconnect();
      mo.disconnect();
    };
  }, []);
  return (
    <span
      ref={ref}
      data-fit-frame
      // z-[1]: above the picture even when it is mirrored (a flipped picture is drawn on its own layer, which would cover the handles)
      className="pointer-events-none absolute z-[1] border-2 border-dashed border-brand"
      style={inset ? { top: inset.t, left: inset.l, right: inset.r, bottom: inset.b } : { inset: 0 }}
    >
      {children}
    </span>
  );
}
