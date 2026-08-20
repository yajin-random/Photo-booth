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
