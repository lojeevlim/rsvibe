"use client";

import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cardBackground, type Settings } from "@/lib/settings-shared";
import { hexMix } from "@/lib/color";
import { asSealId, SealEmblem, WaxSeal } from "@/components/Seal";
import CurvedText from "@/components/CurvedText";

const EASE = [0.22, 1, 0.36, 1] as const;
/** the card sits in its own `data-font` wrapper, so these resolve to its font style's pair, exactly as on the page:
 *  the big "from" line in the heading font, everything else in the body font */
const DISPLAY = "var(--font-display), system-ui, sans-serif";
const BODY = "var(--font-sans), system-ui, sans-serif";
/** paper grain: fine grey noise, laid over the envelope and the letter so they read as paper, not flat colour */
const GRAIN = `data:image/svg+xml,${encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>")}`;

/** Envelope outlines: corner radius (px, of 300 wide), the front pocket and the flap (both drawn in a 300-wide box). */
const SHAPES: Record<Intro["shape"], { radius: number; pocket: string; flap: string; flapH: number }> = {
  classic: { radius: 22, pocket: "M0 22Q0 0 22 0L132 104Q150 118 168 104L278 0Q300 0 300 22V178Q300 200 278 200H22Q0 200 0 178Z", flap: "M0 22Q0 0 22 0H278Q300 0 300 22L168 108Q150 122 132 108Z", flapH: 116 },
  sharp: { radius: 3, pocket: "M0 0L150 112L300 0V200H0Z", flap: "M0 0H300L150 116Z", flapH: 116 },
  soft: { radius: 46, pocket: "M0 46Q0 0 46 0L130 100Q150 124 170 100L254 0Q300 0 300 46V154Q300 200 254 200H46Q0 200 0 154Z", flap: "M0 46Q0 0 46 0H254Q300 0 300 46L170 106Q150 130 130 106Z", flapH: 120 },
  arch: { radius: 22, pocket: "M0 22Q0 0 22 0Q70 70 150 76Q230 70 278 0Q300 0 300 22V178Q300 200 278 200H22Q0 200 0 178Z", flap: "M0 22Q0 0 22 0H278Q300 0 300 22Q290 90 150 126Q10 90 0 22Z", flapH: 128 },
};
// small sparkles that fly out when the seal breaks: [dx, dy, size, delay]
// little crumbs of wax that chip off when the seal cracks: [dx, how high they hop, size, delay]
const CRUMBS: [number, number, number, number][] = [[-34, 14, 5, 0], [28, 18, 4, 0.03], [-18, 10, 3, 0.06], [40, 8, 3, 0.02], [-46, 6, 4, 0.05], [14, 20, 3, 0.08], [-6, 12, 2.5, 0.04], [52, 12, 2.5, 0.07]];
// the crack through the seal: the two halves' outlines
const CRACK_L = "polygon(0 0, 53% 0, 45% 28%, 56% 47%, 44% 70%, 52% 100%, 0 100%)";
const CRACK_R = "polygon(53% 0, 100% 0, 100% 100%, 52% 100%, 44% 70%, 56% 47%, 45% 28%)";

type Intro = Settings["page"]["intro"];

/** the pieces of the card that each have their own settings in the editor */
export type CardPart = "envelope" | "seal" | "title" | "sender" | "hint" | "letter";

/** printed patterns for the letter paper (drawn over its colour) */
const svgTile = (glyph: string) => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='22' height='22'><text x='11' y='15' font-size='10' text-anchor='middle' fill='rgba(0,0,0,0.13)'>${glyph}</text></svg>`)}")`;
const PATTERNS: Record<Intro["letterPattern"], { image: string; size?: string }> = {
  plain: { image: "" },
  lined: { image: "repeating-linear-gradient(180deg, transparent 0 13px, rgba(0,0,0,0.09) 13px 14px)" },
  dots: { image: "radial-gradient(rgba(0,0,0,0.13) 1px, transparent 1.4px)", size: "10px 10px" },
  grid: { image: "linear-gradient(rgba(0,0,0,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.07) 1px, transparent 1px)", size: "12px 12px" },
  stripes: { image: "repeating-linear-gradient(135deg, rgba(0,0,0,0.05) 0 6px, transparent 6px 12px)" },
  hearts: { image: svgTile("♥"), size: "22px 22px" },
  stars: { image: svgTile("★"), size: "22px 22px" },
};
const LETTER_SIZE: Record<Intro["letterSize"], string> = { sm: "text-sm", md: "text-lg", lg: "text-2xl", xl: "text-3xl" };
/** the frame drawn just inside the letter's edge */
const FRAMES: Record<Intro["letterBorder"], string> = {
  single: "border border-black/10",
  double: "border-4 border-double border-black/15",
  dashed: "border border-dashed border-black/25",
  gold: "border-2 border-[#c9a24a] shadow-[inset_0_0_0_3px_rgba(201,162,74,0.25)]",
  none: "hidden",
};

/** A text that is just text on the live page, and an editable field in the editor. */
function Txt({ value, onChange, placeholder, className, style, part, onPick }: { value: string; onChange: (v: string) => void; placeholder: string; className: string; style?: CSSProperties; part: CardPart; onPick?: (part: CardPart) => void }) {
  return <input data-action data-card-part={part} onFocus={() => onPick?.(part)} onClick={() => onPick?.(part)} style={style} value={value} placeholder={placeholder} aria-label={placeholder} maxLength={80} onChange={(e) => onChange(e.target.value)} className={`w-full min-w-0 rounded-md border border-dashed border-transparent bg-transparent text-center outline-none transition-colors placeholder:opacity-40 hover:border-accent-400 focus:border-accent-600 focus:bg-white/60 ${className}`} />;
}

/** Editor: a curved line of the card; clicking it opens its settings (where its words are changed). */
function Curved({ part, onPick, text, curve, style, className }: { part: CardPart; onPick?: (part: CardPart) => void; text: string; curve: number; style?: CSSProperties; className: string }) {
  return (
    <div data-action data-card-part={part} role="button" tabIndex={0} onClick={() => onPick?.(part)} onKeyDown={(e) => e.key === "Enter" && onPick?.(part)} className="w-[min(100%,640px)] cursor-pointer rounded-md border border-dashed border-transparent hover:border-accent-400">
      <CurvedText text={text} curve={curve} style={style} className={className} />
    </div>
  );
}

/** The first screen: a sealed envelope on a soft, light background. Tapping it breaks the wax seal, opens the flap, slides the letter out, and the page appears.
 *  Its shape, paper, seal, background, writing and font all come from the page settings.
 *  With `edit` it sits inside the editor instead of covering the screen: its texts can be typed over, and tapping the envelope just plays the opening again.
 *  `children` (the card's own elements) go under the hint; `decor` (its stickers) floats over the whole screen. */
export default function EnvelopeIntro({ intro, top = 0, edit, children, decor, surface, effect }: { intro: Intro; /** the card's effect: shown only while the envelope opens */ effect?: ReactNode; /** what fills the card on the live page (else its Background setting) */ surface?: { className: string; style: CSSProperties }; top?: number; edit?: { onChange: (p: Partial<Intro>) => void; autoplay: boolean; /** in the editor a tap on a piece of the card opens its settings (the opening is played from a button) */ onPick?: (part: CardPart) => void; /** hold the letter out of the envelope (while its paper is being designed) */ peek?: boolean }; children?: ReactNode; decor?: ReactNode }) {
  const [phase, setPhase] = useState<"closed" | "opening" | "closing" | "gone">(edit?.autoplay ? "opening" : "closed");
  const [flapBehind, setFlapBehind] = useState(false);
  const reduce = useReducedMotion();
  const box = useRef<HTMLDivElement>(null);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, ""); // gradient / pattern ids, unique per card

  // while it is up, nothing behind it scrolls
  useEffect(() => {
    const el = box.current;
    if (!el || phase === "gone" || edit) return;
    // the page behind must not scroll; the card itself may, when its elements make it taller than the screen
    const stop = (e: Event) => {
      if (el.scrollHeight <= el.clientHeight) e.preventDefault();
    };
    el.addEventListener("wheel", stop, { passive: false });
    el.addEventListener("touchmove", stop, { passive: false });
    return () => {
      el.removeEventListener("wheel", stop);
      el.removeEventListener("touchmove", stop);
    };
  }, [phase, edit]);

  useEffect(() => {
    if (phase === "opening") {
      // the flap passes edge-on at about half its turn: that is when it can slip behind the letter unseen
      const half = window.setTimeout(() => setFlapBehind(true), 760);
      // on the live page the envelope goes away; in the editor it plays backwards so it can be played again
      const done = window.setTimeout(() => setPhase(edit ? "closing" : "gone"), 2350);
      return () => {
        window.clearTimeout(half);
        window.clearTimeout(done);
      };
    }
    if (phase === "closing") {
      // the letter slides back in, then the flap folds down (in front again once edge-on), then the seal presses back on
      const half = window.setTimeout(() => setFlapBehind(false), 400);
      const done = window.setTimeout(() => setPhase("closed"), 1150);
      return () => {
        window.clearTimeout(half);
        window.clearTimeout(done);
      };
    }
  }, [phase, edit]);

  const seal = asSealId(intro.seal);
  const letter = (intro.sender.replace(/\{name\}/gi, "").trim()[0] ?? "A").toUpperCase();
  const shape = SHAPES[intro.shape];
  const open = () => {
    if (phase !== "closed") return; // ignore taps while it is moving
    if (reduce) return edit ? undefined : setPhase("gone");
    setPhase("opening");
  };
  const opening = phase === "opening";
  // designing the letter: the flap stays up and the letter out, so changes show as they are made
  const peek = !!edit?.peek && phase === "closed";
  const out = opening || peek;
  const closing = phase === "closing";

  // paper: the envelope's colour and the shades made from it
  const paper = intro.paper || "#fbf7ef";
  const front = [hexMix(paper, 45, "#ffffff"), hexMix(paper, 90, "#000000")];
  const flap = [hexMix(paper, 55, "#ffffff"), hexMix(paper, 84, "#000000")];
  const lining = hexMix(paper, 80, "#000000");
  const sheet = intro.letterPaper ? [intro.letterPaper, hexMix(intro.letterPaper, 94, "#000000")] : [hexMix(paper, 30, "#ffffff"), hexMix(paper, 92, "#ffffff")];
  const pattern = PATTERNS[intro.letterPattern] ?? PATTERNS.plain;
  const fontFamily = BODY;
  const ink: CSSProperties = intro.textColor ? { color: intro.textColor } : {};
  // where the side folds meet: just under the flap's tip
  const foldY = Math.round(shape.flapH * 0.98);
  const radiusPx = `${Math.round((shape.radius / 300) * 440)}px`;

  return (
    <AnimatePresence>
      {phase !== "gone" && (
        <motion.div
          ref={box}
          key="intro"
          data-font={intro.font}
          role="dialog"
          aria-label="Open your invitation"
          className={edit ? "relative w-full overflow-hidden rounded-2xl" : `fixed inset-x-0 bottom-0 z-[90] flex flex-col items-center overflow-y-auto overflow-x-hidden overscroll-contain ${surface?.className ?? ""}`}
          style={{ top: edit ? undefined : top, justifyContent: "safe center", ...(edit ? {} : surface ? surface.style : { background: cardBackground(intro) }) }}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.08 }}
          transition={{ duration: 0.55, ease: EASE }}
        >
          {/* the stage: the same box in the editor and on the live page (at most 712px wide, the editor's card width, at least 680px tall),
              so stickers placed in % of it, and sizes that follow its width, land where they were put */}
          <div data-card-phase={phase} className={`decor-host relative flex min-h-[680px] w-full max-w-[712px] shrink-0 flex-col items-center gap-7 px-5 py-10 ${edit ? "" : "card-host"}`} style={{ justifyContent: "safe center" }}>
          <motion.div className="relative z-10 grid justify-items-center gap-2 text-center" initial={{ opacity: 0, y: 14 }} animate={opening ? { opacity: 0, y: -22 } : { opacity: 1, y: 0 }} transition={{ duration: opening ? 0.5 : 0.9, delay: opening ? 0 : closing ? 0.6 : 0.15, ease: EASE }}>
            {edit ? (
              <>
                {/* a curved line is shown curved (and changed in its panel); a straight one can be typed over right here */}
                {intro.titleCurve ? (
                  <Curved part="title" onPick={edit.onPick} text={intro.title} curve={intro.titleCurve} style={{ ...ink, fontFamily }} className="text-[11px] font-semibold uppercase tracking-[0.34em] text-fg/60 @min-[40rem]/page:text-xs" />
                ) : (
                  <Txt part="title" onPick={edit.onPick} value={intro.title} onChange={(title) => edit.onChange({ title })} placeholder="Heading" style={{ ...ink, fontFamily }} className="text-[11px] font-semibold uppercase tracking-[0.34em] text-fg/60 @min-[40rem]/page:text-xs" />
                )}
                {intro.senderCurve ? (
                  <Curved part="sender" onPick={edit.onPick} text={intro.sender} curve={intro.senderCurve} style={{ ...ink, fontFamily: DISPLAY }} className="font-display text-4xl leading-tight text-accent-800 @min-[40rem]/page:text-5xl" />
                ) : (
                  <Txt part="sender" onPick={edit.onPick} value={intro.sender} onChange={(sender) => edit.onChange({ sender })} placeholder="From — {name} is the event name" style={{ ...ink, fontFamily: DISPLAY }} className="font-display text-4xl leading-tight text-accent-800 @min-[40rem]/page:text-5xl" />
                )}
              </>
            ) : (
              <>
                {intro.title && (intro.titleCurve ? <CurvedText text={intro.title} curve={intro.titleCurve} style={{ ...ink, fontFamily }} className="w-[min(88vw,640px)] text-[11px] font-semibold uppercase tracking-[0.34em] text-fg/60 @min-[40rem]/page:text-xs" /> : <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-fg/60 @min-[40rem]/page:text-xs" style={{ ...ink, fontFamily }}>{intro.title}</p>)}
                {intro.sender && (intro.senderCurve ? <CurvedText text={intro.sender} curve={intro.senderCurve} style={{ ...ink, fontFamily: DISPLAY }} className="w-[min(88vw,640px)] font-display text-4xl leading-tight text-accent-800 @min-[40rem]/page:text-5xl" /> : <p className="max-w-[88vw] text-balance font-display text-4xl leading-tight text-accent-800 @min-[40rem]/page:text-5xl" style={{ ...ink, fontFamily: DISPLAY }}>{intro.sender}</p>)}
              </>
            )}
            <span aria-hidden className="mt-1 flex items-center gap-2 text-accent-600" style={ink}><span className="h-px w-10 bg-current opacity-50" /><SealEmblem id={seal} letter={letter} size={14} /><span className="h-px w-10 bg-current opacity-50" /></span>
          </motion.div>

          <motion.button
            type="button"
            data-action
            data-card-part="envelope"
            onClick={edit?.onPick ? () => edit.onPick?.("envelope") : open}
            aria-label={edit?.onPick ? "Card settings" : "Open the envelope"}
            className="relative z-10 block w-[min(88vw,440px)] cursor-pointer outline-none focus-visible:ring-4 focus-visible:ring-accent-400/50"
            style={{ aspectRatio: "3 / 2", perspective: 1400 }}
            initial={{ opacity: 0, y: 60, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 1, delay: 0.25, ease: EASE }}
            whileHover={phase === "closed" ? { y: -4 } : undefined}
          >
            <motion.span className="absolute inset-0 block will-change-transform" animate={opening ? { y: [0, 3, 3, 34], scale: [1, 0.985, 0.985, 0.95] } : closing ? { y: 0, scale: 1 } : { y: [0, -6, 0], scale: 1 }} transition={opening ? { duration: 2.1, ease: EASE, times: [0, 0.07, 0.5, 1] } : closing ? { duration: 0.45, ease: EASE } : { duration: 4, repeat: Infinity, ease: "easeInOut" }}>
              {/* resting on a surface: a soft contact shadow under it, and a wider, fainter one */}
              <span aria-hidden className="absolute inset-x-[6%] -bottom-[7%] block h-[16%] rounded-[50%] bg-black/30 blur-xl" />
              <span aria-hidden className="absolute inset-0 block shadow-[0_18px_30px_-14px_rgba(0,0,0,0.35),0_40px_70px_-30px_rgba(0,0,0,0.35)]" style={{ borderRadius: radiusPx }} />
              {/* inside of the envelope, with a lining */}
              <span className="absolute inset-0 block ring-1 ring-black/10" style={{ borderRadius: radiusPx, backgroundColor: lining, backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.18), transparent 45%), url("${GRAIN}"), repeating-linear-gradient(135deg, rgba(0,0,0,0.05) 0 8px, transparent 8px 16px)`, backgroundSize: "auto, 160px, auto", backgroundBlendMode: "normal, multiply, normal" }} />
              {/* the letter */}
              <motion.span
                className="absolute inset-x-[5%] bottom-[5%] top-[7%] z-[1] flex flex-col items-center justify-center p-4 text-center shadow-lg ring-1 ring-black/10"
                data-card-part="letter"
                onClick={
                  edit?.onPick
                    ? (e) => {
                        e.stopPropagation(); // the letter's own settings, not the envelope's
                        edit.onPick?.("letter");
                      }
                    : undefined
                }
                style={{
                  borderRadius: Math.max(4, shape.radius * 0.6),
                  backgroundImage: [pattern.image, `linear-gradient(180deg, ${sheet[0]}, ${sheet[1]})`].filter(Boolean).join(", "),
                  backgroundSize: pattern.size ? `${pattern.size}, 100% 100%` : undefined,
                }}
                animate={opening ? { y: ["0%", "-58%", "-64%"], scale: [1, 1.02, 1.05], rotate: [0, 0, -1.5] } : peek ? { y: "-64%", scale: 1.04, rotate: 0 } : { y: 0, scale: 1, rotate: 0 }}
                transition={opening ? { duration: 1.15, delay: 1.0, ease: [0.25, 0.1, 0.25, 1], times: [0, 0.7, 1] } : peek ? { duration: 0.6, delay: 0.35, ease: EASE } : { duration: 0.45, ease: EASE }}
              >
                {/* paper: grain, and a faint shade toward the edges */}
                <span aria-hidden className="pointer-events-none absolute inset-0 block opacity-[0.16] mix-blend-multiply" style={{ borderRadius: "inherit", backgroundImage: `url("${GRAIN}")`, backgroundSize: "160px" }} />
                <span aria-hidden className="pointer-events-none absolute inset-0 block shadow-[inset_0_0_18px_rgba(0,0,0,0.07)]" style={{ borderRadius: "inherit" }} />
                <span className={`absolute inset-2 block ${FRAMES[intro.letterBorder] ?? FRAMES.single}`} style={{ borderRadius: Math.max(2, shape.radius * 0.45) }} />
                {intro.letter ? (
                  <span className={`relative text-balance px-2 font-semibold leading-snug text-accent-800 ${LETTER_SIZE[intro.letterSize] ?? LETTER_SIZE.md}`} style={{ ...ink, fontFamily }}>{intro.letter}</span>
                ) : (
                  <>
                    <span className="relative block h-1.5 w-1/3 rounded-full bg-accent-300" />
                    <span className="relative mt-3 block h-1 w-1/2 rounded-full bg-black/10" />
                    <span className="relative mt-2 block h-1 w-2/5 rounded-full bg-black/10" />
                  </>
                )}
              </motion.span>
              {/* front pocket */}
              <svg aria-hidden className="absolute inset-0 z-[2] h-full w-full drop-shadow-[0_-2px_3px_rgba(0,0,0,0.12)]" viewBox="0 0 300 200" preserveAspectRatio="none">
                <defs>
                  <linearGradient id={`${uid}p`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={front[0]} /><stop offset="1" stopColor={front[1]} /></linearGradient>
                  <clipPath id={`${uid}pc`}><path d={shape.pocket} /></clipPath>
                  <pattern id={`${uid}g`} width="160" height="160" patternUnits="userSpaceOnUse"><image href={GRAIN} width="160" height="160" /></pattern>
                  {/* light from the upper left: a sheen across the paper */}
                  <linearGradient id={`${uid}s`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff" stopOpacity="0.35" /><stop offset="0.45" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity="0.08" /></linearGradient>
                </defs>
                <path d={shape.pocket} fill={`url(#${uid}p)`} />
                <g clipPath={`url(#${uid}pc)`}>
                  {/* the folded side and bottom panels of a real envelope: each catches the light a little differently */}
                  <path d={`M0 0L150 ${foldY}L0 200Z`} fill="#000" opacity="0.045" />
                  <path d={`M300 0L150 ${foldY}L300 200Z`} fill="#fff" opacity="0.12" />
                  <path d={`M0 200L150 ${foldY}L300 200Z`} fill="#000" opacity="0.02" />
                  {/* creases: a dark fold line with a light edge beside it */}
                  <path d={`M0 200L150 ${foldY}L300 200`} fill="none" stroke="#000" strokeOpacity="0.14" strokeWidth="1" />
                  <path d={`M2 199L150 ${foldY + 2}L298 199`} fill="none" stroke="#fff" strokeOpacity="0.5" strokeWidth="0.8" />
                  <rect width="300" height="200" fill={`url(#${uid}s)`} />
                  <rect width="300" height="200" fill={`url(#${uid}g)`} opacity="0.13" style={{ mixBlendMode: "multiply" }} />
                </g>
                <path d={shape.pocket} fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth="1" />
              </svg>
              {/* the flap */}
              {/* the flap: it swings open in depth (perspective), showing its inside once past upright, and settles back with a little bounce */}
              <motion.span
                aria-hidden
                className="absolute inset-x-0 top-0 block will-change-transform"
                style={{ height: `${(shape.flapH / 200) * 100}%`, transformOrigin: "top", transformPerspective: 700, transformStyle: "preserve-3d", zIndex: flapBehind || peek ? 0 : 3 }}
                animate={{ rotateX: out ? 180 : 0 }}
                transition={
                  opening
                    ? { delay: 0.3, type: "spring", stiffness: 55, damping: 11, mass: 1 }
                    : peek
                      ? { duration: 0.85, ease: EASE }
                      : { duration: 0.5, delay: closing ? 0.3 : 0, ease: EASE }
                }
              >
                {/* inside of the flap: plain paper in the lining's colour (drawn tip-up, as it shows once the flap is open) */}
                <svg className="absolute inset-0 h-full w-full" style={{ transform: "rotateX(180deg)", backfaceVisibility: "hidden" }} viewBox={`0 0 300 ${shape.flapH}`} preserveAspectRatio="none">
                  <g transform={`translate(0 ${shape.flapH}) scale(1 -1)`}>
                    <path d={shape.flap} fill={hexMix(lining, 70, "#ffffff")} />
                    <path d={shape.flap} fill={`url(#${uid}fg)`} opacity="0.12" style={{ mixBlendMode: "multiply" }} />
                    <path d={shape.flap} fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth="0.8" />
                  </g>
                </svg>
                <svg className="relative h-full w-full drop-shadow-[0_6px_8px_rgba(0,0,0,0.18)]" style={{ backfaceVisibility: "hidden" }} viewBox={`0 0 300 ${shape.flapH}`} preserveAspectRatio="none">
                  <defs>
                    <linearGradient id={`${uid}f`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={flap[0]} /><stop offset="1" stopColor={flap[1]} /></linearGradient>
                    <clipPath id={`${uid}fc`}><path d={shape.flap} /></clipPath>
                    <pattern id={`${uid}fg`} width="160" height="160" patternUnits="userSpaceOnUse"><image href={GRAIN} width="160" height="160" /></pattern>
                    <linearGradient id={`${uid}fs`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff" stopOpacity="0.3" /><stop offset="0.5" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity="0.06" /></linearGradient>
                  </defs>
                  <path d={shape.flap} fill={`url(#${uid}f)`} />
                  <g clipPath={`url(#${uid}fc)`}>
                    <rect width="300" height={shape.flapH} fill={`url(#${uid}fs)`} />
                    <rect width="300" height={shape.flapH} fill={`url(#${uid}fg)`} opacity="0.13" style={{ mixBlendMode: "multiply" }} />
                    {/* the fold along the top edge */}
                    <rect width="300" height="3" fill="#000" opacity="0.06" />
                  </g>
                  {/* a thin lit edge, as on folded paper */}
                  <path d={shape.flap} fill="none" stroke="#fff" strokeOpacity="0.55" strokeWidth="1.2" />
                  <path d={shape.flap} fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth="0.8" />
                </svg>
              </motion.span>
              {/* crumbs of wax chip off as the seal cracks, hop a little and fall */}
              {opening && CRUMBS.map(([dx, hop, size, delay], i) => (
                <motion.span
                  key={i}
                  aria-hidden
                  className="pointer-events-none absolute left-1/2 z-[5] block rounded-[40%] bg-accent-700"
                  style={{ top: `${(shape.flapH / 200) * 100 - 2}%`, width: size, height: size, ...(intro.sealColor ? { backgroundColor: intro.sealColor } : {}) }}
                  initial={{ opacity: 0, x: 0, y: 0 }}
                  animate={{ opacity: [0, 1, 1, 0], x: dx, y: [0, -hop, 90], rotate: dx * 4 }}
                  transition={{ duration: 0.85, delay: 0.12 + delay, ease: [0.3, 0, 0.7, 1], times: [0, 0.1, 0.75, 1] }}
                />
              ))}
              {/* the wax seal */}
              <motion.span
                aria-hidden
                data-card-part="seal"
                onClick={
                  edit?.onPick
                    ? (e) => {
                        e.stopPropagation(); // the seal's own settings, not the envelope's
                        edit.onPick?.("seal");
                      }
                    : undefined
                }
                className="absolute left-1/2 z-[4] block -translate-x-1/2 -translate-y-1/2"
                style={{ top: `${(shape.flapH / 200) * 100 - 2}%` }}
                animate={opening ? { scale: [1, 0.94, 1] } : closing ? { scale: [0.7, 1.08, 1] } : peek ? { scale: 1 } : { scale: [1, 1.04, 1] }}
                transition={opening ? { duration: 0.18 } : closing ? { duration: 0.4, delay: 0.7, ease: EASE } : peek ? { duration: 0.2 } : { duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
              >
                {/* the seal cracks down the middle as it is pressed: its halves tip apart and drop away */}
                {([[-1, CRACK_L], [1, CRACK_R]] as const).map(([side, clip]) => (
                  <motion.span
                    key={side}
                    className={`${side < 0 ? "relative" : "absolute inset-0"} block`}
                    style={{ clipPath: clip, transformOrigin: side < 0 ? "30% 80%" : "70% 80%" }}
                    animate={opening || peek ? { x: side * 16, y: 46, rotate: side * 32, opacity: 0 } : { x: 0, y: 0, rotate: 0, opacity: 1 }}
                    transition={
                      opening
                        ? { x: { duration: 0.7, delay: 0.14, ease: "easeOut" }, rotate: { duration: 0.7, delay: 0.14, ease: "easeOut" }, y: { duration: 0.7, delay: 0.14, ease: [0.5, 0, 0.9, 0.6] }, opacity: { duration: 0.25, delay: 0.6 } }
                        : peek
                          ? { duration: 0.3 }
                          : { duration: 0.35, delay: closing ? 0.7 : 0, ease: EASE }
                    }
                  >
                    <WaxSeal id={seal} letter={letter} size={84} color={intro.sealColor || undefined} />
                  </motion.span>
                ))}
              </motion.span>
            </motion.span>
          </motion.button>

          <motion.p
            className="relative z-10 rounded-full border border-accent-300 bg-white/70 px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-accent-800 shadow-sm backdrop-blur-sm"
            style={{ ...ink, ...(intro.textColor ? { borderColor: intro.textColor } : {}), fontFamily }}
            initial={{ opacity: 0 }}
            animate={opening || closing ? { opacity: 0 } : { opacity: [0.55, 1, 0.55] }}
            transition={opening || closing ? { duration: 0.3 } : { duration: 2.4, repeat: Infinity }}
          >
            {edit ? <Txt part="hint" onPick={edit.onPick} value={intro.hint} onChange={(hint) => edit.onChange({ hint })} placeholder="Hint" style={{ ...ink, fontFamily }} className="uppercase tracking-[0.28em] text-accent-800" /> : intro.hint}
          </motion.p>
          {children && <div data-card-content className="relative z-10 w-full">{children}</div>}
          {decor}
          </div>
          <AnimatePresence>
            {effect && opening && (
              <motion.div key="effect" aria-hidden className="pointer-events-none absolute inset-0 z-20 overflow-hidden" initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: 1.1, delay: 0.15, ease: "easeOut" } }} exit={{ opacity: 0, transition: { duration: 0.8, ease: "easeInOut" } }}>
                {effect}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
