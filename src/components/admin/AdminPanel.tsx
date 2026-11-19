"use client";

import { Fragment, useEffect, useRef, useState, useSyncExternalStore, type PointerEvent as RPointerEvent } from "react";
import {
  applyName,
  decorPath,
  DEFAULT_BORDER,
  DEFAULT_GRADIENT,
  DEFAULT_PAGE,
  DEFAULT_PATH,
  EFFECTS,
  SHAPES,
  KINDS,
  MAX_BLOCKS,
  EFFECT_LABELS,
  effectInFront,
  MAX_DECORATIONS,
  MAX_IMAGES,
  MAX_SECTIONS,
  ENTER_EFFECTS,
  ENTER_LABELS,
  CARD_SECTION,
  isCardSection,
  pageSections,
  withCardSection,
  phoneSettings,
  phoneDecor,
  phoneBlock,
  splitDecorPatch,
  splitBlockPatch,
  decorXFromPx,
  newBlock,
  resolveRsvpParts,
  RSVP_FIELDS,
  RSVP_PART_META,
  type RsvpPart,
  type RsvpPartKey,
  type Block,
  type BlockType,
  type Decoration,
  type EventType,
  type FontStyle,
  type Section,
  type Settings,
} from "@/lib/settings-shared";
import {
  ArrowDown, ArrowLeft, Columns2, Rows2, Ungroup, Eye, MailOpen, ArrowUp, CalendarDays, ChevronDown, GripVertical, Layers, LayoutTemplate, Palette, SquareStack, Smartphone, SlidersHorizontal, Trash2, Keyboard, Redo2, Undo2, MapPin, Maximize2, Plus, RotateCw, Sparkles, Sticker, Type, Wrench, X, type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import SaveToast from "@/components/SaveToast";
import PageView, { imageWidth } from "@/components/PageView";
import { ICON_OPTIONS } from "@/components/icons";
import { GROUPS, PALETTE, TEXT_PRESETS } from "@/components/palette";
import ArtSvg, { ART_OPTIONS } from "@/components/ArtSvg";
import { asSealId, SEAL_IDS, SEAL_LABELS, SealEmblem } from "@/components/Seal";
import type { CardPart } from "@/components/EnvelopeIntro";
import { colorShades, fitAccent, whiteContrast } from "@/lib/color";
import { applyPreset, EVENT_TYPE_OPTIONS, isPlaceholderName, PRESETS as EVENT_PRESETS } from "@/lib/presets";
import { DecorItem } from "@/components/Decorations";
import { blockAtPoint, BorderPicker, drag, type EditActions } from "@/components/edit-ui";
import { alphaBoundsNow } from "@/components/FitFrame";
import {
  ANIMATED_VARIANTS,
  Alert,
  AlertDialog,
  Badge,
  Button,
  ButtonGroup,
  Card,
  FileUpload,
  Image,
  Input,
  Modal,
  Popover,
  SegmentButton,
  ThemeProvider,
  Tooltip,
  UserMenu,
} from "@/components/ui";
import RsvpList from "./RsvpList";
import { ColorField, Grip, SelectField, SliderField, SwitchField, TextField, useReorder } from "./fields";

type Sel = { section: string | null; block: string | null };

const GRADIENT_PRESETS: [string, string, string][] = [["Dusk", "#4338ca", "#be185d"], ["Ocean", "#0369a1", "#0f766e"], ["Forest", "#166534", "#3f6212"], ["Rose", "#fce7f3", "#fde68a"], ["Ivory", "#faf7f2", "#efe7d8"], ["Midnight", "#0f172a", "#312e81"], ["Champagne", "#f5e6c8", "#fdf6e3"], ["Mist", "#e0f2fe", "#ede9fe"]];
/** one-click colour palettes: an accent, a mode and the font / design that suit it */
const PALETTES: { name: string; accent: string; mode: "light" | "dark"; design: "bento" | "clay"; font: FontStyle }[] = [
  { name: "Ivory & Gold", accent: "#a16207", mode: "light", design: "bento", font: "elegant" },
  { name: "Soft Blush", accent: "#be185d", mode: "light", design: "clay", font: "playful" },
  { name: "Ocean Calm", accent: "#0369a1", mode: "light", design: "bento", font: "modern" },
  { name: "Forest Sage", accent: "#3f6212", mode: "light", design: "bento", font: "elegant" },
  { name: "Royal Plum", accent: "#6b21a8", mode: "light", design: "bento", font: "elegant" },
  { name: "Terracotta", accent: "#c2410c", mode: "light", design: "clay", font: "playful" },
  { name: "Slate & Teal", accent: "#0f766e", mode: "light", design: "bento", font: "modern" },
  { name: "Charcoal", accent: "#27272a", mode: "light", design: "bento", font: "modern" },
  { name: "Midnight Indigo", accent: "#6d5ef0", mode: "dark", design: "bento", font: "modern" },
  { name: "Noir Rose", accent: "#be185d", mode: "dark", design: "clay", font: "elegant" },
];
const ACCENT_PRESETS = ["#27272a", "#334155", "#1d4ed8", "#4f46e5", "#6d28d9", "#be185d", "#b91c1c", "#c2410c", "#a16207", "#3f6212", "#0f766e", "#0369a1"];
const PANEL_OPTIONS = [["none", "None"], ["blob", "Soft blob"], ["arch", "Arch"], ["wavy", "Wavy sides"], ["ticket", "Ticket (notched)"]] as const;
const FRAME_OPTIONS = [["none", "None"], ["checker", "Checkered (racing)"], ["film", "Film strip"], ["polaroid", "Polaroid"], ["double", "Double line"]] as const;
const BG_OPTIONS = [["white", "Surface"], ["cream", "Muted"], ["brand", "Accent colour"], ["ink", "Dark accent"], ["plain", "None (dotted page)"]] as const;
const SIZE_OPTIONS = [["sm", "Small"], ["md", "Medium"], ["lg", "Large"], ["xl", "Extra large"]] as const;
const TONE_OPTIONS = [["ink", "Default"], ["brand", "Accent"], ["soft", "Muted"], ["white", "Contrast (follows the background)"]] as const;
type Clip =
  | { kind: "block"; block: Block }
  | { kind: "section"; section: Section; decorations: Decoration[] }
  | { kind: "sticker"; d: Decoration };

const SHORTCUTS: [string, string][] = [["Ctrl/\u2318 Z", "Undo"], ["Ctrl/\u2318 Shift Z  \u00b7  Ctrl Y", "Redo"], ["Ctrl/\u2318 C  \u00b7  X  \u00b7  V", "Copy, cut, paste the selected element, section or sticker"], ["Ctrl/\u2318 D", "Duplicate the selection"], ["Delete  \u00b7  Backspace", "Delete the selection"], ["Arrow keys", "Nudge a selected sticker (Shift = bigger steps)"], ["Alt + \u2191 / \u2193", "Move the selected element or section up / down"], ["Ctrl/\u2318 S", "Save changes"], ["Esc", "Clear the selection"], ["?", "Show this list"]];

const LG = "(min-width: 1024px)";
function useIsLg() {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(LG);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(LG).matches,
    () => true,
  );
}

const clamp = (n: number) => Math.min(100, Math.max(0, Math.round(n * 10) / 10));

/** next unused id like b12 / s3 */
function nextId(prefix: string, used: string[]) {
  let n = used.length + 1;
  while (used.includes(`${prefix}${n}`)) n++;
  return `${prefix}${n}`;
}

/** the server takes up to 5 MB; big photos are made smaller here first, so they upload instead of being refused */
const UPLOAD_LIMIT = 5 * 1024 * 1024;
const SHRINK_OVER = 2 * 1024 * 1024;

/** Scale a large picture down (longest side at most 2400px, then smaller if needed) and re-save it as WebP (or JPEG where the browser can't write WebP).
 *  GIFs are left alone (re-drawing would stop their animation); so is anything already small, or anything the browser can't read. */
async function shrinkImage(file: File): Promise<File> {
  if (file.type === "image/gif" || file.size <= SHRINK_OVER) return file;
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" }).catch(() => null);
  if (!bmp) return file;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  const alpha = file.type === "image/png" || file.type === "image/webp";
  const encode = (type: string, q: number) => new Promise<Blob | null>((res) => canvas.toBlob(res, type, q));
  let best: Blob | null = null;
  for (const [side, q] of [[2400, 0.86], [2000, 0.8], [1600, 0.75], [1200, 0.7]] as const) {
    const k = Math.min(1, side / Math.max(bmp.width, bmp.height));
    canvas.width = Math.round(bmp.width * k);
    canvas.height = Math.round(bmp.height * k);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    let blob = await encode("image/webp", q);
    // older Safari writes PNG when asked for WebP; a picture that may be see-through (a cut-out) stays PNG, as JPEG has no transparency
    if (!blob || blob.type !== "image/webp") blob = await encode(alpha ? "image/png" : "image/jpeg", q);
    if (blob) best = blob;
    if (blob && blob.size <= UPLOAD_LIMIT * 0.9) break;
  }
  bmp.close();
  if (!best || best.size >= file.size) return file;
  const ext = best.type === "image/webp" ? "webp" : best.type === "image/png" ? "png" : "jpg";
  return new File([best], file.name.replace(/\.[^.]+$/, "") + "." + ext, { type: best.type });
}

async function uploadFiles(files: FileList | null, max: number, onError: (m: string) => void) {
  const urls: string[] = [];
  for (const picked of Array.from(files ?? []).slice(0, max)) {
    const file = await shrinkImage(picked);
    if (file.size > UPLOAD_LIMIT) {
      onError(`${picked.name}: ${file.type === "image/gif" ? "GIFs must be under 5 MB." : "Image is over 5 MB, even after shrinking it."}`);
      break;
    }
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      onError(`${file.name}: ${data?.error ?? "upload failed"}`);
      break;
    }
    urls.push(data.url);
  }
  return urls;
}

type ArrangeOp = "front" | "forward" | "backward" | "back";
/** the stickers a sticker stacks with: same section, same layer (later in the list = drawn on top) */
const stackPeers = (all: Decoration[], d: Decoration) => all.filter((x) => x.section === d.section && (x.layer ?? "front") === (d.layer ?? "front"));

/** where a new or moved section may go: never after the opening card's own section, which stays last */
function insertAt(list: Section[], at: number) {
  const card = list.findIndex((x) => isCardSection(x.id));
  return card < 0 ? at : Math.min(at, card);
}

/** The visual page editor for one event: its design is loaded from and saved to that event. */
export default function AdminPanel({ initial, eventId, eventTitle, account }: { initial: Settings; eventId: string; eventTitle: string; account: { email: string; name: string; imageUrl: string } }) {
  // the opening card keeps what is added to it in a section of its own; added here so it isn't counted as an unsaved change
  const [start] = useState(() => withCardSection(initial));
  const [s, setS] = useState(start);
  const [savedJson, setSavedJson] = useState(() => JSON.stringify(start));
  const [view, setView] = useState<"edit" | "rsvps" | "card">("edit");
  /** bumped to play the opening card again (it also remounts the preview so it starts from the closed envelope) */
  const [cardPlay, setCardPlay] = useState(0);
  const [sel, setSel] = useState<Sel>({ section: null, block: null });
  const [selDecor, setSelDecor] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  /** an element holding an uploaded picture that is about to be removed, waiting for the host to confirm */
  const [confirmImage, setConfirmImage] = useState<{ kind: "block" | "sticker"; id: string } | null>(null);
  const [leftOpen, setLeftOpen] = useState(false);
  // "Content" list: a collapsible bar under the preview on phones, always open in the desktop sidebar
  const [addedOpen, setAddedOpen] = useState(false);
  // "Event & theme" dropdown: controlled so the phone layout can give it a close button
  // (the header and the bar each render one, so remember which is open — a shared flag would open both and each would close the other)
  const [themeOpen, setThemeOpen] = useState<string | null>(null);
  // section settings: on phones the body can be folded away, leaving just its header
  const [settingsOpen, setSettingsOpen] = useState(false);
  // settings live in floating, draggable panels (the toolbox itself is a permanent icon strip)
  // the element / sticker that was just added: closing its panel untouched with ✕ takes it back out again
  const [fresh, setFresh] = useState<{ kind: "block" | "sticker"; id: string; snapshot: string } | null>(null);
  const [elementPanel, setElementPanel] = useState(false);
  // the RSVP form piece being edited in its own floating panel (clicked in the preview)
  const [rsvpPartKey, setRsvpPartKey] = useState<RsvpPartKey | null>(null);
  /** a sticker's entrance played once in the editor ("Play" in its panel) */
  const [enterPlay, setEnterPlay] = useState<{ id: string; n: number } | null>(null);
  const [cardPanel, setCardPanel] = useState<CardPart | null>(null); // a piece of the opening card whose settings float beside it (clicked on the card tab)
  const [stickersPanel, setStickersPanel] = useState(false); // the text-stickers tool (+ Text, + Graffiti, the list)
  const [pendingType, setPendingType] = useState<EventType | null>(null);
  const [selKind, setSelKind] = useState<"sticker" | "block" | "section" | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  /** which layout the canvas shows and edits: the large-screen one, or the phone one (its own places and sizes, phones only) */
  const [device, setDevice] = useState<"desktop" | "phone">("desktop");
  /** large screens: hide the floating Content list and Toolbox to see the page's full width */
  const [panelsHidden, setPanelsHidden] = useState(false);
  const phoneMode = device === "phone";
  /** a change to a sticker: in Phone mode its place, size and turn go to the phone layout */
  const patchDecor = (d: Decoration, patch: Partial<Decoration>): Decoration => ({ ...d, ...(phoneMode ? splitDecorPatch(d, patch) : patch) });
  /** the phone view: the page as a phone shows it, in a phone-sized frame beside the editor (live, unsaved changes included) */
  const [phone, setPhone] = useState(false);
  const [phoneKey, setPhoneKey] = useState(0);
  const phoneFrame = useRef<HTMLIFrameElement>(null);
  const startPreview = () => setPreviewing(true);
  const [stickerPanel, setStickerPanel] = useState(false);
  const [hist, setHist] = useState({ past: 0, future: 0 });
  const past = useRef<Settings[]>([]);
  const future = useRef<Settings[]>([]);
  const last = useRef<Settings>(start);
  const skip = useRef(false);
  const burst = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clip = useRef<Clip | null>(null);
  const isLg = useIsLg();
  // desktop: the side panels float over the canvas and can be dragged by their headers.
  // x is the distance from the panel's anchored edge (left panel: from the left, right panels: from the right)
  type PanelKey = "settings" | "content" | "toolbox";
  const [panelPos, setPanelPos] = useState<Record<PanelKey, { x: number; y: number }>>({
    settings: { x: 16, y: 16 },
    content: { x: 112, y: 16 },
    toolbox: { x: 16, y: 16 },
  });
  const floatStyle = (key: PanelKey, anchor: "left" | "right") =>
    isLg ? { [anchor]: panelPos[key].x, top: panelPos[key].y, maxHeight: `calc(100% - ${panelPos[key].y + 16}px)` } : undefined;
  const startPanelDrag = (key: PanelKey, anchor: "left" | "right") => (e: React.PointerEvent<HTMLElement>) => {
    if (!isLg || e.button !== 0 || (e.target as HTMLElement).closest("button, a, input")) return;
    const panel = e.currentTarget.closest("aside");
    const box = panel?.parentElement?.getBoundingClientRect();
    if (!panel || !box) return;
    e.preventDefault();
    const rect = panel.getBoundingClientRect();
    const offX = e.clientX - rect.left, offY = e.clientY - rect.top;
    const move = (ev: PointerEvent) => {
      const w = panel.offsetWidth;
      const left = Math.min(Math.max(0, box.width - w), Math.max(0, ev.clientX - box.left - offX));
      const top = Math.min(Math.max(0, box.height - 60), Math.max(0, ev.clientY - box.top - offY));
      setPanelPos((p) => ({ ...p, [key]: { x: anchor === "left" ? left : box.width - w - left, y: top } }));
    };
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  const dragging = useRef<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const hotBlock = useRef<HTMLElement | null>(null);

  // focus: bring the selected section / element into view and put the cursor in its first field
  useEffect(() => {
    if (!sel.section) return;
    const q = sel.block ? `[data-block="${sel.block}"]` : `[data-section="${sel.section}"]`;
    previewRef.current?.querySelector(q)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    if (!sel.block) return;
    const t = setTimeout(() => document.querySelector<HTMLElement>('[data-panel="element"] input:not([type=hidden]), [data-panel="element"] textarea')?.focus({ preventScroll: true }), 150);
    return () => clearTimeout(t);
  }, [sel.section, sel.block]);

  // undo / redo: every change pushes the previous state; rapid changes (typing, dragging) merge into one step
  useEffect(() => {
    if (skip.current) {
      skip.current = false;
      last.current = s;
      return;
    }
    if (s === last.current || JSON.stringify(s) === JSON.stringify(last.current)) return;
    if (!burst.current) {
      past.current.push(last.current);
      if (past.current.length > 100) past.current.shift();
      future.current = [];
    } else clearTimeout(burst.current);
    burst.current = setTimeout(() => (burst.current = null), 400);
    last.current = s;
    setHist({ past: past.current.length, future: 0 });
  }, [s]);

  const dirty = JSON.stringify(s) !== savedJson;
  /** the section things go into when nothing is picked: the card's own on the card tab, else the page's first */
  const homeSection = view === "card" ? s.sections.find((x) => isCardSection(x.id)) : pageSections(s)[0];
  const curSection = s.sections.find((x) => x.id === sel.section);
  const curBlock = curSection?.blocks.find((b) => b.id === sel.block);

  /* ---- state mutators ---- */
  const updateSection = (id: string, p: Partial<Section>) =>
    setS((prev) => ({ ...prev, sections: prev.sections.map((x) => (x.id === id ? { ...x, ...p } : x)) }));
  const updateBlock = (id: string, p: Partial<Block>) =>
    setS((prev) => ({
      ...prev,
      sections: prev.sections.map((x) => ({ ...x, blocks: x.blocks.map((b) => (b.id === id ? { ...b, ...p } : b)) })),
    }));

  const [multi, setMulti] = useState<string[]>([]);
  // a group of elements can be selected too (click its box or its "Group" tag) to change its layout and design
  const [groupSel, setGroupSel] = useState<string | null>(null);
  // the group bar blurs in and out (lojee-ui "blur" transition); it stays mounted while the exit plays
  const [barCount, setBarCount] = useState(0);
  const barOpen = multi.length > 1;
  useEffect(() => {
    if (barOpen) return setBarCount(multi.length);
    const t = setTimeout(() => setBarCount(0), 450);
    return () => clearTimeout(t);
  }, [barOpen, multi.length]);
  /** change a setting for every element of a group at once (layout direction, design) */
  /** a card box's place / size: in Phone mode it goes to the phone layout of each of its elements */
  const updateGroupDev = (groupId: string, p: Partial<Block>) =>
    setS((prev) => ({ ...prev, sections: prev.sections.map((x) => ({ ...x, blocks: x.blocks.map((b) => (b.group === groupId ? { ...b, ...(phoneMode ? splitBlockPatch(b, p) : p) } : b)) })) }));
  const actions: EditActions = {
    groupBlocks(ids, dir) {
      const sec = s.sections.find((x) => ids.every((id) => x.blocks.some((b) => b.id === id)));
      if (!sec) return setMsg({ ok: false, text: "Pick elements from one section to group them." });
      const picked = sec.blocks.filter((b) => ids.includes(b.id));
      const gid = nextId("g", sec.blocks.map((b) => b.group));
      const first = sec.blocks.indexOf(picked[0]);
      const rest = sec.blocks.filter((b) => !ids.includes(b.id));
      const at = rest.filter((b) => sec.blocks.indexOf(b) < first).length;
      const made = picked.map((b) => (dir === "none" ? { ...b, group: "" } : { ...b, group: gid, groupDir: dir, x: 0, y: 0, ...(b.m ? { m: { ...b.m, x: undefined, y: undefined } } : {}) }));
      // an ungrouped element keeps its place; grouped ones are gathered at the first one's place so they sit side by side
      const blocks = dir === "none" ? sec.blocks.map((b) => made.find((m) => m.id === b.id) ?? b) : [...rest.slice(0, at), ...made, ...rest.slice(at)];
      setS((prev) => ({ ...prev, sections: prev.sections.map((x) => (x.id === sec.id ? { ...x, blocks } : x)) }));
      setMulti([]);
    },
    growSection(id, grow) {
      updateSection(id, { grow });
    },
    sizeGroup(group, w, h) {
      updateGroupDev(group, { groupW: w, groupH: h });
    },
    placeGroup(group, x, y) {
      updateGroupDev(group, { groupX: x, groupY: y });
    },
    placeBlock(id, x, y) {
      setS((prev) => ({
        ...prev,
        sections: prev.sections.map((sec) => (sec.blocks.some((b) => b.id === id) ? { ...sec, blocks: sec.blocks.map((b) => (b.id === id ? { ...b, ...(phoneMode ? splitBlockPatch(b, { x, y }) : { x, y }) } : b)) } : sec)),
      }));
    },
    moveBlock(id, toSection, index) {
      setS((prev) => {
        const from = prev.sections.find((x) => x.blocks.some((b) => b.id === id));
        const block = from?.blocks.find((b) => b.id === id);
        if (!from || !block) return prev;
        const fromIdx = from.blocks.indexOf(block);
        const at = from.id === toSection && fromIdx < index ? index - 1 : index;
        return {
          ...prev,
          sections: prev.sections.map((x) => {
            let blocks = x.blocks;
            if (x.id === from.id) blocks = blocks.filter((b) => b.id !== id);
            if (x.id === toSection) {
              blocks = [...blocks];
              blocks.splice(at, 0, block);
            }
            return blocks === x.blocks ? x : { ...x, blocks };
          }),
        };
      });
      setSel({ section: toSection, block: id });
      setSelKind("block");
    },
    addBlock(type, toSection, index) {
      const used = s.sections.flatMap((x) => x.blocks.map((b) => b.id));
      const target = s.sections.find((x) => x.id === toSection);
      if (!target || target.blocks.length >= MAX_BLOCKS) return setMsg({ ok: false, text: "That section is full." });
      if (type === "rsvp" && s.sections.some((x) => x.blocks.some((b) => b.type === "rsvp")))
        return setMsg({ ok: false, text: "The page already has an RSVP form." });
      const b = newBlock(type, nextId("b", used));
      setS((prev) => ({
        ...prev,
        sections: prev.sections.map((x) => {
          if (x.id !== toSection) return x;
          const blocks = [...x.blocks];
          blocks.splice(index, 0, b);
          return { ...x, blocks };
        }),
      }));
      setSel({ section: toSection, block: b.id });
      setSelKind("block");
      setElementPanel(true);
      setFresh({ kind: "block", id: b.id, snapshot: JSON.stringify(b) });
    },
    removeBlock(id) {
      setS((prev) => ({ ...prev, sections: prev.sections.map((x) => ({ ...x, blocks: x.blocks.filter((b) => b.id !== id) })) }));
      setSel((p) => (p.block === id ? { ...p, block: null } : p));
    },
    moveSection(id, index) {
      setS((prev) => {
        const from = prev.sections.findIndex((x) => x.id === id);
        if (from < 0 || isCardSection(id)) return prev;
        const list = [...prev.sections];
        const [m] = list.splice(from, 1);
        list.splice(insertAt(list, from < index ? index - 1 : index), 0, m);
        return { ...prev, sections: list };
      });
      setSel({ section: id, block: null });
    },
    removeSection(id) {
      askDeleteSection(id);
    },
    addSticker(sectionId, x, y, preset) {
      addSticker({ ...preset, x: clamp(x), y: clamp(y) }, sectionId);
    },
    adjustSticker(op) {
      if (!selDecor) return;
      setS((prev) => ({
        ...prev,
        decorations: prev.decorations.map((d) => {
          if (d.id !== selDecor) return d;
          const v = phoneMode ? phoneDecor(d) : d; // Phone mode: from (and to) its phone size and turn
          const turn = (delta: number) => ((((v.rotate + delta + 180) % 360) + 360) % 360) - 180;
          const size = (f: number) => Math.max(4, Math.round(v.size * f));
          return op === "flip" ? { ...d, flip: !d.flip } : patchDecor(d, op === "rotL" ? { rotate: turn(-15) } : op === "rotR" ? { rotate: turn(15) } : op === "smaller" ? { size: size(1 / 1.15) } : { size: size(1.15) });
        }),
      }));
    },
    async uploadSticker(sectionId, files) {
      const [url] = await uploadFiles(files, 1, (m) => setMsg({ ok: false, text: m }));
      if (url) addSticker({ kind: "image", content: url, size: 96, effect: "none", color: "#ffffff" }, sectionId);
    },
    async importSticker(sectionId, id) {
      const res = await fetch("/api/illustrations/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.url) return setMsg({ ok: false, text: data?.error ?? "Could not import that illustration." });
      addSticker({ kind: "image", content: data.url, size: 96, effect: "none", color: "#ffffff" }, sectionId);
    },
    selectSection(id) {
      setSel({ section: id, block: null });
      setSelKind("section");
    },
    editSection(id) {
      setSel({ section: id, block: null });
      setSelKind("section");
      setLeftOpen(true);
    },
    moveSectionBy(id, delta) {
      setS((prev) => {
        const i = prev.sections.findIndex((x) => x.id === id);
        const j = i + delta;
        if (i < 0 || j < 0 || j >= prev.sections.length || isCardSection(prev.sections[i].id) || isCardSection(prev.sections[j].id)) return prev;
        const list = [...prev.sections];
        [list[i], list[j]] = [list[j], list[i]];
        return { ...prev, sections: list };
      });
    },
    setBorder(id, patch) {
      const cur = s.sections.find((x) => x.id === id);
      if (cur) updateSection(id, { border: { ...cur.border, ...patch } });
    },
    toggleHidden(id) {
      updateSection(id, { hidden: !s.sections.find((x) => x.id === id)?.hidden });
    },
    duplicateSection(id) {
      const src = s.sections.find((x) => x.id === id);
      if (!src || isCardSection(id)) return;
      if (pageSections(s).length >= MAX_SECTIONS) return setMsg({ ok: false, text: "Too many sections." });
      const used = s.sections.flatMap((x) => x.blocks.map((b) => b.id));
      const newId = nextId("s", s.sections.map((x) => x.id));
      const blocks = src.blocks.filter((b) => b.type !== "rsvp").map((b) => {
        const bid = nextId("b", used);
        used.push(bid);
        return { ...b, id: bid };
      });
      setS((prev) => {
        const list = [...prev.sections];
        list.splice(list.findIndex((x) => x.id === id) + 1, 0, { ...src, id: newId, name: `${src.name} copy`, blocks });
        return { ...prev, sections: list };
      });
      setSel({ section: newId, block: null });
    },
    addSection(index) {
      if (pageSections(s).length >= MAX_SECTIONS) return setMsg({ ok: false, text: "Too many sections." });
      const id = nextId("s", s.sections.map((x) => x.id));
      const sec: Section = { id, name: "New section", bg: "white", bgColor: "", hidden: false, panel: "none", border: DEFAULT_BORDER, gradient: DEFAULT_GRADIENT, effect: "none", card: false, wide: false, pad: "lg", grow: 0, blocks: [] };
      setS((prev) => {
        const list = [...prev.sections];
        list.splice(insertAt(list, index), 0, sec);
        return { ...prev, sections: list };
      });
      setSel({ section: id, block: null });
    },
  };

  /** a floating sticker becomes an element of the layout (other elements move around it) */
  function stickerToLayout(d: Decoration) {
    const sec = s.sections.find((x) => x.id === d.section);
    if (!sec || sec.blocks.length >= MAX_BLOCKS) return setMsg({ ok: false, text: "That section is full." });
    const b: Block = { ...newBlock("illustration", nextId("b", s.sections.flatMap((x) => x.blocks.map((k) => k.id)))), deco: { kind: d.kind, content: d.content, size: d.size, rotate: d.rotate, color: d.color, effect: d.effect, flip: d.flip, sx: d.sx, sy: d.sy, shape: d.shape, opacity: d.opacity, ...(d.original ? { original: d.original } : {}) } };
    const at = Math.round((d.y / 100) * sec.blocks.length);
    setS((prev) => ({
      ...prev,
      decorations: prev.decorations.filter((x) => x.id !== d.id),
      sections: prev.sections.map((x) => (x.id === sec.id ? { ...x, blocks: [...x.blocks.slice(0, at), b, ...x.blocks.slice(at)] } : x)),
    }));
    setSelDecor(null);
    setSel({ section: sec.id, block: b.id });
    setSelKind("block");
    setElementPanel(true);
  }

  /** a layout illustration goes back to floating freely where it sits now */
  function illustrationToFixed(b: Block) {
    const sec = s.sections.find((x) => x.blocks.some((k) => k.id === b.id));
    if (!sec || !b.deco) return;
    if (s.decorations.length >= MAX_DECORATIONS) return setMsg({ ok: false, text: `Up to ${MAX_DECORATIONS} stickers per page.` });
    const secEl0 = previewRef.current?.querySelector<HTMLElement>(`[data-section="${sec.id}"]`);
    const secEl = secEl0?.querySelector<HTMLElement>("[data-decor-band]") ?? secEl0; // stickers are placed in % of their band
    const el = previewRef.current?.querySelector<HTMLElement>(`[data-block="${b.id}"]`);
    let x = 50, y = 50;
    if (secEl && el) {
      const sr = secEl.getBoundingClientRect(), er = el.getBoundingClientRect();
      x = isCardSection(sec.id) ? clamp(((er.left + er.width / 2 - sr.left) / sr.width) * 100) : decorXFromPx(er.left + er.width / 2 - sr.left, sr.width, sec.wide);
      y = clamp(((er.top + er.height / 2 - sr.top) / sr.height) * 100);
    }
    const d: Decoration = { id: nextId("d", s.decorations.map((k) => k.id)), section: sec.id, x, y, path: DEFAULT_PATH, layer: "front", ...b.deco };
    setS((prev) => ({
      ...prev,
      decorations: [...prev.decorations, d],
      sections: prev.sections.map((x) => (x.id === sec.id ? { ...x, blocks: x.blocks.filter((k) => k.id !== b.id) } : x)),
    }));
    setSel({ section: sec.id, block: null });
    setSelDecor(d.id);
    setSelKind("sticker");
    setStickerPanel(true);
    setElementPanel(false);
  }

  function addSticker(p: Partial<Decoration>, sectionId?: string) {
    const target = s.sections.find((x) => x.id === sectionId) ?? curSection ?? s.sections[0];
    if (!target) return;
    if (s.decorations.length >= MAX_DECORATIONS) return setMsg({ ok: false, text: `Up to ${MAX_DECORATIONS} stickers per page.` });
    const d: Decoration = { id: nextId("d", s.decorations.map((x) => x.id)), section: target.id, kind: "text", content: "Hooray!", x: 50, y: 50, size: 40, rotate: 0, color: "#a1a1aa", effect: "float", ...p, flip: p.flip ?? false, sx: p.sx ?? 1, sy: p.sy ?? 1, shape: p.shape ?? "original", opacity: p.opacity ?? 100, layer: p.layer ?? "front", path: p.path ?? DEFAULT_PATH };
    setS((prev) => ({ ...prev, decorations: [...prev.decorations, d] }));
    setSel({ section: target.id, block: null });
    setSelDecor(d.id);
    setSelKind("sticker");
    setStickerPanel(true);
    setFresh({ kind: "sticker", id: d.id, snapshot: JSON.stringify(d) });
    if (view !== "card") setLeftOpen(true); // on the card, a sticker only gets its floating panel
  }

  /** the opening card's section stays (it can be emptied, not deleted) */
  function askDeleteSection(id: string) {
    if (!isCardSection(id)) setConfirmDelete(id);
  }

  /** switch tabs; the card tab starts with its section picked, so its tools and settings are ready */
  function goView(v: typeof view) {
    setView(v);
    if (v === "card") {
      setSel({ section: CARD_SECTION, block: null });
      setSelKind("section");
      setLeftOpen(true);
    } else if (isCardSection(sel.section)) {
      setSel({ section: null, block: null });
      setSelKind(null);
      setLeftOpen(false);
    }
    setSelDecor(null);
    setMulti([]);
    setGroupSel(null);
    setElementPanel(false);
    setStickerPanel(false);
    setStickersPanel(false);
    setCardPanel(null);
    setRsvpPartKey(null);
  }

  /** the envelope was clicked on the card tab: its settings float beside it, like an element's */
  function pickCardPart(part: CardPart) {
    setSel({ section: CARD_SECTION, block: null });
    setSelKind("section");
    setSelDecor(null);
    setGroupSel(null);
    setMulti([]);
    setLeftOpen(true); // the card's section settings stay beside the floating envelope settings
    setElementPanel(false);
    setStickerPanel(false);
    setRsvpPartKey(null);
    setCardPanel(part);
  }

  /** move a sticker up or down the stack: stickers are drawn in list order, so it changes places with its peers in the list */
  function arrangeSticker(id: string, op: ArrangeOp) {
    setS((prev) => {
      const list = [...prev.decorations];
      const d = list.find((x) => x.id === id);
      if (!d) return prev;
      const peers = stackPeers(list, d);
      const i = peers.indexOf(d);
      const j = op === "front" ? peers.length - 1 : op === "back" ? 0 : op === "forward" ? Math.min(peers.length - 1, i + 1) : Math.max(0, i - 1);
      if (i === j) return prev;
      const order = [...peers];
      order.splice(i, 1);
      order.splice(j, 0, d);
      // the peers take back their own places in the list, in the new order
      list.forEach((x, k) => {
        if (peers.includes(x)) list[k] = order.shift()!;
      });
      return { ...prev, decorations: list };
    });
  }

  /** A ready-made card box: a title and some text, boxed together as a group with the "card" design.
   *  Its look (design, colour, crown, row or column) is set in its group panel, which opens straight away; more elements can be added into it there. */
  function addCardBox() {
    const sec = curSection ?? homeSection;
    if (!sec) return;
    if (sec.blocks.length + 2 > MAX_BLOCKS) return setMsg({ ok: false, text: "That section is full." });
    const used = s.sections.flatMap((x) => x.blocks.map((b) => b.id));
    const mk = (type: BlockType, p: Partial<Block>) => {
      const id = nextId("b", used);
      used.push(id);
      return { ...newBlock(type, id), ...p };
    };
    const gid = nextId("g", s.sections.flatMap((x) => x.blocks.map((b) => b.group)));
    const box = { group: gid, groupDir: "col" as const, groupStyle: "card" as const, groupCrown: "none" as const, groupColor: "" };
    const items = [mk("heading", { text: "Card title", size: "sm", ...box }), mk("text", { text: "Add the details here — a time, a place, a note for your guests.", tone: "soft", ...box })];
    // after the picked element (or its group), else at the end of the section
    const pickedAt = curBlock ? Math.max(...sec.blocks.map((b, i) => (b.id === curBlock.id || (curBlock.group && b.group === curBlock.group) ? i : -1))) + 1 : sec.blocks.length;
    setS((prev) => ({ ...prev, sections: prev.sections.map((x) => (x.id === sec.id ? { ...x, blocks: [...x.blocks.slice(0, pickedAt), ...items, ...x.blocks.slice(pickedAt)] } : x)) }));
    setSel({ section: sec.id, block: null });
    setSelKind("section");
    setElementPanel(false);
    setGroupSel(gid);
    setTimeout(() => document.querySelector(`[data-group="${gid}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
  }

  /** add an element inside a group / card box: it goes at the group's end and takes on the group's look */
  function addToGroup(gid: string, type: BlockType) {
    const sec = s.sections.find((x) => x.blocks.some((b) => b.group === gid));
    if (!sec) return;
    if (sec.blocks.length >= MAX_BLOCKS) return setMsg({ ok: false, text: "That section is full." });
    if (type === "rsvp" && s.sections.some((x) => x.blocks.some((b) => b.type === "rsvp"))) return setMsg({ ok: false, text: "The page can only have one RSVP form." });
    const members = sec.blocks.filter((b) => b.group === gid);
    const first = members[0];
    const b: Block = { ...newBlock(type, nextId("b", s.sections.flatMap((x) => x.blocks.map((k) => k.id)))), group: gid, groupDir: first.groupDir, groupStyle: first.groupStyle, groupCrown: first.groupCrown, groupColor: first.groupColor };
    const at = sec.blocks.indexOf(members[members.length - 1]) + 1;
    setS((prev) => ({ ...prev, sections: prev.sections.map((x) => (x.id === sec.id ? { ...x, blocks: [...x.blocks.slice(0, at), b, ...x.blocks.slice(at)] } : x)) }));
    setGroupSel(null);
    setSel({ section: sec.id, block: b.id });
    setSelKind("block");
    setElementPanel(true);
    setFresh({ kind: "block", id: b.id, snapshot: JSON.stringify(b) });
  }

  function deleteSection(id: string) {
    setS((prev) => ({
      ...prev,
      sections: prev.sections.filter((x) => x.id !== id),
      decorations: prev.decorations.filter((d) => d.section !== id),
    }));
    setSel({ section: null, block: null });
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    const res = await fetch(`/api/events/${eventId}/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(s),
    });
    const data = await res.json().catch(() => null);
    if (res.ok) {
      setS(data);
      setSavedJson(JSON.stringify(data));
      setMsg({ ok: true, text: "The event page is updated." });
      // saved: let go of whatever was selected and close the floating settings panels
      setSel({ section: null, block: null });
      setSelDecor(null);
      setSelKind(null);
      setLeftOpen(false);
      setElementPanel(false);
      setStickerPanel(false);
      setStickersPanel(false);
      setRsvpPartKey(null);
      setFresh(null);
    } else {
      setMsg({ ok: false, text: data?.error ?? "Could not save." });
    }
    setSaving(false);
  }

  async function logout() {
    // Clerk's global handles the sign-out
    await (window as unknown as { Clerk?: { signOut: (o?: { redirectUrl?: string }) => Promise<void> } }).Clerk?.signOut({ redirectUrl: "/" });
  }

  // hold and drag on an empty part of a section to draw a box; every element it touches is picked (shift / ctrl / cmd adds to the picks)
  const [marquee, setMarquee] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const justBoxed = useRef(false);
  function startMarquee(e: React.PointerEvent) {
    const t = e.target as HTMLElement;
    const offBlock = !!(e.nativeEvent as PointerEvent & { offBlock?: boolean }).offBlock; // pressed beside an element, on its empty row
    // a sticker set behind all elements is covered by its section: pressing on the section's empty space over it picks it up and drags it
    if (e.button === 0 && !t.closest("[data-block],[data-action],.decor,[data-keep],input,textarea,select,button,a")) {
      const under = document
        .elementsFromPoint(e.clientX, e.clientY)
        .find((n): n is HTMLElement => n instanceof HTMLElement && !!n.closest("[data-behind] [data-decor]"))
        ?.closest<HTMLElement>("[data-decor]");
      const sid = under?.closest<HTMLElement>("[data-section]")?.dataset.section;
      if (under?.dataset.decor && sid) {
        e.preventDefault();
        under.setPointerCapture(e.pointerId); // its layer follows the pointer from here (the same as grabbing it directly)
        dragging.current = under.dataset.decor;
        setSelDecor(under.dataset.decor);
        setSelKind("sticker");
        setStickerPanel(true);
        setSel({ section: sid, block: null });
        setLeftOpen(view !== "card");
        return;
      }
    }
    // touch screens: press and hold an element to start picking; then tap more elements to add or remove them
    const blockId = offBlock ? undefined : t.closest<HTMLElement>("[data-block]")?.dataset.block;
    if (e.pointerType === "touch" && blockId && !t.closest("[data-action]")) {
      const x0 = e.clientX, y0 = e.clientY;
      const timer = setTimeout(() => {
        setMulti((m) => (m.includes(blockId) ? m : [...m, blockId]));
        justBoxed.current = true;
        navigator.vibrate?.(20);
        cleanup();
        setTimeout(() => (justBoxed.current = false), 400);
      }, 450);
      const cancel = (ev: PointerEvent) => { if (Math.hypot(ev.clientX - x0, ev.clientY - y0) > 8) cleanup(); };
      const cleanup = () => {
        clearTimeout(timer);
        window.removeEventListener("pointermove", cancel);
        window.removeEventListener("pointerup", cleanup);
        window.removeEventListener("pointercancel", cleanup);
      };
      window.addEventListener("pointermove", cancel);
      window.addEventListener("pointerup", cleanup);
      window.addEventListener("pointercancel", cleanup);
      return;
    }
    const secEl = t.closest<HTMLElement>("[data-section]");
    if (e.pointerType === "touch") return; // a finger drag on empty space scrolls the page
    if (e.button !== 0 || !secEl || (!offBlock && t.closest("[data-block]")) || t.closest("[data-action],.decor,[data-keep],input,textarea,select,button,a")) return;
    const x1 = e.clientX, y1 = e.clientY;
    const base = e.shiftKey || e.metaKey || e.ctrlKey ? multi : [];
    let on = false;
    const move = (ev: PointerEvent) => {
      if (!on && Math.hypot(ev.clientX - x1, ev.clientY - y1) < 5) return;
      on = true;
      window.getSelection()?.removeAllRanges();
      const box = { x1: Math.min(x1, ev.clientX), y1: Math.min(y1, ev.clientY), x2: Math.max(x1, ev.clientX), y2: Math.max(y1, ev.clientY) };
      setMarquee(box);
      const hit = [...secEl.querySelectorAll<HTMLElement>("[data-block]")]
        .filter((n) => { const r = n.getBoundingClientRect(); return r.right >= box.x1 && r.left <= box.x2 && r.bottom >= box.y1 && r.top <= box.y2; })
        .map((n) => n.dataset.block!);
      setMulti([...new Set([...base, ...hit])]);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setMarquee(null);
      if (on) {
        justBoxed.current = true; // the click that ends the drag must not clear the picks
        setTimeout(() => (justBoxed.current = false), 0);
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  function onPreviewClick(e: React.MouseEvent) {
    if (justBoxed.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    const t = e.target as HTMLElement;
    if (t.closest("[data-action]")) return; // toolbar buttons handle themselves
    // inside the editor a click only selects: no scrolling, links or buttons run
    e.preventDefault();
    e.stopPropagation();
    if (t.closest(".decor:not(.decor-flow), [data-keep]")) return; // stickers and their path handle keep the selection
    setSelDecor(null);
    setCardPanel(null);
    const section = t.closest<HTMLElement>("[data-section]")?.dataset.section ?? null;
    // a click on an element's empty row (beside what it shows) is a click on its section / card box, not on the element
    // the element that really shows under the pointer (looking through the empty parts of elements' rows), if any
    const blockEl = blockAtPoint(e.clientX, e.clientY);
    const block = blockEl?.dataset.block ?? null;
    // shift / ctrl / cmd + click picks several elements to group (while picking, a plain tap does too, for touch screens)
    if (block && (e.shiftKey || e.metaKey || e.ctrlKey || multi.length > 0)) {
      setMulti((m) => {
        const base = m.length || !sel.block || sel.block === block ? m : [sel.block];
        return base.includes(block) ? base.filter((id) => id !== block) : [...base, block];
      });
      return;
    }
    setMulti([]);
    const grp = t.closest<HTMLElement>("[data-group]")?.dataset.group ?? null;
    if (section && grp && !block) {
      setGroupSel(grp);
      setSel({ section, block: null });
      setSelKind("section");
      setElementPanel(false);
      return;
    }
    setGroupSel(null);
    const part = (t.closest<HTMLElement>("[data-rsvp-part]")?.dataset.rsvpPart as RsvpPartKey | undefined) ?? null;
    setRsvpPartKey(section && block ? part : null);
    if (section) {
      setSel({ section, block });
      if (block) setElementPanel(!part); // a clicked form piece opens its own panel instead of the whole element's
      setSelKind(block ? "block" : "section");
      // a highlighted section opens its settings panel; on the card, an element only gets its floating panel (the sidebar is for the card itself)
      setLeftOpen(!(block && view === "card"));
    } else {
      // clicking the empty canvas clears the selection (hides Edit and the section panel)
      setSel({ section: null, block: null });
      setSelKind(null);
      setLeftOpen(false);
    }
  }

  /* ---- undo / redo ---- */
  function undo() {
    const prev = past.current.pop();
    if (!prev) return;
    future.current.push(s);
    skip.current = true;
    burst.current = null;
    setS(prev);
    setHist({ past: past.current.length, future: future.current.length });
  }
  function redo() {
    const next = future.current.pop();
    if (!next) return;
    past.current.push(s);
    skip.current = true;
    burst.current = null;
    setS(next);
    setHist({ past: past.current.length, future: future.current.length });
  }

  /* ---- clipboard: copy / cut / paste / duplicate / delete ---- */
  const curDecor = s.decorations.find((d) => d.id === selDecor);
  const hasSelection = (selKind === "sticker" && !!curDecor) || (selKind === "block" && !!curBlock) || (selKind === "section" && !!curSection);

  function copySelection() {
    if (selKind === "sticker" && curDecor) clip.current = { kind: "sticker", d: curDecor };
    else if (selKind === "block" && curBlock) clip.current = { kind: "block", block: curBlock };
    else if (selKind === "section" && curSection && !isCardSection(curSection.id)) clip.current = { kind: "section", section: curSection, decorations: s.decorations.filter((d) => d.section === curSection.id) };
    else return false;
    return true;
  }

  function pasteClipboard() {
    const c = clip.current;
    if (!c) return;
    const target = curSection ?? homeSection ?? s.sections[0];
    if (!target && c.kind !== "section") return;
    if (c.kind === "sticker") {
      const { id: _id, ...rest } = c.d;
      void _id;
      addSticker({ ...rest, x: clamp(c.d.x + 3), y: clamp(c.d.y + 3) }, target.id);
    } else if (c.kind === "block") {
      if (c.block.type === "rsvp") return setMsg({ ok: false, text: "The page can only have one RSVP form." });
      if (target.blocks.length >= MAX_BLOCKS) return setMsg({ ok: false, text: "That section is full." });
      const used = s.sections.flatMap((x) => x.blocks.map((b) => b.id));
      const copy: Block = { ...c.block, id: nextId("b", used), images: [...c.block.images] };
      const at = curBlock ? target.blocks.findIndex((b) => b.id === curBlock.id) + 1 : target.blocks.length;
      setS((prev) => ({
        ...prev,
        sections: prev.sections.map((x) => {
          if (x.id !== target.id) return x;
          const blocks = [...x.blocks];
          blocks.splice(at, 0, copy);
          return { ...x, blocks };
        }),
      }));
      setSel({ section: target.id, block: copy.id });
      setSelKind("block");
      setElementPanel(true);
      setFresh({ kind: "block", id: copy.id, snapshot: JSON.stringify(copy) });
    } else {
      if (view === "card") return; // a whole section can't go on the card
      if (pageSections(s).length >= MAX_SECTIONS) return setMsg({ ok: false, text: "Too many sections." });
      const used = s.sections.flatMap((x) => x.blocks.map((b) => b.id));
      const newId = nextId("s", s.sections.map((x) => x.id));
      const blocks = c.section.blocks
        .filter((b) => b.type !== "rsvp")
        .map((b) => {
          const id = nextId("b", used);
          used.push(id);
          return { ...b, id };
        });
      const dUsed = s.decorations.map((x) => x.id);
      const decos = c.decorations.slice(0, Math.max(0, MAX_DECORATIONS - s.decorations.length)).map((x) => {
        const id = nextId("d", dUsed);
        dUsed.push(id);
        return { ...x, id, section: newId };
      });
      setS((prev) => {
        const list = [...prev.sections];
        const at = curSection ? list.findIndex((x) => x.id === curSection.id) + 1 : list.length;
        list.splice(insertAt(list, at), 0, { ...c.section, id: newId, name: `${c.section.name} copy`, blocks });
        return { ...prev, sections: list, decorations: [...prev.decorations, ...decos] };
      });
      setSel({ section: newId, block: null });
      setSelKind("section");
    }
  }

  /** removing something that holds an uploaded picture asks first; the file leaves storage when the design is saved */
  function removeBlockAsk(id: string) {
    const b = s.sections.flatMap((x) => x.blocks).find((x) => x.id === id);
    const hasUpload = !!b && (b.images.length > 0 || ((b.type === "image" || b.type === "map") && b.url.startsWith("/api/img/")));
    if (hasUpload) setConfirmImage({ kind: "block", id });
    else actions.removeBlock(id);
  }
  function removeStickerNow(id: string) {
    setS((prev) => ({ ...prev, decorations: prev.decorations.filter((d) => d.id !== id) }));
    setSelDecor((cur) => (cur === id ? null : cur));
  }
  function removeStickerAsk(id: string) {
    if (s.decorations.find((d) => d.id === id)?.kind === "image") setConfirmImage({ kind: "sticker", id });
    else removeStickerNow(id);
  }

  function deleteSelection() {
    if (selKind === "sticker" && curDecor) removeStickerAsk(curDecor.id);
    else if (selKind === "block" && curBlock) removeBlockAsk(curBlock.id);
    else if (selKind === "section" && curSection) askDeleteSection(curSection.id);
  }

  function nudge(dx: number, dy: number) {
    if (selKind === "sticker" && curDecor) {
      setS((prev) => ({ ...prev, decorations: prev.decorations.map((d) => { if (d.id !== curDecor.id) return d; const v = phoneMode ? phoneDecor(d) : d; return patchDecor(d, { x: clamp(v.x + dx), y: clamp(v.y + dy) }); }) }));
    } else if (selKind === "block" && curBlock && curSection) {
      const i = curSection.blocks.findIndex((b) => b.id === curBlock.id);
      const j = i + (dy < 0 ? -1 : 1);
      if (j >= 0 && j < curSection.blocks.length) actions.moveBlock(curBlock.id, curSection.id, dy < 0 ? i - 1 : i + 2);
    } else if (selKind === "section" && curSection) actions.moveSectionBy(curSection.id, dy < 0 ? -1 : 1);
  }

  function onKey(e: KeyboardEvent) {
    const mod = e.metaKey || e.ctrlKey;
    const k = e.key.toLowerCase();
    if (mod && k === "s") {
      e.preventDefault();
      if (view !== "rsvps" && dirty && !saving) save();
      return;
    }
    if (previewing) {
      if (k === "escape") setPreviewing(false);
      return;
    }
    if (view === "rsvps") return;
    const typing = (e.target as HTMLElement | null)?.closest("input, textarea, select, [contenteditable='true'], [role='dialog'], [role='alertdialog']");
    if (typing) return; // leave native text editing (and dialogs) alone
    if (mod && k === "z") {
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    } else if (mod && k === "y") {
      e.preventDefault();
      redo();
    } else if (mod && (k === "c" || k === "x")) {
      if (copySelection()) {
        e.preventDefault();
        if (k === "x") deleteSelection();
      }
    } else if (mod && k === "v") {
      if (clip.current) {
        e.preventDefault();
        pasteClipboard();
      }
    } else if (mod && k === "d") {
      e.preventDefault();
      if (copySelection()) pasteClipboard();
    } else if ((k === "delete" || k === "backspace") && hasSelection) {
      e.preventDefault();
      deleteSelection();
    } else if (k === "escape") {
      setSel({ section: null, block: null });
      setSelDecor(null);
      setSelKind(null);
      setLeftOpen(false);
    } else if (k.startsWith("arrow") && hasSelection) {
      const step = e.shiftKey ? 2 : 0.5;
      const dx = k === "arrowleft" ? -step : k === "arrowright" ? step : 0;
      const dy = k === "arrowup" ? -step : k === "arrowdown" ? step : 0;
      if (selKind === "sticker" || e.altKey) {
        e.preventDefault();
        nudge(dx, dy);
      }
    } else if (e.key === "?") {
      setHelpOpen(true);
    }
  }
  const keyRef = useRef(onKey);
  useEffect(() => {
    keyRef.current = onKey; // always call the latest handler
  });
  useEffect(() => {
    const f = (e: KeyboardEvent) => keyRef.current(e);
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, []);

  const stickerView = curDecor && phoneMode ? phoneDecor(curDecor) : curDecor;
  const stickerInfo = selKind === "sticker" && stickerView ? { section: stickerView.section, flip: stickerView.flip, rotate: stickerView.rotate, size: stickerView.size } : null;
  const display = applyName(s);
  /** what the canvas draws: in Phone mode, the phone layout (each element / sticker at its phone place and size) */
  const canvas = phoneMode ? phoneSettings(display) : display;


  // phone view: send the design to the phone frame whenever it changes (and when the frame says it is ready)
  useEffect(() => {
    if (!phone) return;
    const send = () => phoneFrame.current?.contentWindow?.postMessage({ type: "rsvibe-phone", s: display }, window.location.origin);
    const t = setTimeout(send, 120); // typing: send once it settles
    const onReady = (e: MessageEvent) => {
      if (e.origin === window.location.origin && e.source === phoneFrame.current?.contentWindow && e.data?.type === "rsvibe-phone-ready") send();
    };
    window.addEventListener("message", onReady);
    return () => {
      clearTimeout(t);
      window.removeEventListener("message", onReady);
    };
  }, [phone, display, phoneKey]);

  const layer = (id: string) => (
    <DragLayer
      items={canvas.decorations.filter((d) => d.section === id)}
      selected={selDecor}
      onPathEnd={(did, x, y) => setS((prev) => ({ ...prev, decorations: prev.decorations.map((d) => (d.id === did ? { ...d, path: { ...d.path, x, y } } : d)) }))}
      onSelect={(did) => {
        setSelDecor(did);
        setSelKind("sticker");
        setStickerPanel(true);
        setSel({ section: id, block: null });
        setLeftOpen(view !== "card");
      }}
      onChange={(did, patch) => setS((prev) => ({ ...prev, decorations: prev.decorations.map((d) => (d.id === did ? patchDecor(d, patch) : d)) }))}
      onRemove={removeStickerAsk}
      onMove={(did, x, y) => setS((prev) => ({ ...prev, decorations: prev.decorations.map((d) => (d.id === did ? patchDecor(d, { x, y }) : d)) }))}
      draggingRef={dragging}
      playing={enterPlay}
      wide={isCardSection(id) ? undefined : !!s.sections.find((x) => x.id === id)?.wide}
    />
  );

  const hasRsvp = s.sections.some((x) => x.blocks.some((b) => b.type === "rsvp"));
  const stickersFull = s.decorations.length >= MAX_DECORATIONS;
  const target = curSection ?? homeSection;

  /** a ready-made section: heading, short text and a map */
  function addMapSection() {
    if (pageSections(s).length >= MAX_SECTIONS) return setMsg({ ok: false, text: "Too many sections." });
    const sid = nextId("s", s.sections.map((x) => x.id));
    const used = s.sections.flatMap((x) => x.blocks.map((b) => b.id));
    const mk = (type: BlockType, patch: Partial<Block>) => {
      const id = nextId("b", used);
      used.push(id);
      return { ...newBlock(type, id), ...patch };
    };
    const map = mk("map", {});
    const sec: Section = {
      id: sid,
      name: "Map",
      bg: "cream",
      bgColor: "",
      hidden: false,
      panel: "none",
      border: DEFAULT_BORDER,
      gradient: DEFAULT_GRADIENT,
      effect: "none",
      card: false,
      wide: false,
      pad: "lg", grow: 0,
      blocks: [mk("heading", { text: "Find us" }), mk("text", { text: "Directions and parking tips for getting here.", size: "lg", tone: "soft" }), map],
    };
    setS((prev) => {
      const list = [...prev.sections];
      list.splice(insertAt(list, curSection ? list.findIndex((x) => x.id === curSection.id) + 1 : list.length), 0, sec);
      return { ...prev, sections: list };
    });
    setSel({ section: sid, block: map.id });
    setSelKind("block");
    setElementPanel(true);
    setFresh({ kind: "block", id: map.id, snapshot: JSON.stringify(map) });
  }

  /** an element tool for the strip: icon with its label underneath (showLabel) instead of a tooltip */
  const miniTool = (type: BlockType | "sticker", showLabel = true) => {
    const sticker = type === "sticker";
    const meta = sticker ? { Icon: Sticker, label: "Sticker" } : PALETTE.find((p) => p.type === type)!;
    const disabled = sticker ? stickersFull : type === "rsvp" && hasRsvp;
    return (
      <div
        key={type}
        className="overflow-hidden rounded-xl"
        draggable={!disabled}
        onDragStart={(e) => {
          drag.current = sticker ? { kind: "sticker" } : { kind: "new", type };
          e.dataTransfer.setData("text/plain", type);
          e.dataTransfer.effectAllowed = "copy";
          // the browser's own drag picture has square white corners; hand it a rounded copy instead
          const tile = e.currentTarget.firstElementChild as HTMLElement | null;
          if (tile) {
            const { width, height } = tile.getBoundingClientRect();
            const ghost = tile.cloneNode(true) as HTMLElement;
            Object.assign(ghost.style, { position: "fixed", top: "-1000px", left: "-1000px", width: `${width}px`, height: `${height}px`, borderRadius: "14px", background: "#ffffff", border: "1.5px solid #2563eb", overflow: "hidden", pointerEvents: "none" });
            document.body.appendChild(ghost);
            e.dataTransfer.setDragImage(ghost, width / 2, height / 2);
            setTimeout(() => ghost.remove(), 0);
          }
        }}
        onDragEnd={() => (drag.current = null)}
      >
        <button
          type="button"
          disabled={disabled}
          aria-label={meta.label}
          title={disabled ? (sticker ? "Sticker limit reached" : "The page already has an RSVP form") : undefined}
          onClick={() => (sticker ? addSticker({}) : target && actions.addBlock(type, target.id, target.blocks.length))}
          className={`group flex cursor-grab flex-col items-center justify-center gap-1 rounded-xl border border-border bg-surface-muted text-soft active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40 ${showLabel ? "min-h-[3.6rem] w-16 px-1 py-2" : "h-9 w-9"}`}
        >
          <meta.Icon size={19} strokeWidth={1.75} className={TOOL_TONE[type]} />
          {showLabel && <span className="text-center text-[10px] font-medium leading-tight">{meta.label}</span>}
        </button>
      </div>
    );
  };

  /** Done keeps everything; ✕ keeps it too — unless the element was only just added and is still untouched, then it is taken back out */
  const justAddedBlock = !!curBlock && fresh?.kind === "block" && fresh.id === curBlock.id;
  const justAddedSticker = !!curDecor && fresh?.kind === "sticker" && fresh.id === curDecor.id;
  const untouched = (item: object | undefined) => !!fresh && JSON.stringify(item) === fresh.snapshot;

  function closeElementPanel(cancel: boolean) {
    if (cancel && justAddedBlock && curBlock && untouched(curBlock)) actions.removeBlock(curBlock.id);
    if (justAddedBlock) setFresh(null);
    setElementPanel(false);
  }
  function closeStickerPanel(cancel: boolean) {
    if (cancel && justAddedSticker && curDecor && untouched(curDecor)) {
      setS((prev) => ({ ...prev, decorations: prev.decorations.filter((d) => d.id !== curDecor.id) }));
      setSelDecor(null);
    }
    if (justAddedSticker) setFresh(null);
    setStickerPanel(false);
  }

  /** a plain button for the strip: icon with its label underneath (showLabel) */
  const stripButton = (label: string, Icon: LucideIcon, onClick: () => void, active = false, showLabel = true) => (
    <button
      key={label}
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`flex shrink-0 flex-col items-center justify-center gap-1 rounded-xl border ${showLabel ? "min-h-[3.6rem] w-16 px-1 py-2" : "h-9 w-9"} ${
        active ? "border-fg bg-fg text-surface shadow-md" : "border-border bg-surface-muted text-soft"
      }`}
    >
      <Icon size={19} strokeWidth={1.75} className={active ? undefined : TOOL_TONE[label]} />
      {showLabel && <span className="text-center text-[10px] font-medium leading-tight">{label}</span>}
    </button>
  );

  // Event & theme, Preview and Save: in the header, or (phones, edit view) floating above the "Content" bar
  const actionButtons = (parts: ("theme" | "view")[], compact = false, slot = "header") => (
    <>
      {parts.includes("theme") && view !== "rsvps" && (
        <Popover
          transition="blur"
          transitionDelay={60}
          open={themeOpen === slot}
          onOpenChange={(o) => setThemeOpen(o ? slot : null)}
          position="bottom"
          classNames={{ panel: "fixed inset-x-0 mx-auto sm:inset-x-auto sm:mx-0 sm:left-4 sm:right-auto top-14 sm:top-16 w-[min(92vw,360px)] translate-x-0 z-50 p-5 shadow-xl max-h-[calc(100dvh-4.5rem)] overflow-y-auto" }}
          content={
            <>
              <div className="-mt-2 mb-2 flex items-center justify-between sm:hidden">
                <span className="text-xs font-bold uppercase tracking-wide text-soft">Event &amp; theme</span>
                <Button variant="ghost" size="sm" icon="x" iconOnly aria-label="Close event and theme" onClick={() => setThemeOpen(null)} />
              </div>
              <ThemeTool s={s} setS={setS} onPickType={setPendingType} />
            </>
          }
        >
          <Tooltip content="Event & theme" position="bottom" classNames={{ bubble: compact ? "" : "hidden" }}>
            <Button size="sm" shape="pill" aria-label="Event and theme" className={`font-semibold shadow-sm ${compact ? "px-2" : "max-sm:px-2.5 max-sm:text-xs"}`}>
              <CalendarDays size={15} className={compact ? "" : "mr-1"} /> <span className={compact ? "hidden" : ""}>Event &amp; theme</span> <ChevronDown size={14} className={`ml-1 opacity-70 ${compact ? "hidden" : "max-sm:hidden"}`} />
            </Button>
          </Tooltip>
        </Popover>
      )}
      {parts.includes("theme") && view === "edit" && (
        <Tooltip content="Edit Card" position="bottom" classNames={{ bubble: compact ? "" : "hidden" }}>
          <Button size="sm" shape="pill" aria-label="Edit Card" className={`font-semibold shadow-sm ${compact ? "px-2" : "max-sm:px-2.5 max-sm:text-xs"}`} onClick={() => goView("card")}>
            <MailOpen size={15} className={compact ? "" : "mr-1"} /> <span className={compact ? "hidden" : ""}>Edit Card</span>
          </Button>
        </Tooltip>
      )}
      {parts.includes("view") && view !== "rsvps" && !previewing && (
        <ButtonGroup shape="pill">
          <SegmentButton active={!phoneMode} icon="monitor" onClick={() => setDevice("desktop")}>{compact ? "" : "Desktop"}</SegmentButton>
          <SegmentButton active={phoneMode} icon="smartphone" onClick={() => setDevice("phone")}>{compact ? "" : "Phone"}</SegmentButton>
        </ButtonGroup>
      )}
      {parts.includes("view") && view !== "rsvps" && !previewing && (
        <Tooltip content={phone ? "Close the phone view" : "Phone view — see the page as it looks on a phone, while you edit"} position="bottom" classNames={{ bubble: compact ? "" : "hidden" }}>
          <Button size="sm" shape="pill" variant={phone ? "solid" : undefined} aria-pressed={phone} aria-label="Phone view" className={`font-semibold shadow-sm ${compact ? "px-2" : "max-sm:px-2.5 max-sm:text-xs"}`} onClick={() => setPhone((p) => !p)}>
            <Smartphone size={15} className={compact ? "" : "mr-1"} /> <span className={compact ? "hidden" : ""}>{phone ? "Close phone" : "Phone view"}</span>
          </Button>
        </Tooltip>
      )}
      {parts.includes("view") && <Tooltip content={previewing ? "Back to the editor" : "Preview — the page as visitors will see it, including unsaved changes"} position="bottom" classNames={{ bubble: compact ? "" : "hidden" }}>
        <Button size="sm" shape="pill" icon={previewing ? "pencil" : "eye"} aria-label={previewing ? "Back to Edit" : "Preview"} className={`font-semibold shadow-sm ${compact ? "px-2" : "max-sm:px-2.5 max-sm:text-xs"}`} onClick={() => (previewing ? setPreviewing(false) : startPreview())}><span className={compact ? "hidden" : ""}>{previewing ? "Back to Edit" : "Preview"}</span></Button>
      </Tooltip>}
    </>
  );

  const layerSection = curSection ?? homeSection;
  const confirmSection = s.sections.find((x) => x.id === confirmDelete);

  return (
    <>
      <div className="flex h-screen flex-col overflow-hidden bg-surface-muted text-fg">
        <header className="flex flex-wrap items-center gap-2 border-b border-border bg-surface px-3 py-2 text-xs sm:gap-3 sm:px-5 sm:py-3">
          <Link
            href={`/event/${eventId}`}
            title="Back to the event"
            aria-label={`Back to ${eventTitle}`}
            className="group mr-1 flex min-w-0 items-center gap-2 rounded-full border border-border bg-surface py-1 pl-1 pr-1 text-xs font-semibold shadow-sm transition-colors hover:border-accent-500 hover:bg-surface-muted sm:mr-3 sm:pr-3.5 sm:text-sm"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-600 text-white transition-transform group-hover:-translate-x-0.5">
              <ArrowLeft size={15} strokeWidth={2.25} />
            </span>
            <span className="max-w-[16rem] truncate max-sm:hidden">{eventTitle}</span>
            <span className="font-normal text-soft max-sm:hidden">· Design</span>
          </Link>
          <ButtonGroup shape="pill">
            <SegmentButton active={view === "edit"} icon="palette" onClick={() => goView("edit")}>Edit page</SegmentButton>
            <SegmentButton active={view === "card"} icon="mail-open" onClick={() => goView("card")}>Edit Card</SegmentButton>
            <SegmentButton active={view === "rsvps"} icon="users" onClick={() => goView("rsvps")}>RSVPs</SegmentButton>
          </ButtonGroup>
          {/* phones: on the first row, at the right end, level with the RSVPs tab */}
          <UserMenu transition="blur" transitionDelay={60} className="ml-auto sm:hidden" name={account.name} email={account.email} avatarSrc={account.imageUrl || undefined} avatarInitials={(account.name || account.email)[0].toUpperCase()} items={[{ label: "Log out", danger: true }]} onItemSelect={() => logout()} />
          <div className="flex items-center gap-2 max-sm:w-full max-sm:justify-end sm:ml-auto">
            <Tooltip content="Undo (Ctrl/⌘ Z)" position="bottom" className="max-sm:hidden">
              <Button variant="ghost" size="sm" className="px-2" aria-label="Undo" disabled={hist.past === 0 || view === "rsvps"} onClick={undo}><Undo2 size={16} /></Button>
            </Tooltip>
            <Tooltip content="Redo (Ctrl/⌘ Shift Z)" position="bottom" className="max-sm:hidden">
              <Button variant="ghost" size="sm" className="px-2" aria-label="Redo" disabled={hist.future === 0 || view === "rsvps"} onClick={redo}><Redo2 size={16} /></Button>
            </Tooltip>
            <Tooltip content="Keyboard shortcuts (?)" position="bottom" className="max-sm:hidden">
              <Button variant="ghost" size="sm" className="px-2" aria-label="Keyboard shortcuts" onClick={() => setHelpOpen(true)}><Keyboard size={16} /></Button>
            </Tooltip>
            {dirty && <Badge variant="soft" color="amber" dot>Unsaved changes</Badge>}
            <UserMenu transition="blur" transitionDelay={60} className="max-sm:hidden" name={account.name} email={account.email} avatarSrc={account.imageUrl || undefined} avatarInitials={(account.name || account.email)[0].toUpperCase()} items={[{ label: "Log out", danger: true }]} onItemSelect={() => logout()} />
          </div>
          {/* own row below lg: Event & theme and Preview on the left, Save on the right */}
          <div className={`flex w-full items-center justify-between gap-2 ${previewing ? "hidden" : view !== "rsvps" ? "lg:hidden" : ""}`}>
            <div className="flex flex-wrap items-center gap-2">{actionButtons(["theme", "view"])}</div>
          </div>
        </header>

        {view === "rsvps" ? (
          <div className="flex-1 overflow-auto p-6">
            <div className="mx-auto max-w-4xl">
              <Card variant="elevated" padding="lg">
                <RsvpList eventId={eventId} />
              </Card>
            </div>
          </div>
        ) : (
          // large screens: the canvas is the whole window width (as wide as the preview / a visitor's screen), and the side panels float over it
          <div className="relative flex min-h-0 flex-1 flex-col lg:block">
            <AnimatePresence initial={false}>
              {leftOpen && curSection && (
                <motion.aside
                  key="section-settings"
                  initial={{ width: isLg ? 0 : "100%", height: isLg ? "auto" : 0, opacity: 0 }}
                  animate={{ width: isLg ? 290 : "100%", height: "auto", opacity: 1 }}
                  exit={{ width: isLg ? 0 : "100%", height: isLg ? "auto" : 0, opacity: 0 }}
                  transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                  style={floatStyle("settings", "left")}
                  className="max-h-[45vh] shrink-0 overflow-hidden border-b border-border bg-surface lg:absolute lg:z-[76] lg:flex lg:flex-col lg:rounded-2xl lg:border lg:shadow-2xl"
                >
                    <div className="h-full w-full overflow-auto lg:h-auto lg:min-h-0 lg:w-[290px]">
                      <div onPointerDown={startPanelDrag("settings", "left")}title={isLg ? "Drag to move" : undefined} className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-surface/95 px-4 py-3.5 backdrop-blur lg:cursor-move lg:select-none lg:touch-none">
                        <div className="flex min-w-0 items-center gap-3">
                          <GripVertical size={14} className="-mx-2 hidden shrink-0 text-soft lg:block" aria-hidden />
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-fg text-surface shadow-sm">
                            <Layers size={17} />
                          </span>
                          <div className="grid min-w-0 gap-1">
                            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-soft">Section settings</p>
                            {/* same blue as the section's label in the preview, so the two read as one thing */}
                            <span className="inline-flex w-fit max-w-full items-center gap-1.5 rounded-full bg-[#2563eb] px-2.5 py-0.5 text-xs font-bold text-white shadow-sm">
                              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-white" />
                              <span className="truncate">{curSection.name || "Section"}</span>
                              {curSection.hidden && <span className="shrink-0 font-normal opacity-80">· hidden</span>}
                            </span>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center">
                          <button
                            type="button"
                            aria-expanded={settingsOpen}
                            aria-label={settingsOpen ? "Collapse section settings" : "Expand section settings"}
                            onClick={() => setSettingsOpen((o) => !o)}
                            className="flex h-8 w-8 items-center justify-center rounded-md text-soft hover:bg-surface-muted hover:text-fg lg:hidden"
                          >
                            <ChevronDown size={16} className={`transition-transform ${settingsOpen ? "" : "-rotate-90"}`} />
                          </button>
                          <Button variant="ghost" size="sm" icon="x" iconOnly aria-label="Close section settings" onClick={() => setLeftOpen(false)} />
                        </div>
                      </div>
                      <div className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${settingsOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr] lg:grid-rows-[1fr]"}`}>
                        <div className={`min-h-0 overflow-hidden transition-[visibility] duration-300 ${settingsOpen ? "" : "max-lg:invisible"}`}>
                          <div className="grid gap-6 p-4">
                            <div id="left-section" className="scroll-mt-16">
                              <SectionEditor sec={curSection} set={(p) => updateSection(curSection.id, p)} remove={isCardSection(curSection.id) ? undefined : () => askDeleteSection(curSection.id)} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                </motion.aside>
              )}
            </AnimatePresence>
              <div
                ref={previewRef}
                className="min-h-0 min-w-0 flex-1 overflow-auto bg-surface-muted p-6 lg:absolute lg:inset-0 lg:p-0"
                onPointerDown={startMarquee}
                onPointerMove={(e) => {
                  // the grab hand and the light hover frame: only over an element itself, whichever row lies on top
                  if (e.buttons) return;
                  const b = blockAtPoint(e.clientX, e.clientY);
                  if (b === hotBlock.current) return;
                  if (hotBlock.current) hotBlock.current.dataset.hot = "";
                  if (b) b.dataset.hot = "1";
                  hotBlock.current = b;
                }}
                onPointerLeave={() => {
                  if (hotBlock.current) hotBlock.current.dataset.hot = "";
                  hotBlock.current = null;
                }}
                onClickCapture={onPreviewClick}
                onSubmitCapture={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                {/* large screens: an oval bar of page actions above the page */}
                <div data-action className="fx-invert sticky top-0 z-[60] mb-3 mx-auto hidden max-w-[1100px] justify-between lg:flex">
                  <div className="flex items-center gap-2 rounded-full border border-border bg-surface px-2.5 py-1.5 shadow-md">
                    {actionButtons(["theme", "view"], false, "bar")}
                    {/* the right-hand panels float over the canvas: hide them to see and reach the design's right edge */}
                    <Tooltip content={panelsHidden ? "Show the Content list and Toolbox" : "Hide the Content list and Toolbox (see the whole page)"} position="bottom">
                      <Button size="sm" shape="pill" variant="outline" icon={panelsHidden ? "panel-right-open" : "panel-right-close"} className="font-semibold" onClick={() => setPanelsHidden((h) => !h)}>{panelsHidden ? "Show panels" : "Hide panels"}</Button>
                    </Tooltip>
                    {panelsHidden && <SaveButton dirty={dirty} saving={saving} onClick={save} />}
                  </div>
                </div>
                {/* only this preview takes the site theme — the admin UI itself stays as it is */}
                <ThemeProvider isolated mode={s.theme.mode} accent={s.theme.accent} design={s.theme.design}>
                  {phoneMode && (
                    <div data-action className="mx-auto mb-3 flex max-w-[438px] items-center gap-2 rounded-2xl bg-[#2563eb] px-3 py-2 text-xs font-semibold text-white shadow">
                      <Smartphone size={15} className="shrink-0" />
                      <span>Phone layout (390px). Moving, resizing and turning things here changes phones only; words and looks are shared.</span>
                    </div>
                  )}
                  {view === "card" && (
                    <div data-action className="mx-auto mb-3 flex max-w-[760px] items-center justify-center gap-2 pl-12">
                      <Button size="sm" shape="pill" icon="play" className="font-semibold shadow-sm" onClick={() => setCardPlay((n) => n + 1)}>Play the opening</Button>
                      <span className="text-xs text-soft">Click any part of the card to change it.</span>
                    </div>
                  )}
                  {view === "card" && !s.page.intro.on && (
                    <div data-action className="mx-auto mb-3 flex max-w-[1100px] flex-wrap items-center justify-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 text-center text-fg">
                      <p className="text-sm font-semibold">The opening card is off — guests go straight to your page.</p>
                      <Button size="sm" shape="pill" className="font-semibold" onClick={() => setS((prev) => ({ ...prev, page: { ...prev.page, intro: { ...prev.page.intro, on: true } } }))}>Turn it on</Button>
                    </div>
                  )}
                  <div data-font={s.theme.font} className={`editing ${sel.section ? "has-selection" : ""} ${view === "card" ? `mx-auto ${phoneMode ? "max-w-[438px]" : "max-w-[816px]" /* a 768px (48rem) page: the card's large-screen look */} pt-1 text-fg ${s.page.intro.on ? "" : "opacity-60 saturate-50"}` : `page-bg mx-auto ${phoneMode ? "max-w-[390px]" : "max-w-none"} overflow-x-clip rounded-2xl pt-1 text-fg ring-1 ring-border`}`}>
                    <PageView key={view === "card" ? `card-${cardPlay}` : "page"} s={canvas} card={view === "card" ? { autoplay: cardPlay > 0, onPick: pickCardPart, peek: cardPanel === "letter", onChange: (p) => setS((prev) => ({ ...prev, page: { ...prev.page, intro: { ...prev.page.intro, ...p } } })) } : undefined} edit={{ selected: sel, group: groupSel, multi, layer, actions, phone: phoneMode, desktop: phoneMode ? display : undefined, sticker: stickerInfo, illoHandles: (b) => (b.deco && !phoneMode /* its size and turn are shared; on phones use "Size on phones" */ ? stickerHandles({ id: b.id, section: "", x: 50, y: 50, path: DEFAULT_PATH, layer: "front", ...b.deco }, (_, patch) => updateBlock(b.id, { deco: { ...b.deco!, ...(patch as Partial<NonNullable<Block["deco"]>>) } }), () => removeBlockAsk(b.id)) : null) }} />
                  </div>
                </ThemeProvider>
                {marquee && <i aria-hidden className="pointer-events-none fixed z-[90] rounded-md border-2 border-brand bg-brand/15" style={{ left: marquee.x1, top: marquee.y1, width: marquee.x2 - marquee.x1, height: marquee.y2 - marquee.y1 }} />}
                {barCount > 0 && (
                  <div className="pointer-events-none fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[70] flex justify-center px-3">
                  <div data-action role="toolbar" aria-label="Group selected elements" data-state={barOpen ? "open" : "closed"} className={`lojee-tr lojee-tr-blur ${barOpen ? "" : "pointer-events-none"} pointer-events-auto flex w-full max-w-xl flex-wrap items-center justify-center gap-2 rounded-3xl bg-white px-3 py-2.5 text-slate-900 shadow-2xl ring-4 ring-brand/30 sm:w-auto sm:rounded-full sm:px-4`}>
                    <span className="flex w-full items-center justify-center gap-2 text-sm font-extrabold sm:w-auto"><span className="grid h-6 min-w-6 place-items-center rounded-full bg-brand px-1.5 text-xs text-white">{barCount}</span>selected</span>
                    <button type="button" onClick={() => actions.groupBlocks(multi, "row")} className="flex items-center gap-1.5 rounded-full bg-brand px-3.5 py-2 text-sm font-bold text-white shadow-sm active:scale-95"><Columns2 size={16} />Row</button>
                    <button type="button" onClick={() => actions.groupBlocks(multi, "col")} className="flex items-center gap-1.5 rounded-full bg-brand px-3.5 py-2 text-sm font-bold text-white shadow-sm active:scale-95"><Rows2 size={16} />Column</button>
                    <button type="button" onClick={() => actions.groupBlocks(multi, "none")} className="flex items-center gap-1.5 rounded-full border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 active:scale-95"><Ungroup size={16} />Ungroup</button>
                    <button type="button" aria-label="Clear selection" onClick={() => setMulti([])} className="grid h-9 w-9 place-items-center rounded-full text-slate-600 hover:bg-slate-100"><X size={16} /></button>
                  </div>
                  </div>
                )}
              </div>

            {/* always-visible list of everything added to the selected section */}
            <aside style={floatStyle("content", "right")} className={`max-h-56 w-full shrink-0 overflow-y-auto overscroll-contain border-t border-border bg-surface lg:absolute lg:z-[75] lg:w-[clamp(176px,14vw,300px)] lg:rounded-2xl lg:border lg:shadow-2xl ${panelsHidden ? "lg:hidden" : ""}`}>
              <div onPointerDown={startPanelDrag("content", "right")} title={isLg ? "Drag to move" : undefined} className={`sticky top-0 z-10 flex h-14 w-full shrink-0 items-center gap-2 bg-surface/95 px-3 backdrop-blur lg:h-[65px] lg:cursor-move lg:select-none lg:touch-none ${addedOpen ? "border-b border-border" : "max-lg:border-b-0"} lg:border-b lg:border-border`}>
                <GripVertical size={14} className="-mx-1.5 hidden shrink-0 text-soft lg:block" aria-hidden />
                <SaveButton dirty={dirty} saving={saving} onClick={save} />
                <button type="button" aria-expanded={addedOpen} aria-label="Show or hide what is in this section" onClick={() => setAddedOpen((o) => !o)} className="flex shrink-0 items-center gap-2 rounded-full p-1 lg:hidden">
                  {layerSection && <Badge variant="soft" size="xs" color="blue">{layerSection.blocks.length + s.decorations.filter((d) => d.section === layerSection.id).length}</Badge>}
                  <ChevronDown size={16} className={`shrink-0 text-soft transition-transform ${addedOpen ? "" : "-rotate-90"}`} aria-hidden />
                </button>
              </div>
              <div className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${addedOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr] lg:grid-rows-[1fr]"}`}>
              <div className={`min-h-0 overflow-hidden transition-[visibility] duration-300 ${addedOpen ? "" : "max-lg:invisible"}`}>
              <div className="p-3">
              <span className="mb-2 inline-flex w-fit max-w-full items-center gap-2 rounded-full bg-ink px-3.5 py-1 text-sm font-bold text-white shadow-sm">
                <span className="h-2 w-2 shrink-0 rounded-full bg-white" />
                <span className="truncate">Content</span>
              </span>
              {layerSection ? (
                <ElementList
              section={layerSection}
              stickers={s.decorations.filter((d) => d.section === layerSection.id)}
              selBlock={sel.block}
              selSticker={selKind === "sticker" ? selDecor : null}
              onReorder={(blocks) => updateSection(layerSection.id, { blocks })}
              onPickBlock={(id) => {
                setSel({ section: layerSection.id, block: id });
                setSelKind("block");
                setElementPanel(true);
                previewRef.current?.querySelector(`[data-block="${id}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
              }}
              onPickSticker={(id) => {
                setSel({ section: layerSection.id, block: null });
                setSelDecor(id);
                setSelKind("sticker");
                setStickerPanel(true);
                previewRef.current?.querySelector(`[data-decor="${id}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
              }}
              onDeleteBlock={removeBlockAsk}
              onDeleteSticker={removeStickerAsk}
            />
              ) : (
                <p className="text-xs text-soft">Select a section to see its elements.</p>
              )}
              </div>
              </div>
              </div>
            </aside>

            {/* the toolbox is a permanent icon strip: click or drag a tool; settings open in floating panels */}
            <aside style={floatStyle("toolbox", "right")} className={`max-h-24 w-full shrink-0 overflow-hidden border-t border-border bg-surface lg:absolute lg:z-[75] lg:flex lg:w-[84px] lg:flex-col lg:rounded-2xl lg:border lg:shadow-2xl ${panelsHidden ? "lg:hidden" : ""}`}>
              <div onPointerDown={startPanelDrag("toolbox", "right")} title="Drag to move" className="hidden h-[65px] shrink-0 cursor-move select-none touch-none flex-col items-center justify-center gap-1.5 border-b border-border bg-gradient-to-b from-surface-muted to-surface px-2 lg:flex">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-fg text-surface shadow-sm"><Wrench size={12} /></span>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-fg">Toolbox</p>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto p-2 lg:min-h-0 lg:flex-1 lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden lg:py-3">
                {GROUPS.map((g, i) => (
                  <Fragment key={g.title}>
                    {i > 0 && <span aria-hidden className="mx-1 h-6 w-px shrink-0 bg-border lg:mx-0 lg:my-1 lg:h-px lg:w-6" />}
                    {g.types.map((t) => (
                      <span key={t} className="shrink-0">{miniTool(t)}</span>
                    ))}
                  </Fragment>
                ))}
                <span aria-hidden className="mx-1 h-6 w-px shrink-0 bg-border lg:mx-0 lg:my-1 lg:h-px lg:w-6" />
                {stripButton("Text stickers", Sparkles, () => setStickersPanel((o) => !o), stickersPanel)}
                {stripButton("Card box", SquareStack, addCardBox)}
                {view !== "card" && stripButton("New section", Plus, () => actions.addSection(curSection ? s.sections.indexOf(curSection) + 1 : pageSections(s).length))}
                {view !== "card" && stripButton("New map", MapPin, addMapSection)}
              </div>
            </aside>
          </div>
        )}

        <AnimatePresence>
        {phone && !previewing && view !== "rsvps" && (() => {
          // a 390 x 844 phone screen, shown smaller so it fits beside the editor
          const k = Math.min(0.8, Math.max(0.45, ((typeof window === "undefined" ? 900 : window.innerHeight) * 0.75 - 110) / 844));
          return (
            <FloatingPanel key="phone" panelId="phone" title="Phone view" width={Math.round(390 * k) + 34} onClose={() => setPhone(false)} onDone={() => setPhone(false)}>
              <div className="grid justify-items-center gap-2">
                <div className="rounded-[2.2rem] bg-zinc-900 p-2.5 shadow-xl ring-1 ring-black/20">
                  <div className="relative overflow-hidden rounded-[1.7rem] bg-white" style={{ width: 390 * k, height: 844 * k }}>
                    <iframe
                      key={phoneKey}
                      ref={phoneFrame}
                      src="/phone-preview"
                      title="The page on a phone"
                      className="absolute left-0 top-0 origin-top-left border-0"
                      style={{ width: 390, height: 844, transform: `scale(${k})` }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="xs" shape="pill" variant="outline" icon="rotate-ccw" onClick={() => setPhoneKey((n) => n + 1)}>Start again</Button>
                  <span className="text-[11px] text-soft">390 × 844 · updates as you edit</span>
                </div>
              </div>
            </FloatingPanel>
          );
        })()}
        </AnimatePresence>

        {previewing && (
          // the whole screen, exactly as visitors get it (full height and width; the editor's header is out of the way)
          <div className="fixed inset-0 z-[120] overflow-auto bg-surface-muted">
            {/* floating over the page, taking no room in it */}
            <div className="pointer-events-none fixed inset-x-0 top-3 z-[130] flex items-center justify-center gap-2 px-4">
              <span className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-accent-700 via-accent-600 to-accent-400 py-1.5 pl-3 pr-4 text-[11px] font-bold uppercase tracking-[0.22em] text-white shadow-lg shadow-accent-600/30 ring-1 ring-inset ring-white/30">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/70" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                </span>
                <Eye size={13} strokeWidth={2.25} />
                Preview
              </span>
              <Button size="sm" shape="pill" icon="pencil" className="pointer-events-auto font-semibold shadow-lg" onClick={() => setPreviewing(false)}>
                Back to editor
              </Button>
            </div>
            <ThemeProvider isolated mode={s.theme.mode} accent={s.theme.accent} design={s.theme.design}>
              <div
                data-font={s.theme.font}
                className="page-bg min-h-screen text-fg"
                onSubmitCapture={(e) => {
                  e.preventDefault(); // the form is only a preview here — nothing is sent
                  e.stopPropagation();
                }}
              >
                <PageView s={display} introTop={0} />
              </div>
            </ThemeProvider>
          </div>
        )}

        {stickerPanel && selKind === "sticker" && curDecor && !previewing && <Connector panel="sticker" selector={[`[data-decor="${curDecor.id}"] [data-fit-frame]`, `[data-decor="${curDecor.id}"]`]} />}
        <AnimatePresence>
        {stickerPanel && selKind === "sticker" && curDecor && !previewing && (
          <FloatingPanel key="sticker" panelId="sticker" title={`Edit ${KIND_LABEL[curDecor.kind].toLowerCase()}`} onClose={() => closeStickerPanel(true)} onDone={() => closeStickerPanel(false)} closeHint={justAddedSticker && untouched(curDecor) ? "Cancel — removes the sticker you just added" : "Close"}>
            <StickerEditor
              cur={phoneMode ? phoneDecor(curDecor) : curDecor}
              phone={phoneMode}
              onPlayEnter={() => setEnterPlay((p) => ({ id: curDecor.id, n: (p?.n ?? 0) + 1 }))}
              arrange={(() => {
                const peers = stackPeers(s.decorations, curDecor);
                return { at: peers.indexOf(curDecor) + 1, of: peers.length, move: (op: ArrangeOp) => arrangeSticker(curDecor.id, op) };
              })()}
              onPosition={() => stickerToLayout(curDecor)}
              update={(patch) => setS((prev) => ({ ...prev, decorations: prev.decorations.map((d) => (d.id === curDecor.id ? patchDecor(d, patch) : d)) }))}
              onResetPhone={() => setS((prev) => ({ ...prev, decorations: prev.decorations.map((d) => (d.id === curDecor.id ? { ...d, m: undefined } : d)) }))}
            />
          </FloatingPanel>
        )}
        </AnimatePresence>

        <AnimatePresence>
        {cardPanel && view === "card" && !previewing && <Connector key={`card-line-${cardPanel}`} panel="card" selector={`[data-card-part="${cardPanel}"]`} />}
        {cardPanel && view === "card" && !previewing && (
          <FloatingPanel key="card" panelId="card" title={CARD_PART_TITLE[cardPanel]} onClose={() => setCardPanel(null)} onDone={() => setCardPanel(null)}>
            <CardTool s={s} setS={setS} part={cardPanel} onTry={() => setCardPlay((n) => n + 1)} onLetter={() => setCardPanel("letter")} />
          </FloatingPanel>
        )}
        </AnimatePresence>

        <AnimatePresence>
        {stickersPanel && !previewing && (
          <FloatingPanel key="stickers" panelId="stickers" title="Text stickers" onClose={() => setStickersPanel(false)} onDone={() => setStickersPanel(false)}>
            <DecorTools
              section={layerSection?.id ?? ""}
              s={s}
              setS={setS}
              sel={selDecor}
              onNew={(d) => setFresh({ kind: "sticker", id: d.id, snapshot: JSON.stringify(d) })}
              setSel={(id) => {
                setSelDecor(id);
                if (id) {
                  setSelKind("sticker");
                  setStickerPanel(true);
                }
              }}
            />
          </FloatingPanel>
        )}
        </AnimatePresence>

        {elementPanel && curBlock && !previewing && <Connector panel="element" selector={[`[data-block="${curBlock.id}"] [data-fit-frame]`, `[data-block="${curBlock.id}"] > .block-ring`, `[data-block="${curBlock.id}"]`]} />}
        <AnimatePresence>
        {rsvpPartKey && curBlock?.type === "rsvp" && !previewing && (
          <FloatingPanel key="rsvppart" panelId="rsvppart" title={`Form piece: ${RSVP_PART_META[rsvpPartKey].label}`} onClose={() => setRsvpPartKey(null)} onDone={() => setRsvpPartKey(null)}>
            <RsvpPartEditor b={curBlock} partKey={rsvpPartKey} set={(p) => updateBlock(curBlock.id, p)} onRemoved={() => setRsvpPartKey(null)} />
          </FloatingPanel>
        )}
        </AnimatePresence>

        {rsvpPartKey && curBlock?.type === "rsvp" && !previewing && <Connector panel="rsvppart" selector={`[data-rsvp-part="${rsvpPartKey}"]`} />}

        <AnimatePresence>
        {elementPanel && curBlock && !previewing && (
          <FloatingPanel key="element" panelId="element" title={`Element: ${PALETTE.find((p) => p.type === curBlock.type)?.label ?? curBlock.type}`} onClose={() => closeElementPanel(true)} onDone={() => closeElementPanel(false)} closeHint={justAddedBlock && untouched(curBlock) ? "Cancel — removes the element you just added" : "Close"}>
            <BlockEditor b={curBlock} onSelectGroup={() => setGroupSel(curBlock.group) /* its own panel, beside this one */} setGroup={(p) => updateGroupDev(curBlock.group, p)} phone={phoneMode} onResetPhone={() => updateBlock(curBlock.id, { m: undefined })} onToFixed={() => illustrationToFixed(curBlock)} set={(p) => updateBlock(curBlock.id, p)} remove={() => removeBlockAsk(curBlock.id)} setMsg={setMsg} onEditPart={(k) => { setRsvpPartKey(k); }} />
          </FloatingPanel>
        )}
        </AnimatePresence>

        {/* the blue line from the card box's floating panel to the box itself */}
        {groupSel && !previewing && <Connector panel="group" selector={`.editing [data-group="${groupSel}"]`} />}
        <AnimatePresence>
        {groupSel && !previewing && (() => {
          const members = s.sections.flatMap((x) => x.blocks).filter((b) => b.group === groupSel);
          if (!members.length) return null;
          const first = members[0];
          return (
            <FloatingPanel key="group" panelId="group" title={`${first.groupStyle === "none" ? "Group" : "Card box"} (${members.length} elements)`} onClose={() => setGroupSel(null)} onDone={() => setGroupSel(null)}>
              <div className="grid gap-3">
                <div className="grid gap-1.5">
                  <p className="text-xs font-bold uppercase tracking-wide text-soft">Add inside</p>
                  <div className="flex flex-wrap gap-1.5">
                    {PALETTE.filter((p) => !["rsvp", "map", "gallery", "countdown", "spacer"].includes(p.type)).map((p) => (
                      <button key={p.type} type="button" title={p.label} aria-label={`Add ${p.label} inside`} onClick={() => addToGroup(groupSel, p.type)} className="flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs font-medium hover:border-fg/40 hover:bg-surface-muted">
                        <p.Icon size={14} className={TOOL_TONE[p.type]} />
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
                <GroupFields first={phoneMode ? phoneBlock(first) : first} update={(p) => updateGroupDev(groupSel, p)} />
                <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                  <Button variant="outline" size="sm"  onClick={() => { actions.groupBlocks(members.map((m) => m.id), "none"); setGroupSel(null); }}>Ungroup</Button>
                  <Button
                    variant="destructive-outline"
                    size="sm"
                    icon="trash-2"
                    onClick={() => {
                      // the box and everything in it go (Undo brings them back); their uploaded pictures leave storage when the design is saved
                      const ids = new Set(members.map((m) => m.id));
                      setS((prev) => ({ ...prev, sections: prev.sections.map((x) => ({ ...x, blocks: x.blocks.filter((b) => !ids.has(b.id)) })) }));
                      setGroupSel(null);
                      setSel((p) => ({ ...p, block: null }));
                      setElementPanel(false);
                      setMsg({ ok: true, text: "Card box removed. Undo (Ctrl/⌘ Z) brings it back." });
                    }}
                  >
                    Remove {first.groupStyle === "none" ? "group" : "card box"}
                  </Button>
                </div>
              </div>
            </FloatingPanel>
          );
        })()}
        </AnimatePresence>

        <SaveToast msg={msg} onClose={() => setMsg(null)} />

        <AlertDialog
          open={helpOpen}
          onClose={() => setHelpOpen(false)}
          title="Keyboard shortcuts"
          description={
            <span className="mt-2 grid gap-1.5 text-left">
              {SHORTCUTS.map(([keys, what]) => (
                <span key={keys} className="flex items-baseline justify-between gap-4">
                  <kbd className="rounded-md border border-border bg-surface-muted px-1.5 py-0.5 font-mono text-[11px]">{keys}</kbd>
                  <span className="text-right text-xs">{what}</span>
                </span>
              ))}
            </span>
          }
          confirmLabel="Got it"
          onConfirm={() => setHelpOpen(false)}
        />
        <AlertDialog
          open={!!pendingType}
          onClose={() => setPendingType(null)}
          title={`Use the ${pendingType ? EVENT_PRESETS[pendingType].label : ""} text?`}
          description="This rewrites the hero, event details, schedule, RSVP and footer text for this type of event. Your layout, colours, images and stickers are kept, and you can still edit everything afterwards."
          confirmLabel="Generate text"
          onConfirm={() => {
            if (pendingType) setS((prev) => applyPreset(prev, pendingType));
            setPendingType(null);
          }}
        />
        <AlertDialog
          open={!!confirmImage}
          onClose={() => setConfirmImage(null)}
          variant="destructive"
          title="Remove this image?"
          description="The picture is taken off your design, and the file is deleted from storage when you save. Reload before saving to get it back."
          confirmLabel="Remove image"
          onConfirm={() => {
            if (confirmImage?.kind === "block") actions.removeBlock(confirmImage.id);
            else if (confirmImage) removeStickerNow(confirmImage.id);
            setConfirmImage(null);
          }}
        />
        <AlertDialog
          open={!!confirmSection}
          onClose={() => setConfirmDelete(null)}
          variant="destructive"
          title={`Delete “${confirmSection?.name ?? ""}”?`}
          description="This removes the section with all its elements and stickers. You can still undo by reloading before you save."
          confirmLabel="Delete section"
          onConfirm={() => {
            if (confirmDelete) deleteSection(confirmDelete);
            setConfirmDelete(null);
          }}
        />
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */

const DESIGN_OPTIONS = [["bento", "Bento", "Flat, clean cards"], ["clay", "Clay", "Soft, rounded, friendly"]] as const;
const FONT_OPTIONS = [
  ["playful", "Playful — Nunito & Fredoka"],
  ["modern", "Modern — Inter & Poppins"],
  ["elegant", "Elegant — Lora & Playfair Display"],
  ["bold", "Bold — DM Sans & Space Grotesk"],
] as const;

/** The page's one Save button (the library Button): green and wiggling while there is something to save, a calm "All saved" otherwise. */
function SaveButton({ dirty, saving, onClick }: { dirty: boolean; saving: boolean; onClick: () => void }) {
  return (
    <Button
      aria-label="Save changes"
      shape="pill"
      color="emerald"
      icon={dirty ? "save" : "check"}
      animation={dirty && !saving ? "wiggle" : undefined}
      loading={saving}
      disabled={!dirty || saving}
      onClick={onClick}
      className="min-w-0 flex-1 font-semibold"
    >
      {saving ? "Saving…" : dirty ? "Save changes" : "All saved"}
    </Button>
  );
}

function ThemeTool({ s, setS, onPickType }: { s: Settings; setS: React.Dispatch<React.SetStateAction<Settings>>; onPickType: (t: EventType) => void }) {
  const set = (p: Partial<Settings["theme"]>) => setS((prev) => ({ ...prev, theme: { ...prev.theme, ...p } }));
  const setPage = (p: Partial<Settings["page"]>) => setS((prev) => ({ ...prev, page: { ...prev.page, ...p } }));
  return (
    <div className="grid gap-5">
      <div className="grid gap-1.5">
        <SelectField label="Event type" value={s.eventType} options={EVENT_TYPE_OPTIONS} onChange={(t) => t !== s.eventType && onPickType(t)} />
        <p className="text-xs text-soft">Pick a type to generate ready-made text and sentences for it.</p>
      </div>
      <div className="grid gap-2">
        <TextField
          label="Event name — use {name} in any text"
          value={s.name}
          placeholder={`Enter the real name, e.g. ${EVENT_PRESETS[s.eventType].nameHint}`}
          maxLength={60}
          onChange={(v) => setS((prev) => ({ ...prev, name: v }))}
        />
        {isPlaceholderName(s.name) && (
          <Alert variant="warning" icon={false}>
            Add the real event name. It replaces <b>{"{name}"}</b> across the page, and visitors will see “[Event name]” until you do.
          </Alert>
        )}
      </div>
      <div className="grid gap-2">
        <span className="text-xs font-bold uppercase tracking-wide text-fg-muted">Palettes</span>
        <div className="grid grid-cols-5 gap-2">
          {PALETTES.map((p) => {
            const accent = fitAccent(p.accent, p.mode);
            const on = s.theme.accent === accent && s.theme.mode === p.mode;
            return (
              <button key={p.name} type="button" title={p.name} aria-label={`${p.name} palette`} aria-pressed={on} onClick={() => set({ accent, mode: p.mode, design: p.design, font: p.font })} className={`relative h-9 overflow-hidden rounded-xl border transition-transform hover:scale-105 ${on ? "border-fg ring-2 ring-fg/20" : "border-border"}`} style={{ background: p.mode === "dark" ? "#14141a" : "#faf8f4" }}>
                <span className="absolute inset-x-1.5 bottom-1.5 top-4 rounded-md" style={{ background: accent }} />
                <span className="absolute left-1.5 top-1.5 h-1.5 w-5 rounded-full" style={{ background: p.mode === "dark" ? "#ffffff55" : "#00000026" }} />
              </button>
            );
          })}
        </div>
        <p className="text-xs text-soft">A palette sets the colour, light or dark mode, design and font together.</p>
      </div>
      <ColorField
        label="Accent colour"
        value={/^#[0-9a-fA-F]{6}$/.test(s.theme.accent) ? s.theme.accent : "#27272a"}
        presets={ACCENT_PRESETS}
        onChange={(accent) => set({ accent })}
      />
      {/^#[0-9a-fA-F]{6}$/.test(s.theme.accent) && whiteContrast(s.theme.accent) < 4.5 && (
        <Alert variant="warning" icon={false}>
          This colour is light, so white button text can be hard to read.{" "}
          <button type="button" className="font-semibold underline" onClick={() => set({ accent: fitAccent(s.theme.accent, s.theme.mode) })}>Make it readable</button>
        </Alert>
      )}
      <SwitchField label="Dark mode" checked={s.theme.mode === "dark"} onChange={(dark) => set({ mode: dark ? "dark" : "light" })} />
      <div className="grid gap-1.5">
        <span className="text-xs font-bold uppercase tracking-wide text-fg-muted">Design</span>
        <div className="grid grid-cols-2 gap-2">
          {DESIGN_OPTIONS.map(([id, label, hint]) => (
            <button key={id} type="button" aria-pressed={s.theme.design === id} onClick={() => set({ design: id })} className={`grid gap-1.5 rounded-xl border p-2 text-left transition-colors ${s.theme.design === id ? "border-fg bg-surface-muted" : "border-border hover:border-fg/40"}`}>
              <span className="flex h-9 items-center justify-center rounded-lg bg-surface-muted">
                <span className="h-5 w-12 bg-accent-600" style={{ borderRadius: id === "clay" ? 999 : 5, boxShadow: id === "clay" ? "0 3px 0 rgba(0,0,0,.22)" : "0 4px 10px -4px var(--color-accent-600)" }} />
              </span>
              <span className="text-xs font-bold">{label}</span>
              <span className="text-[11px] leading-snug text-soft">{hint}</span>
            </button>
          ))}
        </div>
      </div>
      <SelectField label="Font style" value={s.theme.font} options={FONT_OPTIONS} onChange={(font) => set({ font })} />
      <p className="text-xs text-soft">The accent colour, mode, design and font style restyle the whole site, and every lojee-ui component on it.</p>

      <div className="grid gap-3 border-t border-border pt-4">
        <span className="text-xs font-bold uppercase tracking-wide text-fg-muted">Page style</span>
        <SelectField
          label="Page style"
          value={s.page.mode}
          options={[["flow", "Scrolling page"], ["screens", "Screen by screen (each snaps into place)"]]}
          onChange={(mode) => setPage({ mode })}
        />
        <SwitchField label="Same look on every screen" checked={!!s.page.sameLook} onChange={(sameLook) => setPage({ sameLook })} />
        <p className="text-xs text-soft">
          {s.page.sameLook
            ? "Phones and tablets show a smaller copy of the page exactly as you design it here: every element keeps its place, spacing and size. The RSVP form and map sections stay full size so they are easy to use; any section can be switched on or off in its own settings."
            : "Off: on phones the page re-arranges itself to fit (text stays full size)."}
        </p>
        {s.page.mode === "screens" && (
          <SelectField label="Screen transition" value={s.page.transition} options={[["rise", "Rise up"], ["zoom", "Zoom in"], ["slide", "Slide from the sides"], ["fade", "Fade"]]} onChange={(transition) => setPage({ transition })} />
        )}
      </div>
    </div>
  );
}

const PAPER_PRESETS = ["#fbf7ef", "#ffffff", "#fbe4e6", "#e3effa", "#e2f3e8", "#e8d3b0", "#ece6f7", "#3f3f46"];
const WAX_PRESETS = ["#b91c1c", "#7f1d1d", "#b8860b", "#1e3a8a", "#166534", "#27272a", "#be185d", "#0f766e"];
const LETTER_PRESETS = ["#fffdf8", "#ffffff", "#fdf6e3", "#fdf2f8", "#f0f9ff", "#f7fee7"];
const CARD_BG_FROM = ["#ffffff", "#fff7ed", "#f0f9ff", "#fdf2f8", "#f7fee7", "#18181b"];
const CARD_BG_TO = ["#e0e7ff", "#fde68a", "#bae6fd", "#fbcfe8", "#d9f99d", "#312e81"];
const CARD_TEXT = ["#27272a", "#7f1d1d", "#1e3a8a", "#166534", "#6b21a8", "#ffffff"];

/** The opening card: a sealed envelope guests tap first. Its words, shape, paper, wax seal, background and writing are all set here. */
const CARD_PART_TITLE: Record<CardPart, string> = { letter: "Card: Letter paper", envelope: "Card: Envelope", seal: "Card: Wax seal", title: "Card: Heading", sender: "Card: From", hint: "Card: Hint" };

/** The settings of one piece of the opening card (clicked in the preview): each piece gets its own floating panel. */
function CardTool({ s, setS, onTry, onLetter, part }: { s: Settings; setS: React.Dispatch<React.SetStateAction<Settings>>; onTry: () => void; onLetter: () => void; part: CardPart }) {
  const intro = s.page.intro;
  const setIntro = (p: Partial<Settings["page"]["intro"]>) => setS((prev) => ({ ...prev, page: { ...prev.page, intro: { ...prev.page.intro, ...p } } }));
  const heading = (label: string) => <p className="border-b border-border pb-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-soft">{label}</p>;
  /** a colour that follows the theme until you pick one */
  const colour = (label: string, key: "paper" | "sealColor" | "textColor", presets: string[], themed: string) => (
    <div className="grid gap-1.5">
      <ColorField label={label} value={intro[key] || themed} presets={presets} onChange={(v) => setIntro({ [key]: v })} />
      {intro[key] && <Button variant="outline" size="xs" className="justify-self-start" onClick={() => setIntro({ [key]: "" })}>Use the theme colour</Button>}
    </div>
  );
  const letter = (intro.sender.replace(/\{name\}/gi, "").trim()[0] ?? "A").toUpperCase();
  const bgMode = intro.bgTo ? "gradient" : intro.bgFrom ? "solid" : "theme";
  /** bend a line of the card: below 0 it smiles, above 0 it arches */
  const curveField = (key: "titleCurve" | "senderCurve") => {
    const v = intro[key] ?? 0;
    return (
      <div className="grid gap-1.5">
        <SliderField label={`Curve ${!v ? "— straight" : v > 0 ? "— arch" : "— smile"}`} min={-100} max={100} value={v} onChange={(n) => setIntro({ [key]: Math.abs(n) < 3 ? 0 : n })} />
        {!!v && <p className="text-xs text-soft">While curved, change its words here (the card shows it curved).</p>}
        {!!v && <Button variant="outline" size="xs" className="justify-self-start" onClick={() => setIntro({ [key]: 0 })}>Straighten</Button>}
      </div>
    );
  };
  // the writing (font and colour) is shared by all the card's words, so each text piece offers it
  const writing = (
    <>
      {heading("Writing — all the card's words")}
      <SelectField label="Font style" value={intro.font} options={FONT_OPTIONS} onChange={(font) => setIntro({ font })} />
      {colour("Text colour", "textColor", CARD_TEXT, "#27272a")}
    </>
  );
  switch (part) {
    case "title":
      return (
        <div className="grid gap-4">
          <TextField label="Heading" value={intro.title} maxLength={80} onChange={(title) => setIntro({ title })} />
          {curveField("titleCurve")}
          {writing}
        </div>
      );
    case "sender":
      return (
        <div className="grid gap-4">
          <TextField label="From — use {name} for the event name" value={intro.sender} maxLength={60} onChange={(sender) => setIntro({ sender })} />
          {curveField("senderCurve")}
          {writing}
        </div>
      );
    case "hint":
      return (
        <div className="grid gap-4">
          <TextField label="Hint under the envelope" value={intro.hint} maxLength={60} onChange={(hint) => setIntro({ hint })} />
          {writing}
        </div>
      );
    case "letter":
      return (
        <div className="grid gap-4">
          <p className="text-xs text-soft">The paper that slides out when the envelope opens. It stays out while this panel is open.</p>
          <TextField label="Message on the letter (optional)" value={intro.letter} maxLength={60} onChange={(letter) => setIntro({ letter })} />
          <SelectField label="Font size" value={intro.letterSize} options={SIZE_OPTIONS} onChange={(letterSize) => setIntro({ letterSize })} />
          <div className="grid gap-1.5">
            <ColorField label="Paper colour" value={intro.letterPaper || "#fffdf8"} presets={LETTER_PRESETS} onChange={(letterPaper) => setIntro({ letterPaper })} />
            {intro.letterPaper && <Button variant="outline" size="xs" className="justify-self-start" onClick={() => setIntro({ letterPaper: "" })}>Match the envelope</Button>}
          </div>
          <SelectField label="Pattern" value={intro.letterPattern} options={[["plain", "Plain"], ["lined", "Lined — writing paper"], ["dots", "Dots"], ["grid", "Grid"], ["stripes", "Soft stripes"], ["hearts", "Little hearts"], ["stars", "Little stars"]]} onChange={(letterPattern) => setIntro({ letterPattern })} />
          <SelectField label="Frame" value={intro.letterBorder} options={[["single", "Thin line"], ["double", "Double line"], ["dashed", "Dashed"], ["gold", "Gold"], ["none", "None"]]} onChange={(letterBorder) => setIntro({ letterBorder })} />
          {writing}
        </div>
      );
    case "seal":
      return (
        <div className="grid gap-4">
          <div className="flex flex-wrap gap-1.5">
            {SEAL_IDS.map((id) => (
              <button key={id} type="button" title={SEAL_LABELS[id]} aria-label={`${SEAL_LABELS[id]} seal`} aria-pressed={asSealId(intro.seal) === id} onClick={() => setIntro({ seal: id })} className={`flex h-9 w-9 items-center justify-center rounded-lg border text-accent-700 ${asSealId(intro.seal) === id ? "border-fg bg-surface-muted" : "border-border hover:border-fg/40"}`}>
                <SealEmblem id={id} letter={letter} size={20} />
              </button>
            ))}
          </div>
          {colour("Wax colour", "sealColor", WAX_PRESETS, s.theme.accent)}
        </div>
      );
    default:
      return (
        <div className="grid gap-4">
          <SwitchField label="Opening card — a sealed envelope, tap to open" checked={intro.on} onChange={(on) => setIntro({ on })} />
          {!intro.on && <p className="text-xs text-soft">Off. Turn it on and guests see a wax-sealed envelope first; tapping it opens the letter and reveals your page.</p>}
          {heading("Envelope")}
          <SelectField label="Shape" value={intro.shape} options={[["classic", "Classic — soft corners"], ["sharp", "Sharp — square corners"], ["soft", "Soft — very round"], ["arch", "Arch — curved flap"]]} onChange={(shape) => setIntro({ shape })} />
          {colour("Paper colour", "paper", PAPER_PRESETS, "#fbf7ef")}
          <Button size="sm" shape="pill" variant="outline" icon="mail-open" className="justify-self-start font-semibold" onClick={onLetter}>Design the letter paper</Button>

          {heading("Background")}
          <SelectField
            label="Background"
            value={bgMode}
            options={[["theme", "Plain — white (dark in dark mode)"], ["solid", "One colour"], ["gradient", "Gradient — two colours"]]}
            onChange={(m) => setIntro(m === "theme" ? { bgFrom: "", bgTo: "" } : m === "solid" ? { bgFrom: intro.bgFrom || CARD_BG_FROM[0], bgTo: "" } : { bgFrom: intro.bgFrom || CARD_BG_FROM[0], bgTo: intro.bgTo || CARD_BG_TO[0] })}
          />
          {bgMode === "theme" && <p className="text-xs text-soft">Follows the page: white in light mode, dark in dark mode.</p>}
          {bgMode !== "theme" && <ColorField label={bgMode === "gradient" ? "Top colour" : "Colour"} value={intro.bgFrom || CARD_BG_FROM[0]} presets={CARD_BG_FROM} onChange={(bgFrom) => setIntro({ bgFrom })} />}
          {bgMode === "gradient" && <ColorField label="Bottom colour" value={intro.bgTo} presets={CARD_BG_TO} onChange={(bgTo) => setIntro({ bgTo })} />}

          <div className="flex flex-wrap gap-2">
            <Button size="sm" shape="pill" icon="eye" className="font-semibold" onClick={onTry}>Try the opening card</Button>
            <Button size="sm" shape="pill" variant="outline" onClick={() => setIntro({ shape: "classic", paper: "", sealColor: "", bgFrom: "", bgTo: "", textColor: "", font: "elegant", letter: "", letterPaper: "", letterPattern: "plain", letterBorder: "single", letterSize: "md" })}>Reset the look</Button>
          </div>
        </div>
      );
  }
}

/** a small labelled group in the section settings */
function Group({ label, Icon, children }: { label: string; Icon: LucideIcon; children: React.ReactNode }) {
  return (
    <section className="grid gap-3">
      <h3 className="flex items-center gap-1.5 border-b border-border pb-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-soft">
        <Icon size={13} />
        {label}
      </h3>
      {children}
    </section>
  );
}

function SectionEditor({ sec, set, remove }: { sec: Section; set: (p: Partial<Section>) => void; remove?: () => void }) {
  return (
    <div className="grid gap-6">
      <Group label="General" Icon={SlidersHorizontal}>
        <TextField label="Name (admin only)" value={sec.name} maxLength={60} onChange={(name) => set({ name })} />
        <SwitchField label="Hide on phones" checked={sec.showOn === "desktop"} onChange={(off) => set({ showOn: off ? "desktop" : undefined })} />
        <SwitchField label="Hide this section on the site" checked={sec.hidden} onChange={(hidden) => set({ hidden })} />
      </Group>

      <Group label="Background" Icon={Palette}>
        <SelectField label="Preset" value={sec.bg} options={BG_OPTIONS} onChange={(bg) => set({ bg })} />
        <SelectField
          label="Effect"
          value={sec.effect}
          options={EFFECT_LABELS}
          onChange={(effect) => set({ effect })}
        />
        {sec.effect !== "none" && (
          <SelectField
            label="Effect position"
            value={effectInFront(sec) ? "front" : "back"}
            options={[["back", "Behind the elements"], ["front", "In front of the elements"]]}
            onChange={(v) => set({ effectFront: v === "front" })}
          />
        )}
        <div className="grid gap-3 rounded-xl border border-border p-3">
          <SwitchField label="Gradient background" checked={sec.gradient.on} onChange={(on) => set({ gradient: { ...sec.gradient, on } })} />
          {sec.gradient.on ? (
            <>
              <div className="h-12 rounded-lg border border-border" style={{ backgroundImage: `linear-gradient(${sec.gradient.angle}deg, ${sec.gradient.from}, ${sec.gradient.to})` }} />
              <div className="flex flex-wrap gap-1.5">
                {GRADIENT_PRESETS.map(([name, from, to]) => (
                  <button key={name} type="button" title={name} aria-label={`${name} gradient`} onClick={() => set({ gradient: { ...sec.gradient, from, to } })} className="h-7 w-7 rounded-full border border-black/10 transition-transform hover:scale-110" style={{ backgroundImage: `linear-gradient(135deg, ${from}, ${to})` }} />
                ))}
              </div>
              <ColorField label="From" value={sec.gradient.from} presets={["#6366f1", "#0ea5e9", "#14b8a6", "#22c55e", "#f59e0b", "#ef4444", "#ec4899", "#18181b"]} onChange={(from) => set({ gradient: { ...sec.gradient, from } })} />
              <ColorField label="To" value={sec.gradient.to} presets={["#ec4899", "#8b5cf6", "#06b6d4", "#84cc16", "#f97316", "#facc15", "#fda4af", "#ffffff"]} onChange={(to) => set({ gradient: { ...sec.gradient, to } })} />
              <SliderField label="Direction (degrees)" value={sec.gradient.angle} min={0} max={360} onChange={(angle) => set({ gradient: { ...sec.gradient, angle } })} />
              <Button variant="outline" size="xs" className="justify-self-start" onClick={() => set({ gradient: { ...sec.gradient, from: sec.gradient.to, to: sec.gradient.from } })}>Swap colours</Button>
            </>
          ) : (
            <p className="text-xs text-soft">Off — a smooth blend of two colours behind this section.</p>
          )}
        </div>
        <div className="grid gap-3 rounded-xl border border-border p-3">
          <SwitchField label="Custom colour" checked={!!sec.bgColor} onChange={(on) => set({ bgColor: on ? "#f4f4f5" : "" })} />
          {sec.bgColor ? (
            <>
              <ColorField
                label="Colour"
                value={sec.bgColor}
                presets={["#ffffff", "#faf7f2", "#f4f4f5", "#eef2ff", "#ecfdf5", "#fff1f2", "#fef9c3", "#18181b"]}
                onChange={(bgColor) => set({ bgColor })}
              />
              <Button variant="outline" size="xs" className="justify-self-start" onClick={() => set({ bgColor: "" })}>
                <Undo2 size={14} className="mr-1" />
                Back to the original background
              </Button>
            </>
          ) : (
            <p className="text-xs text-soft">Using the preset above.</p>
          )}
        </div>
      </Group>

      <Group label="Layout" Icon={LayoutTemplate}>
        <SliderField label="Extra height below the content (px)" value={sec.grow} min={0} max={Math.max(400, sec.grow)} onChange={(grow) => set({ grow })} />
        <SelectField label="Spacing" value={sec.pad} options={[["sm", "Small"], ["md", "Medium"], ["lg", "Large"]]} onChange={(pad) => set({ pad })} />
        <SelectField label="Panel shape behind the content" value={sec.panel} options={PANEL_OPTIONS} onChange={(panel) => set({ panel })} />
        <SwitchField label="Rounded card style" checked={sec.card} onChange={(card) => set({ card })} />
        <SwitchField label="Wide content (use more of the page width)" checked={sec.wide} onChange={(wide) => set({ wide })} />
        <SelectField
          label="Scale with the screen"
          value={sec.shrink === undefined ? "page" : sec.shrink ? "on" : "off"}
          options={[["page", "As the page (Event & theme → Same look on every screen)"], ["on", "On — same look on every screen"], ["off", "Off — re-arrange to fit phones"]]}
          onChange={(v) => set({ shrink: v === "page" ? undefined : v === "on" })}
        />
        {sec.shrink && <p className="text-xs text-soft">The whole section grows and shrinks with the screen&rsquo;s width like a picture: smaller on phones, bigger on large monitors, with its spacing, sizes and stickers always in the same place. Best for picture-led sections; long text gets small on phones.</p>}
        <SelectField
          label="Full screen height"
          value={sec.fullScreen ?? "off"}
          options={[["off", "Off — as tall as its content"], ["mobile", "On phones only"], ["always", "On every screen"]]}
          onChange={(fullScreen) => set({ fullScreen })}
        />
        {sec.fullScreen && sec.fullScreen !== "off" && <p className="text-xs text-soft">The section fills one screen, with its content in the middle, so stickers keep their place on the screen. {sec.fullScreen === "mobile" ? "Phones only: check it in Preview at phone size." : ""}</p>}
      </Group>

      {remove && (
        <div className="border-t border-border pt-5">
          <Button variant="destructive-outline" size="sm" shape="pill" icon="trash-2" className="w-full font-semibold" onClick={remove}>
            Delete section
          </Button>
        </div>
      )}
    </div>
  );
}

const RSVP_ICON_BTN = "flex h-7 w-7 items-center justify-center rounded-lg text-soft hover:bg-surface-muted hover:text-fg disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-soft";

/** the RSVP form pieces (resolved, so any missing one is included) and how to change or reorder them */
function rsvpPartOps(b: Block, set: (p: Partial<Block>) => void) {
  const parts = resolveRsvpParts(b.parts);
  return {
    parts,
    setPart: (key: RsvpPartKey, patch: Partial<RsvpPart>) => set({ parts: parts.map((p) => (p.key === key ? { ...p, ...patch } : p)) }),
    move: (key: RsvpPartKey, d: number) => {
      const a = [...parts];
      const i = a.findIndex((p) => p.key === key);
      if (i < 0 || i + d < 0 || i + d >= a.length) return;
      [a[i], a[i + d]] = [a[i + d], a[i]];
      set({ parts: a });
    },
  };
}

/** The floating settings for one piece of the RSVP form: where it sits, how big it is, and its own text. */
function RsvpPartEditor({ b, partKey, set, onRemoved }: { b: Block; partKey: RsvpPartKey; set: (p: Partial<Block>) => void; onRemoved: () => void }) {
  const { parts, setPart, move } = rsvpPartOps(b, set);
  const i = parts.findIndex((p) => p.key === partKey);
  const p = parts[i];
  const meta = RSVP_PART_META[partKey];
  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-wide text-fg-muted">Position</span>
        <div className="flex items-center gap-1">
          <button type="button" className={RSVP_ICON_BTN} aria-label="Move up" title="Move up" disabled={i === 0} onClick={() => move(partKey, -1)}><ArrowUp size={14} /></button>
          <button type="button" className={RSVP_ICON_BTN} aria-label="Move down" title="Move down" disabled={i === parts.length - 1} onClick={() => move(partKey, 1)}><ArrowDown size={14} /></button>
        </div>
      </div>
      <SwitchField label={meta.required ? "Shown (the form needs this)" : "Show this piece"} checked={!p.hidden} onChange={(show) => !meta.required && setPart(partKey, { hidden: !show })} />
      <div className="grid grid-cols-3 gap-2">
        <SelectField label="Size" value={p.size} options={SIZE_OPTIONS} onChange={(size) => setPart(partKey, { size })} />
        <SelectField label="Align" value={p.align} options={[["left", "Left"], ["center", "Center"], ["right", "Right"]]} onChange={(align) => setPart(partKey, { align })} />
        <SelectField label="Width" value={p.width} options={[["half", "Half"], ["full", "Full"], ["fit", "Fit"]]} onChange={(width) => setPart(partKey, { width })} />
      </div>
      {RSVP_FIELDS.some((f) => f.group === partKey) && (
        <div className="grid gap-3 border-t border-border pt-3">
          <span className="text-xs font-bold uppercase tracking-wide text-fg-muted">Text</span>
          {RSVP_FIELDS.filter((f) => f.group === partKey).map((f) => (
            <TextField key={f.key} label={f.label} value={b.labels[f.key] ?? ""} placeholder={f.def} long={"long" in f} maxLength={300} onChange={(v) => set({ labels: { ...b.labels, [f.key]: v } })} />
          ))}
          <p className="text-xs text-soft">Leave a field empty to use the standard text.</p>
        </div>
      )}
      <div className="grid gap-1.5 border-t border-border pt-3">
        <Button
          variant="destructive-outline"
          size="sm"
          shape="pill"
          icon="trash-2"
          className="w-full font-semibold"
          disabled={meta.required}
          onClick={() => {
            setPart(partKey, { hidden: true });
            onRemoved();
          }}
        >
          Remove from form
        </Button>
        <p className="text-xs text-soft">{meta.required ? "The form can't work without this piece." : "Removed pieces can be added back from the RSVP element's list."}</p>
      </div>
    </div>
  );
}

const GROUP_DESIGNS = [["none", "None"], ["card", "Card"], ["soft", "Soft panel"], ["outline", "Dashed outline"], ["shadow", "Raised card"], ["accent", "Accent colour"], ["glass", "Glass"], ["gradient", "Colour gradient"], ["wavy", "Wavy edges"], ["ticket", "Ticket (notched)"], ["blob", "Soft blob (double outline)"], ["goldframe", "Gold double frame"], ["cartouche", "Ornate mirror frame"], ["flourish", "Corner flourishes"]] as const;
const GROUP_COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f97316", "#f59e0b", "#22c55e", "#14b8a6", "#0ea5e9", "#18181b"];

/** layout, design, illustrated border and colour of a group of elements */
function GroupFields({ first, update }: { first: Block; update: (p: Partial<Block>) => void }) {
  const bw = first.groupBorderW ?? 0;
  return (
    <>
      <div className="grid gap-3 rounded-xl border border-border p-3">
        <p className="text-xs font-bold uppercase tracking-wide text-soft">Box</p>
        <SwitchField label="Hide on phones" checked={first.showOn === "desktop"} onChange={(off) => update({ showOn: off ? "desktop" : "all" })} />
        <SelectField
          label="Position"
          value={first.groupFloat ? "fixed" : "layout"}
          options={[["layout", "Part of the layout — pushes what is below"], ["fixed", "Fixed — floats anywhere, nothing moves"]]}
          onChange={(v) => {
            if (v === "layout") return update({ groupFloat: undefined, groupX: 0, groupY: 0 });
            // keep it where it is now, and its current width, as it starts to float
            const el = document.querySelector<HTMLElement>(`.editing [data-group="${first.group}"]`);
            const body = el?.closest<HTMLElement>("[data-sec-body]");
            if (!el || !body) return update({ groupFloat: true, groupX: 0, groupY: 0 });
            const er = el.getBoundingClientRect(), br = body.getBoundingClientRect();
            update({
              groupFloat: true,
              groupX: Math.round(((er.left - br.left) / br.width) * 1000) / 10,
              groupY: Math.round(er.top - br.top),
              ...(first.groupW ? {} : { groupW: Math.max(10, Math.min(100, Math.round((er.width / br.width) * 100))) }),
            });
          }}
        />
        {first.groupFloat && <p className="text-xs text-soft">It floats over the section. If it hangs past the bottom, make the section taller (Section settings → Extra height below the content).</p>}
        <SliderField label={`Width ${first.groupW ? `— ${first.groupW}%` : "— full"}`} min={10} max={100} value={first.groupW ?? 100} onChange={(groupW) => update({ groupW: groupW >= 100 ? undefined : groupW })} />
        <SliderField label={`Height ${first.groupH ? `— at least ${first.groupH}px` : "— fits its content"}`} min={0} max={1200} value={first.groupH ?? 0} onChange={(groupH) => update({ groupH: groupH || undefined })} />
        <SliderField label={`Corner radius ${first.groupRadius === undefined ? "— as the design" : `— ${first.groupRadius}px`}`} min={0} max={120} value={first.groupRadius ?? 24} onChange={(groupRadius) => update({ groupRadius })} />
        <SliderField label={`Border ${bw ? `— ${bw}px` : "— none"}`} min={0} max={16} value={bw} onChange={(groupBorderW) => update({ groupBorderW })} />
        {bw > 0 && (
          <>
            <SelectField label="Border style" value={first.groupBorderStyle ?? "solid"} options={[["solid", "Solid"], ["dashed", "Dashed"], ["dotted", "Dotted"], ["double", "Double"]]} onChange={(groupBorderStyle) => update({ groupBorderStyle })} />
            <ColorField label="Border colour" value={first.groupBorderColor || "#e4e4e7"} presets={["#e4e4e7", "#18181b", "#e11d48", "#2563eb", "#c9a24a", "#ffffff"]} onChange={(groupBorderColor) => update({ groupBorderColor })} />
          </>
        )}
        <details className="group/art rounded-lg border border-border">
          <summary className="flex cursor-pointer items-center justify-between px-3 py-2 text-sm font-medium">
            Border design {first.groupArt && (["top", "bottom", "left", "right"] as const).some((k) => first.groupArt![k] !== "none") ? <span className="text-xs text-accent-600">on</span> : <span className="text-xs text-soft">none</span>}
          </summary>
          <div className="border-t border-border p-2">
            <BorderPicker border={first.groupArt ?? DEFAULT_BORDER} onChange={(patch) => update({ groupArt: { ...(first.groupArt ?? DEFAULT_BORDER), ...patch } })} />
          </div>
        </details>
        <p className="text-xs text-soft">Drag the box by its edge or its tag to move it, or by the blue dot at its corner to resize it.</p>
        {(first.groupX || first.groupY || first.groupRadius !== undefined || bw > 0 || first.groupW || first.groupH || first.groupArt) && (
          <div className="flex flex-wrap gap-2">
            {(first.groupX || first.groupY) ? <Button variant="outline" size="xs" onClick={() => update({ groupX: 0, groupY: 0 })}>Put it back in place</Button> : null}
            {(first.groupRadius !== undefined || bw > 0 || first.groupArt) && <Button variant="outline" size="xs" onClick={() => update({ groupRadius: undefined, groupBorderW: 0, groupArt: undefined })}>Reset border &amp; corners</Button>}
            {(first.groupW || first.groupH) ? <Button variant="outline" size="xs" onClick={() => update({ groupW: undefined, groupH: undefined })}>Reset size</Button> : null}
          </div>
        )}
      </div>
      <SelectField label="Layout" value={first.groupDir} options={[["row", "Row (side by side)"], ["col", "Column (stacked)"]]} onChange={(groupDir) => update({ groupDir })} />
      <SelectField label="Design" value={first.groupStyle} options={GROUP_DESIGNS.map((d) => [d[0], d[1]] as const)} onChange={(groupStyle) => update({ groupStyle })} />
      <SelectField label="Crown" value={first.groupCrown} options={[["none", "None"], ["gold", "Gold crown"], ["banner", "Crown on a gold banner"], ["royal", "Royal crown"], ["tiara", "Tiara"], ["flowers", "Flower crown"], ["party", "Party crown"]]} onChange={(groupCrown) => update({ groupCrown })} />
      <SwitchField label="Custom colour" checked={!!first.groupColor} onChange={(on) => update({ groupColor: on ? "#6366f1" : "" })} />
      {first.groupColor && first.groupStyle === "none" && <p className="text-xs text-soft">The colour fills the group's background. Pick a Design above for a different look.</p>}
      {first.groupColor && <ColorField label="Colour" value={first.groupColor} presets={GROUP_COLORS} onChange={(groupColor) => update({ groupColor })} />}
    </>
  );
}

/** the ribbon's looks — the same for every style: size, width, arch, words (font, colour), tails, shine and shadow */
function RibbonFields({ b, set }: { b: Block; set: (p: Partial<Block>) => void }) {
  const o = b.ribbon ?? {};
  const put = (p: NonNullable<Block["ribbon"]>) => set({ ribbon: { ...o, ...p } });
  return (
    <div className="grid gap-3 rounded-xl border border-border p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-soft">Ribbon look</p>
      <SelectField label="Size" value={b.size} options={[["sm", "Small"], ["md", "Medium"], ["lg", "Large"], ["xl", "Extra large"]]} onChange={(size) => set({ size })} />
      <SelectField label="Words font" value={o.font ?? (b.text2 === "gold" ? "serif" : "bold")} options={[["bold", "Bold"], ["display", "Heading font (theme)"], ["serif", "Classic serif"], ["script", "Fun hand-lettered"]]} onChange={(font) => put({ font })} />
      <SwitchField label="Custom words colour" checked={!!o.textColor} onChange={(on) => put({ textColor: on ? "#ffffff" : "" })} />
      {o.textColor && <ColorField label="Words colour" value={o.textColor} presets={["#ffffff", "#18181b", "#fde68a", "#6b4a12", "#e11d48", "#1d4ed8"]} onChange={(textColor) => put({ textColor })} />}
      <SliderField label={`Arch ${(o.arch ?? 60) < 15 ? "— almost flat" : (o.arch ?? 60) > 80 ? "— tall" : ""}`} min={0} max={100} value={o.arch ?? 60} onChange={(arch) => put({ arch })} />
      <SliderField label={`Width — ${o.width ?? 100}%`} min={50} max={180} value={o.width ?? 100} onChange={(width) => put({ width })} />
      <SelectField label="Tails" value={o.tails ?? "v"} options={[["v", "V-cut ends"], ["straight", "Straight ends"], ["none", "No tails"]]} onChange={(tails) => put({ tails })} />
      <SwitchField label="Shine" checked={o.shine ?? b.text2 !== ""} onChange={(shine) => put({ shine })} />
      <SwitchField label="Drop shadow" checked={o.shadow !== false} onChange={(shadow) => put({ shadow })} />
      {b.ribbon && <Button variant="outline" size="xs" className="justify-self-start" onClick={() => set({ ribbon: undefined, size: "md" })}>Reset the look</Button>}
    </div>
  );
}

function BlockEditor({ b, set, remove, setMsg, onEditPart, onToFixed, setGroup, onSelectGroup, phone = false, onResetPhone }: { phone?: boolean; onResetPhone?: () => void; onSelectGroup?: () => void; onToFixed?: () => void; setGroup?: (p: Partial<Block>) => void; b: Block; set: (p: Partial<Block>) => void; remove: () => void; setMsg: (m: { ok: boolean; text: string }) => void; onEditPart?: (key: RsvpPartKey) => void }) {
  const t = (field: "text" | "text2" | "text3" | "url" | "icon" | "back", label: string, long = false) => (
    <TextField label={label} value={b[field]} long={long} onChange={(v) => set({ [field]: v })} />
  );
  const rsvp = rsvpPartOps(b, set);
  const sizeSel = (label = "Size") => <SelectField label={label} value={b.size} options={SIZE_OPTIONS} onChange={(size) => set({ size })} />;
  const toneSel = <SelectField label="Colour" value={b.tone} options={TONE_OPTIONS} onChange={(tone) => set({ tone })} />;
  // bend the line: below 0 it smiles, above 0 it arches like a rainbow
  const curveSel = (
    <div className="grid gap-1.5">
      <SliderField label={`Curve ${!b.curve ? "— straight" : b.curve > 0 ? "— arch" : "— smile"}`} min={-100} max={100} value={b.curve ?? 0} onChange={(v) => set({ curve: Math.abs(v) < 3 ? 0 : v })} />
      {!!b.curve && <p className="text-xs text-soft">A curved text is written on one line.</p>}
      {!!b.curve && <Button variant="outline" size="xs" className="justify-self-start" onClick={() => set({ curve: 0 })}>Straighten</Button>}
    </div>
  );

  return (
    <>
      <div className="grid gap-3">
        {/* which screens show it, and (Phone mode) its own size and place on phones */}
        <div className="grid gap-2 rounded-xl border border-border p-3">
          <SwitchField label="Hide on phones" checked={b.showOn === "desktop"} onChange={(off) => set({ showOn: off ? "desktop" : "all" })} />
          <SelectField label="Show on" value={b.showOn ?? "all"} options={[["all", "Every screen"], ["desktop", "Large screens only"], ["phone", "Phones only"]]} onChange={(showOn) => set({ showOn })} />
          {phone && (
            <>
              <SliderField label={`Size on phones — ${b.m?.zoom ?? 100}%`} min={25} max={300} value={b.m?.zoom ?? 100} onChange={(zoom) => set({ m: { ...(b.m ?? {}), zoom: Math.abs(zoom - 100) < 3 ? 100 : zoom } })} />
              <p className="text-xs text-soft">Phone mode: dragging it, and this size, change phones only.</p>
              {b.m && onResetPhone && <Button variant="outline" size="xs" className="justify-self-start" onClick={onResetPhone}>Use the large-screen place &amp; size</Button>}
            </>
          )}
        </div>
        {/* the card box this element sits in has its own floating panel (its look, size, border, position) */}
        {b.group && setGroup && (
          <div className="flex items-center justify-between gap-2 rounded-xl border border-border px-3 py-2">
            <span className="text-xs font-semibold text-soft">{b.groupStyle === "none" ? "Inside a group" : "Inside a card box"}</span>
            <Button variant="outline" size="xs" icon="square-stack" onClick={() => onSelectGroup?.()}>{b.groupStyle === "none" ? "Group settings" : "Card box settings"}</Button>
          </div>
        )}
        {b.type === "badge" && (
          <>
            {t("text", "Text")}
            {curveSel}
          </>
        )}
        {b.type === "heading" && (
          <>
            {t("text", "Text")}
            <div className="grid grid-cols-2 gap-2">{sizeSel()}{toneSel}</div>
            <SwitchField label="UPPERCASE" checked={b.caps} onChange={(caps) => set({ caps })} />
            {curveSel}
          </>
        )}
        {b.type === "text" && (
          <>
            {t("text", "Text", true)}
            <div className="grid grid-cols-2 gap-2">{sizeSel()}{toneSel}</div>
            {curveSel}
          </>
        )}
        {b.type === "script" && (
          <>
            {t("text", "Text")}
            {curveSel}
          </>
        )}
        {b.type === "ribbon" && (
          <>
            {t("text", "Words on the ribbon")}
            <SelectField label="Style" value={b.text2 === "gold" || b.text2 === "arc" ? b.text2 : "classic"} options={[["classic", "Classic (one colour)"], ["arc", "3D curved banner"], ["gold", "Gold scroll"]]} onChange={(v) => set({ text2: v === "classic" ? "" : v })} />
            {b.text2 !== "gold" && <SwitchField label="Custom colour" checked={!!b.color} onChange={(on) => set({ color: on ? "#e11d48" : "" })} />}
            {b.text2 !== "gold" && b.color && <ColorField label="Ribbon colour" value={b.color} presets={GROUP_COLORS} onChange={(color) => set({ color })} />}
            <RibbonFields b={b} set={set} />
          </>
        )}
        {b.type === "button" && (
          <>
            {t("text", "Button text")}
            {t("url", "Link (#rsvp, or https://…)")}
            <SelectField
              label="Animation"
              value={b.text2 || "none"}
              options={[["none", "None"], ...ANIMATED_VARIANTS.map((a) => [a, a.replace("-", " ").replace(/^./, (c) => c.toUpperCase())] as const)]}
              onChange={(text2) => set({ text2 })}
            />
          </>
        )}
        {b.type === "emoji" && (<>{t("text", "Emoji")}{sizeSel()}</>)}
        {b.type === "card" && (
          <>
            <SelectField label="Icon" value={b.icon} options={[["", "None"], ...ICON_OPTIONS]} onChange={(icon) => set({ icon })} />
            {t("text", "Title")}
            {t("text2", "Main line")}
            {t("text3", "Second line")}
            {t("url", "Link (optional, https://…)")}
            <SelectField label="When tapped" value={b.tap} options={[["none", "Nothing"], ["flip", "Flip over"], ["pop", "Pop (bounce)"]]} onChange={(tap) => set({ tap })} />
            {b.tap === "flip" && t("back", "Text on the back", true)}
            {/* colour circles are for the dress code card: shown when the card has the shirt icon or "dress" in its title */}
            {(b.color || b.icon === "shirt" || /dress/i.test(b.text)) && <SwitchField label="Show colour circles (dress code)" checked={!!b.color} onChange={(on) => set({ color: on ? "#6366f1" : "" })} />}
            {b.color && (
              <>
                <ColorField label="Pick a colour — its matching shades are made automatically" value={b.color} presets={["#6366f1", "#0ea5e9", "#14b8a6", "#22c55e", "#f59e0b", "#ef4444", "#ec4899", "#18181b"]} onChange={(color) => set({ color })} />
                <div className="flex pl-3">
                  {colorShades(b.color).map((c, i) => <span key={i} title={c} className="-ml-3 h-8 w-8 rounded-full border-2 border-white shadow" style={{ background: c }} />)}
                </div>
              </>
            )}
          </>
        )}
        {b.type === "step" && (<>{t("text", "Time")}{t("text2", "Title")}{t("text3", "Description", true)}</>)}
        {b.type === "countdown" && (
          <>
            {t("text", "Label")}
            <TextField label="Counts down to" type="datetime-local" value={b.text2} onChange={(text2) => set({ text2 })} />
            <SelectField
              label="Text colour"
              value={b.tone === "white" ? "white" : "ink"}
              options={[["white", "Contrast (follows the background)"], ["ink", "Default"]]}
              onChange={(tone) => set({ tone })}
            />
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-soft">When it reaches zero</p>
            {t("text3", "Message")}
            <SelectField label="Background effect" value={b.fxBg} options={EFFECT_LABELS} onChange={(fxBg) => set({ fxBg })} />
            <p className="text-xs text-soft">Plays once every number is 0. The message replaces the number tiles as a heading; leave it empty to keep the tiles. To preview it, set the date above to a time that has already passed.</p>
          </>
        )}
        {b.type === "rsvp" && (
          <>
            {t("text", "Form title")}
            {t("text2", "Form subtitle", true)}
            <div className="grid gap-2">
              <p className="text-xs font-bold uppercase tracking-wide text-fg-muted">Form pieces</p>
              <p className="-mt-1 text-xs text-soft">Click a piece in the preview, or its Edit button, to open its own settings.</p>
              {rsvp.parts.map((p, i) => {
                const meta = RSVP_PART_META[p.key];
                return (
                  <div key={p.key} className={`flex items-center gap-1 rounded-xl border border-border py-1.5 pl-3 pr-1.5 ${p.hidden ? "bg-surface-muted/60" : ""}`}>
                    <span className={`flex-1 truncate text-sm font-semibold ${p.hidden ? "text-soft line-through" : ""}`}>{meta.label}</span>
                    <button type="button" className={RSVP_ICON_BTN} aria-label={`Move ${meta.label} up`} disabled={i === 0} onClick={() => rsvp.move(p.key, -1)}><ArrowUp size={14} /></button>
                    <button type="button" className={RSVP_ICON_BTN} aria-label={`Move ${meta.label} down`} disabled={i === rsvp.parts.length - 1} onClick={() => rsvp.move(p.key, 1)}><ArrowDown size={14} /></button>
                    {p.hidden ? (
                      <Button variant="ghost" size="sm" onClick={() => rsvp.setPart(p.key, { hidden: false })}>Add back</Button>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => onEditPart?.(p.key)}>Edit</Button>
                    )}
                  </div>
                );
              })}
            </div>
            <fieldset className="grid gap-3 rounded-xl border border-border p-3">
              <legend className="px-1 text-[11px] font-medium uppercase tracking-[0.18em] text-soft">Thank-you message</legend>
              {RSVP_FIELDS.filter((f) => f.group === "done").map((f) => (
                <TextField key={f.key} label={f.label} value={b.labels[f.key] ?? ""} placeholder={f.def} long={"long" in f} maxLength={300} onChange={(v) => set({ labels: { ...b.labels, [f.key]: v } })} />
              ))}
              <p className="text-xs text-soft">Shown after someone sends the form. Leave empty to use the standard text.</p>
            </fieldset>
          </>
        )}
        {b.type === "divider" && t("text", "Label (optional)")}
        {b.type === "spacer" && sizeSel("Height")}
        {b.type === "image" && <ImageField b={b} set={set} setMsg={setMsg} />}
        {b.type === "gallery" && <GalleryField b={b} set={set} setMsg={setMsg} />}
        {(b.type === "image" || b.type === "gallery") && <SelectField label="Photo frame" value={b.frame} options={FRAME_OPTIONS} onChange={(frame) => set({ frame })} />}
        {b.type === "map" && <MapFields b={b} set={set} setMsg={setMsg} />}
        {b.type === "illustration" && b.deco && (
          <StickerEditor
            cur={{ id: b.id, section: "", x: 50, y: 50, path: DEFAULT_PATH, layer: "front", ...b.deco }}
            inLayout
            onPosition={() => onToFixed?.()}
            update={(patch) => set({ deco: { ...b.deco!, ...(patch as Partial<NonNullable<Block["deco"]>>) } })}
          />
        )}
        <SwitchField label="Overlap other elements (they don't move when this one is dragged)" checked={b.overlap} onChange={(overlap) => set({ overlap })} />
        <Button variant="destructive-outline" size="sm" icon="trash-2" className="justify-self-start" onClick={remove}>
          Delete element
        </Button>
      </div>
    </>
  );
}

/** "Remove background" for any uploaded picture (an Image element, or a picture sticker / illustration).
 *  The cut-out is previewed first, with a "keep more / remove more" slider for its edge; applying uploads it as a new picture.
 *  The original is kept, so it can be brought back (and cut again from the untouched one). */
function RemoveBackground({ src, original, onCut, onRestore }: { src: string; original?: string; onCut: (url: string, original: string) => void; onRestore: () => void }) {
  const [busy, setBusy] = useState<"" | "cutting" | "saving">("");
  const [error, setError] = useState("");
  const [quality, setQuality] = useState<"best" | "fast">("best");
  const [cut, setCut] = useState<import("@/lib/remove-bg").Cutout | null>(null);
  const [keep, setKeep] = useState(0);
  const [preview, setPreview] = useState("");

  // redraw the preview whenever the cut-out or the edge setting changes
  useEffect(() => {
    if (!cut) return;
    let url = "";
    let live = true;
    const id = setTimeout(async () => {
      const { toPng } = await import("@/lib/remove-bg");
      const png = await toPng(cut, keep);
      if (!live) return;
      url = URL.createObjectURL(png);
      setPreview(url);
    }, 60);
    return () => {
      live = false;
      clearTimeout(id);
      if (url) URL.revokeObjectURL(url);
    };
  }, [cut, keep]);

  async function run() {
    if (!src || busy) return;
    setBusy("cutting");
    setError("");
    try {
      const { cutOut } = await import("@/lib/remove-bg");
      setCut(await cutOut(original || src, quality)); // always from the untouched picture
      setKeep(0);
    } catch (err) {
      console.error("Background removal failed", err);
      setError("Could not remove the background. Check your connection and try again.");
    } finally {
      setBusy("");
    }
  }
  async function apply() {
    if (!cut) return;
    setBusy("saving");
    try {
      const { toPng } = await import("@/lib/remove-bg");
      const dt = new DataTransfer();
      dt.items.add(new File([await toPng(cut, keep)], "cut-out.png", { type: "image/png" }));
      const [url] = await uploadFiles(dt.files, 1, setError);
      if (url) {
        onCut(url, original || src);
        setCut(null);
        setPreview("");
      }
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="grid gap-2 rounded-xl border border-border p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-soft">Background</p>
      {cut ? (
        <>
          {/* the result on a checkerboard, so what is now see-through shows */}
          <div className="grid place-items-center overflow-hidden rounded-lg border border-border p-1" style={{ background: "repeating-conic-gradient(#e4e4e7 0 25%, #fff 0 50%) 0 0 / 16px 16px" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {preview ? <img src={preview} alt="Preview of the cut-out" className="max-h-56 w-auto object-contain" /> : <span className="py-10 text-xs text-soft">Preparing the preview…</span>}
          </div>
          <SliderField label={`Edge ${keep === 0 ? "— as found" : keep > 0 ? "— keeping more" : "— removing more"}`} min={-100} max={100} value={keep} onChange={(v) => setKeep(Math.abs(v) < 4 ? 0 : v)} />
          <p className="text-xs text-soft">Parts of your subject missing? Slide toward keep more. Background left around it? Slide toward remove more.</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" shape="pill" icon="check" className="font-semibold" loading={busy === "saving"} disabled={!!busy} onClick={apply}>Use this</Button>
            <Button size="sm" shape="pill" variant="outline" disabled={!!busy} onClick={() => { setCut(null); setPreview(""); }}>Cancel</Button>
          </div>
        </>
      ) : (
        <>
          <SelectField label="Quality" value={quality} options={[["best", "Best — any subject"], ["fast", "Fast — portraits only"]]} onChange={setQuality} />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" shape="pill" icon="eraser" className="font-semibold" loading={busy === "cutting"} disabled={!!busy} onClick={run}>
              {busy === "cutting" ? "Removing…" : original ? "Remove again" : "Remove background"}
            </Button>
            {original && !busy && <Button size="sm" shape="pill" variant="outline" icon="undo-2" onClick={onRestore}>Bring it back</Button>}
          </div>
          <p className={`text-xs ${error ? "text-red-600" : "text-soft"}`}>
            {error || (busy ? "The first time takes longer while the tool downloads (it is kept for next time)." : "It runs in your browser: you will see the result before it is used.")}
          </p>
        </>
      )}
    </div>
  );
}

function ImageField({ b, set, setMsg }: { b: Block; set: (p: Partial<Block>) => void; setMsg: (m: { ok: boolean; text: string }) => void }) {
  return (
    <>
      {b.url && <Image src={b.url} alt={b.text} ratio="16/9" fit="cover" rounded="lg" />}
      <TextField label="Description (alt text)" value={b.text} onChange={(text) => set({ text })} />
      <SliderField label="Image width (px)" min={80} max={1600} step={10} value={imageWidth(b)} onChange={(imgW) => set({ imgW })} />
      {b.url && <RemoveBackground src={b.url} original={b.original} onCut={(url, original) => set({ url, original })} onRestore={() => set({ url: b.original, original: undefined })} />}
      <FileUpload
        label={b.url ? "Replace image" : "Upload image"}
        accept="image/png,image/jpeg,image/webp,image/gif"
        onFilesSelected={async (files) => {
          const [url] = await uploadFiles(files, 1, (m) => setMsg({ ok: false, text: m }));
          if (url) set({ url, original: undefined });
        }}
      />
    </>
  );
}

/** Map settings: search an address (OpenStreetMap Nominatim) or type the coordinates. */
function MapFields({ b, set, setMsg }: { b: Block; set: (p: Partial<Block>) => void; setMsg: (m: { ok: boolean; text: string }) => void }) {
  const [busy, setBusy] = useState(false);
  const [lat = "", lng = ""] = b.text3.split(",").map((x) => x.trim());
  const setCoords = (la: string, lo: string) => set({ text3: la || lo ? `${la},${lo}` : "" });

  async function find() {
    if (!b.text2.trim()) return setMsg({ ok: false, text: "Type an address to search for first." });
    setBusy(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(b.text2)}`);
      const [hit] = (await res.json()) as { lat: string; lon: string; display_name: string }[];
      if (!hit) setMsg({ ok: false, text: "Couldn't find that address — try adding the city or country." });
      else {
        set({ text3: `${(+hit.lat).toFixed(6)},${(+hit.lon).toFixed(6)}` });
        setMsg({ ok: true, text: `Found: ${hit.display_name.slice(0, 70)}` });
      }
    } catch {
      setMsg({ ok: false, text: "The address search isn't reachable right now. Enter the coordinates instead." });
    }
    setBusy(false);
  }

  return (
    <>
      <TextField label="Title (shown on the pin)" value={b.text} onChange={(text) => set({ text })} />
      <TextField label="Address" value={b.text2} placeholder="e.g. 10 Downing Street, London" onChange={(text2) => set({ text2 })} />
      <Button variant="outline" size="sm" icon="map-pin" loading={busy} className="justify-self-start" onClick={find}>
        Find on map
      </Button>
      <div className="grid grid-cols-2 gap-2">
        <TextField label="Latitude" value={lat} placeholder="51.5034" onChange={(v) => setCoords(v, lng)} />
        <TextField label="Longitude" value={lng} placeholder="-0.1276" onChange={(v) => setCoords(lat, v)} />
      </div>
      <div className="grid gap-2">
        <p className="text-xs font-bold uppercase tracking-wide">Pin avatar (optional)</p>
        {b.url && (
          <div className="flex items-center gap-3">
            <Image src={b.url} alt="" ratio="1/1" fit="cover" rounded="full" width={56} height={56} />
            <Button variant="outline" size="xs" onClick={() => set({ url: "" })}>Remove avatar</Button>
          </div>
        )}
        <FileUpload
          label={b.url ? "Replace avatar" : "Upload an avatar for the pin"}
          accept="image/png,image/jpeg,image/webp,image/gif"
          onFilesSelected={async (files) => {
            const [url] = await uploadFiles(files, 1, (m) => setMsg({ ok: false, text: m }));
            if (url) set({ url });
          }}
        />
        <p className="text-xs text-soft">Shown as a round picture in place of the pin.</p>
      </div>
      <SliderField label="Zoom" min={3} max={18} value={Number(b.icon) || 14} onChange={(v) => set({ icon: String(v) })} />
      <SelectField label="Height" value={b.size} options={[["sm", "Small"], ["md", "Medium"], ["lg", "Large"], ["xl", "Extra large"]]} onChange={(size) => set({ size })} />
    </>
  );
}

function GalleryField({ b, set, setMsg }: { b: Block; set: (p: Partial<Block>) => void; setMsg: (m: { ok: boolean; text: string }) => void }) {
  const images = b.images;
  const dnd = useReorder(images, (l) => set({ images: l }));
  return (
    <>
      <SelectField
        label="Picture size"
        value={b.size}
        options={[["sm", "Small — 5 per row"], ["md", "Medium — 3 per row"], ["lg", "Large — 2 per row"], ["xl", "Extra large — 1 per row"]]}
        onChange={(size) => set({ size })}
      />
      <p className="text-xs font-bold uppercase tracking-wide">Images ({images.length}/{MAX_IMAGES}) — drag ⠿ to reorder</p>
      <div className="grid grid-cols-2 gap-2">
        {images.map((img, i) => (
          <div key={img.url} {...dnd.row(i)}>
            <Card variant="outline" padding="sm">
              <Image src={img.url} alt={img.alt} ratio="1/1" fit="cover" rounded="lg" />
              <div className="mt-2 grid gap-2">
                <Input size="sm" placeholder="Description" value={img.alt} onChange={(e) => set({ images: images.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x)) })} />
                <div className="flex items-center justify-between">
                  <Grip {...dnd.handle(i)} />
                  <Button variant="ghost" size="xs" icon="trash-2" iconOnly aria-label="Remove image" onClick={() => set({ images: images.filter((_, j) => j !== i) })} />
                </div>
              </div>
            </Card>
          </div>
        ))}
      </div>
      {images.length < MAX_IMAGES && (
        <FileUpload
          label="Upload images"
          multiple
          accept="image/png,image/jpeg,image/webp,image/gif"
          onFilesSelected={async (files) => {
            const urls = await uploadFiles(files, MAX_IMAGES - images.length, (m) => setMsg({ ok: false, text: m }));
            if (urls.length) set({ images: [...images, ...urls.map((url) => ({ url, alt: "" }))] });
          }}
        />
      )}
      <p className="text-xs text-soft">PNG, JPG, WEBP or GIF, up to 5 MB each.</p>
    </>
  );
}

/* ---- stickers (free-positioned decorations) ---- */

/** handles on a sticker's dashed frame: rotate, resize, remove (also used by illustrations that are part of the layout) */
function stickerHandles(d: Decoration, onChange: (id: string, patch: Partial<Decoration>) => void, onRemove: (id: string) => void) {
    const sx = d.sx ?? 1;
    const sy = d.sy ?? 1;
    const grab = (mode: "rot" | "size") => (e: React.PointerEvent<HTMLElement>) => {
      e.stopPropagation();
      e.preventDefault();
      const el = e.currentTarget;
      el.setPointerCapture(e.pointerId);
      const box = el.closest(".decor") as HTMLElement;
      const r = box.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const startDist = Math.hypot(e.clientX - cx, e.clientY - cy) || 1;
      const move = (ev: PointerEvent) => {
        if (mode === "rot") {
          let a = (Math.atan2(ev.clientY - cy, ev.clientX - cx) * 180) / Math.PI + 90;
          a = ((((a + 180) % 360) + 360) % 360) - 180;
          if (ev.shiftKey) a = Math.round(a / 15) * 15;
          onChange(d.id, { rotate: Math.round(a) });
          return;
        }
        onChange(d.id, { size: Math.max(4, Math.round(d.size * (Math.hypot(ev.clientX - cx, ev.clientY - cy) / startDist))) });
      };
      const up = () => {
        el.removeEventListener("pointermove", move);
        el.removeEventListener("pointerup", up);
        el.removeEventListener("pointercancel", up);
      };
      el.addEventListener("pointermove", move);
      el.addEventListener("pointerup", up);
      el.addEventListener("pointercancel", up);
    };
    const knob = "pointer-events-auto absolute flex h-6 w-6 touch-none items-center justify-center rounded-full border-2 border-[#2563eb] bg-white text-[#2563eb] shadow";
    const at = (left: string, top: string) => ({ left, top, transform: `translate(-50%,-50%) scale(${1 / sx},${1 / sy})` });
    return (
      <>
        <span aria-hidden className="absolute left-1/2 -top-5 h-5 w-px bg-[#2563eb]" />
        <span title="Drag to rotate (Shift snaps to 15°)" data-keep className={`${knob} cursor-grab`} style={at("50%", "-28px")} onPointerDown={grab("rot")}><RotateCw size={13} /></span>
        {/* how far it is turned, kept upright and readable whatever the angle (the inverse of the sticker's own turn and stretch) */}
        <span
          aria-live="polite"
          className="pointer-events-none absolute whitespace-nowrap rounded-full bg-[#2563eb] px-2 py-0.5 text-[11px] font-bold tabular-nums text-white shadow"
          style={{ left: "50%", top: "-58px", transform: `translate(-50%,-50%) scale(${1 / sx},${1 / sy}) rotate(${-d.rotate}deg)` }}
        >
          {d.rotate > 0 ? `+${d.rotate}°` : `${d.rotate}°`}
        </span>
        <span title="Drag to resize" data-keep className={`${knob} cursor-nwse-resize`} style={at("100%", "100%")} onPointerDown={grab("size")}><Maximize2 size={13} /></span>
        <span
          title="Remove"
          role="button"
          data-keep
          className={`${knob} cursor-pointer border-red-500 text-red-600`}
          style={at("0%", "0%")}
          onPointerDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onRemove(d.id);
          }}
        >
          <X size={13} />
        </span>
      </>
    );
  }

function DragLayer({
  items,
  selected,
  onSelect,
  onMove,
  onPathEnd,
  onChange,
  onRemove,
  draggingRef,
  playing,
  wide,
}: {
  items: Decoration[];
  selected: string | null;
  onChange: (id: string, patch: Partial<Decoration>) => void;
  onRemove: (id: string) => void;
  onSelect: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
  onPathEnd: (id: string, x: number, y: number) => void;
  draggingRef: React.RefObject<string | null>;
  /** a sticker whose entrance is being shown in the editor (n restarts it) */
  playing?: { id: string; n: number } | null;
  /** page sections: stickers keep to the text column at any width (unset on the card: plain %) */
  wide?: boolean;
}) {
  // the sticker being previewed is mounted afresh (new key) with its entrance switched on
  const playKey = (d: Decoration) => (playing?.id === d.id ? `${d.id}-${playing.n}` : d.id);
  const playProps = (d: Decoration) => ({ wide, ...(playing?.id === d.id ? { enter: true, "data-play": "" } : {}) });
  const ref = useRef<HTMLDivElement>(null);
  const all = items;
  // find each picture sticker's visible part now, so the very first press on it already knows its edges
  const pics = items.filter((d) => d.kind === "image").map((d) => d.content).join("|");
  useEffect(() => {
    for (const src of pics.split("|")) if (src) alphaBoundsNow(new URL(src, window.location.href).href);
  }, [pics]);
  const sel = all.find((d) => d.id === selected);
  // centre lines while a sticker is dragged: green once it sits on the section's centre (it snaps there within a few pixels)
  const [guide, setGuide] = useState<{ x: boolean; y: boolean } | null>(null);
  const stopDrag = () => {
    draggingRef.current = null;
    setGuide(null);
  };
  function move(e: RPointerEvent) {
    const id = draggingRef.current;
    if (!id || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    // the same mapping the sticker is drawn with, backwards, so it stays under the pointer at any canvas width
    let x = wide === undefined ? clamp(((e.clientX - r.left) / r.width) * 100) : decorXFromPx(e.clientX - r.left, r.width, wide);
    let y = clamp(((e.clientY - r.top) / r.height) * 100);
    const onX = Math.abs(x - 50) * r.width / 100 < 8;
    const onY = Math.abs(y - 50) * r.height / 100 < 8;
    if (onX) x = 50;
    if (onY) y = 50;
    if (!guide || guide.x !== onX || guide.y !== onY) setGuide({ x: onX, y: onY });
    if (id.startsWith("end:")) {
      const real = id.slice(4);
      if (all.some((d) => d.id === real)) onPathEnd(real, x, y);
    } else if (all.some((d) => d.id === id)) onMove(id, x, y); // behind stickers too (they are not in the front list)
  }

  const handlesFor = (d: Decoration) => stickerHandles(d, onChange, onRemove);

  // the path as a curve, so the editor can draw it (control point recovered from the curve's midpoint)
  let curve: string | null = null;
  if (sel?.path?.on) {
    const mid = decorPath(sel)[2];
    const cx = 2 * mid[0] - (sel.x + sel.path.x) / 2;
    const cy = 2 * mid[1] - (sel.y + sel.path.y) / 2;
    curve = `M${sel.x} ${sel.y} Q${cx} ${cy} ${sel.path.x} ${sel.path.y}`;
  }

  // stickers set to "behind" sit under the section's elements, even while picked: the picture stays on the back layer and only its frame and handles are drawn in front
  const behind = all.filter((d) => d.layer === "back");
  const front = all.filter((d) => d.layer !== "back");
  const pickedBehind = behind.find((d) => d.id === selected);
  const item = (d: Decoration) => {
    const grab = (e: React.PointerEvent<HTMLDivElement>) => {
      if (!onDrawnPart(e)) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      draggingRef.current = d.id;
      onSelect(d.id);
    };
    return <DecorItem key={playKey(d)} {...playProps(d)} d={d} noPath selected={false} className="pointer-events-auto cursor-grab touch-none active:cursor-grabbing" onPointerDown={grab} />;
  };

  return (
    <>
    {behind.length > 0 && (
      <div data-behind className="pointer-events-none absolute inset-0 z-[6] touch-none overflow-hidden" onPointerMove={move} onPointerUp={stopDrag} onPointerCancel={stopDrag}>
        <div data-decor-band className="decor-band">{behind.map(item)}</div>
      </div>
    )}
    {pickedBehind && (
      <div className="pointer-events-none absolute inset-0 z-20 touch-none overflow-hidden" onPointerMove={move} onPointerUp={stopDrag} onPointerCancel={stopDrag}>
        <div data-decor-band className="decor-band">
          <DecorItem d={pickedBehind} wide={wide} noPath ghost selected handles={handlesFor(pickedBehind)} className="pointer-events-auto cursor-grab touch-none active:cursor-grabbing" onPointerDown={(e) => { if (!onDrawnPart(e)) return; e.currentTarget.setPointerCapture(e.pointerId); draggingRef.current = pickedBehind.id; }} />
        </div>
      </div>
    )}
    <div
      className="pointer-events-none absolute inset-0 z-20 touch-none overflow-hidden"
      onPointerMove={move}
      onPointerUp={stopDrag}
      onPointerCancel={stopDrag}
    >
      {/* stickers are placed in % of this band (the editor's section width at most), the same as on the live page */}
      <div ref={ref} data-decor-band className="decor-band">
      {guide && (
        <>
          <i aria-hidden className="pointer-events-none absolute inset-y-0 left-1/2 z-[40] w-0 border-l-2 border-dashed transition-colors" style={{ borderColor: guide.x ? "#22c55e" : "rgba(239,68,68,0.55)" }} />
          <i aria-hidden className="pointer-events-none absolute inset-x-0 top-1/2 z-[40] h-0 border-t-2 border-dashed transition-colors" style={{ borderColor: guide.y ? "#22c55e" : "rgba(239,68,68,0.55)" }} />
          {guide.x && guide.y && <i aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 z-[40] h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#22c55e] ring-2 ring-white" />}
        </>
      )}
      {sel && curve && (
        <>
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
            <path d={curve} fill="none" stroke="#2563eb" strokeWidth="2" strokeDasharray="6 5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </svg>
          <div
            title="Drag to set where it travels"
            data-keep
            className="pointer-events-auto absolute z-30 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none items-center justify-center rounded-full border-2 border-white bg-[#2563eb] text-[9px] font-bold text-white shadow active:cursor-grabbing"
            style={{ left: `${sel.path.x}%`, top: `${sel.path.y}%` }}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              draggingRef.current = `end:${sel.id}`;
            }}
          >
            end
          </div>
        </>
      )}
      {front.map((d) => {
        const grab = (e: React.PointerEvent<HTMLDivElement>) => {
          if (!onDrawnPart(e)) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          draggingRef.current = d.id;
          onSelect(d.id);
        };
        // with a path the sticker plays its motion live; a faint copy stays at the start spot so it can still be selected and dragged
        return d.path?.on ? (
          <Fragment key={playKey(d)}>
            <DecorItem {...playProps(d)} d={d} noPath selected={d.id === selected} handles={handlesFor(d)} className="pointer-events-auto cursor-grab touch-none opacity-40 active:cursor-grabbing" onPointerDown={grab} />
            <DecorItem d={d} wide={wide} noDelay aria-hidden className="pointer-events-none" />
          </Fragment>
        ) : (
          <DecorItem key={playKey(d)} {...playProps(d)} d={d} noPath selected={d.id === selected} handles={handlesFor(d)} className="pointer-events-auto cursor-grab touch-none active:cursor-grabbing" onPointerDown={grab} />
        );
      })}
      </div>
    </div>
    </>
  );
}

/** Is a press on the part of a picture sticker that shows (inside its frame), not on its see-through margins?
 *  offsetX / offsetY are in the picture's own turned and stretched coordinates, so this holds at any angle. Drawings and text answer
 *  only on their shapes already (globals.css), so they always pass. */
function onDrawnPart(e: React.PointerEvent<HTMLElement>): boolean {
  const t = e.target as HTMLElement;
  if (t.tagName !== "IMG") return true;
  const im = t as HTMLImageElement;
  if (!im.naturalWidth) return true;
  const w = im.offsetWidth, h = im.offsetHeight;
  let pw = w, ph = h;
  if (getComputedStyle(im).objectFit === "contain") {
    const ar = im.naturalWidth / im.naturalHeight;
    if (w / h > ar) pw = h * ar;
    else ph = w / ar;
  }
  const ox = (w - pw) / 2, oy = (h - ph) / 2;
  const b = (getComputedStyle(im).objectFit === "cover" ? null : alphaBoundsNow(im.currentSrc || im.src)) ?? { l: 0, t: 0, r: 0, b: 0 };
  const x = e.nativeEvent.offsetX, y = e.nativeEvent.offsetY;
  return x >= ox + b.l * pw - 3 && x <= ox + pw * (1 - b.r) + 3 && y >= oy + b.t * ph - 3 && y <= oy + ph * (1 - b.b) + 3;
}

const KIND_LABEL = { text: "Text", graffiti: "Graffiti", emoji: "Emoji", art: "Illustration", image: "Image" } as const;

/** Preview a sticker at a small size (used for tiles and the chip list). */
function StickerThumb({ d, size = 28 }: { d: Pick<Decoration, "kind" | "content" | "color">; size?: number }) {
  return d.kind === "image" ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={d.content} alt="" className="h-8 w-auto max-w-14 rounded object-contain" />
  ) : d.kind === "art" ? (
    <span className="flex items-center justify-center" style={{ fontSize: size * 0.8 }}><ArtSvg name={d.content} /></span>
  ) : (
    <span className="max-w-full truncate px-1 text-sm font-bold" style={{ color: d.kind === "emoji" ? undefined : d.color }}>{d.content || "·"}</span>
  );
}

function DecorTools({
  section,
  s,
  setS,
  sel,
  setSel,
  onNew,
}: {
  section: string;
  s: Settings;
  setS: React.Dispatch<React.SetStateAction<Settings>>;
  sel: string | null;
  setSel: (id: string | null) => void;
  onNew: (d: Decoration) => void;
}) {
  const all = s.decorations;
  const mine = all.filter((d) => d.section === section);
  const full = all.length >= MAX_DECORATIONS;

  function add(p: Partial<Decoration>) {
    const d: Decoration = { id: nextId("d", all.map((x) => x.id)), section, kind: "emoji", content: "", x: 50, y: 50, size: 40, rotate: 0, color: "#a1a1aa", effect: "none", ...p, flip: p.flip ?? false, sx: p.sx ?? 1, sy: p.sy ?? 1, shape: p.shape ?? "original", opacity: p.opacity ?? 100, layer: p.layer ?? "front", path: p.path ?? DEFAULT_PATH };
    setS((prev) => ({ ...prev, decorations: [...prev.decorations, d] }));
    onNew(d);
    setSel(d.id);
  }

  const heading = (text: string, Icon: LucideIcon) => (
    <h4 className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-soft">
      <Icon size={13} />
      {text}
    </h4>
  );

  return (
    <div className="grid gap-5">
      <div className="flex items-center justify-between">
        <p className="text-xs text-soft">Add words like “Hooray!” and drag them into place. For animated illustrations, use the party-popper icon on the section&apos;s tool bar.</p>
        <Badge variant="outline" size="xs" color={full ? "rose" : undefined}>{all.length}/{MAX_DECORATIONS}</Badge>
      </div>

      <div className="grid gap-2">
        {heading("Text", Type)}
        <div className="flex flex-wrap gap-1.5">
          {TEXT_PRESETS.map((p) => (
            <div
              key={p.label}
              draggable={!full}
              onDragStart={(e) => {
                drag.current = { kind: "sticker", preset: p.d };
                e.dataTransfer.setData("text/plain", p.label);
                e.dataTransfer.effectAllowed = "copy";
              }}
              onDragEnd={() => (drag.current = null)}
              className="cursor-grab"
            >
                          <Button variant="outline" size="xs" disabled={full} onClick={() => add(p.d)}>
              {p.label}
              {all.some((x) => x.kind === p.d.kind) && (
                <Badge variant="solid" size="xs" className="ml-1.5">{all.filter((x) => x.kind === p.d.kind).length}</Badge>
              )}
            </Button>
            </div>
          ))}
        </div>
      </div>

      {mine.length > 0 && (
        <div className="grid gap-2">
          {heading(`On this section (${mine.length})`, Layers)}
          <div className="flex flex-wrap gap-2">
            {mine.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setSel(d.id)}
                className={`flex h-11 min-w-11 max-w-28 items-center justify-center rounded-xl border px-1 transition-colors ${d.id === sel ? "border-fg bg-surface-muted" : "border-border hover:border-fg/50"}`}
              >
                <StickerThumb d={d} />
              </button>
            ))}
          </div>
        </div>
      )}

      {mine.length > 0 && <p className="text-xs text-soft">Select a sticker to edit it in a floating panel you can drag around.</p>}
    </div>
  );
}


/** The sticker settings, shown inside the floating panel. */
function StickerEditor({ cur, update, onPosition, inLayout = false, arrange, onPlayEnter, phone = false, onResetPhone }: {
  /** the editor is in Phone mode: place, size and turn changes go to the phone layout */
  phone?: boolean;
  onResetPhone?: () => void;
  /** show its entrance once in the editor */
  onPlayEnter?: () => void;
  cur: Decoration;
  update: (patch: Partial<Decoration>) => void;
  /** switch between floating (fixed) and part of the layout */ onPosition: () => void;
  inLayout?: boolean;
  /** stacking among the other stickers on the same layer: where it is now (1 = bottom) and how to move it */
  arrange?: { at: number; of: number; move: (op: ArrangeOp) => void };
}) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-1.5">
        <p className="text-xs font-bold uppercase tracking-wide">Position</p>
        <div className="flex gap-1">
          {([[false, "Fixed"], [true, "Part of layout"]] as const).map(([v, label]) => (
            <button key={label} type="button" onClick={() => v !== inLayout && onPosition()} className={`flex-1 rounded-full px-3 py-1.5 text-xs font-semibold ${v === inLayout ? "bg-fg text-surface" : "bg-surface-muted text-soft hover:text-fg"}`}>{label}</button>
          ))}
        </div>
        <p className="text-xs text-soft">{inLayout ? "Sits in the page like any element: dragging it moves the elements around it." : "Floats freely over the section; other elements never move."}</p>
      </div>
      {cur.kind === "image" ? (
        <div className="grid gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cur.content} alt="" className="max-h-32 w-auto max-w-full justify-self-start rounded-lg border border-border object-contain p-1" />
          <FileUpload
            label="Replace image"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onFilesSelected={async (files) => {
              const [url] = await uploadFiles(files, 1, () => {});
              if (url) update({ content: url });
            }}
          />
        </div>
      ) : cur.kind === "art" ? (
        <SelectField label="Illustration" value={cur.content} options={ART_OPTIONS} onChange={(content) => update({ content })} />
      ) : (
        <TextField label="Text / emoji" value={cur.content} maxLength={40} onChange={(content) => update({ content })} />
      )}
      <div className="grid grid-cols-2 gap-2">
        {cur.kind !== "image" && (
          <SelectField label="Style" value={cur.kind} options={KINDS.filter((k) => k !== "image").map((k) => [k, KIND_LABEL[k]] as const)} onChange={(kind) => update({ kind, content: kind === "art" && !ART_OPTIONS.some(([k]) => k === cur.content) ? "cake" : cur.content })} />
        )}
        <SelectField label="Motion" value={cur.effect} options={EFFECTS.map((k) => [k, k[0].toUpperCase() + k.slice(1)] as const)} onChange={(effect) => update({ effect })} />
      </div>
      {(cur.kind === "text" || cur.kind === "graffiti") && <ColorField label="Colour" value={cur.color} onChange={(color) => update({ color })} />}
      <SwitchField label="Mirror (flip left ↔ right)" checked={cur.flip} onChange={(flip) => update({ flip })} />
      {cur.kind === "image" && cur.content.startsWith("/api/img/") && (
        <RemoveBackground src={cur.content} original={cur.original} onCut={(content, original) => update({ content, original })} onRestore={() => update({ content: cur.original, original: undefined })} />
      )}
      {cur.kind === "image" && (
        <SelectField
          label="Shape"
          value={cur.shape}
          options={SHAPES.map((k) => [k, { original: "Original", rounded: "Rounded corners", circle: "Circle", square: "Square", heart: "Heart", star: "Star", hexagon: "Hexagon" }[k]] as const)}
          onChange={(shape) => update({ shape })}
        />
      )}
      <SliderField label="Opacity (%)" min={10} max={100} value={cur.opacity} onChange={(opacity) => update({ opacity })} />
      {!inLayout && <SelectField label="Layer (never moves other elements)" value={cur.layer ?? "front"} options={[["front", "In front of all elements"], ["back", "Behind all elements"]]} onChange={(layer) => update({ layer })} />}
      {!inLayout && (
        <div className="grid gap-2 rounded-xl border border-border p-3">
          <SwitchField label="Hide on phones" checked={cur.showOn === "desktop"} onChange={(off) => update({ showOn: off ? "desktop" : "all" })} />
          <SelectField label="Show on" value={cur.showOn ?? "all"} options={[["all", "Every screen"], ["desktop", "Large screens only"], ["phone", "Phones only"]]} onChange={(showOn) => update({ showOn })} />
          {phone && <p className="text-xs text-soft">Phone mode: moving, resizing and turning it here changes phones only.</p>}
          {phone && cur.m && onResetPhone && <Button variant="outline" size="xs" className="justify-self-start" onClick={onResetPhone}>Use the large-screen place &amp; size</Button>}
        </div>
      )}
      {!inLayout && (
        <div className="grid gap-3 rounded-xl border border-border p-3">
          <SelectField label="Appear" value={cur.enter ?? "none"} options={ENTER_EFFECTS.map((k) => [k, ENTER_LABELS[k]] as const)} onChange={(enter) => {
              update({ enter });
              if (enter !== "none") setTimeout(() => onPlayEnter?.(), 0); // show the new entrance straight away
            }} />
          {cur.enter && cur.enter !== "none" && onPlayEnter && (
            <Button size="xs" shape="pill" variant="outline" icon="play" className="justify-self-start" onClick={onPlayEnter}>Play it here</Button>
          )}
          {cur.enter && cur.enter !== "none" && (
            <SliderField label={`Show after ${(cur.enterDelay ?? 0).toFixed(1)} s`} min={0} max={10} step={0.1} value={cur.enterDelay ?? 0} onChange={(enterDelay) => update({ enterDelay: Math.round(enterDelay * 10) / 10 })} onCommit={() => onPlayEnter?.()} />
          )}
          <p className="text-xs text-soft">On the site it plays once its section comes into view (on the card: when the card appears). In the editor, press Play it here.</p>
        </div>
      )}
      {!inLayout && arrange && arrange.of > 1 && (
        <div className="grid gap-1.5">
          <p className="flex items-center justify-between text-sm font-medium">
            Arrange <span className="text-xs font-normal text-soft">{arrange.at === arrange.of ? "On top" : arrange.at === 1 ? "At the bottom" : `${arrange.at} of ${arrange.of}`}</span>
          </p>
          <div className="grid grid-cols-4 gap-1.5">
            <Button size="xs" variant="outline" icon="bring-to-front" disabled={arrange.at === arrange.of} onClick={() => arrange.move("front")}>Front</Button>
            <Button size="xs" variant="outline" icon="arrow-up" disabled={arrange.at === arrange.of} onClick={() => arrange.move("forward")}>Up</Button>
            <Button size="xs" variant="outline" icon="arrow-down" disabled={arrange.at === 1} onClick={() => arrange.move("backward")}>Down</Button>
            <Button size="xs" variant="outline" icon="send-to-back" disabled={arrange.at === 1} onClick={() => arrange.move("back")}>Back</Button>
          </div>
          <p className="text-xs text-soft">Which sticker sits over which, among the stickers on this layer of the section.</p>
        </div>
      )}

      {!inLayout && (
      <div className="grid gap-3 rounded-xl border border-border p-3">
        <SwitchField
          label="Move along a path"
          checked={cur.path.on}
          onChange={(on) =>
            update({
              path: on
                ? { ...cur.path, on: true, x: cur.x > 60 ? cur.x - 30 : cur.x + 30, y: cur.y > 50 ? cur.y - 25 : cur.y + 25 }
                : { ...cur.path, on: false },
            })
          }
        />
        {cur.path.on && (
          <>
            <p className="text-xs text-soft">Drag the blue “end” dot on the page to set where it travels. The sticker plays live here (a faint copy stays at the start so you can still select it). On the page it travels, fades out, rests for the pause, then repeats.</p>
            <SliderField label="Curve" min={-100} max={100} value={cur.path.curve} onChange={(curve) => update({ path: { ...cur.path, curve } })} />
            <SliderField label="Duration (seconds)" min={1} max={30} value={cur.path.duration} onChange={(duration) => update({ path: { ...cur.path, duration } })} />
            <SliderField label="Pause between moves (seconds)" min={0} max={20} value={cur.path.delay} onChange={(delay) => update({ path: { ...cur.path, delay } })} />
          </>
        )}
      </div>
      )}

    </div>
  );
}

/** A dashed line from a floating panel to the element it edits; it follows dragging, scrolling and resizing. */
/** The blue line from a floating panel to what it edits. `selector` may list several targets, most precise first
 *  (an element's fitted frame, then its row): the first one that is on the page and has a size is used, so the line touches the element itself. */
function Connector({ panel, selector }: { panel: string; selector: string | string[] }) {
  const [geo, setGeo] = useState<{ sx: number; sy: number; ex: number; ey: number } | null>(null);

  useEffect(() => {
    let raf = 0;
    let lastKey = "";
    const tick = () => {
      const p = document.querySelector(`[data-panel="${panel}"]`)?.getBoundingClientRect();
      let t: DOMRect | undefined;
      for (const q of Array.isArray(selector) ? selector : [selector]) {
        const r = document.querySelector(q)?.getBoundingClientRect();
        if (r && r.width > 0 && r.height > 0) {
          t = r;
          break;
        }
      }
      let next: { sx: number; sy: number; ex: number; ey: number } | null = null;
      if (p && t && t.width > 0 && t.bottom > 0 && t.top < window.innerHeight) {
        const targetIsLeft = t.left + t.width / 2 < p.left + p.width / 2;
        next = {
          sx: targetIsLeft ? p.left : p.right,
          sy: Math.min(p.bottom - 24, Math.max(p.top + 24, t.top + t.height / 2)),
          ex: targetIsLeft ? t.right : t.left,
          ey: t.top + t.height / 2,
        };
      }
      const key = next ? `${Math.round(next.sx)},${Math.round(next.sy)},${Math.round(next.ex)},${Math.round(next.ey)}` : "";
      if (key !== lastKey) {
        lastKey = key;
        setGeo(next);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [panel, Array.isArray(selector) ? selector.join("|") : selector]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!geo) return null;
  const bend = Math.max(40, Math.abs(geo.ex - geo.sx) / 2);
  const dir = geo.ex < geo.sx ? -1 : 1;
  // above the canvas (a picked section is raised to z-40, which hid the line inside it), under the floating panels (z-110)
  return (
    <svg className="pointer-events-none fixed inset-0 z-[100] h-full w-full" aria-hidden>
      <path
        d={`M ${geo.sx} ${geo.sy} C ${geo.sx + dir * bend} ${geo.sy}, ${geo.ex - dir * bend} ${geo.ey}, ${geo.ex} ${geo.ey}`}
        fill="none"
        stroke="#2563eb"
        strokeWidth="2"
        strokeDasharray="6 5"
        strokeLinecap="round"
      />
      <circle cx={geo.sx} cy={geo.sy} r="4" fill="#2563eb" />
      <circle cx={geo.ex} cy={geo.ey} r="5" fill="#fff" stroke="#2563eb" strokeWidth="2.5" />
    </svg>
  );
}

const lastPanelPos: Record<string, { x: number; y: number }> = {}; // remembered per panel between openings
// where each panel first opens (cascaded, so several open together do not sit exactly on top of each other)
const PANEL_START: Record<string, { fromRight: number; y: number; left?: number }> = { element: { fromRight: 300, y: 90 }, sticker: { fromRight: 340, y: 130 }, stickers: { fromRight: 320, y: 200 }, rsvppart: { fromRight: 360, y: 150 }, phone: { fromRight: 0, y: 80, left: 24 }, group: { fromRight: 660, y: 90 } }; // clear of the element list + toolbox columns

/** A small window that floats over the editor; drag it by its header. */
function FloatingPanel({ panelId, title, onClose, onDone, closeHint = "Close", width = 340, children }: { panelId: string; title: string; onClose: () => void; onDone: () => void; closeHint?: string; width?: number; children: React.ReactNode }) {
  const [pos, setPos] = useState(
    () => lastPanelPos[panelId] ?? { x: PANEL_START[panelId]?.left ?? Math.max(16, (typeof window === "undefined" ? 900 : window.innerWidth) - width - (PANEL_START[panelId]?.fromRight ?? 90)), y: PANEL_START[panelId]?.y ?? 110 },
  );
  const grab = useRef<{ dx: number; dy: number } | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0, filter: "blur(12px)", scale: 0.96 }}
      animate={{ opacity: 1, filter: "blur(0px)", scale: 1, transition: { duration: 0.28, delay: 0.06, ease: [0.22, 1, 0.36, 1] } }}
      exit={{ opacity: 0, filter: "blur(12px)", scale: 0.96, transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] } }}
      className="fixed z-[110] flex max-h-[75vh] flex-col overflow-hidden rounded-2xl border border-border bg-surface text-fg shadow-2xl"
      style={{ left: pos.x, top: pos.y, width }}
      role="dialog"
      aria-label={title}
      data-panel={panelId}
    >
      <div
        className="flex cursor-grab touch-none select-none items-center justify-between gap-2 border-b border-accent-700 bg-accent-600 px-3 py-2 text-white active:cursor-grabbing"
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest("button")) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          grab.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
        }}
        onPointerMove={(e) => {
          if (!grab.current) return;
          const next = {
            x: Math.min(window.innerWidth - 80, Math.max(0, e.clientX - grab.current.dx)),
            y: Math.min(window.innerHeight - 48, Math.max(0, e.clientY - grab.current.dy)),
          };
          lastPanelPos[panelId] = next;
          setPos(next);
        }}
        onPointerUp={() => (grab.current = null)}
        onPointerCancel={() => (grab.current = null)}
      >
        <span className="flex items-center gap-1.5 text-sm font-semibold">
          <GripVertical size={14} className="opacity-70" />
          {title}
        </span>
        <button type="button" aria-label={closeHint} title={closeHint} onClick={onClose} className="flex h-6 w-6 items-center justify-center rounded-md text-white/80 hover:bg-white/20 hover:text-white">
          <X size={14} />
        </button>
      </div>
      <div className="overflow-auto p-4">{children}</div>
      <div className="border-t border-border bg-surface p-3">
        <Button shape="pill" size="sm" className="w-full font-semibold" onClick={onDone}>
          Done
        </Button>
      </div>
    </motion.div>
  );
}


/** toolbox icon colour per tool (full class names so Tailwind keeps them) */
const TOOL_TONE: Record<string, string> = {
  "Card box": "text-rose-600",
  heading: "text-indigo-600",
  text: "text-slate-600",
  badge: "text-amber-600",
  script: "text-violet-600",
  image: "text-sky-600",
  gallery: "text-cyan-600",
  map: "text-emerald-600",
  sticker: "text-orange-600",
  card: "text-teal-600",
  step: "text-blue-600",
  countdown: "text-rose-600",
  rsvp: "text-pink-600",
  button: "text-fuchsia-600",
  divider: "text-zinc-600",
  spacer: "text-stone-600",
  "Text stickers": "text-yellow-600",
  Layers: "text-lime-600",
  "New section": "text-purple-600",
  "New map": "text-green-600",
};

const TYPE_COLOR: Record<string, string> = { heading: "indigo", text: "slate", badge: "amber", script: "violet", image: "sky", gallery: "cyan", map: "emerald", emoji: "orange", card: "teal", step: "blue", countdown: "rose", rsvp: "pink", button: "fuchsia", divider: "slate", spacer: "slate" };

/** Every element and sticker of one section: click to select, drag ⠿ to reorder the elements, ✕ to delete. */
function ElementList({
  section,
  stickers,
  selBlock,
  selSticker,
  onReorder,
  onPickBlock,
  onPickSticker,
  onDeleteBlock,
  onDeleteSticker,
}: {
  section: Section;
  stickers: Decoration[];
  selBlock: string | null;
  selSticker: string | null;
  onReorder: (blocks: Block[]) => void;
  onPickBlock: (id: string) => void;
  onPickSticker: (id: string) => void;
  onDeleteBlock: (id: string) => void;
  onDeleteSticker: (id: string) => void;
}) {
  const dnd = useReorder(section.blocks, onReorder);
  const [shut, setShut] = useState<Record<string, boolean>>({});
  const heading = (text: string, count: number, Icon: LucideIcon) => (
    <button
      type="button"
      aria-expanded={!shut[text]}
      onClick={() => setShut((o) => ({ ...o, [text]: !o[text] }))}
      className="col-span-full flex w-full items-center gap-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-soft hover:text-fg"
    >
      <Icon size={13} />
      <span className="flex-1 text-left">{text}</span>
      <Badge variant="soft" size="xs" color="blue">{count}</Badge>
      <ChevronDown size={14} className={`transition-transform ${shut[text] ? "-rotate-90" : ""}`} />
    </button>
  );
  const row = "group relative flex items-center gap-2.5 overflow-hidden rounded-xl border px-2 py-2 text-left transition-all hover:-translate-y-px";
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-2 lg:gap-3">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-1 sm:grid-cols-2 sm:gap-x-2 lg:grid-cols-[minmax(0,1fr)]">
        {heading("Components", section.blocks.length, Layers)}
        {!shut.Components && section.blocks.length === 0 && <p className="col-span-full text-xs text-soft">Nothing here yet — add an element from the toolbox.</p>}
        {!shut.Components && section.blocks.map((b, i) => {
          const meta = PALETTE.find((p) => p.type === b.type);
          const snippet = (b.text || b.text2 || b.url || "").trim();
          return (
            <div key={b.id} {...dnd.row(i)} className={`${row} ${b.id === selBlock ? "border-[#2563eb]/40 bg-[#2563eb]/[0.05] shadow-[0_2px_10px_rgba(37,99,235,0.12)] before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-r before:bg-[#2563eb]" : "border-transparent hover:border-border hover:bg-surface-muted"}`}>
              <Grip {...dnd.handle(i)} />
              <button type="button" onClick={() => onPickBlock(b.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                <span className="grid min-w-0 gap-0.5">
                  <Badge variant="soft" size="xs" color={TYPE_COLOR[b.type] as "indigo"} className="w-fit max-w-full">{meta?.label ?? b.type}</Badge>
                  <span className="block truncate text-xs text-soft">{snippet || "—"}</span>
                </span>
              </button>
              <button type="button" aria-label={`Delete ${meta?.label ?? b.type}`} onClick={() => onDeleteBlock(b.id)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-soft opacity-0 transition-opacity hover:text-red-600 focus:opacity-100 group-hover:opacity-100 pointer-coarse:opacity-100 lg:h-7 lg:w-7">
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}
      </div>

      {stickers.length > 0 && (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-1 sm:grid-cols-2 sm:gap-x-2 lg:grid-cols-[minmax(0,1fr)]">
          {heading("Stickers", stickers.length, Sparkles)}
          {!shut.Stickers && stickers.map((d) => (
            <div key={d.id} className={`${row} ${d.id === selSticker ? "border-[#2563eb]/40 bg-[#2563eb]/[0.05] shadow-[0_2px_10px_rgba(37,99,235,0.12)] before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-r before:bg-[#2563eb]" : "border-transparent hover:border-border hover:bg-surface-muted"}`}>
              <button type="button" onClick={() => onPickSticker(d.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                <span className="grid min-w-0 gap-0.5">
                  <Badge variant="soft" size="xs" color="rose" className="w-fit max-w-full">{KIND_LABEL[d.kind]}</Badge>
                  <span className="block truncate text-xs text-soft">{d.kind === "image" || d.kind === "art" ? (d.kind === "art" ? d.content : "your picture") : d.content}</span>
                </span>
              </button>
              <button type="button" aria-label="Delete sticker" onClick={() => onDeleteSticker(d.id)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-soft opacity-0 transition-opacity hover:text-red-600 focus:opacity-100 group-hover:opacity-100 pointer-coarse:opacity-100 lg:h-7 lg:w-7">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
