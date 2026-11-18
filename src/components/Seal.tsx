import { useId, type ReactNode } from "react";
import { hexMix } from "@/lib/color";

/** Emblems pressed into the wax seal. Each is drawn in a 24×24 box. */
export const SEAL_IDS = ["heart", "star", "crown", "flag", "rocket", "leaf", "ring", "gift", "cap", "tree", "bolt", "flower", "anchor", "trophy", "cake", "balloon", "bell", "music", "paw", "moon", "sun", "diamond", "rings", "clover", "snowflake", "butterfly", "key", "cocktail", "initial"] as const;
export type SealId = (typeof SEAL_IDS)[number];
export const SEAL_LABELS: Record<SealId, string> = { heart: "Heart", star: "Star", crown: "Crown", flag: "Racing flag", rocket: "Rocket", leaf: "Leaf", ring: "Ring", gift: "Gift", cap: "Graduation", tree: "Tree", bolt: "Bolt", flower: "Flower", anchor: "Anchor", trophy: "Trophy", cake: "Cake", balloon: "Balloon", bell: "Bell", music: "Music", paw: "Paw", moon: "Moon", sun: "Sun", diamond: "Diamond", rings: "Two rings", clover: "Clover", snowflake: "Snowflake", butterfly: "Butterfly", key: "Key", cocktail: "Cocktail", initial: "Monogram" };
export const asSealId = (v: string): SealId => ((SEAL_IDS as readonly string[]).includes(v) ? (v as SealId) : "heart");

const EMBLEMS: Record<Exclude<SealId, "initial">, ReactNode> = {
  heart: <path d="M12 21s-7-4.500-9.500-9C1 9 2.500 5.500 6 5.500c2 0 3.500 1.200 6 3.500 2.500-2.300 4-3.500 6-3.500 3.500 0 5 3.500 3.500 6.500-2.500 4.500-9.500 9-9.500 9z" />,
  star: <path d="M12 2l2.900 6.300 6.900.8-5.100 4.700 1.400 6.800L12 17.200 5.900 20.600l1.400-6.800L2.200 9.100l6.900-.8z" />,
  crown: <path d="M3 18h18l1-11-5.500 4.500L12 4 7.500 11.500 2 7zM3 20h18v2H3z" />,
  flag: (
    <>
      <path d="M5 2h1.800v20H5z" />
      {Array.from({ length: 12 }, (_, i) => ({ x: i % 4, y: Math.floor(i / 4) })).filter(({ x, y }) => (x + y) % 2 === 0).map(({ x, y }) => <rect key={`${x}${y}`} x={7.500 + x * 3.200} y={3 + y * 3.200} width="3.200" height="3.200" />)}
    </>
  ),
  rocket: <path d="M12 2c3 2.500 4.500 6 4.500 10l2 3.500-3.500-.5L12 22l-3-7-3.500.5 2-3.500C7.500 8 9 4.500 12 2zm0 6a1.800 1.800 0 100 3.600A1.800 1.800 0 0012 8z" fillRule="evenodd" />,
  leaf: <path d="M20 4C9 4 4 9.500 4 16c0 1.500.3 2.800.8 4C6 14 10 11 14 9.500 9.500 12 7 15.500 6 20.500c1 .3 2 .5 3 .5 7 0 11-6 11-17z" />,
  ring: <path d="M12 2l3 3-3 4-3-4zM12 10a6 6 0 100 12 6 6 0 000-12zm0 2.200a3.800 3.800 0 110 7.600 3.800 3.800 0 010-7.600z" fillRule="evenodd" />,
  gift: <path d="M3 10h18v11H3zM2 7h20v3H2zM12 7C9 3 5 4 6 7c1 2 4 1 6 0 2 1 5 2 6 0 1-3-3-4-6 0z" />,
  cap: <path d="M12 4L1 9l11 5 9-4.100V16h2V9zM5 13v4c0 1.500 3 3 7 3s7-1.500 7-3v-4l-7 3.200z" />,
  tree: <path d="M12 2l6 8h-3l5 7H4l5-7H6zM11 17h2v5h-2z" />,
  bolt: <path d="M13 2L4 14h6l-1 8 9-12h-6z" />,
  flower: (
    <>
      {[0, 72, 144, 216, 288].map((r) => <circle key={r} cx="12" cy="6.500" r="4" transform={`rotate(${r} 12 12)`} />)}
      <circle cx="12" cy="12" r="2.600" />
    </>
  ),
  anchor: <path d="M12 2.500a2.500 2.500 0 100 5 2.500 2.500 0 000-5zM11 7h2v11h-2zM8 10h8v2H8zM5 12H3c0 5 4 9 9 9s9-4 9-9h-2c0 4-3 7-7 7s-7-3-7-7z" />,
  trophy: <path d="M7 3h10v6c0 3-2 5-5 5s-5-2-5-5zM7 5H3c0 4 2 5 4 5zM17 5h4c0 4-2 5-4 5zM11 14h2v4h-2zM8 20h8v2H8z" />,
  cake: <path d="M4 12h16v8H4zM3 20.500h18V22H3zM11 7h2v4h-2zM12 2c1.300 1.500 1.600 2.700 0 4-1.600-1.300-1.300-2.500 0-4z" />,
  balloon: (
    <>
      <ellipse cx="12" cy="9" rx="6" ry="7" />
      <path d="M10.800 15.600h2.400L12 17.400zM11.500 17.200h1V22h-1z" />
    </>
  ),
  bell: <path d="M12 2a1.500 1.500 0 011.500 1.500v.6A6 6 0 0118 10v5l2 2v1H4v-1l2-2v-5a6 6 0 014.500-5.900v-.6A1.500 1.500 0 0112 2zM9.500 19.500h5a2.500 2.500 0 01-5 0z" />,
  music: (
    <>
      <circle cx="7" cy="18" r="3" />
      <circle cx="17" cy="16" r="3" />
      <path d="M8.500 5L20 2.500V16h-1.800V7l-8 1.800V18H8.500z" />
    </>
  ),
  paw: (
    <>
      <ellipse cx="12" cy="16" rx="5" ry="4.200" />
      <circle cx="5.800" cy="10.500" r="2.200" />
      <circle cx="9.800" cy="6.500" r="2.200" />
      <circle cx="14.200" cy="6.500" r="2.200" />
      <circle cx="18.200" cy="10.500" r="2.200" />
    </>
  ),
  moon: <path d="M15 2.500A9.500 9.500 0 1021.500 15 7.500 7.500 0 0115 2.500z" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4.500" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => <rect key={a} x="11" y="1" width="2" height="4" rx="1" transform={`rotate(${a} 12 12)`} />)}
    </>
  ),
  diamond: <path d="M7 3h10l4 5-9 13L3 8z" />,
  rings: (
    <>
      <path d="M9 6a6 6 0 100 12A6 6 0 009 6zm0 2a4 4 0 110 8 4 4 0 010-8z" fillRule="evenodd" />
      <path d="M15 6a6 6 0 100 12 6 6 0 000-12zm0 2a4 4 0 110 8 4 4 0 010-8z" fillRule="evenodd" />
    </>
  ),
  clover: (
    <>
      <circle cx="12" cy="7.200" r="3.600" />
      <circle cx="16.800" cy="12" r="3.600" />
      <circle cx="12" cy="16.200" r="3.600" />
      <circle cx="7.200" cy="12" r="3.600" />
      <circle cx="12" cy="12" r="2.600" />
      <path d="M11.400 16h1.400l1.600 6H13z" />
    </>
  ),
  snowflake: (
    <>
      {[0, 60, 120].map((a) => <rect key={a} x="11" y="2" width="2" height="20" rx="1" transform={`rotate(${a} 12 12)`} />)}
      <circle cx="12" cy="12" r="2.400" />
    </>
  ),
  butterfly: (
    <>
      <ellipse cx="7.500" cy="8.500" rx="4.500" ry="5" transform="rotate(-25 7.500 8.500)" />
      <ellipse cx="16.500" cy="8.500" rx="4.500" ry="5" transform="rotate(25 16.500 8.500)" />
      <ellipse cx="8.500" cy="16.500" rx="3.200" ry="3.600" transform="rotate(20 8.500 16.500)" />
      <ellipse cx="15.500" cy="16.500" rx="3.200" ry="3.600" transform="rotate(-20 15.500 16.500)" />
      <rect x="11.200" y="5" width="1.600" height="15" rx="0.800" />
    </>
  ),
  key: <path d="M7 7a5 5 0 100 10A5 5 0 007 7zm0 3a2 2 0 110 4 2 2 0 010-4zM11.500 11H22v2h-2v3h-2v-3h-2v2h-2v-2h-2.500z" fillRule="evenodd" />,
  cocktail: <path d="M5 3h14l-6 8v8h4v2H7v-2h4v-8z" />,
};

/** A single emblem as a plain icon, for pickers and small marks. */
export function SealEmblem({ id, letter = "A", size = 24, className }: { id: SealId; letter?: string; size?: number; className?: string }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      {id === "initial" ? <text x="12" y="17.500" textAnchor="middle" fontSize="16" fontWeight="700" fontStyle="italic" fontFamily="Georgia, serif">{letter}</text> : EMBLEMS[id]}
    </svg>
  );
}

// an irregular, hand-pressed edge: 16 points around a circle, each pushed in or out a little
const NOISE = [3.200, -1.800, 4.200, -2.800, 2.200, -3.800, 3.600, -1.200, 4.400, -3.200, 2.600, -2.200, 3.800, -4, 2.400, -1.600];
const EDGE = (() => {
  const pts = NOISE.map((n, i) => {
    const a = (i / NOISE.length) * Math.PI * 2;
    const r = 42 + n;
    return [50 + r * Math.cos(a), 50 + r * Math.sin(a)] as const;
  });
  const mid = (a: readonly [number, number], b: readonly [number, number]) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] as const;
  const f = (n: number) => n.toFixed(1);
  let d = `M${f(mid(pts[pts.length - 1], pts[0])[0])} ${f(mid(pts[pts.length - 1], pts[0])[1])}`;
  pts.forEach((p, i) => {
    const m = mid(p, pts[(i + 1) % pts.length]);
    d += `Q${f(p[0])} ${f(p[1])} ${f(m[0])} ${f(m[1])}`;
  });
  return d + "Z";
})();

/** A wax seal: an uneven pressed edge, a raised rim, and the emblem embossed in the middle, with light and shadow. Wax colour follows the accent. */
export function WaxSeal({ id, letter = "A", size = 72, className, color }: { id: SealId; letter?: string; size?: number; className?: string; /** wax colour (a #rrggbb); empty follows the accent */ color?: string }) {
  const uid = useId().replace(/:/g, "");
  // the five shades of the wax: highlight, mid, deep, the pressed centre (light, dark) and the emblem
  const wax = color
    ? { hi: hexMix(color, 62, "#ffffff"), mid: color, deep: hexMix(color, 50, "#000000"), c1: hexMix(color, 85, "#ffffff"), c2: hexMix(color, 62, "#000000"), emblem: hexMix(color, 60, "#000000") }
    : { hi: "var(--color-accent-400)", mid: "var(--color-accent-600)", deep: "var(--color-accent-900)", c1: "var(--color-accent-500)", c2: "var(--color-accent-800)", emblem: "var(--color-accent-700)" };
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 100 100" className={className} style={{ filter: "drop-shadow(0 6px 8px rgba(0,0,0,0.38))" }}>
      <defs>
        <radialGradient id={`${uid}w`} cx="0.34" cy="0.28" r="0.85">
          <stop offset="0" stopColor={wax.hi} />
          <stop offset="0.5" stopColor={wax.mid} />
          <stop offset="1" stopColor={wax.deep} />
        </radialGradient>
        <linearGradient id={`${uid}r`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.5" />
        </linearGradient>
        <radialGradient id={`${uid}c`} cx="0.6" cy="0.7" r="0.9">
          <stop offset="0" stopColor={wax.c1} />
          <stop offset="1" stopColor={wax.c2} />
        </radialGradient>
      </defs>
      <path d={EDGE} fill={`url(#${uid}w)`} />
      {/* a soft crescent of light on the upper left */}
      <path d="M22 36Q30 16 54 13Q36 20 28 44Z" fill="#fff" opacity="0.28" />
      {/* the raised rim */}
      <circle cx="50" cy="50" r="33" fill="none" stroke={`url(#${uid}r)`} strokeWidth="3.200" />
      <circle cx="50" cy="50" r="31" fill={`url(#${uid}c)`} />
      <circle cx="50" cy="50" r="31" fill="none" stroke="#000" strokeOpacity="0.28" strokeWidth="0.8" />
      {/* the emblem, pressed in: shadow below-right, light above-left, wax in the middle */}
      <g transform="translate(50 50) scale(1.15) translate(-12 -12)">
        <g fill="#000" opacity="0.5" transform="translate(0.9 0.9)">{id === "initial" ? <text x="12" y="17.500" textAnchor="middle" fontSize="16" fontWeight="700" fontStyle="italic" fontFamily="Georgia, serif">{letter}</text> : EMBLEMS[id]}</g>
        <g fill="#fff" opacity="0.45" transform="translate(-0.6 -0.6)">{id === "initial" ? <text x="12" y="17.500" textAnchor="middle" fontSize="16" fontWeight="700" fontStyle="italic" fontFamily="Georgia, serif">{letter}</text> : EMBLEMS[id]}</g>
        <g fill={wax.emblem}>{id === "initial" ? <text x="12" y="17.500" textAnchor="middle" fontSize="16" fontWeight="700" fontStyle="italic" fontFamily="Georgia, serif">{letter}</text> : EMBLEMS[id]}</g>
      </g>
    </svg>
  );
}
