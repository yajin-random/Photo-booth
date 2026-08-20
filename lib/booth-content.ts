import { PoseGuide, StickerDef } from "./types";

export const POSE_GUIDES: PoseGuide[] = [
  { id: "back-to-back", name: "Back to back", description: "Stand shoulder to shoulder, facing opposite ways." },
  { id: "cheek-to-cheek", name: "Cheek to cheek", description: "Lean in, heads together, big smiles." },
  { id: "heart-hands", name: "Heart hands", description: "Each of you makes half a heart with your hands." },
  { id: "jump-shot", name: "Jump shot", description: "Both feet off the ground on the count of one." },
  { id: "point-at-camera", name: "Point at camera", description: "Both point straight at the lens, deadpan face." },
  { id: "silly-face", name: "Silly face", description: "Whatever your goofiest face is — go." },
];

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
