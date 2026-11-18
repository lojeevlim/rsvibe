"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { Check, ArrowDown, ArrowUp, EyeOff, Frame, Loader2, Search, FlipHorizontal2, GripVertical, ImagePlus, MoreHorizontal, PartyPopper, Plus, Type, RotateCcw, RotateCw, X, ZoomIn, ZoomOut } from "lucide-react";
import { Badge, Button, DropdownMenu, DropdownMenuItem, Popover, Tooltip } from "@/components/ui";
import { BORDER_OPTIONS, BorderThumb } from "@/components/BorderArt";
import ArtSvg, { ART_GROUPS } from "@/components/ArtSvg";
import { elementMeta, GROUPS, TEXT_PRESETS, type ElementType } from "@/components/palette";
import { alphaBoundsNow } from "@/components/FitFrame";
import { blockPhoneAttrs, decorXFromPx, type Block, type BlockType, type Decoration, type Section } from "@/lib/settings-shared";
import { ICONIFY, ILLUSTRATION_IDEAS, ILLUSTRATION_SETS } from "@/lib/illustrations";
import { ILLUSTRATION_PACKS, PACK_FILES, packLabel } from "@/lib/illustration-packs";

export type StickerOp = "flip" | "rotL" | "rotR" | "smaller" | "bigger";
export type StickerState = { flip: boolean; rotate: number; size: number };

export type EditActions = {
  adjustSticker: (op: StickerOp) => void;
  /** free-position a block (x in % of the section width, y in px) */
  placeBlock: (id: string, x: number, y: number) => void;
  /** make a section's extra height below its content at least this many px (room for something dragged past its bottom) */
  growSection: (id: string, grow: number) => void;
  /** free-position a whole group / card box (same units as placeBlock) */
  placeGroup: (group: string, x: number, y: number) => void;
  /** resize a group / card box: width in % of the content column, height (minimum) in px */
  sizeGroup: (group: string, w: number, h: number) => void;
  /** put several elements of one section together in a row or a column ("none" takes them out of their group) */
  groupBlocks: (ids: string[], dir: "row" | "col" | "none") => void;
  moveBlock: (id: string, toSection: string, index: number) => void;
  addBlock: (type: BlockType, toSection: string, index: number) => void;
  removeBlock: (id: string) => void;
  moveSection: (id: string, index: number) => void;
  removeSection: (id: string) => void;
  addSection: (index: number) => void;
  addSticker: (sectionId: string, x: number, y: number, preset?: Partial<Decoration>) => void;
  selectSection: (id: string) => void;
  editSection: (id: string) => void;
  moveSectionBy: (id: string, delta: -1 | 1) => void;
  toggleHidden: (id: string) => void;
  setBorder: (id: string, patch: Partial<Section["border"]>) => void;
  duplicateSection: (id: string) => void;
  /** upload a picture of your own and drop it into a section as a sticker */
  uploadSticker: (sectionId: string, files: FileList | null) => Promise<void>;
  /** copy a free illustration (e.g. "noto:racing-car") into storage and drop it into a section as a sticker */
  importSticker: (sectionId: string, id: string) => Promise<void>;
};

type Payload = { kind: "block"; id: string } | { kind: "new"; type: BlockType } | { kind: "section"; id: string } | { kind: "sticker"; preset?: Partial<Decoration> };

/** What is currently being dragged (dataTransfer can't be read during dragover). */
// blocks that hug their content so the hover highlight is tight; the rest span the full width
const HUG = new Set(["badge", "heading", "text", "script", "button", "emoji", "illustration"]);

export const drag: { current: Payload | null } = { current: null };

/** Popover content: illustrated borders. Pick a side (or All), then a design; the size applies to every side. */
export function BorderPicker({ border, onChange }: { border: Section["border"]; onChange: (patch: Partial<Section["border"]>) => void }) {
  const sides = ["all", "top", "bottom", "left", "right"] as const;
  const [side, setSide] = useState<(typeof sides)[number]>("all");
  const current = side === "all" ? (border.top === border.bottom && border.top === border.left && border.top === border.right ? border.top : null) : border[side];
  const pick = (id: Section["border"]["top"]) => onChange(side === "all" ? { top: id, bottom: id, left: id, right: id } : { [side]: id });
  return (
    <div className="grid w-72 gap-3">
      <div className="flex flex-wrap gap-1">
        {sides.map((x) => (
          <button key={x} type="button" onClick={() => setSide(x)} className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${side === x ? "bg-fg text-surface" : "bg-surface-muted text-soft hover:text-fg"}`}>
            {x}
          </button>
        ))}
      </div>
      <div className="grid max-h-60 grid-cols-3 gap-2 overflow-y-auto p-0.5">
        {BORDER_OPTIONS.map(([id, label]) => (
          <button key={id} type="button" title={label} aria-label={label} aria-pressed={current === id} onClick={() => pick(id)} className={`grid gap-1 rounded-xl border p-1.5 text-center transition-colors hover:border-fg ${current === id ? "border-fg bg-surface-muted" : "border-border"}`}>
            <span className="flex h-8 items-center justify-center overflow-hidden rounded-md bg-surface-muted">
              <BorderThumb id={id} />
            </span>
            <span className="truncate text-[10px] font-medium">{label}</span>
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1">
          {(["sm", "md", "lg", "xl"] as const).map((z) => (
            <button key={z} type="button" onClick={() => onChange({ size: z })} className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase ${border.size === z ? "bg-fg text-surface" : "bg-surface-muted text-soft hover:text-fg"}`}>{z}</button>
          ))}
        </div>
        <Button variant="outline" size="xs" onClick={() => onChange({ top: "none", bottom: "none", left: "none", right: "none" })}>Remove all</Button>
      </div>
      <label className="grid gap-1 text-xs font-semibold">
        <span className="flex items-center justify-between">Bend the border<span className="font-normal text-soft">{border.curve === 0 ? "Flat" : border.curve > 0 ? `Sag ${border.curve}%` : `Arch ${-border.curve}%`}</span></span>
        <span className="text-[11px] font-normal leading-snug text-soft">Arch rises in the middle, sag hangs down.</span>
        <input type="range" min={-100} max={100} step={5} value={border.curve} onChange={(e) => onChange({ curve: +e.target.value })} className="w-full accent-[var(--color-accent-600)]" />
        <span className="flex justify-between text-[10px] font-normal text-soft"><span>Arch ⌒</span><span>Flat</span><span>Sag ⌣</span></span>
      </label>
      <label className="grid gap-1 text-xs font-semibold">
        <span className="flex items-center justify-between">Ripples<span className="font-normal text-soft">{(border.wave ?? 0) === 0 ? "None" : `${border.wave}%`}</span></span>
        <span className="text-[11px] font-normal leading-snug text-soft">Slide right for more ripples.</span>
        <input type="range" min={0} max={100} step={5} value={border.wave ?? 0} onChange={(e) => onChange({ wave: +e.target.value })} className="w-full accent-[var(--color-accent-600)]" />
        <span className="flex justify-between text-[10px] font-normal text-soft"><span>None</span><span>Few</span><span>Many</span></span>
      </label>
    </div>
  );
}

/** Popover content: animated illustrations to drop into a section (click to add, or drag onto the page). */
/** Search the free illustration libraries; picking one copies it into the page (no leaving the app). */
function IllustrationLibrary({ onImport }: { onImport: (id: string) => Promise<void> }) {
  const [source, setSource] = useState<"packs" | "emoji">("packs");
  const [pack, setPack] = useState<string>(ILLUSTRATION_PACKS[0].id);
  const [q, setQ] = useState("");
  const [set, setSet] = useState("all");
  const [ids, setIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const term = q.trim();
    if (!term) return; // the ideas show instead
    const ctl = new AbortController();
    const timer = setTimeout(async () => {
      setBusy(true);
      setError("");
      try {
        const res = await fetch(`/api/illustrations?q=${encodeURIComponent(term)}&set=${set}`, { signal: ctl.signal });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Search failed.");
        setIds(data.icons ?? []);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError((e as Error).message);
      } finally {
        if (!ctl.signal.aborted) setBusy(false);
      }
    }, 350);
    return () => {
      clearTimeout(timer);
      ctl.abort();
    };
  }, [q, set]);

  async function pick(id: string) {
    setAdding(id);
    try {
      await onImport(id);
    } finally {
      setAdding(null);
    }
  }

  const sources = (
    <div className="flex gap-1">
      {([["packs", "Characters"], ["emoji", "Icons & emoji"]] as const).map(([id, label]) => (
        <button key={id} type="button" onClick={() => setSource(id)} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${source === id ? "bg-accent-600 text-white" : "bg-surface-muted text-soft hover:text-fg"}`}>{label}</button>
      ))}
    </div>
  );

  if (source === "packs") {
    const files = PACK_FILES.filter(([p]) => p === pack);
    const info = ILLUSTRATION_PACKS.find((p) => p.id === pack)!;
    return (
      <div className="grid gap-2">
        {sources}
        <div className="flex gap-1">
          {ILLUSTRATION_PACKS.map((p) => (
            <button key={p.id} type="button" onClick={() => setPack(p.id)} className={`rounded-full border px-2.5 py-1 text-xs font-medium ${pack === p.id ? "border-fg text-fg" : "border-border text-soft hover:text-fg"}`}>{p.label}</button>
          ))}
        </div>
        <div className="grid max-h-60 grid-cols-3 gap-1.5 overflow-auto pr-1">
          {files.map(([p, file]) => {
            const id = `${p}:${file}`;
            return (
              <button key={id} type="button" title={packLabel(file)} aria-label={`Add ${packLabel(file)}`} disabled={!!adding} onClick={() => pick(id)} className="relative flex aspect-square items-center justify-center rounded-xl border border-border bg-white p-1.5 transition-colors hover:border-fg disabled:opacity-60">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/illustrations/${p}/${file}.svg`} alt="" loading="lazy" className="h-full w-full object-contain" />
                {adding === id && <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/70"><Loader2 size={16} className="animate-spin" /></span>}
              </button>
            );
          })}
        </div>
        <p className="text-[10px] leading-snug text-soft">{info.label} by {info.by}, free for any use ({info.license}). Added pictures are copied into your page.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      {sources}
      <label className="relative block">
        <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-soft" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search: car, dinosaur, cake…" aria-label="Search free illustrations" className="h-9 w-full rounded-lg border border-border-strong bg-surface pl-8 pr-2 text-sm text-fg placeholder:text-soft outline-none focus:border-fg-subtle" />
      </label>
      <div className="flex flex-wrap gap-1">
        {[{ prefix: "all", label: "All" }, ...ILLUSTRATION_SETS].map((x) => (
          <button key={x.prefix} type="button" onClick={() => setSet(x.prefix)} className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${set === x.prefix ? "border-fg text-fg" : "border-border text-soft hover:text-fg"}`}>{x.label}</button>
        ))}
      </div>
      {!q.trim() ? (
        <div className="flex flex-wrap gap-1.5">
          {ILLUSTRATION_IDEAS.map((w) => (
            <button key={w} type="button" onClick={() => setQ(w)} className="rounded-full border border-border bg-surface-muted px-2.5 py-1 text-xs font-medium capitalize text-soft hover:text-fg">{w}</button>
          ))}
        </div>
      ) : busy ? (
        <p className="flex items-center gap-2 py-6 text-sm text-soft"><Loader2 size={14} className="animate-spin" /> Searching…</p>
      ) : error ? (
        <p className="py-4 text-sm text-red-600">{error}</p>
      ) : ids.length === 0 ? (
        <p className="py-4 text-sm text-soft">Nothing found. Try another word.</p>
      ) : (
        <div className="grid max-h-60 grid-cols-4 gap-1.5 overflow-auto pr-1">
          {ids.map((id) => {
            const [prefix, name] = id.split(":");
            return (
              <button key={id} type="button" title={name.replace(/-/g, " ")} aria-label={`Add ${name.replace(/-/g, " ")}`} disabled={!!adding} onClick={() => pick(id)} className="relative flex aspect-square items-center justify-center rounded-xl border border-border bg-surface p-1.5 transition-colors hover:border-fg disabled:opacity-60">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`${ICONIFY}/${prefix}/${name}.svg`} alt="" loading="lazy" className="h-full w-full object-contain" />
                {adding === id && <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-surface/70"><Loader2 size={16} className="animate-spin" /></span>}
              </button>
            );
          })}
        </div>
      )}
      <p className="text-[10px] leading-snug text-soft">
        Free to use: {ILLUSTRATION_SETS.map((s) => `${s.name} (${s.license})`).join(", ")}. Added pictures are copied into your page.
      </p>
    </div>
  );
}

export function ArtPicker({ onPick, onUpload, onImport, sticker, adjust }: { onPick: (key: string) => void; onUpload?: (files: FileList | null) => void; onImport?: (id: string) => Promise<void>; sticker?: StickerState | null; adjust?: (op: StickerOp) => void }) {
  const [tab, setTab] = useState<"built" | "free">("built");
  const [aq, setAq] = useState("");
  const tile = ([key, label]: readonly [string, string]) => (
    <button
      key={key}
      type="button"
      title={label}
      aria-label={`Add ${label}`}
      draggable
      onDragStart={(e) => {
        drag.current = { kind: "sticker", preset: { kind: "art", content: key, size: 64, effect: "none" } };
        e.dataTransfer.setData("text/plain", key);
        e.dataTransfer.effectAllowed = "copy";
      }}
      onDragEnd={() => (drag.current = null)}
      onClick={() => onPick(key)}
      className="flex aspect-square w-full cursor-grab items-center justify-center rounded-xl border border-border bg-surface text-fg transition-colors hover:border-fg active:cursor-grabbing"
    >
      <span style={{ fontSize: 24 }}><ArtSvg name={key} /></span>
    </button>
  );
  return (
    <div data-action className="grid w-80 gap-2 p-1 text-left">
      {sticker && adjust && (
        <div className="grid gap-1.5 border-b border-border pb-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-soft">Selected sticker</p>
          <div className="flex items-center gap-1">
            {(
              [
                ["flip", "Mirror", <FlipHorizontal2 key="f" size={16} />, sticker.flip],
                ["rotL", "Rotate left", <RotateCcw key="l" size={16} />, false],
                ["rotR", "Rotate right", <RotateCw key="r" size={16} />, false],
                ["smaller", "Smaller", <ZoomOut key="s" size={16} />, false],
                ["bigger", "Bigger", <ZoomIn key="b" size={16} />, false],
              ] as [StickerOp, string, React.ReactNode, boolean][]
            ).map(([op, label, icon, on]) => (
              <Tooltip key={op} content={label} position="top" portal>
                <button
                  type="button"
                  aria-label={label}
                  aria-pressed={on}
                  onClick={() => adjust(op)}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${on ? "border-fg bg-fg text-surface" : "border-border hover:border-fg"}`}
                >
                  {icon}
                </button>
              </Tooltip>
            ))}
          </div>
          <p className="text-[11px] text-soft">Rotation {Math.round(sticker.rotate)}° · Size {sticker.size}</p>
        </div>
      )}
      {onImport && (
        <div className="flex gap-1">
          {([["built", "Animated"], ["free", "Free library"]] as const).map(([id, label]) => (
            <button key={id} type="button" onClick={() => setTab(id)} className={`flex-1 rounded-full px-2.5 py-1 text-xs font-semibold ${tab === id ? "bg-fg text-surface" : "bg-surface-muted text-soft hover:text-fg"}`}>{label}</button>
          ))}
        </div>
      )}
      {tab === "free" && onImport ? (
        <IllustrationLibrary onImport={onImport} />
      ) : (
        <>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-soft">Animated illustrations</p>
          <label className="relative block">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-soft" />
            <input value={aq} onChange={(e) => setAq(e.target.value)} placeholder="Search animated: balloon, star, cake…" aria-label="Search animated illustrations" className="h-9 w-full rounded-lg border border-border-strong bg-surface pl-8 pr-2 text-sm text-fg placeholder:text-soft outline-none focus:border-fg-subtle" />
          </label>
          {(() => {
            const words = aq.trim().toLowerCase().split(/\s+/).filter(Boolean);
            const groups = ART_GROUPS.map(([title, items]) => [title, words.length ? items.filter(([k, l]) => words.every((w) => `${k} ${l} ${title}`.toLowerCase().includes(w))) : items] as const).filter(([, items]) => items.length);
            return (
              <div className="grid max-h-72 gap-3 overflow-auto pr-1">
                {groups.length === 0 && <p className="py-6 text-center text-xs text-soft">No animated illustration matches “{aq}”.</p>}
                {groups.map(([title, items]) => (
                  <div key={title} className="grid gap-1.5">
                    <p className="text-xs font-semibold text-fg">{title}</p>
                    <div className="grid grid-cols-4 gap-1.5">{items.map(tile)}</div>
                  </div>
                ))}
              </div>
            );
          })()}
        </>
      )}
      {onUpload && (
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-accent-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-500">
          <ImagePlus size={16} />
          Upload your own image
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            hidden
            onChange={(e) => {
              onUpload(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      )}
    </div>
  );
}

export type Limits = { rsvp: boolean; stickers: boolean; textCount: number; graffitiCount: number };

/** Popover content: every element you can add to this section (click to add, or drag onto the page). */
function ElementPicker({ onPick, limits }: { onPick: (type: ElementType) => void; limits: Limits }) {
  return (
    <div data-action className="grid w-64 gap-3 p-1 text-left">
      {GROUPS.map((g) => (
        <div key={g.title} className="grid gap-1.5">
          <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-soft">
            <g.Icon size={12} />
            {g.title}
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {g.types.map((type) => {
              const { Icon, label } = elementMeta(type);
              const disabled = type === "sticker" ? limits.stickers : type === "rsvp" && limits.rsvp;
              return (
                <button
                  key={type}
                  type="button"
                  disabled={disabled}
                  draggable={!disabled}
                  title={disabled ? (type === "sticker" ? "Sticker limit reached" : "The page already has an RSVP form") : label}
                  onDragStart={(e) => {
                    drag.current = type === "sticker" ? { kind: "sticker" } : { kind: "new", type };
                    e.dataTransfer.setData("text/plain", type);
                    e.dataTransfer.effectAllowed = "copy";
                  }}
                  onDragEnd={() => (drag.current = null)}
                  onClick={() => onPick(type)}
                  className="flex cursor-grab flex-col items-center gap-1 rounded-lg border border-border bg-surface px-1 py-2 text-fg transition-colors hover:border-fg active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Icon size={17} strokeWidth={1.5} className="text-soft" />
                  <span className="text-[10px] font-medium leading-tight">{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Popover content: the text stickers (+ Text, + Graffiti), with how many of each are already on the page. */
function TextStickerPicker({ limits, onPick }: { limits: Limits; onPick: (preset: Partial<Decoration>) => void }) {
  const counts = [limits.textCount, limits.graffitiCount];
  return (
    <div data-action className="grid w-56 gap-2 p-1 text-left">
      <h4 className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-soft">
        <Type size={13} />
        Text
      </h4>
      <div className="flex flex-wrap gap-1.5">
        {TEXT_PRESETS.map((p, i) => (
          <div
            key={p.label}
            draggable={!limits.stickers}
            onDragStart={(e) => {
              drag.current = { kind: "sticker", preset: p.d };
              e.dataTransfer.setData("text/plain", p.label);
              e.dataTransfer.effectAllowed = "copy";
            }}
            onDragEnd={() => (drag.current = null)}
            className="cursor-grab"
          >
            <Button variant="outline" size="xs" disabled={limits.stickers} onClick={() => onPick(p.d)}>
              {p.label}
              {counts[i] > 0 && (
                <Badge variant="solid" size="xs" className="ml-1.5">
                  {counts[i]}
                </Badge>
              )}
            </Button>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-soft">Click to add in the middle, or drag onto the page.</p>
    </div>
  );
}

const half = (e: React.DragEvent) => {
  const r = e.currentTarget.getBoundingClientRect();
  return e.clientY < r.top + r.height / 2 ? "before" : "after";
};

export function EditBlock({
  block,
  sectionId,
  index,
  selected,
  pickedNo = 0,
  actions,
  children,
}: {
  block: Block;
  sectionId: string;
  index: number;
  selected: boolean;
  /** 1, 2, 3… = its place in the multi-selection; 0 = not picked */
  pickedNo?: number;
  actions: EditActions;
  children: ReactNode;
}) {
  const [over, setOver] = useState<"before" | "after" | null>(null);
  const [guide, setGuide] = useState<{ x: number; top: number; height: number; snapped: boolean } | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const ring = useFittedRing(root, body);
  /** is the pointer on what the element shows (its fitted frame), not just somewhere on its full-width row? */
  const onContent = (x: number, y: number) => {
    const el = root.current;
    if (!el || !ring) return true;
    const er = el.getBoundingClientRect();
    const k = er.width / (el.offsetWidth || er.width);
    return x >= er.left + (ring.l - 4) * k && x <= er.left + (ring.l + ring.w + 4) * k && y >= er.top + (ring.t - 4) * k && y <= er.top + (ring.t + ring.h + 4) * k;
  };

  // free drag: move the element anywhere in its section; a centre line shows (and snaps) while dragging, and everything below follows (the section grows or shrinks with it)
  const startMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = root.current;
    const wrap = el?.closest<HTMLElement>("[data-sec-body]");
    const sec = el?.closest<HTMLElement>("[data-section]");
    if (e.button !== 0 || e.shiftKey || e.metaKey || e.ctrlKey || !el || !wrap || !sec || (e.target as HTMLElement).closest("[data-action],input,textarea,select")) return;
    const on = onContent(e.clientX, e.clientY);
    // beside this element, but on another one that shows there (overlapping rows): that one is what was pressed
    if (!on) {
      const other = blockAtPoint(e.clientX, e.clientY, el) as (HTMLElement & { __startMove?: (ev: React.PointerEvent<HTMLDivElement>) => void }) | null;
      if (other?.__startMove) {
        other.__startMove(e);
        return;
      }
    }
    // inside a card box: a press beside the element's own content (or anywhere, once the box is selected) moves the box instead
    if (block.group && (!on || el.closest(".is-group-sel"))) {
      (e.nativeEvent as PointerEvent & { boxDrag?: boolean }).boxDrag = true;
      return;
    }
    // only the element itself drags it: beside it, on its empty row, the press belongs to the section (select it / draw a selection box)
    if (!on) {
      (e.nativeEvent as PointerEvent & { offBlock?: boolean }).offBlock = true;
      return;
    }
    const sx = e.clientX, sy = e.clientY;
    const r0 = el.getBoundingClientRect();
    const box = block.group ? el.closest<HTMLElement>("[data-group]") : null;
    if (box) {
      // inside a card box: the element moves freely within the box (its left is a % of the box's width, as CSS places it)
      const g0 = box.getBoundingClientRect();
      const k = r0.width / (el.offsetWidth || r0.width);
      // CSS places its left as a % of the box's inner width (inside its padding)
      const bcs = getComputedStyle(box);
      const cw = (box.clientWidth - parseFloat(bcs.paddingLeft) - parseFloat(bcs.paddingRight)) * k;
      // what the element shows (its words / picture), so it is that which stays inside the box, not its full-width row
      const c0 = ring ? { l: r0.left + ring.l * k, t: r0.top + ring.t * k, r: r0.left + (ring.l + ring.w) * k, b: r0.top + (ring.t + ring.h) * k } : { l: r0.left, t: r0.top, r: r0.right, b: r0.bottom };
      const px0b = (block.x / 100) * cw;
      const gcx = g0.left + g0.width / 2;
      let movedB = false;
      const moveB = (ev: PointerEvent) => {
        let dx = ev.clientX - sx;
        const dy = ev.clientY - sy;
        if (!movedB && Math.hypot(dx, dy) < 4) return;
        movedB = true;
        dx = Math.max(g0.left - c0.l, Math.min(g0.right - c0.r, dx));
        const snapped = Math.abs((c0.l + c0.r) / 2 + dx - gcx) < 8;
        if (snapped) dx = gcx - (c0.l + c0.r) / 2;
        // anywhere between the box's top and bottom (inside a box an element floats at its spot: nothing else moves)
        const ddy = Math.max(g0.top - c0.t, Math.min(g0.bottom - c0.b, dy));
        actions.placeBlock(block.id, Math.round(((px0b + dx) / cw) * 1000) / 10, Math.round(block.y + ddy / k));
        setGuide({ x: gcx, top: g0.top, height: g0.height, snapped });
      };
      const upB = () => {
        window.removeEventListener("pointermove", moveB);
        window.removeEventListener("pointerup", upB);
        window.removeEventListener("pointercancel", upB);
        setGuide(null);
        if (movedB) {
          const stop = (c: MouseEvent) => { c.preventDefault(); c.stopPropagation(); };
          window.addEventListener("click", stop, { capture: true, once: true });
          setTimeout(() => window.removeEventListener("click", stop, true), 0);
        }
      };
      window.addEventListener("pointermove", moveB);
      window.addEventListener("pointerup", upB);
      window.addEventListener("pointercancel", upB);
      return;
    }
    const w0 = wrap.getBoundingClientRect();
    const s0 = sec.getBoundingClientRect();
    const room = makeRoom(sec, actions);
    const px0 = (block.x / 100) * w0.width;
    const baseCx = r0.left + r0.width / 2 - px0;
    const cx = w0.left + w0.width / 2;
    let moved = false;
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - sx, dy = ev.clientY - sy;
      if (!moved && Math.hypot(dx, dy) < 4) return;
      moved = true;
      let px = px0 + dx;
      const snapped = Math.abs(baseCx + px - cx) < 8;
      if (snapped) px = cx - baseCx;
      // keep at least part of the element inside the section (full-width elements can still be nudged sideways)
      const keep = Math.min(r0.width, 80);
      px = Math.max(w0.left + keep - r0.width / 2 - baseCx, Math.min(w0.right - keep + r0.width / 2 - baseCx, px));
      // pushing: upwards the limit is the element's original spot (its normal spacing); downwards it pushes what is below
      // overlapping: it floats anywhere inside the section and nothing else moves
      const y = block.overlap
        ? Math.round(Math.max(block.y - (r0.top - s0.top), block.y + dy)) // down as far as you like: the section grows to hold it
        : Math.max(0, Math.round(block.y + dy));
      actions.placeBlock(block.id, Math.round((px / w0.width) * 1000) / 10, y);
      if (block.overlap) room(r0.bottom + (y - block.y)); // floating over the others: the section grows to hold it
      const sr = sec.getBoundingClientRect();
      setGuide({ x: cx, top: sr.top, height: sr.height, snapped });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      setGuide(null);
      // releasing over a button / link must not press it
      if (moved) {
        const stop = (c: MouseEvent) => { c.preventDefault(); c.stopPropagation(); };
        window.addEventListener("click", stop, { capture: true, once: true });
        setTimeout(() => window.removeEventListener("click", stop, true), 0);
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };
  // other elements may hand a press to this one (when its content is under the pointer but their row is on top)
  useEffect(() => {
    if (root.current) (root.current as HTMLElement & { __startMove?: typeof startMove }).__startMove = startMove;
  });
  return (
    <div
      ref={root}
      data-block={block.id}
      {...blockPhoneAttrs(block).attrs}
      onPointerDown={startMove}
      // the grab hand only over the element itself
      style={{ ...(block.x || block.y ? (block.overlap ? { left: `${block.x}%`, top: block.y, zIndex: 2 } : block.group ? { left: `${block.x}%`, top: block.y } : { left: `${block.x}%`, marginTop: block.y }) : {}), ...blockPhoneAttrs(block).vars } as React.CSSProperties}
      onDragOver={(e) => {
        const p = drag.current;
        if (!p || p.kind === "section" || p.kind === "sticker" || (p.kind === "block" && p.id === block.id)) return;
        e.preventDefault();
        e.stopPropagation();
        setOver(half(e));
      }}
      onDragLeave={() => setOver(null)}
      onDrop={(e) => {
        const p = drag.current;
        if (!p || p.kind === "section" || p.kind === "sticker") return;
        e.preventDefault();
        e.stopPropagation();
        const at = index + (over === "after" ? 1 : 0);
        drag.current = null;
        setOver(null);
        if (p.kind === "block") actions.moveBlock(p.id, sectionId, at);
        else actions.addBlock(p.type, sectionId, at);
      }}
      className={`group/b relative flex ${HUG.has(block.type) ? "w-fit max-w-full" : "w-full"} touch-none flex-col items-center ${selected ? "is-selected z-50" : ""} ${pickedNo ? "is-picked" : ""}`}
    >
      {over === "before" && <i className="drop-line -top-3" />}
      {pickedNo > 0 && (
        <span aria-label={`Selected ${pickedNo}`} className="pick-badge pointer-events-none absolute -left-3 -top-3 z-30 flex h-7 min-w-7 items-center justify-center gap-0.5 rounded-full bg-brand px-1.5 text-xs font-extrabold text-white shadow-lg ring-2 ring-white">
          <Check size={13} strokeWidth={3} />{pickedNo}
        </span>
      )}
      <div ref={body} className="contents">{children}</div>
      {/* the hover / selected frame, fitted to what the element shows (its words, picture, box), not its full-width row */}
      {ring && <span aria-hidden className="block-ring pointer-events-none absolute z-[25]" style={{ left: ring.l, top: ring.t, width: ring.w, height: ring.h, borderRadius: ring.radius }} />}
      {over === "after" && <i className="drop-line -bottom-3" />}
      {guide && createPortal(<i aria-hidden className={`pointer-events-none fixed z-[100] w-0 transition-colors border-l-2 border-dashed`} style={{ left: guide.x, top: guide.top, height: guide.height, borderColor: guide.snapped ? "#22c55e" : "#ef4444" }} />, document.body)}
      <div
        className={`absolute -top-3 right-0 z-30 flex items-center gap-1 rounded-full bg-brand px-2 py-0.5 text-xs font-bold text-white shadow ${selected ? "" : "pointer-events-none opacity-0 group-hover/b:pointer-events-auto group-hover/b:opacity-100"}`}
      >
        {/* the grip is the handle for re-ordering (drop between elements or into another section); the body of the element moves freely */}
        <span
          data-action
          draggable
          title="Drag to re-order"
          className="flex cursor-grab items-center"
          onPointerDown={(e) => e.stopPropagation()}
          onDragStart={(e) => {
            e.stopPropagation();
            drag.current = { kind: "block", id: block.id };
            e.dataTransfer.setData("text/plain", block.id);
            e.dataTransfer.effectAllowed = "move";
          }}
          onDragEnd={() => {
            drag.current = null;
            setOver(null);
          }}
        ><GripVertical size={14} />{block.type}</span>
        <button type="button" data-action aria-label="Remove element" onClick={() => actions.removeBlock(block.id)} className="ml-1 rounded-full p-0.5 hover:bg-white/30"><X size={14} /></button>
      </div>
    </div>
  );
}

export function EditSection({
  fixed = false,
  section,
  index,
  count,
  sticker,
  limits,
  selected,
  actions,
  layer,
  children,
}: {
  /** a section that can't be moved, copied or deleted (the opening card's) */
  fixed?: boolean;
  section: Section;
  index: number;
  count: number;
  sticker: StickerState | null;
  limits: Limits;
  selected: boolean;
  actions: EditActions;
  layer: ReactNode;
  children: ReactNode;
}) {
  const [over, setOver] = useState<"before" | "after" | "inside" | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [artOpen, setArtOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [textOpen, setTextOpen] = useState(false);
  const [borderOpen, setBorderOpen] = useState(false);
  return (
    <motion.div
      layout="position"
      transition={{ type: "spring", stiffness: 380, damping: 36 }}
      data-section={section.id}
      data-show={section.showOn && section.showOn !== "all" ? section.showOn : undefined}
      className={`group/s decor-host relative hover:z-40 ${selected ? "is-selected z-40" : ""} ${menuOpen || artOpen || addOpen || textOpen || borderOpen ? "!z-[60]" : ""} ${section.card ? "mx-auto my-8 w-[calc(100%-1.5rem)] max-w-7xl rounded-[64px] border border-border shadow-[0_10px_28px_-18px_rgba(0,0,0,0.25)]" : ""} ${section.hidden ? "opacity-50" : ""}`}
      onDragOver={(e) => {
        const p = drag.current;
        if (!p) return;
        e.preventDefault();
        setOver(p.kind === "section" ? half(e) : "inside");
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(null);
      }}
      onDrop={(e) => {
        const p = drag.current;
        if (!p) return;
        e.preventDefault();
        const pos = over;
        drag.current = null;
        setOver(null);
        if (p.kind === "sticker") {
          // dropped stickers are placed in % of the sticker band (see .decor-band), as everywhere else
          const r = (e.currentTarget.querySelector("[data-decor-band]") ?? e.currentTarget).getBoundingClientRect();
          actions.addSticker(section.id, fixed ? Math.round(((e.clientX - r.left) / r.width) * 1000) / 10 : decorXFromPx(e.clientX - r.left, r.width, section.wide), Math.round(((e.clientY - r.top) / r.height) * 1000) / 10, p.preset);
        } else if (p.kind === "section") {
          if (!fixed) actions.moveSection(p.id, index + (pos === "after" ? 1 : 0));
        }
        else if (p.kind === "block") actions.moveBlock(p.id, section.id, section.blocks.length);
        else actions.addBlock(p.type, section.id, section.blocks.length);
      }}
    >
      {over === "before" && <i className="drop-line -top-1" />}
      {over === "inside" && <i className="pointer-events-none absolute inset-0 z-40 rounded-[inherit] ring-4 ring-inset ring-brand/50" />}
      {children}
      {layer}
      {section.blocks.length === 0 && !fixed && (
        // drawn over the section, so it adds no height (the section is as tall here as on the live page, and its stickers sit in the same place)
        <p className="pointer-events-none absolute inset-4 z-20 flex items-center justify-center rounded-2xl border-2 border-dashed border-brand/40 text-center text-sm font-bold text-brand">Empty section — drop elements here</p>
      )}
      {/* section tools: a vertical rail in the gutter outside the left edge. data-action lets clicks through the editor's "click only selects" guard */}
      <div
        data-action
        // the card's tools sit in the gutter beside it; a page section is as wide as the canvas, so its tools sit just inside its left edge
        className={`pointer-events-none absolute ${fixed ? "-left-11" : "left-2"} top-3 z-[45] flex w-9 flex-col items-center gap-1.5`}
      >
        <div className={`flex flex-col items-center gap-0.5 rounded-2xl bg-ink p-1 text-white shadow-lg pointer-events-auto`}>
        <Popover
          position="right"
          classNames={{ panel: "top-0 translate-y-0" }}
          open={addOpen}
          onOpenChange={(o) => {
            setAddOpen(o);
            if (o) actions.selectSection(section.id);
          }}
          content={
            <ElementPicker
              limits={limits}
              onPick={(type) => {
                if (type === "sticker") actions.addSticker(section.id, 50, 50);
                else actions.addBlock(type, section.id, section.blocks.length);
                setAddOpen(false);
              }}
            />
          }
        >
          <Tooltip content="Add an element" position="right" portal>
            <button type="button" aria-label="Add an element" className="flex h-7 w-7 items-center justify-center rounded-xl hover:bg-white/20">
              <Plus size={16} />
            </button>
          </Tooltip>
        </Popover>
        <Popover
          position="right"
          classNames={{ panel: "top-0 translate-y-0" }}
          open={textOpen}
          onOpenChange={(o) => {
            setTextOpen(o);
            if (o) actions.selectSection(section.id);
          }}
          content={
            <TextStickerPicker
              limits={limits}
              onPick={(preset) => {
                actions.addSticker(section.id, 50, 50, preset);
                setTextOpen(false);
              }}
            />
          }
        >
          <Tooltip content="Text stickers" position="right" portal>
            <button type="button" aria-label="Text stickers" className="flex h-7 w-7 items-center justify-center rounded-xl hover:bg-white/20">
              <Type size={16} />
            </button>
          </Tooltip>
        </Popover>
        <Popover
          position="right"
          classNames={{ panel: "top-0 translate-y-0" }}
          open={artOpen}
          onOpenChange={(o) => {
            setArtOpen(o);
            if (o) actions.selectSection(section.id);
          }}
          content={
            <ArtPicker
              sticker={sticker}
              adjust={actions.adjustSticker}
              onUpload={(files) => {
                void actions.uploadSticker(section.id, files);
                setArtOpen(false);
              }}
              onImport={async (id) => {
                await actions.importSticker(section.id, id);
                setArtOpen(false);
              }}
              onPick={(key) => {
                actions.addSticker(section.id, 50, 50, { kind: "art", content: key, size: 64, effect: "none" });
                setArtOpen(false);
              }}
            />
          }
        >
          <Tooltip content="Illustrations" position="right" portal>
            <button type="button" aria-label="Add animated illustration" className="flex h-7 w-7 items-center justify-center rounded-xl hover:bg-white/20">
              <PartyPopper size={16} />
            </button>
          </Tooltip>
        </Popover>
        <Popover
          position="right"
          classNames={{ panel: "top-0 translate-y-0" }}
          open={borderOpen}
          onOpenChange={(o) => {
            setBorderOpen(o);
            if (o) actions.selectSection(section.id);
          }}
          content={<BorderPicker border={section.border} onChange={(patch) => actions.setBorder(section.id, patch)} />}
        >
          <Tooltip content="Borders" position="right" portal>
            <button type="button" aria-label="Section borders" className="flex h-7 w-7 items-center justify-center rounded-xl hover:bg-white/20">
              <Frame size={16} />
            </button>
          </Tooltip>
        </Popover>
        <DropdownMenu
          align="start"
          onOpenChange={(o) => {
            setMenuOpen(o);
            if (o) actions.selectSection(section.id);
          }}
          trigger={
            <Tooltip content="Section options" position="right" portal>
              <button type="button" aria-label="Section options" className="flex h-7 w-7 items-center justify-center rounded-xl hover:bg-white/20">
                <MoreHorizontal size={16} />
              </button>
            </Tooltip>
          }
        >
          <DropdownMenuItem icon="sparkles" onClick={() => actions.editSection(section.id)}>Edit section</DropdownMenuItem>
          <DropdownMenuItem icon={section.hidden ? "eye" : "eye-off"} onClick={() => actions.toggleHidden(section.id)}>{section.hidden ? "Show on site" : "Hide on site"}</DropdownMenuItem>
          {!fixed && <DropdownMenuItem icon="copy" onClick={() => actions.duplicateSection(section.id)}>Duplicate</DropdownMenuItem>}
          {!fixed && <DropdownMenuItem icon="trash-2" danger onClick={() => actions.removeSection(section.id)}>Delete section</DropdownMenuItem>}
        </DropdownMenu>
        {section.hidden && (
          <Tooltip content="Hidden on the live site — click to show it" position="right" portal>
            <button type="button" aria-label="Show this section on the site" onClick={() => actions.toggleHidden(section.id)} className="flex h-7 w-7 items-center justify-center rounded-xl text-white/80 hover:bg-white/20 hover:text-white">
              <EyeOff size={16} />
            </button>
          </Tooltip>
        )}
        </div>
        {/* move up / down: second pill under the tools */}
        {!fixed && <div className={`flex flex-col items-center gap-0.5 rounded-2xl bg-ink p-1 text-white shadow-lg pointer-events-auto`}>
          <Tooltip content="Move up" position="right" portal>
            <button type="button" aria-label="Move section up" disabled={index === 0} onClick={() => actions.moveSectionBy(section.id, -1)} className="flex h-7 w-7 items-center justify-center rounded-xl hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-transparent">
              <ArrowUp size={16} />
            </button>
          </Tooltip>
          <Tooltip content="Move down" position="right" portal>
            <button type="button" aria-label="Move section down" disabled={index === count - 1} onClick={() => actions.moveSectionBy(section.id, 1)} className="flex h-7 w-7 items-center justify-center rounded-xl hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-transparent">
              <ArrowDown size={16} />
            </button>
          </Tooltip>
        </div>}
      </div>
      {/* section name label: top right, straddling the top edge */}
      <div className={`pointer-events-none absolute top-1.5 right-3 z-50 ${selected || menuOpen || artOpen || addOpen || textOpen || borderOpen ? "" : "opacity-0 group-hover/s:opacity-100"}`}>
        <span className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold text-white shadow-lg ${selected ? "bg-[#2563eb]" : "bg-ink"}`}>
          {selected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
          {section.name || "Section"}
          {section.hidden && <span className="ml-1.5 font-normal opacity-70">(hidden)</span>}
        </span>
      </div>
      {over === "after" && <i className="drop-line -bottom-1" />}
    </motion.div>
  );
}


/** Editor: a group / card box that can be dragged by its own box (its edge, padding or its tag); the elements inside still drag on their own.
 *  Like an element, it moves sideways freely (a centre line shows and snaps) and downwards pushes what is below. */
export function EditGroup({ group, floating = false, x, y, actions, className, style, attrs, children }: { group: string; floating?: boolean; x: number; y: number; actions: EditActions; className: string; style: React.CSSProperties; attrs?: Record<string, string>; children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const [guide, setGuide] = useState<{ x: number; top: number; height: number; snapped: boolean } | null>(null);
  const start = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = root.current;
    const t = e.target as HTMLElement;
    // only the box itself: a press on an element inside it moves that element instead
    const handed = (e.nativeEvent as PointerEvent & { boxDrag?: boolean }).boxDrag;
    if (e.button !== 0 || !el || (t.closest("[data-block]") && !handed) || t.closest("[data-action],input,textarea,select")) return;
    const wrap = el.closest<HTMLElement>("[data-sec-body]");
    const sec = el.closest<HTMLElement>("[data-section]");
    if (!wrap || !sec) return;
    e.stopPropagation(); // not a marquee
    const sx = e.clientX, sy = e.clientY;
    const r0 = el.getBoundingClientRect();
    const w0 = wrap.getBoundingClientRect();
    const s0 = (sec.querySelector("section") ?? sec).getBoundingClientRect(); // the whole section: the box may go to its sides too
    const room = makeRoom(sec, actions);
    if (floating) {
      // fixed box: moves anywhere inside its section; a centre line shows and snaps
      const left0 = r0.left - w0.left, top0 = r0.top - w0.top;
      const cx = w0.left + w0.width / 2;
      let movedF = false;
      const moveF = (ev: PointerEvent) => {
        const dx = ev.clientX - sx, dy = ev.clientY - sy;
        if (!movedF && Math.hypot(dx, dy) < 4) return;
        movedF = true;
        let left = Math.max(s0.left - w0.left, Math.min(s0.right - w0.left - r0.width, left0 + dx));
        const snapped = Math.abs(w0.left + left + r0.width / 2 - cx) < 8;
        if (snapped) left = w0.width / 2 - r0.width / 2;
        const top = Math.max(s0.top - w0.top, top0 + dy); // down as far as you like: the section grows to hold it
        room(w0.top + top + r0.height);
        actions.placeGroup(group, Math.round((left / w0.width) * 1000) / 10, Math.round(top));
        const sr = sec.getBoundingClientRect();
        setGuide({ x: cx, top: sr.top, height: sr.height, snapped });
      };
      const upF = () => {
        window.removeEventListener("pointermove", moveF);
        window.removeEventListener("pointerup", upF);
        window.removeEventListener("pointercancel", upF);
        setGuide(null);
        if (movedF) {
          const stop = (c: MouseEvent) => { c.preventDefault(); c.stopPropagation(); };
          window.addEventListener("click", stop, { capture: true, once: true });
          setTimeout(() => window.removeEventListener("click", stop, true), 0);
        }
      };
      window.addEventListener("pointermove", moveF);
      window.addEventListener("pointerup", upF);
      window.addEventListener("pointercancel", upF);
      return;
    }
    const px0 = (x / 100) * w0.width;
    const baseCx = r0.left + r0.width / 2 - px0;
    const cx = w0.left + w0.width / 2;
    let moved = false;
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - sx, dy = ev.clientY - sy;
      if (!moved && Math.hypot(dx, dy) < 4) return;
      moved = true;
      let px = px0 + dx;
      const snapped = Math.abs(baseCx + px - cx) < 8;
      if (snapped) px = cx - baseCx;
      // anywhere across the whole section (its sides too), and up as far as the section's top
      px = Math.max(s0.left + r0.width / 2 - baseCx, Math.min(s0.right - r0.width / 2 - baseCx, px));
      const ny = Math.max(y - (r0.top - s0.top), Math.round(y + dy));
      actions.placeGroup(group, Math.round((px / w0.width) * 1000) / 10, ny);
      const sr = sec.getBoundingClientRect();
      setGuide({ x: cx, top: sr.top, height: sr.height, snapped });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      setGuide(null);
      if (moved) {
        const stop = (c: MouseEvent) => { c.preventDefault(); c.stopPropagation(); };
        window.addEventListener("click", stop, { capture: true, once: true });
        setTimeout(() => window.removeEventListener("click", stop, true), 0);
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };
  // the corner handle: drag to make the box wider / narrower and taller / shorter (it stays centred, so the width changes on both sides)
  const resize = (e: React.PointerEvent<HTMLSpanElement>) => {
    const el = root.current;
    const wrap = el?.closest<HTMLElement>("[data-sec-body]");
    if (e.button !== 0 || !el || !wrap) return;
    e.stopPropagation();
    e.preventDefault();
    const sx = e.clientX, sy = e.clientY;
    const r0 = el.getBoundingClientRect();
    const ww = wrap.getBoundingClientRect().width;
    const secEl = el.closest<HTMLElement>("[data-section]");
    const room = secEl ? makeRoom(secEl, actions) : null;
    const move = (ev: PointerEvent) => {
      const w = Math.max(10, Math.min(100, Math.round(((r0.width + 2 * (ev.clientX - sx)) / ww) * 1000) / 10));
      const h = Math.max(0, Math.round(r0.height + (ev.clientY - sy)));
      actions.sizeGroup(group, w, h);
      room?.(r0.top + h); // a taller box past the bottom: the section grows to hold it
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      const stop = (c: MouseEvent) => { c.preventDefault(); c.stopPropagation(); };
      window.addEventListener("click", stop, { capture: true, once: true });
      setTimeout(() => window.removeEventListener("click", stop, true), 0);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };
  return (
    <div ref={root} {...attrs} data-group={group} onPointerDown={start} className={`${className} cursor-grab active:cursor-grabbing`} style={style}>
      {children}
      <span
        data-action
        role="separator"
        aria-label="Resize the box"
        title="Drag to resize"
        onPointerDown={resize}
        className="group-tag absolute -bottom-2 -right-2 z-[70] h-4 w-4 rounded-full border-2 border-white bg-[#2563eb] shadow"
        style={{ cursor: "nwse-resize" }}
      />
      {guide && createPortal(<i aria-hidden className="pointer-events-none fixed z-[100] w-0 border-l-2 border-dashed transition-colors" style={{ left: guide.x, top: guide.top, height: guide.height, borderColor: guide.snapped ? "#22c55e" : "#ef4444" }} />, document.body)}
    </div>
  );
}


/** The area an element really shows inside its row: its words (by their glyphs), pictures, drawings and painted boxes.
 *  Measured again when it changes size or content, so the editor's frame hugs it. Coordinates are in the row's own CSS pixels. */
function useFittedRing(root: React.RefObject<HTMLDivElement | null>, body: React.RefObject<HTMLDivElement | null>) {
  const [box, setBox] = useState<{ l: number; t: number; w: number; h: number; radius: string } | null>(null);
  useLayoutEffect(() => {
    const host = root.current, el = body.current;
    if (!host || !el) return;
    let raf = 0;
    const measure = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r0 = host.getBoundingClientRect();
        if (!r0.width) return;
        const k = host.offsetWidth / r0.width; // screen px -> the row's px (the row may be zoomed)
        let L = Infinity, T = Infinity, R = -Infinity, B = -Infinity;
        // the biggest painted shape (a button's pill, a picture, a card): when it is the whole element, the frame takes its corners
        let main: { r: DOMRect; radius: string } | null = null;
        const add = (r: DOMRect) => {
          if (r.width < 1 || r.height < 1) return;
          L = Math.min(L, r.left); T = Math.min(T, r.top); R = Math.max(R, r.right); B = Math.max(B, r.bottom);
        };
        const walk = document.createTreeWalker(el, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
        const range = document.createRange();
        for (let n = walk.nextNode(); n; n = walk.nextNode()) {
          if (n.nodeType === Node.TEXT_NODE) {
            if (!n.textContent?.trim()) continue;
            range.selectNodeContents(n);
            for (const r of Array.from(range.getClientRects())) add(r);
            continue;
          }
          const e = n as HTMLElement;
          // a drawing: its drawn shapes, not its (mostly empty) box
          if (e.tagName.toLowerCase() === "svg") {
            for (const s of Array.from(e.querySelectorAll("path,circle,rect,ellipse,polygon,polyline,line,text,image,use"))) {
              if (s.closest("defs,clipPath,mask,pattern,symbol,linearGradient,radialGradient,marker")) continue;
              add(s.getBoundingClientRect());
            }
            continue;
          }
          // a picture: its visible pixels (a cut-out's see-through edges are not part of it)
          if (e.tagName === "IMG") {
            const im = e as HTMLImageElement;
            const r = im.getBoundingClientRect();
            const fit = getComputedStyle(im).objectFit;
            const a = fit === "cover" || !im.naturalWidth ? null : alphaBoundsNow(im.currentSrc || im.src, measure);
            let box = r;
            if (im.naturalWidth && fit === "contain") {
              const ar = im.naturalWidth / im.naturalHeight;
              let pw = r.width, ph = r.height;
              if (r.width / r.height > ar) pw = r.height * ar;
              else ph = r.width / ar;
              box = new DOMRect(r.left + (r.width - pw) / 2, r.top + (r.height - ph) / 2, pw, ph);
            }
            const v = a ? new DOMRect(box.left + a.l * box.width, box.top + a.t * box.height, box.width * (1 - a.l - a.r), box.height * (1 - a.t - a.b)) : box;
            add(v);
            if (!main || v.width * v.height > main.r.width * main.r.height) main = { r: v, radius: a ? "6px" : getComputedStyle(im).borderRadius };
            continue;
          }
          if (/^(CANVAS|IFRAME|VIDEO|INPUT|TEXTAREA|SELECT|BUTTON)$/i.test(e.tagName)) {
            const r = e.getBoundingClientRect();
            add(r);
            if (!main || r.width * r.height > main.r.width * main.r.height) main = { r, radius: getComputedStyle(e).borderRadius };
            continue;
          }
          const cs = getComputedStyle(e);
          if (cs.display === "none" || cs.visibility === "hidden") continue;
          const painted = cs.backgroundImage !== "none" || !/rgba\(0, 0, 0, 0\)|transparent/.test(cs.backgroundColor) || parseFloat(cs.borderTopWidth) > 0 || parseFloat(cs.borderLeftWidth) > 0 || cs.boxShadow !== "none";
          if (painted) {
            const r = e.getBoundingClientRect();
            add(r);
            if (!main || r.width * r.height > main.r.width * main.r.height) main = { r, radius: cs.borderRadius };
          }
        }
        if (L === Infinity) return setBox(null);
        const m = main as { r: DOMRect; radius: string } | null;
        const whole = !!m && Math.abs(m.r.left - L) < 2 && Math.abs(m.r.top - T) < 2 && Math.abs(m.r.right - R) < 2 && Math.abs(m.r.bottom - B) < 2;
        const radius = whole && m && m.radius && m.radius !== "0px" ? m.radius : "6px";
        const next = { l: Math.round((L - r0.left) * k), t: Math.round((T - r0.top) * k), w: Math.round((R - L) * k), h: Math.round((B - T) * k), radius };
        setBox((p) => (p && p.l === next.l && p.t === next.t && p.w === next.w && p.h === next.h && p.radius === next.radius ? p : next));
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(host);
    const mo = new MutationObserver(measure);
    mo.observe(el, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["src", "class", "style"] });
    const img = (e: Event) => (e.target instanceof HTMLImageElement ? measure() : undefined);
    el.addEventListener("load", img, true);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
      el.removeEventListener("load", img, true);
    };
  }, [root, body]);
  return box;
}


/** While something that floats (a fixed card box, an element over the others) is dragged past its section's bottom, the section grows to hold it
 *  (its "extra height below the content"); dragged back up it shrinks again, but never below the height it had when the drag began. */
function makeRoom(secEl: HTMLElement, actions: EditActions) {
  const sectionEl = secEl.querySelector<HTMLElement>("section") ?? secEl;
  const grow0 = Number(sectionEl.dataset.grow ?? 0) || 0;
  const id = secEl.dataset.section ?? "";
  let last = grow0;
  return (bottom: number) => {
    const live = sectionEl.getBoundingClientRect();
    const grownBy = Number(sectionEl.dataset.grow ?? 0) || 0; // what the section has right now
    const base = live.bottom - grownBy; // its bottom with no extra height
    const want = Math.min(4000, Math.max(grow0, Math.ceil(bottom + 24 - base)));
    if (id && want !== last) {
      last = want;
      actions.growSection(id, want);
    }
  };
}


/** The element that really shows at a point: its fitted frame (its words, picture, box) holds the point.
 *  Rows of elements are as wide as the column and may lie over one another; this looks through the empty parts of those rows,
 *  topmost first, so an element can always be picked where it shows. */
export function blockAtPoint(x: number, y: number, except?: Element | null): HTMLElement | null {
  const seen = new Set<Element>();
  for (const n of document.elementsFromPoint(x, y)) {
    const b = n.closest<HTMLElement>("[data-block]");
    if (!b || seen.has(b)) continue;
    seen.add(b);
    if (b === except) continue;
    const ring = b.querySelector(":scope > .block-ring")?.getBoundingClientRect();
    if (!ring || !ring.width) continue;
    if (x >= ring.left - 4 && x <= ring.right + 4 && y >= ring.top - 4 && y <= ring.bottom + 4) return b;
  }
  return null;
}
