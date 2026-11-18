"use client";

import { useEffect, useRef } from "react";

/** Marks its parent with `data-in` the first time the parent comes into view, which lets the stickers' entrances (see globals.css) start playing. */
export default function EnterWatch() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const host = ref.current?.parentElement;
    if (!host) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        host.setAttribute("data-in", "");
        io.disconnect();
      },
      { threshold: 0.15 },
    );
    io.observe(host);
    return () => io.disconnect();
  }, []);
  return <i ref={ref} hidden />;
}
