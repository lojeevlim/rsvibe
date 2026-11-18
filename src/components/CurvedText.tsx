"use client";

import { useId, useLayoutEffect, useRef, useState, type CSSProperties } from "react";

/** A line of text bent along an arc. `curve` runs from -100 (a smile) through 0 (straight) to 100 (a rainbow).
 *  It keeps the element's own font, size, weight, case and colour: the text is measured as it would be written straight, then laid on a curve of that width. */
export default function CurvedText({ text, curve, as: Tag = "p", className = "", style }: { text: string; curve: number; as?: "p" | "h1" | "h2"; className?: string; style?: CSSProperties }) {
  const id = `ct${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const probe = useRef<HTMLSpanElement>(null);
  const [m, setM] = useState<{ w: number; fs: number } | null>(null);
  const line = text.replace(/\s*\n\s*/g, " ").trim();

  useLayoutEffect(() => {
    const el = probe.current;
    if (!el) return;
    const read = () => setM({ w: el.offsetWidth, fs: parseFloat(getComputedStyle(el).fontSize) || 16 });
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    void document.fonts?.ready.then(read); // web fonts change the width once they load
    return () => ro.disconnect();
  }, [line]);

  const geo = m && (() => {
    const { w, fs } = m;
    const sag = (Math.max(-100, Math.min(100, curve)) / 100) * w * 0.35; // how far the middle rises (+) or dips (-)
    const up = sag > 0;
    const a = Math.abs(sag);
    const base = up ? a + fs : fs; // where the ends of the line sit
    const ctrl = up ? base - 2 * a : base + 2 * a;
    const pad = fs * 0.6;
    return { d: `M0 ${base.toFixed(1)} Q${(w / 2).toFixed(1)} ${ctrl.toFixed(1)} ${w.toFixed(1)} ${base.toFixed(1)}`, vw: w + pad * 2, vh: a + fs * 1.35, pad };
  })();

  return (
    <Tag className={`relative ${className}`} style={style} aria-label={line}>
      {/* the text written straight, unseen: it gives the width and font size the curve is built from */}
      <span ref={probe} aria-hidden className="pointer-events-none invisible absolute left-0 top-0 whitespace-nowrap">{line}</span>
      {geo ? (
        <svg aria-hidden width={geo.vw} viewBox={`${-geo.pad} 0 ${geo.vw} ${geo.vh}`} className="mx-auto block h-auto max-w-full overflow-visible">
          <path id={id} d={geo.d} fill="none" />
          <text fill="currentColor" textAnchor="middle">
            <textPath href={`#${id}`} startOffset="50%">{line}</textPath>
          </text>
        </svg>
      ) : (
        <span className="invisible">{line}</span>
      )}
    </Tag>
  );
}
