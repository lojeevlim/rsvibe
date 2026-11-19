import ScrollIn, { type ScrollInKind } from "@/components/ScrollIn";
import EnvelopeIntro, { type CardPart } from "@/components/EnvelopeIntro";
import TapCard from "@/components/TapCard";
import FitZoom from "@/components/FitZoom";
import CurvedText from "@/components/CurvedText";
import ScreensMode from "@/components/ScreensMode";
import SectionBorder from "@/components/BorderArt";
import { useId, type ReactNode } from "react";
import RsvpForm from "@/components/RsvpForm";
import LinkButton from "@/components/LinkButton";
import MapBlock from "@/components/MapBlock";
import { parseLatLng } from "@/lib/map";
import { colorShades, hexMix } from "@/lib/color";
import { Badge, Card, Divider, Image } from "@/components/ui";
import { BlockIcon } from "@/components/icons";
import SectionEffect from "@/components/SectionEffect";
import Countdown from "@/components/Countdown";
import Decorations, { DecorItem } from "@/components/Decorations";
import { EditBlock, EditGroup, EditSection, type EditActions } from "@/components/edit-ui";
import { blockPhoneAttrs, cardBackground, groupPhoneAttrs, sectionScales, effectInFront, CARD_SECTION, DEFAULT_BORDER, DEFAULT_PATH, MAX_DECORATIONS, pageSections, type Block, type Section, type Settings } from "@/lib/settings-shared";

export type EditProps = {
  selected: { section: string | null; block: string | null };
  /** the selected group of elements (its box can be clicked and styled) */
  group: string | null;
  /** elements picked together (shift / ctrl / cmd + click) to be grouped into a row or column */
  multi: string[];
  /** draggable sticker layer for a section (admin preview only) */
  layer: (sectionId: string) => ReactNode;
  actions: EditActions;
  /** rotate / resize / remove handles for a selected illustration that is part of the layout */
  illoHandles?: (b: Block) => ReactNode;
  /** the editor's Phone mode: the canvas is phone-sized and edits the phone layout */
  phone?: boolean;
  /** Phone mode: the large-screen design, for sections that scale it (phones show exactly that) */
  desktop?: Settings;
  /** the selected sticker, so its section's illustration popover can offer mirror / rotate / scale */
  sticker?: { section: string; flip: boolean; rotate: number; size: number } | null;
};

const BG = { white: "bg-surface", cream: "bg-cream", brand: "bg-brand text-white", ink: "bg-accent-900 text-white", plain: "" };
const PAD = { sm: "py-10 @min-[48rem]/page:py-12", md: "py-12 @min-[48rem]/page:py-16", lg: "py-16 @min-[48rem]/page:py-20" };
const HEAD = { sm: "text-2xl", md: "text-2xl @min-[40rem]/page:text-3xl @min-[48rem]/page:text-4xl", lg: "text-3xl @min-[40rem]/page:text-4xl @min-[48rem]/page:text-5xl", xl: "text-4xl @min-[40rem]/page:text-5xl @min-[48rem]/page:text-7xl" };
const TEXT = { sm: "text-sm", md: "text-base", lg: "text-lg", xl: "text-xl" };
const EMOJI = { sm: "text-3xl", md: "text-5xl", lg: "text-6xl", xl: "text-8xl" };
// gallery: how many pictures per row (small = many small ones … extra large = one big one)
const GALLERY = { sm: "grid-cols-3 @min-[48rem]/page:grid-cols-5", md: "grid-cols-2 @min-[48rem]/page:grid-cols-3", lg: "grid-cols-1 @min-[40rem]/page:grid-cols-2", xl: "grid-cols-1" };
// single image: the widest it may get
const IMAGE_W = { sm: 320, md: 448, lg: 672, xl: 896 };
/** a single image's width: its own px width (or its old size preset), never wider than its section */
export const imageWidth = (b: Block) => b.imgW ?? IMAGE_W[b.size];
const imageStyle = (b: Block) => ({ width: `min(${imageWidth(b)}px, calc(100cqw - 2rem))`, maxWidth: "none" });
const SPACE = { sm: "h-4", md: "h-8", lg: "h-16", xl: "h-24" };
// "white" tone = contrast colour: it follows the section background (--on-bg), so it stays readable on any colour
const TONE = { ink: "text-ink", brand: "text-brand", soft: "text-soft", white: "text-[color:var(--on-bg,#fff)]" };

/** readable text colour (light or dark) for a custom background */
function onColor(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.55 ? "#0f172a" : "#ffffff";
}


/** readable text colour for a two-colour gradient: judged on the average of both ends */
function onGradient(from: string, to: string) {
  const mid = [1, 3, 5].map((i) => Math.round((parseInt(from.slice(i, i + 2), 16) + parseInt(to.slice(i, i + 2), 16)) / 2).toString(16).padStart(2, "0")).join("");
  return onColor(`#${mid}`);
}

const external = (url: string) => (/^https?:\/\//i.test(url) ? { target: "_blank", rel: "noopener noreferrer" } : {});

/** A picture frame: a checkered racing border, a film strip, a polaroid, or an elegant double line. */
function Framed({ frame, className = "", children }: { frame: Block["frame"]; className?: string; children: ReactNode }) {
  switch (frame) {
    case "checker":
      return <div className={className} style={{ padding: 10, borderRadius: 22, background: "conic-gradient(#18181b 25%, #fff 0 50%, #18181b 0 75%, #fff 0) 0 0 / 20px 20px", boxShadow: "0 10px 22px -12px rgba(0,0,0,0.45)" }}><div className="overflow-hidden rounded-[14px]">{children}</div></div>;
    case "film":
      return (
        <div className={`relative ${className}`} style={{ padding: "14px 26px", borderRadius: 8, background: "#141416", boxShadow: "0 10px 22px -12px rgba(0,0,0,0.55)" }}>
          {(["left-2", "right-2"] as const).map((side) => (
            <span key={side} aria-hidden className={`absolute inset-y-3 ${side} w-2.5 rounded-sm`} style={{ backgroundImage: "repeating-linear-gradient(to bottom, #f5f5f4 0 9px, transparent 9px 19px)" }} />
          ))}
          <div className="overflow-hidden rounded-sm">{children}</div>
        </div>
      );
    case "polaroid":
      return <div className={className} style={{ padding: "12px 12px 46px", background: "#fff", borderRadius: 4, transform: "rotate(-1.5deg)", boxShadow: "0 14px 26px -12px rgba(0,0,0,0.45), 0 0 0 1px rgba(0,0,0,0.06)" }}><div className="overflow-hidden">{children}</div></div>;
    case "double":
      return <div className={className} style={{ padding: 9, borderRadius: 22, border: "3px solid var(--color-accent-600)", background: "var(--color-surface)", boxShadow: "inset 0 0 0 1px var(--color-accent-300)" }}><div className="overflow-hidden rounded-[14px]">{children}</div></div>;
    default:
      return <div className={className}>{children}</div>;
  }
}

function BlockView({ b, edit, rsvpEndpoint, handles }: { b: Block; edit: boolean; rsvpEndpoint?: string; handles?: ReactNode }) {
  switch (b.type) {
    case "badge":
      // curved: the words alone, bent (a pill can't bend), in the badge's lettering
      if (b.curve) return <CurvedText curve={b.curve} text={b.text} className="w-full max-w-md text-sm font-bold uppercase tracking-widest text-brand" />;
      return <Badge variant="outline" size="lg" className="rounded-full bg-surface px-5 font-bold uppercase tracking-widest text-brand">{b.text}</Badge>;
    case "heading": {
      const Tag = b.size === "xl" ? "h1" : "h2";
      if (b.curve) return <CurvedText as={Tag} curve={b.curve} text={b.text} className={`${HEAD[b.size]} ${TONE[b.tone]} w-full font-extrabold leading-[1.05] ${b.caps ? "uppercase" : ""}`} />;
      return <Tag className={`${HEAD[b.size]} ${TONE[b.tone]} font-extrabold leading-[1.05] ${b.caps ? "uppercase" : ""} text-balance break-words`}>{b.text}</Tag>;
    }
    case "text":
      if (b.curve) return <CurvedText curve={b.curve} text={b.text} className={`${TEXT[b.size]} ${TONE[b.tone]} w-full max-w-2xl group-data-[wide=true]/sec:max-w-5xl`} />;
      return <p className={`${TEXT[b.size]} ${TONE[b.tone]} max-w-2xl break-words whitespace-pre-line group-data-[wide=true]/sec:max-w-5xl`}>{b.text}</p>;
    case "script":
      if (b.curve) return <CurvedText curve={b.curve} text={b.text} className="font-comic w-full text-2xl tracking-wide text-amber-500" />;
      return <p className="font-comic text-2xl tracking-wide text-amber-500">{b.text}</p>;
    case "button":
      // text2 holds the lojee-ui animation ("" or "none" = static, the default)
      return <LinkButton href={b.url || "#rsvp"} animation={b.text2 && b.text2 !== "none" ? b.text2 : undefined}>{b.text}</LinkButton>;
    case "image": {
      // background removed: no grey box or border behind it, so what is now see-through shows the section behind
      const cutOut = b.original ? { borderless: true, classNames: { frame: "bg-transparent" } } : {};
      return b.url ? (
        b.frame === "none" ? (
          <div className="shrink-0" style={imageStyle(b)}><Image src={b.url} alt={b.text} ratio="4/3" fit="cover" rounded="xl" loading="lazy" {...cutOut} className="w-full" /></div>
        ) : (
          <div className="shrink-0" style={imageStyle(b)}><Framed frame={b.frame} className="w-full"><Image src={b.url} alt={b.text} ratio="4/3" fit="cover" rounded="xl" loading="lazy" {...cutOut} className="w-full" /></Framed></div>
        )
      ) : edit ? (
        <p className="w-full max-w-md rounded-3xl border-2 border-dashed border-line py-16 text-sm text-soft">Image — choose one in the toolbox</p>
      ) : null;
    }
    case "gallery":
      return b.images.length ? (
        <div className={`grid w-full gap-4 ${GALLERY[b.size]}`}>
          {b.images.map((img) => (
            <Framed key={img.url} frame={b.frame}><Image src={img.url} alt={img.alt} ratio="1/1" fit="cover" rounded="xl" loading="lazy" /></Framed>
          ))}
        </div>
      ) : edit ? (
        <p className="w-full rounded-3xl border-2 border-dashed border-line py-16 text-sm text-soft">Gallery — upload images in the toolbox</p>
      ) : null;
    case "emoji":
      return <span className={EMOJI[b.size]}>{b.text}</span>;
    case "card": {
      const inner = (
        <Card variant="outline" padding="lg" hoverable={!!b.url} className={`w-full rounded-[28px] !p-5 @min-[40rem]/page:!p-8 text-center ${b.url ? "border-brand" : ""}`}>
          <div className="flex justify-center"><BlockIcon name={b.icon} size={40} /></div>
          <h3 className="mt-3 text-xl font-extrabold text-ink @min-[40rem]/page:text-2xl">{b.text}</h3>
          <p className="mt-3 text-lg font-bold text-ink">{b.text2}</p>
          {b.text3 && <p className="text-soft">{b.text3}</p>}
          {b.color && (
            <div className="mt-4 flex justify-center pl-4" role="list" aria-label="Colours">
              {colorShades(b.color).map((c, i) => <span key={i} role="listitem" title={c} className="-ml-4 h-11 w-11 rounded-full border-2 border-white shadow-md" style={{ background: c, zIndex: i }} />)}
            </div>
          )}
        </Card>
      );
      if (b.tap !== "none" && !edit) return <TapCard mode={b.tap} back={b.back}>{inner}</TapCard>;
      return b.url ? (
        <a href={b.url} {...external(b.url)} className="block w-full">{inner}</a>
      ) : (
        inner
      );
    }
    case "step":
      return (
        <Card variant="outline" padding="md" className="relative w-full rounded-3xl text-left">
          <span className="absolute -left-[2.25rem] top-6 @min-[40rem]/page:-left-[3.25rem] h-5 w-5 rounded-full bg-brand ring-4 ring-cream" />
          <Badge variant="soft" size="sm" className="font-bold">{b.text}</Badge>
          <h3 className="mt-2 text-xl font-extrabold text-ink">{b.text2}</h3>
          <p className="mt-1 text-soft">{b.text3}</p>
        </Card>
      );
    case "countdown":
      return <Countdown target={b.text2} label={b.text} light={b.tone === "white"} endHeading={b.text3} fx={b.fxBg} />;
    case "rsvp":
      return (
        <div id="rsvp" className="w-full max-w-2xl scroll-mt-4 text-left">
          <Card variant="outline" padding="lg" className="rounded-[28px] border border-border p-4 shadow-none @min-[40rem]/page:p-10">
            <RsvpForm title={b.text} subtitle={b.text2} labels={b.labels} parts={b.parts} endpoint={rsvpEndpoint} />
          </Card>
        </div>
      );
    case "map": {
      const pos = parseLatLng(b.text3);
      if (!pos) {
        return edit ? <p className="w-full rounded-3xl border-2 border-dashed border-line py-16 text-sm text-soft">Map — search for a location in the toolbox</p> : null;
      }
      return <MapBlock title={b.text} location={b.text3} zoom={b.icon} size={b.size} interactive={!edit} avatar={b.url} />;
    }
    case "divider":
      return <Divider label={b.text || undefined} className="w-full max-w-xl" />;
    case "spacer":
      return <div className={`${SPACE[b.size]} w-full`} />;
    case "ribbon":
      return <Ribbon text={b.text} color={b.color} style={b.text2 === "gold" ? "gold" : b.text2 === "arc" ? "arc" : "classic"} size={b.size} o={b.ribbon ?? {}} />;
    case "illustration":
      // an illustration that is part of the layout (not floating): it takes up room, so other elements move around it
      return b.deco ? <DecorItem d={{ id: b.id, section: "", x: 50, y: 50, path: DEFAULT_PATH, layer: "front", ...b.deco }} noPath selected={!!handles} handles={handles} className="decor-flow !static !transform-none mx-auto inline-block" style={{ left: "auto", top: "auto" }} /> : null;
  }
}

/** a cream-and-gold scroll banner with curled ends, like a vintage title ribbon */
type RibbonOpts = NonNullable<Block["ribbon"]>;
type RibbonStyle = "classic" | "arc" | "gold";
const RIBBON_FONT: Record<NonNullable<RibbonOpts["font"]>, string | undefined> = {
  bold: undefined,
  display: "var(--font-display), system-ui, sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
  script: "var(--font-accent), cursive",
};
const RIBBON_ZOOM = { sm: 0.75, md: 1, lg: 1.3, xl: 1.6 } as const;
/** each style's natural rise of the band's middle (at arch 60) and its tallest (at arch 100), in its drawing units */
const RISE: Record<RibbonStyle, [number, number]> = { arc: [51, 85], classic: [9, 40], gold: [11, 42] };
/** the drawing's own width, and how wide it shows at most at normal size and width */
const BASE: Record<RibbonStyle, { w: number; max: number }> = { arc: { w: 480, max: 512 }, classic: { w: 420, max: 448 }, gold: { w: 480, max: 512 } };

/** A ribbon banner with words on it, drawn as one picture so every style takes the same settings:
 *  arch (how far its middle rises), width (how long the band is), tails (V-cut, straight or none), shine, shadow, size, and the words' font and colour.
 *  The words always follow the band's curve. */
function Ribbon({ text, color, style, size = "md", o = {} }: { text: string; color: string; style: RibbonStyle; size?: Block["size"]; o?: RibbonOpts }) {
  const id = `rb${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const arch = o.arch ?? 60;
  const [base, top] = RISE[style];
  const r = arch <= 60 ? (base * arch) / 60 : base + ((arch - 60) / 40) * (top - base);
  const dx = Math.round(((o.width ?? 100) / 100 - 1) * (style === "classic" ? 312 : style === "gold" ? 376 : 340)); // longer or shorter band
  const W = BASE[style].w + dx;
  const cx = BASE[style].w / 2 + dx / 2;
  const R = (x: number) => x + dx; // right-hand points move with the band's end
  const shine = o.shine ?? style !== "classic";
  const tails = o.tails ?? "v";
  const f = (n: number) => n.toFixed(1);

  const c = style === "gold" ? "#f3dc9a" : color || "var(--color-accent-500)";
  const mix = (pct: number, to: string) => `color-mix(in srgb, ${c} ${pct}%, ${to})`;
  const ink = o.textColor || (style === "gold" ? "#6b4a12" : color ? onColor(color) : "#ffffff");
  const font = o.font ?? (style === "gold" ? "serif" : "bold");
  const words = text.length || 1;

  let minY = 0, H = 0, band = "", path = "", fs = 0, art: React.ReactNode = null, sheen = "";
  if (style === "arc") {
    minY = Math.min(0, 80 - r - 14);
    H = 215;
    band = `M70 80 Q${f(cx)} ${f(80 - 2 * r)} ${R(410)} 80 C${R(426)} 100 ${R(428)} 136 ${R(414)} 160 Q${f(cx)} ${f(160 - 2 * r * 0.92)} 66 160 C52 136 54 100 70 80 Z`;
    path = `M88 124 Q${f(cx)} ${f(124 - 2 * r * 0.92)} ${R(392)} 124`;
    sheen = `M82 84 Q${f(cx)} ${f(80 - 2 * r + 12)} ${R(398)} 84`;
    fs = Math.max(16, Math.min(38, (300 + dx) / (words * 0.6)));
    art = tails !== "none" && (
      <>
        <path d={tails === "v" ? "M118 126 L10 150 L48 176 L22 206 L140 172 Z" : "M118 126 L10 150 L22 206 L140 172 Z"} fill={`url(#${id}t)`} />
        <path d={tails === "v" ? `M${R(362)} 126 L${R(470)} 150 L${R(432)} 176 L${R(458)} 206 L${R(340)} 172 Z` : `M${R(362)} 126 L${R(470)} 150 L${R(458)} 206 L${R(340)} 172 Z`} fill={`url(#${id}t)`} />
        <path d="M68 156 C70 176 92 186 132 176 L140 172 L118 140 Z" style={{ fill: mix(48, "#000") }} />
        <path d={`M${R(412)} 156 C${R(410)} 176 ${R(388)} 186 ${R(348)} 176 L${R(340)} 172 L${R(362)} 140 Z`} style={{ fill: mix(48, "#000") }} />
      </>
    );
  } else if (style === "classic") {
    minY = Math.min(0, 14 - r - 8);
    H = 110;
    band = `M54 14 Q${f(cx)} ${f(14 - 2 * r)} ${R(366)} 14 L${R(366)} 76 Q${f(cx)} ${f(76 - 2 * r)} 54 76 Z`;
    path = `M78 47 Q${f(cx)} ${f(47 - 2 * r)} ${R(342)} 47`;
    sheen = `M60 20 Q${f(cx)} ${f(20 - 2 * r)} ${R(360)} 20`;
    fs = Math.max(14, Math.min(30, (262 + dx) / (words * 0.62)));
    art = tails !== "none" && (
      <>
        <polygon points={tails === "v" ? "0,26 76,26 76,84 0,84 24,55" : "0,26 76,26 76,84 0,84"} style={{ fill: mix(72, "#000") }} />
        <polygon points={tails === "v" ? `${R(420)},26 ${R(344)},26 ${R(344)},84 ${R(420)},84 ${R(396)},55` : `${R(420)},26 ${R(344)},26 ${R(344)},84 ${R(420)},84`} style={{ fill: mix(72, "#000") }} />
        <polygon points="54,84 76,84 76,102" style={{ fill: mix(52, "#000") }} />
        <polygon points={`${R(366)},84 ${R(344)},84 ${R(344)},102`} style={{ fill: mix(52, "#000") }} />
      </>
    );
  } else {
    minY = Math.min(0, 28 - r - 10);
    H = 130;
    band = `M52 28 Q${f(cx)} ${f(28 - 2 * r)} ${R(428)} 28 L${R(428)} 96 Q${f(cx)} ${f(96 - 2 * r)} 52 96 Z`;
    path = `M74 64 Q${f(cx)} ${f(64 - 2 * r)} ${R(406)} 64`;
    sheen = `M62 36 Q${f(cx)} ${f(36 - 2 * r)} ${R(418)} 36 M62 88 Q${f(cx)} ${f(88 - 2 * r)} ${R(418)} 88`;
    fs = Math.max(14, Math.min(30, (332 + dx) / (words * 0.62)));
    art = tails !== "none" && (
      <>
        <path d={tails === "v" ? "M0 50 L58 36 L70 100 L10 118 L28 82 Z" : "M0 50 L58 36 L70 100 L10 118 Z"} fill={`url(#${id}t)`} />
        <path d={tails === "v" ? `M${R(480)} 50 L${R(422)} 36 L${R(410)} 100 L${R(470)} 118 L${R(452)} 82 Z` : `M${R(480)} 50 L${R(422)} 36 L${R(410)} 100 L${R(470)} 118 Z`} fill={`url(#${id}t)`} />
        <path d="M44 100 L70 100 L70 118 Z" fill="#a9771d" />
        <path d={`M${R(436)} 100 L${R(410)} 100 L${R(410)} 118 Z`} fill="#a9771d" />
      </>
    );
  }
  const zoom = RIBBON_ZOOM[size] ?? 1;
  const vbH = H - minY;
  const shadow = o.shadow === false ? "" : style === "arc" ? "drop-shadow-[0_8px_10px_rgba(0,0,0,0.22)]" : "drop-shadow-md";
  return (
    // the size scales the whole banner; its box never gets wider than the column
    // bigger sizes: laid out narrower, so zoomed up they fill the column exactly; smaller sizes just shrink in place, centred
    <div className="mx-auto w-full" style={zoom === 1 ? undefined : zoom > 1 ? { zoom, width: `${100 / zoom}%` } : { zoom }}>
      <div className="relative mx-auto w-full" style={{ maxWidth: (BASE[style].max * W) / BASE[style].w }} role="img" aria-label={text}>
        <svg viewBox={`0 ${f(minY)} ${W} ${f(vbH)}`} className={`block h-auto w-full overflow-visible ${shadow}`} aria-hidden>
          <defs>
            <linearGradient id={`${id}b`} x1="0" y1="0" x2="0" y2="1">
              {style === "gold" ? (
                <>
                  <stop offset="0" stopColor={shine ? "#fdf6dc" : "#f3dc9a"} />
                  <stop offset="0.6" stopColor="#f3dc9a" />
                  <stop offset="1" stopColor={shine ? "#e2bb62" : "#f3dc9a"} />
                </>
              ) : (
                <>
                  <stop offset="0" style={{ stopColor: shine ? mix(78, "#fff") : c }} />
                  <stop offset="0.22" style={{ stopColor: c }} />
                  <stop offset="0.8" style={{ stopColor: c }} />
                  <stop offset="1" style={{ stopColor: shine || style === "arc" ? mix(80, "#000") : c }} />
                </>
              )}
            </linearGradient>
            {/* the 3D band turns away at each end: darker toward its edges */}
            <linearGradient id={`${id}s`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#000" stopOpacity="0.28" />
              <stop offset="0.1" stopColor="#000" stopOpacity="0" />
              <stop offset="0.9" stopColor="#000" stopOpacity="0" />
              <stop offset="1" stopColor="#000" stopOpacity="0.28" />
            </linearGradient>
            <linearGradient id={`${id}t`} x1="0" y1="0" x2={style === "gold" ? 1 : 0} y2="1">
              {style === "gold" ? (
                <>
                  <stop offset="0" stopColor="#f2cf74" />
                  <stop offset="1" stopColor="#c9972c" />
                </>
              ) : (
                <>
                  <stop offset="0" style={{ stopColor: mix(82, "#000") }} />
                  <stop offset="1" style={{ stopColor: mix(70, "#000") }} />
                </>
              )}
            </linearGradient>
            <path id={`${id}p`} d={path} />
          </defs>
          {art}
          <path d={band} fill={`url(#${id}b)`} {...(style === "gold" ? { stroke: "#d0a23a", strokeWidth: 2 } : {})} />
          {style === "arc" && <path d={band} fill={`url(#${id}s)`} />}
          {shine && (style === "gold" ? <path d={sheen} fill="none" stroke="#d0a23a" strokeWidth="1.2" opacity="0.7" /> : <path d={sheen} fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth={style === "arc" ? 5 : 3} strokeLinecap="round" />)}
          <text
            fill={ink}
            fontSize={fs}
            fontWeight={font === "script" ? 400 : 800}
            textAnchor="middle"
            dominantBaseline="middle"
            letterSpacing={font === "script" ? 0.5 : 1.5}
            style={{ textTransform: font === "script" ? "none" : "uppercase", fontFamily: RIBBON_FONT[font], paintOrder: "stroke", stroke: style === "gold" ? "none" : "rgba(0,0,0,0.12)", strokeWidth: 1 }}
          >
            <textPath href={`#${id}p`} startOffset="50%">{text}</textPath>
          </text>
        </svg>
      </div>
    </div>
  );
}

/** Consecutive steps form one timeline, consecutive cards one column, and elements of one group a row or column. */
function runsOf(blocks: Block[]) {
  const runs: { kind: "step" | "card" | "group" | "single"; group?: string; items: { b: Block; i: number }[] }[] = [];
  blocks.forEach((b, i) => {
    const kind = b.group ? "group" : b.type === "step" ? "step" : b.type === "card" ? "card" : "single";
    const last = runs[runs.length - 1];
    if (kind === "group" && last?.kind === "group" && last.group === b.group) last.items.push({ b, i });
    else if (kind === "group") runs.push({ kind, group: b.group, items: [{ b, i }] });
    else if (kind !== "single" && last?.kind === kind) last.items.push({ b, i });
    else runs.push({ kind, items: [{ b, i }] });
  });
  return runs;
}

/** how each kind of block arrives as the page is scrolled */
function scrollKind(b: Block, i: number, page: Settings["page"], screens: boolean): ScrollInKind {
  // screen-by-screen pages use one transition for everything on a screen
  if (screens) return page.transition === "slide" ? (i % 2 ? "right" : "left") : page.transition === "zoom" ? "zoom" : page.transition === "fade" ? "fade" : "rise";
  switch (b.type) {
    case "image": case "gallery": case "map": case "countdown": case "rsvp": return "zoom";
    case "card": return i % 2 ? "right" : "left";
    case "step": return "left";
    case "heading": case "badge": return "drop";
    default: return "rise";
  }
}

/** the box around a group of elements */
const GROUP_LOOK: Record<Block["groupStyle"], string> = {
  none: "",
  card: "rounded-3xl border border-border bg-surface p-5 shadow-sm @min-[40rem]/page:p-6",
  soft: "rounded-3xl bg-surface-muted p-5 @min-[40rem]/page:p-6",
  outline: "rounded-3xl border-2 border-dashed border-brand/50 p-5 @min-[40rem]/page:p-6",
  shadow: "rounded-3xl bg-surface p-6 shadow-2xl @min-[40rem]/page:p-8",
  accent: "rounded-3xl bg-brand p-5 text-white @min-[40rem]/page:p-6 [--on-bg:#fff]",
  glass: "rounded-3xl border border-white/50 bg-white/40 p-5 shadow-lg backdrop-blur-md @min-[40rem]/page:p-6",
  gradient: "rounded-3xl bg-gradient-to-br from-brand to-accent-300 p-5 text-white shadow-lg @min-[40rem]/page:p-6 [--on-bg:#fff]",
  wavy: "rounded-3xl bg-surface p-7 @min-[40rem]/page:p-9",
  ticket: "rounded-2xl bg-surface p-6 @min-[40rem]/page:p-8",
  blob: "bg-surface p-8 @min-[40rem]/page:p-10",
  goldframe: "rounded-2xl p-6 @min-[40rem]/page:p-8",
  cartouche: "p-10 @min-[40rem]/page:p-14",
  flourish: "rounded-md p-9 @min-[40rem]/page:p-12",
};

/** shared metallic gradients for the gold artwork (crowns, frames, flourishes) */
function GoldDefs() {
  return (
    <defs>
      <linearGradient id="rg-gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff6c4" /><stop offset="0.25" stopColor="#f7d65a" /><stop offset="0.55" stopColor="#d9a21b" /><stop offset="0.8" stopColor="#f1c64a" /><stop offset="1" stopColor="#8a5a06" /></linearGradient>
      <linearGradient id="rg-goldh" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#8a5a06" /><stop offset="0.3" stopColor="#ffe98a" /><stop offset="0.5" stopColor="#fff8d6" /><stop offset="0.7" stopColor="#e6b422" /><stop offset="1" stopColor="#7a4d05" /></linearGradient>
      <radialGradient id="rg-ball" cx="0.35" cy="0.3" r="0.8"><stop offset="0" stopColor="#fffbe0" /><stop offset="0.35" stopColor="#f4cd45" /><stop offset="1" stopColor="#8a5a06" /></radialGradient>
      <radialGradient id="rg-pearl" cx="0.35" cy="0.3" r="0.8"><stop offset="0" stopColor="#ffffff" /><stop offset="0.6" stopColor="#e8e4dc" /><stop offset="1" stopColor="#a39e92" /></radialGradient>
      <radialGradient id="rg-ruby" cx="0.35" cy="0.3" r="0.8"><stop offset="0" stopColor="#fecaca" /><stop offset="0.45" stopColor="#e11d48" /><stop offset="1" stopColor="#7f1d1d" /></radialGradient>
      <radialGradient id="rg-sapph" cx="0.35" cy="0.3" r="0.8"><stop offset="0" stopColor="#dbeafe" /><stop offset="0.45" stopColor="#2563eb" /><stop offset="1" stopColor="#1e3a8a" /></radialGradient>
      <linearGradient id="rg-velvet" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#c41e3a" /><stop offset="1" stopColor="#5b0f0f" /></linearGradient>
    </defs>
  );
}

/** a gold crown drawn like a render: curved band for depth, open-work points over a velvet lining, soft shading and specular highlights, with thin edges instead of cartoon outlines */
function RealCrown() {
  const E = "#8a5d0b"; // fine edge colour
  const top = (x: number) => 72 + 5 * (1 - ((x - 80) / 66) ** 2); // top edge of the curved band
  const ball = (x: number, y: number, r: number) => (
    <g key={`${x}${y}`}>
      <circle cx={x} cy={y} r={r} fill="url(#rg-ball)" stroke={E} strokeWidth="0.5" />
      <ellipse cx={x - r * 0.3} cy={y - r * 0.42} rx={r * 0.34} ry={r * 0.2} fill="#fff" opacity="0.9" />
    </g>
  );
  const gem = (x: number, fill: string, r: number) => {
    const y = top(x) + 9;
    return (
      <g key={x}>
        <ellipse cx={x} cy={y} rx={r + 1.4} ry={r + 1.4} fill="url(#rg-gold)" stroke={E} strokeWidth="0.5" />
        <ellipse cx={x} cy={y} rx={r} ry={r} fill={`url(#${fill})`} />
        <path d={`M${x - r * 0.55} ${y - r * 0.3} Q${x - r * 0.2} ${y - r * 0.8} ${x + r * 0.3} ${y - r * 0.7}`} stroke="#fff" strokeWidth="0.9" strokeLinecap="round" fill="none" opacity="0.85" />
      </g>
    );
  };
  const body = "M14 74 L18 38 Q30 52 40 56 Q45 36 51 22 Q58 44 66 52 Q72 28 80 10 Q88 28 94 52 Q102 44 109 22 Q115 36 120 56 Q130 52 142 38 L146 74 Q80 84 14 74 Z";
  return (
    <>
      <GoldDefs />
      <ellipse cx="80" cy="96" rx="64" ry="3.4" fill="#000" opacity="0.2" />
      {/* velvet lining seen through the open-work */}
      <path d="M22 76 Q20 44 42 40 Q80 26 118 40 Q140 44 138 76 Z" fill="url(#rg-velvet)" />
      <path d={body} fill="url(#rg-goldh)" />
      <path d={body} fill="url(#rg-gold)" opacity="0.62" />
      {/* open arches between the points, with a lit inner rim */}
      {[34, 66, 94, 126].map((x) => (
        <g key={x}>
          <ellipse cx={x} cy={x === 66 || x === 94 ? 62 : 64} rx="7.5" ry="9.5" fill="url(#rg-velvet)" />
          <ellipse cx={x} cy={x === 66 || x === 94 ? 62 : 64} rx="7.5" ry="9.5" fill="none" stroke="url(#rg-goldh)" strokeWidth="1.4" />
          <path d={`M${x - 5} ${(x === 66 || x === 94 ? 62 : 64) - 5} Q${x} ${(x === 66 || x === 94 ? 62 : 64) - 9} ${x + 5} ${(x === 66 || x === 94 ? 62 : 64) - 5}`} stroke="#000" strokeWidth="2.6" opacity="0.28" fill="none" strokeLinecap="round" />
        </g>
      ))}
      <path d={body} fill="none" stroke={E} strokeWidth="0.7" strokeLinejoin="round" />
      {/* soft light from the upper left */}
      <path d="M18 40 Q30 52 40 56 Q45 36 51 24 L46 22 Q40 34 36 48 Q26 44 20 36 Z M72 28 Q76 16 80 12 L78 24 Z" fill="#fffbe0" opacity="0.55" />
      {/* the band: curved for depth */}
      <path d="M14 72 Q80 82 146 72 L146 90 Q80 100 14 90 Z" fill="url(#rg-goldh)" stroke={E} strokeWidth="0.7" />
      <path d="M14 73.6 Q80 83.6 146 73.6" fill="none" stroke="#fff8d6" strokeWidth="1" opacity="0.85" />
      <path d="M14 88.4 Q80 98.4 146 88.4" fill="none" stroke="#5b3a05" strokeWidth="1" opacity="0.5" />
      {[24, 34, 44, 58, 68, 92, 102, 116, 126, 136].map((x) => <circle key={x} cx={x} cy={top(x) + 9} r="2.3" fill="url(#rg-pearl)" stroke="#9a8a68" strokeWidth="0.4" />)}
      {gem(48, "rg-sapph", 4)}{gem(80, "rg-ruby", 5.6)}{gem(112, "rg-sapph", 4)}
      {ball(18, 36, 4.6)}{ball(51, 20, 4.6)}{ball(80, 8, 5.6)}{ball(109, 20, 4.6)}{ball(142, 36, 4.6)}
    </>
  );
}

/** the ornate shapes behind a group: a cartouche (mirror-shaped) frame, or corner flourishes */
function OrnateFrame({ kind, color }: { kind: "cartouche" | "flourish"; color: string }) {
  const custom = !!color;
  const fill = custom ? hexMix(color, 8, "#ffffff") : "var(--color-surface)";
  const line = custom ? color : "url(#rg-gold)";
  const dark = custom ? hexMix(color, 55, "#000000") : "#6b4204";
  const light = custom ? hexMix(color, 35, "#ffffff") : "#fff6c4";
  if (kind === "cartouche") {
    const d = "M50 1 C58 1 58 6 66 6 L88 6 C96 6 99 12 99 20 L99 38 C99 44 96 47 96 50 C96 53 99 56 99 62 L99 80 C99 88 96 94 88 94 L66 94 C58 94 58 99 50 99 C42 99 42 94 34 94 L12 94 C4 94 1 88 1 80 L1 62 C1 56 4 53 4 50 C4 47 1 44 1 38 L1 20 C1 12 4 6 12 6 L34 6 C42 6 42 1 50 1 Z";
    const inner = "translate(50 50) scale(0.93) translate(-50 -50)";
    return (
      <>
        <svg aria-hidden viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" style={{ filter: "drop-shadow(0 6px 8px rgba(0,0,0,0.25))" }}>
          <GoldDefs />
          <path d={d} fill={fill} />
          <path d={d} fill="none" stroke={dark} strokeWidth="7" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
          <path d={d} fill="none" stroke={line} strokeWidth="4.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
          <path d={d} fill="none" stroke={light} strokeWidth="1" vectorEffect="non-scaling-stroke" opacity="0.8" transform="translate(50 50) scale(0.995) translate(-50 -50)" />
          <path d={d} fill="none" stroke={dark} strokeWidth="2.4" vectorEffect="non-scaling-stroke" transform={inner} />
          <path d={d} fill="none" stroke={line} strokeWidth="1.4" vectorEffect="non-scaling-stroke" transform={inner} />
        </svg>
        {/* a small gold shell on the top and bottom points */}
        {["-top-3", "-bottom-3 rotate-180"].map((p) => (
          <svg key={p} aria-hidden viewBox="0 0 60 30" className={`pointer-events-none absolute left-1/2 z-10 h-7 w-14 -translate-x-1/2 ${p}`}>
            <GoldDefs />
            <path d="M30 4 C22 4 14 12 14 24 L46 24 C46 12 38 4 30 4 Z" fill={line} stroke={dark} strokeWidth="1.4" />
            <path d="M30 6 L30 24 M24 8 L22 24 M36 8 L38 24 M19 13 L16 24 M41 13 L44 24" stroke={dark} strokeWidth="0.9" opacity="0.55" fill="none" />
            <circle cx="30" cy="3" r="2.6" fill="url(#rg-ball)" stroke={dark} strokeWidth="0.8" />
          </svg>
        ))}
      </>
    );
  }
  // flourish: a fine gold frame with embossed scrolls and leaves in every corner
  const emb = (d: string, w: number) => (
    <>
      <path d={d} stroke={dark} strokeWidth={w + 1.8} />
      <path d={d} stroke={line} strokeWidth={w} />
      <path d={d} stroke={light} strokeWidth={w * 0.28} opacity="0.85" transform="translate(-0.5 -0.5)" />
    </>
  );
  const leaf = (d: string) => <path d={d} fill={custom ? color : "url(#rg-gold)"} stroke={dark} strokeWidth="0.9" />;
  const corner = (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      {emb("M3 58 C3 24 24 3 58 3", 2.2)}
      {emb("M14 46 C14 28 28 14 46 14 C56 14 56 27 48 28 C41 29 39 21 44 20", 2)}
      {emb("M3 3 C12 11 19 11 27 3", 1.6)}
      {emb("M3 3 C11 12 11 19 3 27", 1.6)}
      {emb("M20 32 C26 30 32 34 33 40", 1.4)}
      {leaf("M7 34 C7 26 13 21 21 22 C21 30 15 36 7 34 Z")}
      {leaf("M34 7 C26 7 21 13 22 21 C30 21 36 15 34 7 Z")}
      <circle cx="58" cy="3" r="2.4" fill="url(#rg-ball)" stroke={dark} strokeWidth="0.8" /><circle cx="3" cy="58" r="2.4" fill="url(#rg-ball)" stroke={dark} strokeWidth="0.8" />
    </g>
  );
  const pos = ["left-0 top-0", "right-0 top-0 -scale-x-100", "bottom-0 left-0 -scale-y-100", "bottom-0 right-0 -scale-100"];
  return (
    <>
      <div aria-hidden className="pointer-events-none absolute inset-2 rounded-sm" style={{ border: `1.5px solid ${custom ? color : "#c9972c"}`, boxShadow: `0 0 0 1px ${light}, inset 0 0 0 1px ${light}`, opacity: 0.9 }} />
      {pos.map((p) => (
        <svg key={p} aria-hidden viewBox="0 0 62 62" className={`pointer-events-none absolute h-16 w-16 ${p}`} style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.25))" }}><GoldDefs />{corner}</svg>
      ))}
    </>
  );
}

/** a crown that sits on the top edge of a group's box */
function GroupCrownArt({ kind }: { kind: Exclude<Block["groupCrown"], "none"> }) {
  const art: Record<typeof kind, React.ReactNode> = {
    gold: <RealCrown />,
    banner: (
      <>
        <GoldDefs />
        <ellipse cx="80" cy="96" rx="70" ry="3" fill="#000" opacity="0.16" />
        <path d="M2 66 L22 58 L26 86 L8 94 L16 78 Z" fill="url(#rg-gold)" stroke="#8a5d0b" strokeWidth="0.7" /><path d="M158 66 L138 58 L134 86 L152 94 L144 78 Z" fill="url(#rg-gold)" stroke="#8a5d0b" strokeWidth="0.7" />
        <path d="M18 86 L26 86 L26 92 Z" fill="#7a4d05" /><path d="M142 86 L134 86 L134 92 Z" fill="#7a4d05" />
        <path d="M20 58 Q80 40 140 58 L136 86 Q80 68 24 86 Z" fill="#f6e3a4" stroke="#c9972c" strokeWidth="0.9" />
        <path d="M20 58 Q80 40 140 58 L139 64 Q80 46 21 64 Z" fill="#fff8dc" opacity="0.7" />
        <path d="M24 80 Q80 62 136 80" fill="none" stroke="#c9972c" strokeWidth="0.8" opacity="0.7" />
        <g transform="translate(40 -2) scale(0.5)"><RealCrown /></g>
      </>
    ),
    royal: (
      <>
        <path d="M16 58 Q14 30 30 24 Q60 4 90 24 Q106 30 104 58 Z" fill="#b91c1c" stroke="#7f1d1d" strokeWidth="2.5" />
        <path d="M20 58 L26 22 L46 40 L60 14 L74 40 L94 22 L100 58 Z" fill="#fcd34d" stroke="#92400e" strokeWidth="2.5" strokeLinejoin="round" />
        <rect x="14" y="54" width="92" height="14" rx="5" fill="#f59e0b" stroke="#92400e" strokeWidth="2.5" />
        <path d="M60 14 L60 2 M55 6 L65 6" stroke="#92400e" strokeWidth="3" strokeLinecap="round" />
        <circle cx="26" cy="20" r="4" fill="#fff" stroke="#92400e" strokeWidth="1.5" /><circle cx="94" cy="20" r="4" fill="#fff" stroke="#92400e" strokeWidth="1.5" />
        <circle cx="36" cy="61" r="3.5" fill="#22c55e" /><circle cx="60" cy="61" r="3.5" fill="#3b82f6" /><circle cx="84" cy="61" r="3.5" fill="#22c55e" />
      </>
    ),
    tiara: (
      <>
        <path d="M10 60 Q60 30 110 60" fill="none" stroke="#9ca3af" strokeWidth="4" strokeLinecap="round" />
        {[22, 41, 60, 79, 98].map((x, i) => {
          const y = 56 - Math.sin(((x - 10) / 100) * Math.PI) * 24;
          const h = i === 2 ? 34 : 22;
          return <g key={x}><path d={`M${x - 6} ${y + 2} L${x} ${y - h} L${x + 6} ${y + 2} Z`} fill="#e5e7eb" stroke="#9ca3af" strokeWidth="2" strokeLinejoin="round" /><circle cx={x} cy={y - h - 3} r={i === 2 ? 5 : 3.5} fill={i === 2 ? "#f472b6" : "#fff"} stroke="#9ca3af" strokeWidth="1.5" /></g>;
        })}
      </>
    ),
    flowers: (
      <>
        <path d="M6 54 Q60 40 114 54" fill="none" stroke="#16a34a" strokeWidth="5" strokeLinecap="round" />
        {[[16, "#f472b6"], [38, "#fbbf24"], [60, "#fb7185"], [82, "#fbbf24"], [104, "#f472b6"]].map(([x, c], i) => {
          const y = 54 - Math.sin(((Number(x) - 6) / 108) * Math.PI) * 12 - (i === 2 ? 8 : 0);
          return <g key={String(x)}>{[0, 72, 144, 216, 288].map((a) => <circle key={a} cx={Number(x) + Math.cos((a * Math.PI) / 180) * 7} cy={y + Math.sin((a * Math.PI) / 180) * 7} r="6" fill={String(c)} />)}<circle cx={x as number} cy={y} r="4.5" fill="#fff7ed" /></g>;
        })}
        <path d="M28 52 q-6-10 2-14 M92 52 q6-10 -2-14" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" />
      </>
    ),
    party: (
      <>
        <path d="M14 64 L26 20 L40 44 L60 10 L80 44 L94 20 L106 64 Z" fill="#a78bfa" stroke="#5b21b6" strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M14 64 L106 64" stroke="#5b21b6" strokeWidth="3" />
        {[[34, 52, "#fde047"], [60, 44, "#f472b6"], [86, 52, "#34d399"], [48, 30, "#fff"], [72, 30, "#fde047"]].map(([x, y, c]) => <circle key={`${x}${y}`} cx={x as number} cy={y as number} r="4" fill={String(c)} />)}
        <circle cx="26" cy="18" r="4" fill="#f472b6" /><circle cx="60" cy="8" r="4.5" fill="#fde047" /><circle cx="94" cy="18" r="4" fill="#34d399" />
      </>
    ),
  };
  return (
    <svg aria-hidden viewBox={kind === "gold" || kind === "banner" ? "0 0 160 100" : "0 0 120 72"} className={`pointer-events-none absolute left-1/2 z-20 -translate-x-1/2 drop-shadow-lg ${kind === "gold" ? "-top-[4.4rem] h-[5.6rem] w-36" : kind === "banner" ? "-top-[4.4rem] h-[5.6rem] w-36 @min-[40rem]/page:w-44" : "-top-[3.25rem] h-[4.5rem] w-28"}`}>
      {art[kind]}
    </svg>
  );
}

/** colours for a group's box when the group has its own colour: tinted background and a border / gradient in that colour */
/** a gold (or custom colour) metallic double line: a gradient border and a thin inner line */
function metalFrame(color: string, radius: number | string): React.CSSProperties {
  const hi = color ? hexMix(color, 40, "#ffffff") : "#f8e38b";
  const mid = color || "#b8860b";
  return {
    border: "3px solid transparent",
    borderRadius: radius,
    background: `linear-gradient(${color ? hexMix(color, 8, "#ffffff") : "var(--color-surface)"}, ${color ? hexMix(color, 8, "#ffffff") : "var(--color-surface)"}) padding-box, linear-gradient(135deg, ${hi}, ${mid} 45%, ${hi} 70%, ${mid}) border-box`,
    boxShadow: `inset 0 0 0 6px ${color ? hexMix(color, 8, "#ffffff") : "var(--color-surface)"}, inset 0 0 0 7.5px ${mid}, 0 10px 24px -14px rgba(0,0,0,0.35)`,
  };
}

function groupColorCss(style: Block["groupStyle"], color: string, edit: boolean): React.CSSProperties {
  if (style === "goldframe") return metalFrame(color, 18);
  if (style === "flourish") return metalFrame(color, 6);
  if (style === "cartouche") return {};
  // an organic blob with a soft double outline, like a wavy invitation card
  const BLOB: React.CSSProperties = { borderRadius: "46px 96px 52px 90px / 70px 48px 88px 44px", boxShadow: `inset 0 0 0 6px #ffffffd9, inset 0 0 0 8px ${color ? hexMix(color, 40, "#ffffff") : "var(--color-accent-200)"}, 0 10px 24px -14px rgba(0,0,0,0.3)` };
  if (style === "blob") return color ? { ...BLOB, background: hexMix(color, 12, "#ffffff") } : BLOB;
  if (!color) return style === "wavy" ? panelStyle("wavy", edit) : style === "ticket" ? panelStyle("ticket", edit) : {};
  const tint = hexMix(color, 12, "#ffffff");
  const dark = onColor(color);
  const base: React.CSSProperties =
    style === "accent" ? { background: color, color: dark, ["--on-bg" as string]: dark }
    : style === "gradient" ? { backgroundImage: `linear-gradient(135deg, ${color}, ${hexMix(color, 55, "#ffffff")})`, color: dark, ["--on-bg" as string]: dark }
    : style === "outline" ? { borderColor: color }
    : style === "none" ? { background: tint, borderRadius: 24 }
    : { background: tint, borderColor: hexMix(color, 45, "#ffffff") };
  if (style === "wavy") return { ...base, ...panelStyle("wavy", edit) , background: tint };
  if (style === "ticket") return { ...base, ...panelStyle("ticket", edit), background: tint };
  return base;
}

const WAVY = `url("data:image/svg+xml,${encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'><path d='M3 2Q0 12 3 22T3 42T3 62T3 82T3 98H97Q100 88 97 78T97 58T97 38T97 18T97 2Z' fill='black'/></svg>")}")`;
const TICKET = "radial-gradient(circle 16px at 0 50%, #0000 97%, #000) left / 51% 100% no-repeat, radial-gradient(circle 16px at 100% 50%, #0000 97%, #000) right / 51% 100% no-repeat";

/** The panel behind a section's content: an organic blob, an arch, a wavy-sided card or a ticket with notches. (In the editor, masked shapes are shown rounded so the editing handles stay visible.) */
/** a group / card box: its design colour, plus its own corner radius, border and where it was dragged to (pushing what is below, like an element) */
function groupBoxCss(g: Block, edit: boolean): React.CSSProperties {
  const css: React.CSSProperties = { ...groupColorCss(g.groupStyle ?? "none", g.groupColor ?? "", edit) };
  if (g.groupRadius !== undefined) css.borderRadius = g.groupRadius;
  if (g.groupW) css.width = `${g.groupW}%`;
  // room inside for the border artwork, so it frames the contents instead of covering them
  const art = g.groupArt && (["top", "bottom", "left", "right"] as const).some((s) => g.groupArt![s] !== "none");
  if (art) {
    css.padding = { sm: 30, md: 44, lg: 58, xl: 76 }[g.groupArt!.size];
    css.position = "relative"; // the artwork is laid around this box, not the section
    css.isolation = "isolate";
  }
  if (g.groupH) {
    css.minHeight = g.groupH;
    css.justifyContent = "center"; // the contents sit in the middle of a taller box
  }
  if (g.groupBorderW) css.border = `${g.groupBorderW}px ${g.groupBorderStyle ?? "solid"} ${g.groupBorderColor || "var(--color-border)"}`;
  if (g.groupFloat) {
    // fixed: floats over the section at its own spot; nothing moves around it
    css.position = "absolute";
    css.left = `${g.groupX ?? 0}%`;
    css.top = g.groupY ?? 0;
    css.zIndex = 3;
    css.margin = 0;
    if (!g.groupW) css.width = "max-content";
    css.maxWidth = "100%";
  } else if (g.groupX || g.groupY) {
    css.position = "relative";
    css.left = `${g.groupX ?? 0}%`;
    css.marginTop = g.groupY ?? 0;
  }
  return css;
}

function panelStyle(panel: Section["panel"], edit: boolean): React.CSSProperties {
  const base: React.CSSProperties = { background: "var(--color-surface)", color: "var(--color-fg)", ["--on-bg" as string]: "var(--color-fg)" };
  switch (panel) {
    case "blob": return { ...base, borderRadius: "46px 96px 52px 90px / 70px 48px 88px 44px" };
    case "arch": return { ...base, borderRadius: "50% 50% 32px 32px / 16% 16% 32px 32px" };
    case "wavy": return edit ? { ...base, borderRadius: 32 } : { ...base, WebkitMask: WAVY + " 0 0 / 100% 100% no-repeat", mask: WAVY + " 0 0 / 100% 100% no-repeat" };
    case "ticket": return edit ? { ...base, borderRadius: 18 } : { ...base, WebkitMask: TICKET, mask: TICKET };
    default: return {};
  }
}

/** "Full screen": at least one screen tall (svh: the height with the phone's address bar showing, so it never jumps), content in the middle.
 *  "mobile" switches on below the md breakpoint, where text wraps onto more lines and the section would otherwise change height. */
const FULL_SCREEN = {
  off: "",
  mobile: "@max-[48rem]/page:grid @max-[48rem]/page:min-h-svh @max-[48rem]/page:content-center",
  always: "grid min-h-svh content-center",
} as const;

function SectionBody({ sec, edit, rsvpEndpoint, page, screens }: { sec: Section; edit?: EditProps; rsvpEndpoint?: string; page: Settings["page"]; screens: boolean }) {
  const node = (b: Block, i: number) => {
    const view = <BlockView b={b} edit={!!edit} rsvpEndpoint={rsvpEndpoint} handles={edit && b.type === "illustration" && edit.selected.block === b.id ? edit.illoHandles?.(b) : undefined} />;
    return edit ? (
      <EditBlock key={b.id} block={b} sectionId={sec.id} index={i} selected={edit.selected.block === b.id} pickedNo={edit.multi.indexOf(b.id) + 1} actions={edit.actions}>
        {view}
      </EditBlock>
    ) : (
      <div key={b.id} className="relative w-full" {...blockPhoneAttrs(b).attrs} style={{ ...(b.x || b.y ? (b.overlap ? { left: `${b.x}%`, top: b.y, zIndex: 2 } : b.group ? { left: `${b.x}%`, top: b.y } /* inside a card box: floats at its spot */ : { left: `${b.x}%`, marginTop: b.y }) : {}), ...blockPhoneAttrs(b).vars }}>
        <ScrollIn kind={scrollKind(b, i, page, screens)} once={!screens} delay={(i % 4) * 0.1} className="flex w-full flex-col items-center">{view}</ScrollIn>
      </div>
    );
  };
  return (
    <section
      data-grow={sec.grow}
      className={`relative overflow-hidden ${BG[sec.bg]} ${PAD[sec.pad]} px-4 ${screens ? (sec.card ? "grid min-h-[calc(100dvh-5rem)] content-center" : "grid min-h-dvh content-center") : ""} ${sec.card ? "rounded-[inherit]" : ""} ${sec.blocks.length === 0 && edit ? "min-h-40" : ""} ${FULL_SCREEN[sec.fullScreen ?? "off"]}`}
      style={
        {
          ...(sec.bgColor ? { backgroundColor: sec.bgColor, color: onColor(sec.bgColor) } : {}),
          ...(sec.gradient.on ? { backgroundImage: `linear-gradient(${sec.gradient.angle}deg, ${sec.gradient.from}, ${sec.gradient.to})`, color: onGradient(sec.gradient.from, sec.gradient.to) } : {}),
          "--on-bg": sec.gradient.on ? onGradient(sec.gradient.from, sec.gradient.to) : sec.bgColor ? onColor(sec.bgColor) : sec.bg === "brand" || sec.bg === "ink" ? "#ffffff" : "var(--color-fg)",
        } as React.CSSProperties
      }
    >
      <SectionEffect kind={sec.effect} front={effectInFront(sec)} />
      <SectionBorder border={sec.border} id={sec.id} />
      <div className={`relative z-10 mx-auto w-full ${sec.wide ? "max-w-6xl" : "max-w-3xl"}`} style={{ ...(sec.panel === "none" ? {} : { filter: "drop-shadow(0 14px 22px rgba(0,0,0,0.16))" }), marginBottom: sec.grow || undefined }}>
      <div className={`group/sec relative flex flex-col items-center gap-4 text-center @min-[48rem]/page:gap-5 ${sec.panel === "none" ? "" : "px-6 py-10 @min-[40rem]/page:px-12 @min-[40rem]/page:py-14"}`} style={panelStyle(sec.panel, !!edit)} data-wide={sec.wide} data-sec-body>
        {runsOf(sec.blocks).map((run) =>
          run.kind === "single" ? (
            node(run.items[0].b, run.items[0].i)
          ) : run.kind === "group" ? (
            (() => {
              const g = run.items[0].b;
              const ph = groupPhoneAttrs(g); // the box's own place / size on phones
              const style = { ...groupBoxCss(g, !!edit), ...ph.vars } as React.CSSProperties;
              const className = `${run.items[0].b.groupCrown && run.items[0].b.groupCrown !== "none" ? (run.items[0].b.groupCrown === "gold" || run.items[0].b.groupCrown === "banner" ? "mt-16 " : "mt-10 ") : ""}${run.items[0].b.groupStyle === "none" && run.items[0].b.groupColor ? "p-5 @min-[40rem]/page:p-6 " : ""}${edit && edit.group === run.group ? "is-group-sel " : ""}${edit ? "group/g relative " : ""}flex w-full items-center justify-center gap-4 @min-[48rem]/page:gap-6 ${GROUP_LOOK[run.items[0].b.groupStyle ?? "none"]} ${run.items[0].b.groupDir === "row" ? "flex-row flex-wrap [&>*]:!w-auto [&>*]:max-w-full" : "flex-col"}`;
              const inner = (
                <>
                  {(g.groupStyle === "cartouche" || g.groupStyle === "flourish") && <OrnateFrame kind={g.groupStyle} color={g.groupColor ?? ""} />}
                  {g.groupCrown && g.groupCrown !== "none" && <GroupCrownArt kind={g.groupCrown} />}
                  {g.groupArt && <SectionBorder border={g.groupArt} id={`g-${g.group}`} />}
                  {edit && <span aria-hidden className="group-tag absolute -top-3 left-3 z-[70] rounded-full bg-[#2563eb] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow">{g.groupStyle === "none" ? "Group" : "Card box"} · drag</span>}
                  {run.items.map(({ b, i }) => node(b, i))}
                </>
              );
              return edit ? (
                <EditGroup key={g.id} group={g.group} floating={!!g.groupFloat} x={g.groupX ?? 0} y={g.groupY ?? 0} actions={edit.actions} className={className} style={style} attrs={ph.attrs}>{inner}</EditGroup>
              ) : (
                <div key={g.id} data-group={run.group} className={className} style={style} {...ph.attrs}>{inner}</div>
              );
            })()
          ) : (
            <div
              key={run.items[0].b.id}
              className={run.kind === "step" ? "relative mt-4 flex w-full flex-col gap-5 border-l border-dashed border-line pl-6 @min-[40rem]/page:pl-10 @min-[48rem]/page:gap-6" : "mt-2 flex w-full flex-col gap-6"}
            >
              {run.items.map(({ b, i }) => node(b, i))}
            </div>
          ),
        )}
      </div>
      </div>
    </section>
  );
}

/** What fills the opening card: the card section's own background (set in its section settings) when it has one, else the card's Background setting. */
function cardSurface(sec: Section | undefined, intro: Settings["page"]["intro"]): { className: string; style: React.CSSProperties } {
  if (sec?.gradient.on) return { className: "", style: { background: `linear-gradient(${sec.gradient.angle}deg, ${sec.gradient.from}, ${sec.gradient.to})` } };
  if (sec?.bgColor) return { className: "", style: { background: sec.bgColor } };
  if (sec && sec.bg !== "plain") return { className: BG[sec.bg], style: {} };
  return { className: "", style: { background: cardBackground(intro) } };
}

/** The whole public page. `s` must already have {name} applied. In the admin it is rendered with `edit` as a live, drag-and-drop preview. */
export default function PageView({ s, edit, card, rsvpEndpoint, introTop }: {
  s: Settings;
  edit?: EditProps;
  /** with `edit`: show the opening card (the envelope and its own section) instead of the page */
  card?: { onChange: (p: Partial<Settings["page"]["intro"]>) => void; autoplay: boolean; onPick?: (part: CardPart) => void; peek?: boolean };
  rsvpEndpoint?: string;
  /** where the envelope intro starts, when the page sits under a header (the editor's preview) */
  introTop?: number;
}) {
  // the editor canvas always scrolls normally, so editing stays easy; visitors and the preview get the chosen style
  const screens = !edit && s.page.mode === "screens";
  const cardSec = s.sections.find((x) => x.id === CARD_SECTION);
  const sections = pageSections(s);
  const limits = { rsvp: s.sections.some((x) => x.blocks.some((b) => b.type === "rsvp")), stickers: s.decorations.length >= MAX_DECORATIONS, textCount: s.decorations.filter((d) => d.kind === "text").length, graffitiCount: s.decorations.filter((d) => d.kind === "graffiti").length };
  const surface = cardSurface(cardSec, s.page.intro);
  // the card's elements sit on the card's own surface, so their section draws no background, border or effect of its own
  const cardBody = cardSec ? { ...cardSec, bg: "plain" as const, bgColor: "", gradient: { ...cardSec.gradient, on: false }, effect: "none" as const, border: DEFAULT_BORDER } : undefined;
  const cardDeco = cardSec ? <SectionBorder border={cardSec.border} id={cardSec.id} /> : null;
  // the card's effect (confetti, balloons…) only plays as the envelope opens
  const cardEffect = cardSec && cardSec.effect !== "none" && !(cardSec.hidden && !edit) ? <SectionEffect kind={cardSec.effect} /> : undefined;
  if (edit && card) {
    return (
      <main className="@container/page flow-root pl-12" style={{ containerName: "page screen" }}>
        {cardSec && cardBody && (
          // the card section's background (left sidebar) and the card's Background setting cover the whole card, elements and all
          <div className={`card-host relative rounded-2xl ring-1 ring-border ${surface.className}`} style={surface.style}>
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">{cardDeco}</div>
          <EditSection fixed section={cardSec} index={0} count={1} sticker={edit.sticker?.section === cardSec.id ? edit.sticker : null} limits={limits} selected={edit.selected.section === cardSec.id} actions={edit.actions} layer={edit.layer(cardSec.id)}>
            {/* an empty card shows just the card (elements can still be dropped anywhere on it) */}
            {/* clipped to the card's rounded border (the section's handles sit outside it, so the clip is in here) */}
            <div className="overflow-hidden rounded-2xl">
              <EnvelopeIntro intro={s.page.intro} edit={card} effect={cardEffect}>
                {cardBody.blocks.length > 0 ? <SectionBody sec={cardBody} edit={edit} page={s.page} screens={false} /> : undefined}
              </EnvelopeIntro>
            </div>
          </EditSection>
          </div>
        )}
      </main>
    );
  }
  const cardShown = cardSec && !cardSec.hidden;
  return (
    // @container/page: the page's phone / large-screen styles follow the width of the page itself, not the window,
    // so the editor's phone canvas shows (and edits) the real phone layout
    // "screen": the real width, for the phone layout and "show on" (a section that scales with the screen is a "page" of its own, at 1052px, but never a "screen")
    <main className="@container/page flow-root" style={{ containerName: "page screen" }}>
      {!edit && s.page.intro.on && (
        <EnvelopeIntro
          intro={s.page.intro}
          top={introTop}
          surface={surface}
          effect={cardEffect}
          decor={cardShown ? <>{cardDeco}<Decorations items={s.decorations.filter((d) => d.section === CARD_SECTION)} /></> : undefined}
        >
          {cardShown && cardBody && cardBody.blocks.length > 0 ? <SectionBody sec={cardBody} rsvpEndpoint={rsvpEndpoint} page={s.page} screens={false} /> : undefined}
        </EnvelopeIntro>
      )}
      {screens && <ScreensMode />}
      {sections.map((sec, index) => {
        if (sec.hidden && !edit) return null;
        const body = <SectionBody sec={sec} edit={edit} rsvpEndpoint={rsvpEndpoint} page={s.page} screens={screens} />;
        if (edit && edit.phone && sectionScales(sec, s.page)) {
          const big = edit.desktop ?? s;
          const dsec = big.sections.find((x) => x.id === sec.id) ?? sec;
          // Phone mode: a section that scales with the screen shows the large-screen design, smaller, exactly as phones get it.
          // There is nothing phone-only to change in it, so it is shown, not edited here.
          return (
            <div key={sec.id} data-section={sec.id} data-show={sec.showOn && sec.showOn !== "all" ? sec.showOn : undefined} className="decor-host relative">
              <div className="fit-inner pointer-events-none relative">
                <FitZoom />
                <SectionBody sec={dsec} page={s.page} screens={false} />
                <Decorations items={big.decorations.filter((d) => d.section === sec.id)} wide={dsec.wide} />
              </div>
              <span className="pointer-events-none absolute right-2 top-2 z-[80] rounded-full bg-ink/85 px-2.5 py-1 text-[10px] font-bold text-white shadow">Scales the large-screen design · edit it on Desktop</span>
            </div>
          );
        }
        if (edit) {
          return (
            <EditSection key={sec.id} section={sec} index={index} count={sections.length} sticker={edit.sticker?.section === sec.id ? edit.sticker : null} limits={limits} selected={edit.selected.section === sec.id} actions={edit.actions} layer={edit.layer(sec.id)}>
              {body}
            </EditSection>
          );
        }
        return (
          <div key={sec.id} data-section={sec.id} data-show={sec.showOn && sec.showOn !== "all" ? sec.showOn : undefined} className={`decor-host relative ${screens ? "snap-start snap-always" : ""} ${sec.card ? "mx-auto my-5 w-[calc(100%-1rem)] @min-[48rem]/page:my-8 @min-[48rem]/page:w-[calc(100%-1.5rem)] max-w-7xl rounded-[32px] border @min-[48rem]/page:rounded-[64px] border-border shadow-[0_10px_28px_-18px_rgba(0,0,0,0.25)] overflow-hidden" : ""}`}>
            {sectionScales(sec, s.page) ? (
              // laid out at the editor's width, then shrunk to fit the screen (see .fit-inner)
              <div className="fit-inner relative">
                <FitZoom />
                {body}
                <Decorations items={s.decorations.filter((d) => d.section === sec.id)} wide={sec.wide} />
              </div>
            ) : (
              <>
                {body}
                <Decorations items={s.decorations.filter((d) => d.section === sec.id)} wide={sec.wide} />
              </>
            )}
          </div>
        );
      })}
      {edit && (
        <button type="button" data-action onClick={() => edit.actions.addSection(sections.length)} className="mx-auto my-6 block rounded-full border-2 border-dashed border-brand/50 px-8 py-3 font-bold text-brand">
          + Add section
        </button>
      )}
    </main>
  );
}
