export type BoothMode = "solo" | "shared";

export type PoseGuide = {
  id: string;
  name: string;
  description: string;
  /** Optional local meme/reference image, e.g. /pose-guides/back-to-back.webp. */
  imageSrc?: string;
};

export type StickerDef = {
  id: string;
  glyph: string;
  label: string;
};

export type PlacedSticker = {
  key: string;
  stickerId: string;
  glyph: string;
  x: number; // 0-1 fraction of canvas width
  y: number; // 0-1 fraction of canvas height
  scale: number;
  rotation: number; // degrees
};

export type CapturedFrame = {
  id: string;
  dataUrl: string; // current image (post bg-removal if applied)
  originalDataUrl: string; // raw capture, kept so bg removal can be re-toggled
  bgRemoved: boolean;
  stickers: PlacedSticker[];
};
