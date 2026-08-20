"use client";

const CDNS = [
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14",
  "https://unpkg.com/@mediapipe/tasks-vision@0.10.14",
];
const MODEL = "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite";
const MASK_MS = 60;
const EDGE_LO = 0.3;
const EDGE_HI = 0.72;

type RemoteVision = {
  FilesetResolver: { forVisionTasks: (path: string) => Promise<unknown> };
  ImageSegmenter: { createFromOptions: (files: unknown, options: unknown) => Promise<Segmenter> };
};
type Segmenter = {
  segmentForVideo: (source: CanvasImageSource, timestamp: number) => SegmentationResult;
  close?: () => void;
};
type SegmentationResult = {
  confidenceMasks?: Array<{ width: number; height: number; getAsFloat32Array: () => Float32Array }>;
  close?: () => void;
};

let enginePromise: Promise<{ vision: RemoteVision; files: unknown }> | null = null;

async function loadEngine() {
  if (enginePromise) return enginePromise;
  enginePromise = (async () => {
    let lastError: unknown;
    for (const cdn of CDNS) {
      try {
        const vision = (await import(/* webpackIgnore: true */ `${cdn}/vision_bundle.mjs`)) as unknown as RemoteVision;
        const files = await vision.FilesetResolver.forVisionTasks(`${cdn}/wasm`);
        return { vision, files };
      } catch (error) {
        lastError = error;
      }
    }
    enginePromise = null;
    throw lastError ?? new Error("MediaPipe unavailable");
  })();
  return enginePromise;
}

async function prime(segmenter: Segmenter) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas unavailable");
  context.fillStyle = "#8a8a8a";
  context.fillRect(0, 0, 64, 64);
  context.fillStyle = "#303030";
  context.fillRect(18, 14, 28, 44);
  let hasMask = false;
  for (let index = 0; index < 3; index += 1) {
    const result = segmenter.segmentForVideo(canvas, performance.now() + index + 1);
    hasMask ||= Boolean(result.confidenceMasks?.[0]);
    result.close?.();
    await new Promise((resolve) => setTimeout(resolve, 30));
  }
  if (!hasMask) throw new Error("Segmentation priming failed");
}

async function buildSegmenter() {
  const { vision, files } = await loadEngine();
  for (const delegate of ["GPU", "CPU"] as const) {
    let segmenter: Segmenter | null = null;
    try {
      segmenter = await vision.ImageSegmenter.createFromOptions(files, {
        baseOptions: { modelAssetPath: MODEL, delegate },
        runningMode: "VIDEO",
        outputConfidenceMasks: true,
        outputCategoryMask: false,
      });
      await prime(segmenter);
      return segmenter;
    } catch (error) {
      segmenter?.close?.();
      if (delegate === "CPU") throw error;
    }
  }
  throw new Error("No compatible segmenter");
}

export type PersonSegmenter = { cutout: () => HTMLCanvasElement | null; ready: () => boolean; failed: () => boolean; close: () => void };

export function createPersonSegmenter(video: HTMLVideoElement, onStatus?: (status: string) => void): PersonSegmenter {
  let segmenter: Segmenter | null = null;
  let closed = false;
  let failed = false;
  let lastTimestamp = -1;
  let maskAt = 0;
  let maskCanvas: HTMLCanvasElement | null = null;
  let maskData: ImageData | null = null;
  let cutoutCanvas: HTMLCanvasElement | null = null;
  let hasMask = false;
  let polarity = 0;

  onStatus?.("Loading live camera effects…");
  buildSegmenter()
    .then((built) => {
      if (closed) built.close?.();
      else {
        segmenter = built;
        onStatus?.("Finding you in the frame…");
      }
    })
    .catch(() => {
      failed = true;
      onStatus?.("Live effects unavailable — using your normal camera.");
    });

  const detectPolarity = (values: Float32Array, width: number, height: number) => {
    const at = (x: number, y: number) => values[Math.min(height - 1, Math.max(0, Math.round(y * height))) * width + Math.min(width - 1, Math.max(0, Math.round(x * width)))] ?? 0;
    const corner = ([ [0.08, 0.08], [0.5, 0.05], [0.92, 0.08], [0.08, 0.4], [0.92, 0.4] ] as const).reduce((sum, [x, y]) => sum + at(x, y), 0) / 5;
    const centre = ([ [0.5, 0.55], [0.4, 0.7], [0.6, 0.7], [0.5, 0.85], [0.5, 0.4] ] as const).reduce((sum, [x, y]) => sum + at(x, y), 0) / 5;
    if (Math.abs(centre - corner) >= 0.15) polarity = centre >= corner ? 1 : -1;
  };

  const refreshMask = () => {
    if (!segmenter || !video.videoWidth || (maskCanvas && performance.now() - maskAt < MASK_MS)) return;
    let result: SegmentationResult | null = null;
    try {
      const timestamp = Math.max(lastTimestamp + 1, Math.round(performance.now()));
      lastTimestamp = timestamp;
      result = segmenter.segmentForVideo(video, timestamp);
      const mask = result.confidenceMasks?.[0];
      if (!mask) return;
      const values = mask.getAsFloat32Array();
      if (!polarity) detectPolarity(values, mask.width, mask.height);
      if (!maskCanvas || maskCanvas.width !== mask.width || maskCanvas.height !== mask.height) {
        maskCanvas = document.createElement("canvas");
        maskCanvas.width = mask.width;
        maskCanvas.height = mask.height;
        maskData = maskCanvas.getContext("2d")?.createImageData(mask.width, mask.height) ?? null;
      }
      if (!maskData || !maskCanvas) return;
      const ramp = EDGE_HI - EDGE_LO;
      for (let index = 0; index < values.length; index += 1) {
        const confidence = polarity < 0 ? 1 - values[index] : values[index];
        const alpha = Math.min(1, Math.max(0, (confidence - EDGE_LO) / ramp));
        maskData.data[index * 4 + 3] = alpha * alpha * (3 - 2 * alpha) * 255;
      }
      maskCanvas.getContext("2d")?.putImageData(maskData, 0, 0);
      maskAt = performance.now();
      hasMask = true;
    } catch {
      // Preserve the most recent valid mask; a dropped frame should not flash the raw video.
    } finally {
      result?.close?.();
    }
  };

  return {
    cutout: () => {
      if (!segmenter || !video.videoWidth || !video.videoHeight) return null;
      refreshMask();
      if (!maskCanvas) return null;
      if (!cutoutCanvas || cutoutCanvas.width !== video.videoWidth || cutoutCanvas.height !== video.videoHeight) {
        cutoutCanvas = document.createElement("canvas");
        cutoutCanvas.width = video.videoWidth;
        cutoutCanvas.height = video.videoHeight;
      }
      const context = cutoutCanvas.getContext("2d");
      if (!context) return null;
      context.clearRect(0, 0, cutoutCanvas.width, cutoutCanvas.height);
      context.drawImage(video, 0, 0);
      context.save();
      context.globalCompositeOperation = "destination-in";
      context.filter = `blur(${Math.max(1, Math.round(video.videoWidth / 320))}px)`;
      context.drawImage(maskCanvas, 0, 0, cutoutCanvas.width, cutoutCanvas.height);
      context.restore();
      return cutoutCanvas;
    },
    ready: () => hasMask,
    failed: () => failed,
    close: () => {
      closed = true;
      segmenter?.close?.();
      segmenter = null;
      maskCanvas = null;
      cutoutCanvas = null;
    },
  };
}
