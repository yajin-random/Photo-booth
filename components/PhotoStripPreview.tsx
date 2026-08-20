"use client";

import { useEffect, useRef, useState } from "react";
import { CapturedFrame } from "@/lib/types";

const STRIP_W = 480;
const FRAME_H = 360;
const BORDER = 18;
const GAP = 14;
const FOOTER_H = 90;

export function PhotoStripPreview({ frames, roomLabel, columns = 1 }: { frames: CapturedFrame[]; roomLabel?: string; columns?: 1 | 3 }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function build() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rows = Math.ceil(frames.length / columns);
      const frameW = (STRIP_W - BORDER * 2 - GAP * (columns - 1)) / columns;
      const frameH = columns === 1 ? FRAME_H : Math.round(frameW * 1.16);
      const totalH = BORDER + rows * frameH + Math.max(0, rows - 1) * GAP + FOOTER_H;
      canvas.width = STRIP_W;
      canvas.height = totalH;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.fillStyle = "#fffcf7";
      ctx.fillRect(0, 0, STRIP_W, totalH);

      const images = await Promise.all(
        frames.map(
          (f) =>
            new Promise<HTMLImageElement>((resolve, reject) => {
              const img = new Image();
              img.onload = () => resolve(img);
              img.onerror = reject;
              img.src = f.dataUrl;
            })
        )
      );
      if (cancelled) return;

      images.forEach((img, i) => {
        const row = Math.floor(i / columns);
        const column = i % columns;
        const x = BORDER + column * (frameW + GAP);
        const y = BORDER + row * (frameH + GAP);
        drawCover(ctx, img, x, y, frameW, frameH);
      });

      ctx.fillStyle = "#1b1620";
      ctx.font = "600 20px var(--font-space-grotesk), sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(roomLabel ?? "two-up booth", STRIP_W / 2, totalH - FOOTER_H / 2 + 6);

      setDataUrl(canvas.toDataURL("image/png"));
    }

    if (frames.length) build();
    return () => {
      cancelled = true;
    };
  }, [frames, roomLabel, columns]);

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="strip-drop w-full max-w-[280px] overflow-hidden rounded-lg shadow-[0_18px_40px_rgba(0,0,0,0.45)]">
        <canvas ref={canvasRef} className="w-full" />
      </div>
      <a
        href={dataUrl ?? "#"}
        download="two-up-strip.png"
        aria-disabled={!dataUrl}
        className="flex h-12 w-full max-w-[280px] items-center justify-center rounded-full bg-[var(--color-shutter)] font-semibold text-[var(--color-flash)] active:scale-95"
      >
        Download strip
      </a>
    </div>
  );
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, dx: number, dy: number, dw: number, dh: number) {
  const srcRatio = img.width / img.height;
  const dstRatio = dw / dh;
  let sx = 0,
    sy = 0,
    sw = img.width,
    sh = img.height;
  if (srcRatio > dstRatio) {
    sw = img.height * dstRatio;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / dstRatio;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}
