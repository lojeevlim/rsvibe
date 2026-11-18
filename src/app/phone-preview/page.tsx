"use client";

import { useEffect, useState } from "react";
import PageView from "@/components/PageView";
import { ThemeProvider } from "@/components/ui";
import type { Settings } from "@/lib/settings-shared";

/** The editor's phone view runs this page inside a phone-sized frame, so the page lays itself out exactly as on a phone
 *  (its phone styles follow the width of the window it is in). It shows the design the editor sends it, unsaved changes included,
 *  and only accepts it from a window on this same site. Nothing here reads or saves data. */
export default function PhonePreview() {
  const [s, setS] = useState<Settings | null>(null);
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== window.parent) return;
      if (e.data?.type === "rsvibe-phone" && e.data.s) setS(e.data.s as Settings);
    };
    window.addEventListener("message", onMsg);
    window.parent?.postMessage({ type: "rsvibe-phone-ready" }, window.location.origin);
    return () => window.removeEventListener("message", onMsg);
  }, []);
  if (!s) return <p className="p-6 text-center text-sm text-soft">Loading…</p>;
  return (
    <ThemeProvider isolated mode={s.theme.mode} accent={s.theme.accent} design={s.theme.design}>
      <div
        data-font={s.theme.font}
        className="page-bg min-h-screen text-fg"
        onSubmitCapture={(e) => {
          e.preventDefault(); // a preview: the RSVP form sends nothing
          e.stopPropagation();
        }}
      >
        <PageView s={s} />
      </div>
    </ThemeProvider>
  );
}
