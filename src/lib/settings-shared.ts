import { z } from "zod";

export const MAX_IMAGES = 12;
export const MAX_DECORATIONS = 20;
export const MAX_SECTIONS = 30;
export const MAX_BLOCKS = 60;
/** how a sticker first appears (once its section comes into view), after its delay */
export const ENTER_EFFECTS = ["none", "fade", "bounce", "blur", "zoom", "pop", "slide-up", "slide-down", "slide-left", "slide-right", "drop", "spin", "flip", "swing"] as const;
export const ENTER_LABELS: Record<(typeof ENTER_EFFECTS)[number], string> = {
  none: "None — always there",
  fade: "Fade in",
  bounce: "Bounce in",
  blur: "Blur in",
  zoom: "Zoom in",
  pop: "Pop",
  "slide-up": "Slide up",
  "slide-down": "Slide down",
  "slide-left": "Slide in from the right",
  "slide-right": "Slide in from the left",
  drop: "Drop in",
  spin: "Spin in",
  flip: "Flip in",
  swing: "Swing in",
};
export const EFFECTS = ["none", "float", "wiggle", "pulse", "spin", "bounce", "swing", "shake", "tada"] as const;
export const SHAPES = ["original", "rounded", "circle", "square", "heart", "star", "hexagon"] as const;
export const KINDS = ["text", "graffiti", "emoji", "art", "image"] as const;
/** looks for a group of elements (the box drawn around them) */
/** crowns that sit on top of a group of elements */
export const GROUP_CROWNS = ["none", "gold", "banner", "royal", "tiara", "flowers", "party"] as const;
export type GroupCrown = (typeof GROUP_CROWNS)[number];
export const GROUP_STYLES = ["none", "card", "soft", "outline", "shadow", "accent", "glass", "gradient", "wavy", "ticket", "blob", "goldframe", "cartouche", "flourish"] as const;
export type GroupStyle = (typeof GROUP_STYLES)[number];
export const BLOCK_TYPES = ["badge", "heading", "text", "script", "button", "image", "gallery", "emoji", "card", "step", "countdown", "rsvp", "divider", "spacer", "map", "illustration", "ribbon"] as const;
export type BlockType = (typeof BLOCK_TYPES)[number];
export const SECTION_EFFECTS = ["none", "balloons", "graffiti", "confetti", "popper", "hearts", "stars", "snow", "rain", "bubbles", "fireflies", "fireworks"] as const;
export const EVENT_TYPES = ["general", "birthday", "anniversary", "wedding", "christmas", "new-year", "baby-shower", "graduation", "housewarming", "corporate"] as const;
export type EventType = (typeof EVENT_TYPES)[number];
/** Illustrated edge designs for a section's top / bottom / left / right (the artwork lives in components/BorderArt.tsx) */
export const BORDER_IDS = ["none", "scallop", "bunting", "balloons", "hearts", "stars", "vine", "snow", "confetti", "waves", "lights", "zigzag", "flowers", "gold", "clouds", "road", "spikes", "planets", "paws", "bubbles", "checker"] as const;
export type BorderId = (typeof BORDER_IDS)[number];
export const DEFAULT_BORDER = { top: "none", bottom: "none", left: "none", right: "none", size: "md", curve: 0, wave: 0 } as const;
/** optional two-colour gradient behind a section (when `on`, it replaces the background colour) */
export const DEFAULT_GRADIENT = { on: false, from: "#e0e7ff", to: "#fce7f3", angle: 135 } as const;
/** How the page behaves: scrolling, or one screen at a time (each snaps into place and plays its own transition), plus an optional envelope that is opened first. */
export const PAGE_MODES = ["flow", "screens"] as const;
export const SCREEN_TRANSITIONS = ["rise", "zoom", "slide", "fade"] as const;
/** the shapes the opening card's envelope can take, and the fonts for its writing */
export const ENVELOPE_SHAPES = ["classic", "sharp", "soft", "arch"] as const;
/** the opening card's writing: the same pairings as the page's font styles */
export const LETTER_PATTERNS = ["plain", "lined", "dots", "grid", "stripes", "hearts", "stars"] as const;
export const LETTER_BORDERS = ["single", "double", "dashed", "gold", "none"] as const;
export const ENVELOPE_FONTS = ["playful", "modern", "elegant", "bold"] as const;
/** cards saved before the card used the page's font styles */
const OLD_ENVELOPE_FONTS: Record<string, (typeof ENVELOPE_FONTS)[number]> = { serif: "elegant", script: "elegant", sans: "modern", rounded: "playful" };
export const DEFAULT_PAGE = {
  mode: "flow",
  transition: "rise",
  intro: { on: false, title: "You have a letter from:", sender: "{name}", hint: "Tap the envelope to open", seal: "heart", shape: "classic", paper: "", sealColor: "", bgFrom: "", bgTo: "", textColor: "", font: "elegant", letter: "", letterPaper: "", letterPattern: "plain", letterBorder: "single", letterSize: "md" },
} as const;
/** frames for pictures (image and gallery blocks) */
export const FRAMES = ["none", "checker", "film", "polaroid", "double"] as const;
export type Frame = (typeof FRAMES)[number];
/** what an info card does when it is tapped */
export const TAPS = ["none", "flip", "pop"] as const;
/** the shape of the panel behind a section's content */
export const PANELS = ["none", "blob", "arch", "wavy", "ticket"] as const;
export type Panel = (typeof PANELS)[number];
export const BGS = ["white", "cream", "brand", "ink", "plain"] as const;

export const DEFAULT_PATH = { on: false, x: 80, y: 20, curve: 0, duration: 6, delay: 0 };
const pathSchema = z.object({
  on: z.boolean(),
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  curve: z.number().min(-100).max(100),
  duration: z.number().min(1).max(30),
  delay: z.number().min(0).max(20),
});

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);
/** font pairings (body + headings) for the whole site; the CSS for each lives in globals.css */
export const FONT_STYLES = ["playful", "modern", "elegant", "bold"] as const;
export type FontStyle = (typeof FONT_STYLES)[number];
const DEFAULT_THEME = { mode: "light" as const, accent: "#18181b", design: "bento" as const, font: "playful" as FontStyle };
const text = (max = 200) => z.string().trim().max(max);
const sizes = z.enum(["sm", "md", "lg", "xl"]);
const upload = z.string().regex(/^\/api\/img\/([\w-]+\/)?[\w.-]+$/);

/** Every piece of text on the RSVP form that the editor can change: key, editor label, default text, and which form piece it belongs to ("done" = the thank-you message). */
export const RSVP_FIELDS = [
  { key: "nameLabel", label: "Name label", def: "Full name", group: "name" },
  { key: "namePlaceholder", label: "Name hint", def: "e.g. Uncle Alex & Family", group: "name" },
  { key: "emailLabel", label: "Email label", def: "Email", group: "email" },
  { key: "emailPlaceholder", label: "Email hint", def: "For your confirmation", group: "email" },
  { key: "attendLabel", label: "Question", def: "Will you attend?", group: "attend" },
  { key: "yesTitle", label: "Yes answer", def: "Count me in", group: "attend" },
  { key: "yesHint", label: "Yes answer — small text", def: "I'll be there", group: "attend" },
  { key: "noTitle", label: "No answer", def: "Regretfully no", group: "attend" },
  { key: "noHint", label: "No answer — small text", def: "I can't make it", group: "attend" },
  { key: "whoLabel", label: "Guests heading", def: "Who's coming?", group: "guests" },
  { key: "guestOne", label: "Word for 1 guest", def: "guest", group: "guests" },
  { key: "guestMany", label: "Word for several guests", def: "guests", group: "guests" },
  { key: "adultsLabel", label: "Adults label", def: "Adults", group: "guests" },
  { key: "adultsHint", label: "Adults small text", def: "Including you", group: "guests" },
  { key: "kidsLabel", label: "Kids label", def: "Kids", group: "guests" },
  { key: "kidsHint", label: "Kids small text", def: "Under 12", group: "guests" },
  { key: "notesLabel", label: "Note label", def: "Notes / dietary needs", group: "notes" },
  { key: "notesPlaceholder", label: "Note hint", def: "Leave a note for the hosts…", group: "notes" },
  { key: "submitYes", label: "Button (attending)", def: "Send my RSVP", group: "submit" },
  { key: "submitNo", label: "Button (not attending)", def: "Send my reply", group: "submit" },
  { key: "sending", label: "Button while sending", def: "Sending…", group: "submit" },
  { key: "privacy", label: "Privacy line", def: "We only use your email to send your confirmation.", group: "privacy" },
  { key: "doneYesTitle", label: "Title (attending)", def: "You're on the list!", group: "done" },
  { key: "doneYesText", label: "Text (attending)", def: "We're so glad you can make it. Your confirmation is on its way — check spam if you don't see it.", group: "done", long: true },
  { key: "doneNoTitle", label: "Title (not attending)", def: "Thanks for letting us know", group: "done" },
  { key: "doneNoText", label: "Text (not attending)", def: "We'll miss you. Thank you for replying.", group: "done", long: true },
] as const;
export const RSVP_DEFAULTS: Record<string, string> = Object.fromEntries(RSVP_FIELDS.map((f) => [f.key, f.def]));

/** The pieces of the RSVP form, in their default order. `required` pieces can't be hidden: the form needs them to work. */
export const RSVP_PART_KEYS = ["name", "email", "attend", "guests", "notes", "submit", "privacy"] as const;
export type RsvpPartKey = (typeof RSVP_PART_KEYS)[number];
export const RSVP_PART_META: Record<RsvpPartKey, { label: string; required: boolean; width: "half" | "full" }> = {
  name: { label: "Full name", required: true, width: "half" },
  email: { label: "Email", required: true, width: "half" },
  attend: { label: "Will you attend?", required: false, width: "full" },
  guests: { label: "Guests (adults & kids)", required: false, width: "full" },
  notes: { label: "Note box", required: false, width: "full" },
  submit: { label: "Send button", required: true, width: "full" },
  privacy: { label: "Privacy line", required: false, width: "full" },
};
const rsvpPart = z.object({
  key: z.enum(RSVP_PART_KEYS),
  hidden: z.boolean().default(false),
  size: sizes.default("md"),
  align: z.enum(["left", "center", "right"]).default("left"),
  width: z.enum(["half", "full", "fit"]).default("full"),
});
export type RsvpPart = z.infer<typeof rsvpPart>;
/** The stored pieces in their stored order, with any missing piece added back at the end with its defaults. */
export function resolveRsvpParts(stored?: RsvpPart[]): RsvpPart[] {
  const seen = new Set<RsvpPartKey>();
  const out: RsvpPart[] = [];
  for (const p of stored ?? []) {
    if (seen.has(p.key)) continue;
    seen.add(p.key);
    out.push({ ...p, hidden: RSVP_PART_META[p.key].required ? false : p.hidden });
  }
  for (const key of RSVP_PART_KEYS) if (!seen.has(key)) out.push({ key, hidden: false, size: "md", align: key === "privacy" ? "center" : "left", width: RSVP_PART_META[key].width });
  return out;
}

/** Is the section's effect drawn in front of its elements? Its own setting wins; confetti pops / falls in front by default, the rest stay behind */
export const effectInFront = (sec: { effect: string; effectFront?: boolean }) => sec.effectFront ?? (sec.effect === "confetti" || sec.effect === "popper");

/** Labels for the animated background effects (shared by sections and the countdown) */
export const EFFECT_LABELS: [(typeof SECTION_EFFECTS)[number], string][] = [
  ["none", "None"],
  ["balloons", "Balloons rising"],
  ["hearts", "Hearts floating up"],
  ["bubbles", "Bubbles rising"],
  ["stars", "Twinkling stars"],
  ["fireflies", "Fireflies"],
  ["fireworks", "Fireworks"],
  ["snow", "Snow falling"],
  ["rain", "Rain"],
  ["confetti", "Confetti falling"],
  ["popper", "Confetti popping from the sides"],
  ["graffiti", "Graffiti falling & fading"],
];

/** how an illustration looks (the same settings a floating sticker has); used by "illustration" blocks, which sit in the page layout instead of floating */
const decoLook = z.object({
  kind: z.enum(KINDS),
  content: text(120),
  /** picture stickers: the upload as it was before its background was removed */
  original: upload.optional(),
  size: z.number().min(4).max(5000),
  rotate: z.number().min(-180).max(180),
  color: hex,
  effect: z.enum(EFFECTS),
  flip: z.boolean().default(false),
  sx: z.number().min(0.02).max(200).default(1),
  sy: z.number().min(0.02).max(200).default(1),
  shape: z.enum(SHAPES).default("original"),
  opacity: z.number().min(5).max(100).default(100),
});
export type DecoLook = z.infer<typeof decoLook>;

/** illustrated border art on each side (sections, and card boxes) */
const borderArt = z.object({ top: z.enum(BORDER_IDS), bottom: z.enum(BORDER_IDS), left: z.enum(BORDER_IDS), right: z.enum(BORDER_IDS), size: z.enum(["sm", "md", "lg", "xl"]), curve: z.number().min(-100).max(100).default(0), wave: z.number().min(0).max(100).default(0) });

const block = z
  .object({
    id: text(40),
    type: z.enum(BLOCK_TYPES),
    text: text(400).default(""),
    text2: text(400).default(""),
    text3: text(400).default(""),
    /** heading / text / handwriting: bend the line along an arc (-100 smile … 0 straight … 100 rainbow) */
    curve: z.number().min(-100).max(100).optional(),
    /** image: the uploaded picture as it was before its background was removed (so it can be brought back) */
    original: upload.optional(),
    /** image: how wide it is, in px (unset: from its old size preset). It may grow past the text column, up to the section's width */
    imgW: z.number().min(60).max(2400).optional(),
    /** ribbon banner looks (all optional: an unset one keeps the style's own look) */
    ribbon: z
      .object({
        textColor: z.union([hex, z.literal("")]),
        font: z.enum(["bold", "display", "serif", "script"]),
        arch: z.number().min(0).max(100),
        /** how long the band is, % of its normal length */
        width: z.number().min(50).max(180),
        tails: z.enum(["v", "straight", "none"]),
        shine: z.boolean(),
        shadow: z.boolean(),
      })
      .partial()
      .optional(),
    url: z.string().trim().max(500).default(""),
    icon: text(16).default(""),
    size: sizes.default("md"),
    tone: z.enum(["ink", "brand", "soft", "white"]).default("ink"),
    caps: z.boolean().default(false),
    /** countdown only: background effect that plays once the countdown reaches zero (the heading shown then is `text3`) */
    fxBg: z.enum(SECTION_EFFECTS).default("none"),
    images: z.array(z.object({ url: upload, alt: text() })).max(MAX_IMAGES).default([]),
    /** picture frame (image and gallery blocks) */
    frame: z.enum(FRAMES).default("none"),
    /** info cards: what happens when tapped, and the text on the back when it flips */
    tap: z.enum(TAPS).default("none"),
    back: text(200).default(""),
    /** RSVP form: text overrides by key (see RSVP_FIELDS); a missing or empty key uses the default */
    labels: z.record(z.string(), text(300)).default({}),
    /** info cards: a colour shown as a row of circles under the text, with the lighter and darker shades worked out from it. "" = no circles */
    color: z.union([hex, z.literal("")]).default(""),
    /** "illustration" blocks only: the picture / emoji / text and how it looks */
    deco: decoLook.nullable().default(null),
    /** blocks that share a group id (and sit next to each other) are laid out together, side by side ("row") or stacked ("col"); "" = not grouped */
    group: text(20).default(""),
    groupDir: z.enum(["row", "col"]).default("col"),
    /** the look of the box around the group (kept on every member, like groupDir) */
    groupStyle: z.enum(GROUP_STYLES).default("none"),
    /** a crown on top of the group, and a colour the box is made in ("" = the theme's colours) */
    groupCrown: z.enum(GROUP_CROWNS).default("none"),
    groupColor: z.union([hex, z.literal("")]).default(""),
    /** a group / card box's own look and place (kept the same on every member): moved by (x % of the section's width, y px), corner radius, border */
    groupX: z.number().min(-300).max(300).optional(), // % of the text column: past ±100 reaches the section's sides
    groupY: z.number().min(-2000).max(4000).optional(),
    groupRadius: z.number().min(0).max(120).optional(),
    /** a card box that floats: placed anywhere in its section (x % from the left, y px from the top) without moving anything around it */
    groupFloat: z.boolean().optional(),
    /** the same illustrated border art a section can have, drawn around the box */
    groupArt: borderArt.optional(),
    /** the phone layout: this element's own place / size on phones (unset = as on large screens), and which screens show it */
    m: z
      .object({
        x: z.number().min(-100).max(100),
        y: z.number().min(-2000).max(4000),
        /** % of its large-screen size */
        zoom: z.number().min(25).max(300),
        groupX: z.number().min(-300).max(300),
        groupY: z.number().min(-2000).max(4000),
        groupW: z.number().min(10).max(100),
        groupH: z.number().min(0).max(2000),
      })
      .partial()
      .optional(),
    showOn: z.enum(["all", "desktop", "phone"]).optional(),
    /** size: width in % of the section's content column, height as a minimum in px (taller content still fits) */
    groupW: z.number().min(10).max(100).optional(),
    groupH: z.number().min(0).max(2000).optional(),
    groupBorderW: z.number().min(0).max(16).optional(),
    groupBorderColor: z.union([hex, z.literal("")]).optional(),
    groupBorderStyle: z.enum(["solid", "dashed", "dotted", "double"]).optional(),
    /** true: when moved down or up it floats over the other elements (they stay put, and it can overlap them); false: it pushes the elements below it */
    overlap: z.boolean().default(false),
    /** free position: sideways offset in % of the section width, downward offset in px (0,0 = the normal flow) */
    x: z.number().min(-100).max(100).default(0),
    y: z.number().min(-2000).max(4000).default(0),
    /** RSVP form: order, visibility, size, alignment and width of each piece (empty = the standard layout) */
    parts: z.array(rsvpPart).max(10).default([]),
  })
  .superRefine((b, ctx) => {
    const link = b.url === "" || b.url.startsWith("#") || /^https?:\/\//i.test(b.url);
    const img = b.url === "" || upload.safeParse(b.url).success || /^https?:\/\//i.test(b.url);
    if ((b.type === "button" || b.type === "card") && !link) ctx.addIssue({ code: "custom", path: ["url"], message: "Link must be #section or http(s)://" });
    if (b.type === "map" && b.text3 !== "") {
      const m = /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/.exec(b.text3);
      if (!m || Math.abs(+m[1]) > 90 || Math.abs(+m[2]) > 180) ctx.addIssue({ code: "custom", path: ["text3"], message: "Location must be latitude,longitude" });
    }
    if ((b.type === "image" || b.type === "map") && !img) ctx.addIssue({ code: "custom", path: ["url"], message: "Bad image address" });
  });

const section = z.object({
  id: text(40),
  name: text(60),
  bg: z.enum(BGS),
  /** optional custom background colour (overrides `bg`); "" = use the preset */
  bgColor: z.union([hex, z.literal("")]).default(""),
  hidden: z.boolean(),
  /** shape of the panel behind the content (none = no panel) */
  panel: z.enum(PANELS).default("none"),
  gradient: z.object({ on: z.boolean(), from: hex, to: hex, angle: z.number().min(0).max(360) }).default(DEFAULT_GRADIENT),
  /** illustrated border on each side, and how big the artwork is */
  border: borderArt.default(DEFAULT_BORDER),
  effect: z.enum(SECTION_EFFECTS).default("none"),
  /** draw the effect in front of the section's elements (unset: confetti in front, the rest behind; see effectInFront) */
  effectFront: z.boolean().optional(),
  card: z.boolean(),
  wide: z.boolean(),
  pad: z.enum(["sm", "md", "lg"]),
  /** extra empty space (px) added below the section's content, making it taller */
  grow: z.number().min(0).max(4000).default(0),
  /** the section fills exactly one screen height (content centred): on phones only, or on every screen */
  fullScreen: z.enum(["off", "mobile", "always"]).optional(),
  /** scale the whole section with the screen's width, like a picture (the same look everywhere: spacing, sizes, sticker places) instead of re-flowing it */
  shrink: z.boolean().optional(),
  /** which screens show the section: every screen, or large screens only (hidden on phones) */
  showOn: z.enum(["all", "desktop", "phone"]).optional(),
  blocks: z.array(block).max(MAX_BLOCKS),
});

export const settingsSchema = z.object({
  name: text(60),
  /** one-time page upgrades already applied (so a section you delete is not added back) */
  upgrades: z.array(text(40)).max(20).default([]),
  eventType: z.enum(EVENT_TYPES).default("general"),
  page: z
    .object({
      mode: z.enum(PAGE_MODES),
      transition: z.enum(SCREEN_TRANSITIONS),
      /** every section scales with the screen (a phone shows a smaller copy of the large-screen page), unless a section says otherwise */
      sameLook: z.boolean().optional(),
      intro: z
        .object({
          on: z.boolean(),
          title: text(80),
          sender: text(60),
          hint: text(60),
          seal: text(8),
          /** envelope outline: classic (soft corners), sharp, soft (very round) or arch (curved flap) */
          shape: z.enum(ENVELOPE_SHAPES).default("classic"),
          /** colours; "" = follow the theme */
          paper: z.union([hex, z.literal("")]).default(""),
          sealColor: z.union([hex, z.literal("")]).default(""),
          bgFrom: z.union([hex, z.literal("")]).default(""),
          bgTo: z.union([hex, z.literal("")]).default(""),
          textColor: z.union([hex, z.literal("")]).default(""),
          font: z.preprocess((v) => (typeof v === "string" && OLD_ENVELOPE_FONTS[v]) || v, z.enum(ENVELOPE_FONTS)).default("elegant"),
          /** a short message written on the letter that slides out */
          letter: text(60).default(""),
          /** the letter paper inside: its colour ("" = made from the envelope paper), a printed pattern and a frame */
          letterPaper: z.union([hex, z.literal("")]).default(""),
          letterPattern: z.enum(LETTER_PATTERNS).default("plain"),
          letterBorder: z.enum(LETTER_BORDERS).default("single"),
          /** how big the message on the letter is written */
          letterSize: z.enum(["sm", "md", "lg", "xl"]).default("md"),
          /** bend the heading / the "from" line along an arc (-100 smile … 0 straight … 100 rainbow) */
          titleCurve: z.number().min(-100).max(100).optional(),
          senderCurve: z.number().min(-100).max(100).optional(),
        }),
    })
    .default(DEFAULT_PAGE),
  theme: z.object({ mode: z.enum(["light", "dark"]), accent: text(40).regex(/^([a-z]+|#[0-9a-fA-F]{6})$/), design: z.enum(["bento", "clay"]), font: z.enum(FONT_STYLES).default("playful") }),
  // + 1: the opening card's own section (CARD_SECTION)
  sections: z.array(section).max(MAX_SECTIONS + 1),
  decorations: z
    .array(
      z.object({
        id: text(40),
        section: text(40),
        kind: z.enum(KINDS),
        content: text(120),
        x: z.number().min(0).max(100),
        y: z.number().min(0).max(100),
        size: z.number().min(4).max(5000),
        rotate: z.number().min(-180).max(180),
        color: hex,
        effect: z.enum(EFFECTS),
        flip: z.boolean().default(false),
        /** stretch on each axis (1 = natural) */
        sx: z.number().min(0.02).max(200).default(1),
        sy: z.number().min(0.02).max(200).default(1),
        /** picture stickers: how the image is cropped */
        shape: z.enum(SHAPES).default("original"),
        /** 5–100 % */
        opacity: z.number().min(5).max(100).default(100),
        /** in front of the section's text and pictures, or behind them (it never moves them either way) */
        layer: z.enum(["front", "back"]).default("front"),
        path: pathSchema.default(DEFAULT_PATH),
        /** how it first appears, and after how many seconds */
        enter: z.enum(ENTER_EFFECTS).optional(),
        enterDelay: z.number().min(0).max(30).optional(),
        /** picture stickers: the upload as it was before its background was removed */
        original: upload.optional(),
        /** the phone layout: its own place, size and turn on phones (unset = as on large screens), and which screens show it */
        m: z.object({ x: z.number().min(0).max(100), y: z.number().min(0).max(100), size: z.number().min(4).max(5000), rotate: z.number().min(-180).max(180) }).partial().optional(),
        showOn: z.enum(["all", "desktop", "phone"]).optional(),
      })
        .refine((d) => d.kind !== "image" || upload.safeParse(d.content).success, { path: ["content"], message: "An image sticker needs an uploaded picture" }),
    )
    .max(MAX_DECORATIONS),
});

export type Settings = z.infer<typeof settingsSchema>;
export type Section = Settings["sections"][number];
export type Block = Section["blocks"][number];
export type Decoration = Settings["decorations"][number];

/** Five points along the sticker's path (a quadratic curve from its position to the end point), in % of the section. */
export function decorPath(d: { x: number; y: number; path: { x: number; y: number; curve: number } }): [number, number][] {
  const { x, y, path } = d;
  const dx = path.x - x;
  const dy = path.y - y;
  const len = Math.hypot(dx, dy) || 1;
  const cx = (x + path.x) / 2 + (-dy / len) * path.curve;
  const cy = (y + path.y) / 2 + (dx / len) * path.curve;
  return [0, 0.25, 0.5, 0.75, 1].map((t) => [
    (1 - t) * (1 - t) * x + 2 * (1 - t) * t * cx + t * t * path.x,
    (1 - t) * (1 - t) * y + 2 * (1 - t) * t * cy + t * t * path.y,
  ]);
}

/** Replace {name} in every text with the event name. */
/** The opening card's background: plain (white, or dark in dark mode) unless a colour is picked; a gradient only when a bottom colour is set too.
 *  Shared (not in the client-only card component) because the live page, drawn on the server, uses it too. */
export function cardBackground(intro: Settings["page"]["intro"]) {
  // older cards may have only a bottom colour: their top stays white, as the settings show
  return intro.bgTo ? `linear-gradient(180deg, ${intro.bgFrom || "#ffffff"} 0%, ${intro.bgTo} 100%)` : intro.bgFrom || "var(--color-surface)";
}

/* ---- where a sticker sits across its section, at any screen width ----
 * Stickers are placed (x, in %) on the editor's sticker band, 1052px wide, where the section's text column is 768px (1020px when "wide") in the middle.
 * On a narrower screen the column fills almost the whole width, so a plain % would push margin stickers onto the text.
 * Instead each part keeps its own part: a sticker in the left / right margin stays in that margin (squeezed with it), one over the column stays at the same point of the column.
 * At 1052px and wider the band is exactly as drawn, so nothing moves. Positions are worked out in CSS (100cqw = the band's width), so the live page needs no script. */
export const DECOR_BAND = 1052;
const DECOR_PAD = 32; // the section's side padding (px-4, both sides)
const decorCol = (band: number, wide: boolean) => Math.min(band - DECOR_PAD, wide ? 1152 : 768);

/** CSS `left` for a sticker at x% of the band (wide: the section uses its wide column).
 *  In a side margin (between the section's edge and its text column) it keeps to whichever it is near:
 *  at the very edge it stays at the edge, beside the text it stays beside the text, smoothly in between (w = 0 … 1 across the margin).
 *  Where the margin is narrower than in the editor (phones) the margin is simply squeezed. */
const smooth = (w: number) => w * w * (3 - 2 * w);
export function decorLeft(x: number, wide: boolean): string {
  const B = DECOR_BAND, c = decorCol(B, wide), m = (B - c) / 2, X = (x / 100) * B;
  const col = `min(100cqw - ${DECOR_PAD}px, ${wide ? 1152 : 768}px)`;
  const margin = `((100cqw - ${col}) / 2)`;
  const k = (n: number) => n.toFixed(4);
  // distance into the margin, measured from the section's edge, on a screen with a margin `margin` (the editor's is m)
  const into = (d: number) => `(${k(d / m)} * min(${margin}, ${m}px) + ${k(smooth(Math.min(1, d / m)))} * max(0px, ${margin} - ${m}px))`;
  if (X <= m) return `calc(${into(X)})`;
  if (X >= B - m) return `calc(100cqw - ${into(B - X)})`;
  return `calc(${margin} + ${k((X - m) / c)} * ${col})`;
}

/** the other way: a point `px` from the left of a band `band` px wide, as the sticker's x% */
export function decorXFromPx(px: number, band: number, wide: boolean): number {
  const B = DECOR_BAND, c = decorCol(B, wide), m = (B - c) / 2;
  const cl = decorCol(band, wide), ml = (band - cl) / 2;
  // a distance from the edge on this screen -> the editor's distance (undoes `into`, which only grows with d)
  const back = (dist: number) => {
    if (ml <= m) return ml > 0 ? (dist / ml) * m : 0;
    let lo = 0, hi = m;
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2;
      if (mid + smooth(mid / m) * (ml - m) < dist) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  };
  const X = px <= ml ? back(Math.max(0, px)) : px >= band - ml ? B - back(Math.max(0, band - px)) : m + ((px - ml) / cl) * c;
  return Math.max(0, Math.min(100, Math.round((X / B) * 1000) / 10));
}

/* ---- the phone layout ----
 * Elements, stickers and card boxes can have their own place and size on phones ("m"), set in the editor's Phone mode.
 * The live page carries both and switches with a container query on the page's width (below 48rem = phone), see globals.css. */
const PHONE_DECOR_KEYS = ["x", "y", "size", "rotate"] as const;
const PHONE_BLOCK_KEYS = ["x", "y", "groupX", "groupY", "groupW", "groupH"] as const;

/** a sticker as it sits on phones */
export function phoneDecor(d: Decoration): Decoration {
  return d.m ? { ...d, ...d.m } : d;
}
/** an element as it sits on phones */
export function phoneBlock(b: Block): Block {
  if (!b.m) return b;
  const o = { ...b };
  for (const k of PHONE_BLOCK_KEYS) if (b.m[k] !== undefined) (o as Record<string, unknown>)[k] = b.m[k];
  return o;
}
/** the whole design as the phone layout shows it (the editor's Phone mode draws and edits this) */
export function phoneSettings(s: Settings): Settings {
  return { ...s, decorations: s.decorations.map(phoneDecor), sections: s.sections.map((sec) => ({ ...sec, blocks: sec.blocks.map(phoneBlock) })) };
}
/** a change to a sticker made in Phone mode: its place, size and turn go to the phone layout, everything else to the sticker itself */
export function splitDecorPatch(d: Decoration, patch: Partial<Decoration>): Partial<Decoration> {
  const out: Partial<Decoration> = {};
  const m = { ...(d.m ?? {}) };
  let phone = false;
  for (const [k, v] of Object.entries(patch)) {
    if ((PHONE_DECOR_KEYS as readonly string[]).includes(k)) {
      (m as Record<string, unknown>)[k] = v;
      phone = true;
    } else (out as Record<string, unknown>)[k] = v;
  }
  return phone ? { ...out, m } : out;
}
/** the same for an element / card box (its place and the box's size) */
export function splitBlockPatch(b: Block, patch: Partial<Block>): Partial<Block> {
  const out: Partial<Block> = {};
  const m = { ...(b.m ?? {}) };
  let phone = false;
  for (const [k, v] of Object.entries(patch)) {
    if ((PHONE_BLOCK_KEYS as readonly string[]).includes(k)) {
      (m as Record<string, unknown>)[k] = v;
      phone = true;
    } else (out as Record<string, unknown>)[k] = v;
  }
  return phone ? { ...out, m } : out;
}

/** HTML attributes + CSS variables that carry a sticker's phone layout (applied by globals.css on phone-sized pages) */
export function decorPhoneAttrs(d: Decoration): { attrs: Record<string, string>; vars: Record<string, string> } {
  const attrs: Record<string, string> = {}, vars: Record<string, string> = {};
  if (d.m?.x !== undefined || d.m?.y !== undefined) {
    attrs["data-m-pos"] = "";
    vars["--m-x"] = `${d.m.x ?? d.x}%`;
    vars["--m-y"] = `${d.m.y ?? d.y}%`;
  }
  if (d.m?.size !== undefined) {
    attrs["data-m-size"] = "";
    vars["--m-s"] = String(d.m.size);
  }
  if (d.m?.rotate !== undefined) {
    attrs["data-m-rot"] = "";
    vars["--m-r"] = `${d.m.rotate}deg`;
  }
  if (d.showOn && d.showOn !== "all") attrs["data-show"] = d.showOn;
  return { attrs, vars };
}
/** the same for an element's wrapper */
export function blockPhoneAttrs(b: Block): { attrs: Record<string, string>; vars: Record<string, string> } {
  const attrs: Record<string, string> = {}, vars: Record<string, string> = {};
  if (b.m?.x !== undefined || b.m?.y !== undefined) {
    attrs["data-m-bpos"] = b.overlap || b.group ? "top" : "";
    vars["--m-bx"] = `${b.m.x ?? b.x}%`;
    vars["--m-by"] = `${b.m.y ?? b.y}px`;
  }
  if (b.m?.zoom !== undefined && b.m.zoom !== 100) {
    attrs["data-m-zoom"] = "";
    vars["--m-z"] = String(b.m.zoom / 100);
  }
  if (b.showOn && b.showOn !== "all") attrs["data-show"] = b.showOn;
  return { attrs, vars };
}
/** the same for a card box (read from its first element) */
export function groupPhoneAttrs(b: Block): { attrs: Record<string, string>; vars: Record<string, string> } {
  const attrs: Record<string, string> = {}, vars: Record<string, string> = {};
  if (b.m?.groupX !== undefined || b.m?.groupY !== undefined) {
    attrs["data-m-gpos"] = b.groupFloat ? "top" : "";
    vars["--m-gx"] = `${b.m.groupX ?? b.groupX ?? 0}%`;
    vars["--m-gy"] = `${b.m.groupY ?? b.groupY ?? 0}px`;
  }
  if (b.m?.groupW !== undefined) {
    attrs["data-m-gw"] = "";
    vars["--m-gw"] = `${b.m.groupW}%`;
  }
  if (b.m?.groupH !== undefined) {
    attrs["data-m-gh"] = "";
    vars["--m-gh"] = `${b.m.groupH}px`;
  }
  if (b.showOn && b.showOn !== "all") attrs["data-show"] = b.showOn; // the box itself (its background, border) hides with its contents
  return { attrs, vars };
}

/** Does this section scale with the screen? Its own setting wins; otherwise the page's "same look on every screen",
 *  except for sections holding the RSVP form or a map, which stay full size so they are easy to use on a phone. */
export function sectionScales(sec: Section, page: Settings["page"]): boolean {
  if (sec.shrink !== undefined) return sec.shrink;
  return !!page.sameLook && !sec.blocks.some((b) => b.type === "rsvp" || b.type === "map");
}

/** The section holding what is added to the opening card (elements, stickers). It is drawn on the envelope screen, never on the page, and always sits last in `sections`. */
export const CARD_SECTION = "opening-card";
export const isCardSection = (id: string | null | undefined) => id === CARD_SECTION;
/** the page's own sections (without the opening card's) */
export const pageSections = (s: Settings) => s.sections.filter((x) => x.id !== CARD_SECTION);

/** Make sure the opening card has its section, kept at the end of the list. */
export function withCardSection(s: Settings): Settings {
  const card = s.sections.find((x) => x.id === CARD_SECTION);
  const rest = pageSections(s);
  if (card && s.sections[s.sections.length - 1] === card) return s;
  return {
    ...s,
    sections: [...rest, card ?? { id: CARD_SECTION, name: "Card", bg: "plain", bgColor: "", hidden: false, panel: "none", border: DEFAULT_BORDER, gradient: DEFAULT_GRADIENT, effect: "none", card: false, wide: false, pad: "sm", grow: 0, blocks: [] }],
  };
}

export function applyName(s: Settings): Settings {
  const name = s.name || "[Event name]";
  const walk = (v: unknown): unknown =>
    typeof v === "string"
      ? v.replace(/\{name\}/gi, name)
      : Array.isArray(v)
        ? v.map(walk)
        : v && typeof v === "object"
          ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]))
          : v;
  const out = walk(s) as Settings;
  return { ...out, name: s.name };
}

export function newBlock(type: BlockType, id: string): Block {
  const base: Block = { id, type, text: "", text2: "", text3: "", url: "", icon: "", size: "md", tone: "ink", caps: false, fxBg: "none", images: [], labels: {}, parts: [], frame: "none", tap: "none", back: "", group: "", groupDir: "col", groupStyle: "none", groupCrown: "none", groupColor: "", overlap: false, color: "", deco: null, x: 0, y: 0 };
  switch (type) {
    case "badge": return { ...base, text: "New badge" };
    case "heading": return { ...base, text: "New heading", size: "lg" };
    case "text": return { ...base, text: "Write something here…", tone: "soft" };
    case "script": return { ...base, text: "★ Handwritten ★" };
    case "button": return { ...base, text: "Click me", url: "#rsvp", text2: "none" };
    case "image": return base;
    case "gallery": return base;
    case "emoji": return { ...base, text: "🎈", size: "xl" };
    case "card": return { ...base, icon: "star", text: "Title", text2: "Detail", text3: "More detail" };
    case "step": return { ...base, text: "5:00 PM", text2: "New step", text3: "Description" };
    case "countdown": return { ...base, text: "Countdown", text2: "2026-12-31T12:00", tone: "white" };
    case "rsvp": return { ...base, text: "RSVP Attendance", text2: "Please confirm your attendance!" };
    // map: text = title, text2 = address searched, text3 = "lat,lng", icon = zoom, size = height, url = optional avatar for the pin
    case "map": return { ...base, text: "Find us", icon: "14" };
    case "divider": return base;
    case "spacer": return base;
    // ribbon: text = the words on it, color = ribbon colour ("" = the accent)
    case "ribbon": return { ...base, text: "Little Racer" };
    case "illustration": return { ...base, deco: { kind: "emoji", content: "🎈", size: 80, rotate: 0, color: "#a1a1aa", effect: "none", flip: false, sx: 1, sy: 1, shape: "original", opacity: 100 } };
  }
}

export function imageUrls(s: Settings): string[] {
  return [
    ...s.sections.flatMap((sec) =>
      sec.blocks.flatMap((b) => [
        ...b.images.map((i) => i.url),
        ...((b.type === "image" || b.type === "map") && b.url.startsWith("/api/img/") ? [b.url] : []),
        ...(b.original ? [b.original] : []),
        // a picture illustration placed in the layout keeps its upload too
        ...(b.deco?.kind === "image" ? [b.deco.content, ...(b.deco.original ? [b.deco.original] : [])] : []),
      ]),
    ),
    ...s.decorations.filter((d) => d.kind === "image").flatMap((d) => [d.content, ...(d.original ? [d.original] : [])]),
  ];
}

/* ------------------------------------------------------------------ */
/* Defaults, plus conversion of the earlier fixed-layout settings      */
/* ------------------------------------------------------------------ */

/* eslint-disable @typescript-eslint/no-explicit-any */
/** Earlier versions stored brand/ink/cream/line colours; the main colour becomes the accent. */
export function normalizeTheme(t: any): Settings["theme"] {
  return {
    mode: t?.mode === "dark" ? "dark" : "light",
    accent: typeof t?.accent === "string" ? t.accent : typeof t?.brand === "string" ? t.brand : DEFAULT_THEME.accent,
    design: t?.design === "clay" ? "clay" : "bento",
    font: FONT_STYLES.includes(t?.font) ? t.font : "playful",
  };
}

export function legacyDefaults(): any {
  const [date, time] = (process.env.EVENT_DATE ?? "Saturday, 31 December 2026 · 6:00 PM - 9:00 PM").split(" · ");
  return {
    theme: DEFAULT_THEME,
    hero: {
      name: process.env.EVENT_NAME ?? "",
      badge: "You're invited",
      line1: "Join us for",
      line2: "{name}",
      tagline: "★ Save the date ★",
      subtitle: "We'd love to celebrate with you. Please let us know if you can make it.",
      button: "RSVP Now",
    },
    countdown: { enabled: true, label: "Countdown to the event", target: process.env.EVENT_ISO ?? "2026-12-31T18:00" },
    event: {
      title: "Event Details",
      subtitle: "Everything you need to know before you arrive.",
      date,
      time: time ?? "",
      place: process.env.EVENT_PLACE ?? "Venue name",
      address: process.env.EVENT_ADDRESS ?? "123 Example Street, City",
      mapsUrl: process.env.EVENT_MAPS_URL ?? "",
      dress: process.env.EVENT_DRESS ?? "Smart casual",
      dressNote: process.env.EVENT_DRESS_NOTE ?? "Dress comfortably",
    },
    agenda: {
      enabled: true,
      badge: "Schedule",
      title: "Event Schedule",
      items: [
        { time: "6:00 PM", title: "Arrival & welcome", text: "Drinks and a warm welcome as guests arrive." },
        { time: "7:00 PM", title: "Main event", text: "The highlight of the evening." },
        { time: "8:00 PM", title: "Dinner & celebration", text: "Food, music and time to mingle." },
      ],
    },
    gallery: { enabled: false, title: "Highlights", subtitle: "A few moments to look forward to.", images: [] },
    rsvp: { title: "RSVP", subtitle: "Please let us know if you can join us." },
    footer: { title: "{name}", text: "We can't wait to see you there!" },
    decorations: [
      { id: "celebrate", section: "hero", kind: "text", content: "Celebrate!", x: 10, y: 9, size: 40, rotate: -12, color: "#a1a1aa", effect: "float" },
      { id: "joinus", section: "hero", kind: "text", content: "Join us!", x: 90, y: 11, size: 40, rotate: 12, color: "#fcd34d", effect: "float" },
    ],
  };
}

/** The "Find us" section. The location is a starting point (Cebu City, Philippines) until the host searches for the real address. */
function mapSection(b: (type: BlockType, p?: Partial<Block>) => Block, sec: (id: string, name: string, p: Partial<Section>, blocks: Block[]) => Section, place: string, address: string): Section {
  return sec("map", "Map", { bg: "cream" }, [
    b("heading", { text: "Find us" }),
    b("text", { text: "Directions and parking tips for getting here.", size: "lg", tone: "soft" }),
    b("map", { text: place, text2: address, text3: "10.315700,123.885400" }),
  ]);
}

/** One-time upgrade for pages saved before the map existed: add a visible map section after the event details. */
export function withMapSection(s: Settings): Settings {
  if (s.upgrades.includes("map-section")) return s;
  const upgraded = { ...s, upgrades: [...s.upgrades, "map-section"] };
  if (s.sections.some((x) => x.blocks.some((b) => b.type === "map"))) return upgraded; // they already have one
  const usedBlocks = s.sections.flatMap((x) => x.blocks.map((b) => b.id));
  const next = (prefix: string, used: string[]) => {
    let n = used.length + 1;
    while (used.includes(`${prefix}${n}`)) n++;
    used.push(`${prefix}${n}`);
    return `${prefix}${n}`;
  };
  const b = (type: BlockType, p: Partial<Block> = {}): Block => ({ ...newBlock(type, next("b", usedBlocks)), ...p });
  const usedSections = s.sections.map((x) => x.id);
  const sec = (id: string, name: string, p: Partial<Section>, blocks: Block[]): Section => ({
    id: usedSections.includes(id) ? next("s", usedSections) : id,
    name, bg: "white", bgColor: "", hidden: false, panel: "none", border: DEFAULT_BORDER, gradient: DEFAULT_GRADIENT, effect: "none", card: false, wide: false, pad: "lg", grow: 0, ...p, blocks,
  });
  const event = s.sections.find((x) => x.id === "event");
  const card = event?.blocks.filter((c) => c.type === "card")[1]; // the "Where" card
  const section = mapSection(b, sec, card?.text2 || "Venue", card?.text3 || "");
  const at = event ? s.sections.indexOf(event) + 1 : s.sections.length;
  const sections = [...s.sections];
  sections.splice(at, 0, section);
  return { ...upgraded, sections };
}

export function fromLegacy(l: any): Settings {
  let n = 0;
  const b = (type: BlockType, p: Partial<Block> = {}): Block => ({ ...newBlock(type, `b${++n}`), ...p });
  const sec = (id: string, name: string, p: Partial<Section>, blocks: Block[]): Section => ({
    id, name, bg: "white", bgColor: "", hidden: false, panel: "none", border: DEFAULT_BORDER, gradient: DEFAULT_GRADIENT, effect: "none", card: false, wide: false, pad: "lg", grow: 0, ...p, blocks,
  });
  const e = l.event;
  const maps = e.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${e.place} ${e.address}`)}`;
  return {
    name: l.hero.name ?? "",
    eventType: "general",
    upgrades: ["map-section"],
    theme: normalizeTheme(l.theme),
    page: DEFAULT_PAGE,
    decorations: (l.decorations ?? []).map((d: any) => ({ ...d, section: d.section ?? "hero" })),
    sections: [
      sec("hero", "Hero", {}, [
        b("badge", { text: l.hero.badge }),
        b("heading", { text: l.hero.line1, size: "xl", caps: true }),
        b("heading", { text: l.hero.line2, size: "xl", caps: true, tone: "brand" }),
        b("script", { text: l.hero.tagline }),
        b("text", { text: l.hero.subtitle, size: "lg", tone: "soft" }),
        b("button", { text: l.hero.button, url: "#rsvp", text2: "none" }),
      ]),
      sec("countdown", "Countdown", { bg: "brand", pad: "md", hidden: !l.countdown.enabled }, [
        b("countdown", { text: l.countdown.label, text2: l.countdown.target, tone: "white" }),
      ]),
      sec("event", "Event details", {}, [
        b("heading", { text: e.title }),
        b("text", { text: e.subtitle, size: "lg", tone: "soft" }),
        b("card", { icon: "calendar-days", text: "When", text2: e.date, text3: e.time }),
        b("card", { icon: "map-pin", text: "Where", text2: e.place, text3: e.address, url: maps }),
        b("card", { icon: "shirt", text: "Dress Code", text2: e.dress, text3: e.dressNote }),
      ]),
      mapSection(b, sec, e.place, e.address),
      sec("agenda", "Agenda", { bg: "cream", hidden: !l.agenda.enabled }, [
        b("badge", { text: l.agenda.badge }),
        b("heading", { text: l.agenda.title }),
        ...l.agenda.items.map((i: any) => b("step", { text: i.time, text2: i.title, text3: i.text })),
      ]),
      sec("gallery", "Gallery", { wide: true, hidden: !l.gallery.enabled }, [
        b("heading", { text: l.gallery.title }),
        b("text", { text: l.gallery.subtitle, size: "lg", tone: "soft" }),
        b("gallery", { images: l.gallery.images }),
      ]),
      sec("rsvp", "RSVP", { bg: "cream" }, [b("rsvp", { text: l.rsvp.title, text2: l.rsvp.subtitle })]),
      sec("footer", "Footer", { bg: "ink", pad: "md" }, [
        b("heading", { text: l.footer.title, size: "sm", caps: true, tone: "white" }),
        b("text", { text: l.footer.text, tone: "white" }),
      ]),
    ],
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export function defaultSettings(): Settings {
  return fromLegacy(legacyDefaults());
}
