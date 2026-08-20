"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type Konva from "konva";
import { STICKERS } from "@/lib/booth-content";
import { PlacedSticker } from "@/lib/types";

const StickerCanvasInner = dynamic(() => import("./StickerCanvasInner"), { ssr: false });

const CANVAS_W = 340;
const DEFAULT_CANVAS_H = (CANVAS_W * 4) / 3;

type Props = {
  photoUrl: string;
  initialStickers: PlacedSticker[];
  onDone: (stickers: PlacedSticker[], flattenedDataUrl: string) => void;
  onSkip: () => void;
};

export function StickerEditor({ photoUrl, initialStickers, onDone, onSkip }: Props) {
  const [stickers, setStickers] = useState<PlacedSticker[]>(initialStickers);
  const [canvasHeight, setCanvasHeight] = useState(DEFAULT_CANVAS_H);
  const stageRef = useRef<Konva.Stage | null>(null);

  useEffect(() => {
    const image = new Image();
    image.onload = () => setCanvasHeight(Math.round(CANVAS_W * (image.naturalHeight / image.naturalWidth)));
    image.src = photoUrl;
  }, [photoUrl]);

  function addSticker(glyph: string, stickerId: string) {
    setStickers((prev) => [
      ...prev,
      {
        key: `${stickerId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        stickerId,
        glyph,
        x: 0.5 + (Math.random() - 0.5) * 0.2,
        y: 0.5 + (Math.random() - 0.5) * 0.2,
        scale: 1,
        rotation: (Math.random() - 0.5) * 20,
      },
    ]);
  }

  function finish() {
    const dataUrl = stageRef.current ? stageRef.current.toDataURL({ pixelRatio: 2 }) : photoUrl;
    onDone(stickers, dataUrl);
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="overflow-hidden rounded-3xl border border-[var(--color-line)] bg-black" style={{ touchAction: "none" }}>
        <StickerCanvasInner
          photoUrl={photoUrl}
          stickers={stickers}
          onChange={setStickers}
          stageRef={stageRef}
          width={CANVAS_W}
          height={canvasHeight}
        />
      </div>

      <div className="flex w-full max-w-sm flex-wrap justify-center gap-2 rounded-2xl bg-[var(--color-ink-soft)] p-3">
        {STICKERS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => addSticker(s.glyph, s.id)}
            aria-label={`Add ${s.label} sticker`}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-black/30 text-2xl active:scale-90"
          >
            {s.glyph}
          </button>
        ))}
      </div>

      <p className="max-w-sm text-center font-mono text-xs text-[var(--color-flash-dim)]/70">
        Tap a sticker to drop it on the photo. Drag to move, use the corner handle to resize or rotate.
      </p>

      <div className="flex w-full max-w-sm gap-3">
        <button
          type="button"
          onClick={onSkip}
          className="h-12 flex-1 rounded-full border border-[var(--color-line)] font-medium text-[var(--color-flash-dim)]"
        >
          Skip
        </button>
        <button
          type="button"
          onClick={finish}
          className="h-12 flex-1 rounded-full bg-[var(--color-shutter)] font-semibold text-[var(--color-flash)] active:scale-95"
        >
          Done
        </button>
      </div>
    </div>
  );
}
