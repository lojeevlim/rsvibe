"use client";

import { useEffect, useRef } from "react";

const W = 1052; // the width a "Scale with the screen" section is laid out at (see .fit-inner in globals.css)

/** Safari's zoom is not the same as Chrome's: inside a zoomed box it checks container queries against the zoomed width,
 *  so a scaled section switched to its phone layout. Checked once, by measuring a hidden test box. */
let zoomBreaksQueries: boolean | undefined;
function checkZoom(): boolean {
  if (zoomBreaksQueries !== undefined) return zoomBreaksQueries;
  const style = document.createElement("style");
  style.textContent = `@container fitprobe (width > 1000px) { .fitprobe-in { order: 7; } }`;
  const box = document.createElement("div");
  box.style.cssText = `position:absolute;left:-99999px;top:0;visibility:hidden;width:${W}px;zoom:0.25;container:fitprobe/inline-size`;
  const inner = document.createElement("div");
  inner.className = "fitprobe-in";
  box.append(inner);
  document.head.append(style);
  document.body.append(box);
  zoomBreaksQueries = getComputedStyle(inner).order !== "7";
  box.remove();
  style.remove();
  return zoomBreaksQueries;
}

/** Scales its parent `.fit-inner` to the section's width with a script.
 *  globals.css does it in CSS with zoom: tan(atan2(100cqw, 1052px)), which Safari (iOS / macOS) gets wrong twice:
 *  it works the number out as about 12.6 instead of 0.37 on a phone, and inside a zoomed box it shows the phone layout.
 *  So: Chrome & co. get the right zoom; Safari gets transform: scale() (it keeps the 1052px layout) with the section's height set to match. */
export default function FitZoom() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const fit = ref.current?.parentElement;
    const host = fit?.parentElement;
    if (!fit || !host) return;
    const scaleMode = checkZoom();
    const apply = () => {
      const w = host.clientWidth - parseFloat(getComputedStyle(host).paddingLeft) - parseFloat(getComputedStyle(host).paddingRight); // what 100cqw measures
      if (w <= 0) return;
      const r = w / W;
      if (!scaleMode) {
        fit.style.zoom = String(r);
        return;
      }
      fit.style.zoom = "1";
      fit.style.transformOrigin = "0 0";
      fit.style.transform = `scale(${r})`;
      host.style.overflow = "clip"; // the unscaled box (1052px wide, taller than it shows) must not make the page wider or longer
      const h = `${fit.offsetHeight * r}px`;
      if (host.style.height !== h) host.style.height = h;
    };
    const ro = new ResizeObserver(apply);
    ro.observe(host);
    ro.observe(fit);
    apply();
    return () => {
      ro.disconnect();
      fit.style.zoom = fit.style.transform = fit.style.transformOrigin = "";
      host.style.height = host.style.overflow = "";
    };
  }, []);
  return <i ref={ref} hidden />;
}
