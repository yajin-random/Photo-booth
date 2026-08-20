import { PoseGuide, StickerDef } from "./types";

export const POSE_GUIDES: PoseGuide[] = [
  { id: "back-to-back", name: "Back to back", description: "Stand shoulder to shoulder, facing opposite ways." },
  { id: "cheek-to-cheek", name: "Cheek to cheek", description: "Lean in, heads together, big smiles." },
  { id: "heart-hands", name: "Heart hands", description: "Each of you makes half a heart with your hands." },
  { id: "jump-shot", name: "Jump shot", description: "Both feet off the ground on the count of one." },
  { id: "point-at-camera", name: "Point at camera", description: "Both point straight at the lens, deadpan face." },
  { id: "silly-face", name: "Silly face", description: "Whatever your goofiest face is — go." },
];

/** Curated Unsplash stock photographs used as client-side virtual backgrounds. */
export const STOCK_BACKGROUNDS = [
  { id: "sunset", name: "Sunset coast", src: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1080&q=82" },
  { id: "flowers", name: "Flower field", src: "https://images.unsplash.com/photo-1497250681960-ef046c08a56e?auto=format&fit=crop&w=1080&q=82" },
  { id: "city", name: "Neon city", src: "https://images.unsplash.com/photo-1519608487953-e999c86e7451?auto=format&fit=crop&w=1080&q=82" },
  { id: "cabin", name: "Mountain cabin", src: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1080&q=82" },
] as const;

export const CAMERA_FILTERS = [
  { id: "none", name: "Clean", css: "none" },
  { id: "warm", name: "Golden", css: "sepia(0.22) saturate(1.16) contrast(1.04)" },
  { id: "mono", name: "B&W", css: "grayscale(1) contrast(1.16)" },
  { id: "dreamy", name: "Dreamy", css: "saturate(0.82) brightness(1.08) contrast(0.9)" },
  { id: "pop", name: "Pop", css: "saturate(1.42) contrast(1.12)" },
  { id: "rose", name: "Rose", css: "sepia(0.12) hue-rotate(315deg) saturate(1.18)" },
] as const;

export const STRIP_LAYOUTS = [
  { id: "3x1", name: "Classic", detail: "3 photos", shots: 3, columns: 1 },
  { id: "4x1", name: "Long", detail: "4 photos", shots: 4, columns: 1 },
  { id: "3x3", name: "Grid", detail: "9 photos", shots: 9, columns: 3 },
] as const;

export type CameraFilterId = (typeof CAMERA_FILTERS)[number]["id"];
export type StripLayoutId = (typeof STRIP_LAYOUTS)[number]["id"];

export const STICKERS: StickerDef[] = [
  { id: "heart", glyph: "\u2764\uFE0F", label: "Heart" },
  { id: "sparkle", glyph: "\u2728", label: "Sparkle" },
  { id: "star", glyph: "\u2B50", label: "Star" },
  { id: "fire", glyph: "\uD83D\uDD25", label: "Fire" },
  { id: "sunglasses", glyph: "\uD83D\uDE0E", label: "Sunglasses" },
  { id: "camera", glyph: "\uD83D\uDCF7", label: "Camera" },
  { id: "ring", glyph: "\uD83D\uDC8D", label: "Ring" },
  { id: "kiss", glyph: "\uD83D\uDC8B", label: "Kiss" },
  { id: "balloon", glyph: "\uD83C\uDF88", label: "Balloon" },
  { id: "confetti", glyph: "\uD83C\uDF89", label: "Confetti" },
];
