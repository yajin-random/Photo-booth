"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type Peer from "peerjs";
import { FilesetResolver, ImageSegmenter } from "@mediapipe/tasks-vision";
import { answerCalls, callPeer, createPeer, peerIdFor, PeerRole } from "@/lib/peer";

export type CameraViewHandle = {
  capture: () => string | null;
  hasLiveBackground: () => boolean;
};

type Props = {
  mode: "solo" | "shared";
  roomId?: string;
  role?: PeerRole;
  liveBackground: boolean;
  backgroundSrc?: string;
  onReadyChange?: (ready: boolean) => void;
  flashKey?: number;
};

const MAX_EDGE = 1080;
const PREVIEW_EDGE = 480;

export const CameraView = forwardRef<CameraViewHandle, Props>(function CameraView(
  { mode, roomId, role, liveBackground, backgroundSrc, onReadyChange, flashKey },
  ref
) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const foregroundCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const peerRef = useRef<Peer | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const backgroundImageRef = useRef<HTMLImageElement | null>(null);
  const livePreviewReadyRef = useRef(false);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [localReady, setLocalReady] = useState(false);
  const [remoteReady, setRemoteReady] = useState(mode === "solo");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState("");
  const [previewReady, setPreviewReady] = useState(false);
  const [previewStatus, setPreviewStatus] = useState("");

  useEffect(() => {
    if (!backgroundSrc) {
      backgroundImageRef.current = null;
      return;
    }
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => { backgroundImageRef.current = image; };
    image.onerror = () => { backgroundImageRef.current = null; };
    image.src = backgroundSrc;
  }, [backgroundSrc]);

  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | null = null;
    async function start() {
      setCameraError(null);
      setLocalReady(false);
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: MAX_EDGE }, height: { ideal: MAX_EDGE } }, audio: false });
        if (cancelled) return stream.getTracks().forEach((track) => track.stop());
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      } catch {
        setCameraError("Couldn't access the camera. Check your browser's camera permission for this site.");
      }
    }
    start();
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((track) => track.stop());
      if (localStreamRef.current === stream) localStreamRef.current = null;
    };
  }, [facing]);

  useEffect(() => {
    if (mode !== "shared" || !roomId || !role) return;
    const activeRoomId = roomId;
    const activeRole = role;
    let cancelled = false;
    async function connect() {
      setRemoteReady(false);
      let tries = 0;
      while (!localStreamRef.current && tries < 100 && !cancelled) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        tries += 1;
      }
      const stream = localStreamRef.current;
      if (!stream || cancelled) return;
      setConnectionStatus(activeRole === "host" ? "Waiting for your partner to join…" : "Connecting to your partner…");
      try {
        const peer = await createPeer(peerIdFor(activeRoomId, activeRole));
        if (cancelled) return;
        peerRef.current = peer;
        const onRemoteStream = (remoteStream: MediaStream) => {
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
          setRemoteReady(true);
          setConnectionStatus("Connected");
        };
        answerCalls(peer, stream, onRemoteStream);
        if (activeRole === "guest") callPeer(peer, peerIdFor(activeRoomId, "host"), stream, onRemoteStream);
      } catch {
        setConnectionStatus("Couldn't reach the signaling server — check your connection.");
      }
    }
    connect();
    return () => {
      cancelled = true;
      peerRef.current?.destroy();
      peerRef.current = null;
    };
  }, [mode, roomId, role, facing]);

  // MediaPipe runs its person-segmentation model directly on video frames. The mask is composited on
  // the GPU-backed pipeline before each repaint, rather than waiting for a still photo to be captured.
  useEffect(() => {
    if (!liveBackground || mode !== "solo" || !localReady) {
      livePreviewReadyRef.current = false;
      setPreviewReady(false);
      setPreviewStatus("");
      return;
    }
    let cancelled = false;
    let animationFrame: number | undefined;
    let segmenter: ImageSegmenter | undefined;
    setPreviewStatus("Loading live camera effects…");
    const renderNext = () => {
      const video = localVideoRef.current;
      const preview = previewCanvasRef.current;
      if (!segmenter || !video?.videoWidth || !preview || cancelled) return;
      segmenter.segmentForVideo(video, performance.now(), (result) => {
        const personMask = result.confidenceMasks?.[1];
        if (!personMask || cancelled) return;
        const width = Math.min(PREVIEW_EDGE, video.videoWidth);
        const height = Math.round(width * (video.videoHeight / video.videoWidth));
        preview.width = width;
        preview.height = height;
        const ctx = preview.getContext("2d");
        if (!ctx) return;
        const background = backgroundImageRef.current;
        if (background) drawCover(ctx, background, 0, 0, width, height);
        else {
          const gradient = ctx.createLinearGradient(0, 0, width, height);
          gradient.addColorStop(0, "#3a204e");
          gradient.addColorStop(1, "#ff4b5c");
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, width, height);
        }
        const foreground = foregroundCanvasRef.current ?? document.createElement("canvas");
        foregroundCanvasRef.current = foreground;
        foreground.width = width;
        foreground.height = height;
        const foregroundCtx = foreground.getContext("2d");
        if (!foregroundCtx) return;
        drawMirrored(foregroundCtx, video, width, height, facing === "user");
        const mask = maskCanvasRef.current ?? document.createElement("canvas");
        maskCanvasRef.current = mask;
        mask.width = personMask.width;
        mask.height = personMask.height;
        const maskCtx = mask.getContext("2d");
        if (!maskCtx) return;
        const alpha = personMask.getAsFloat32Array();
        const pixels = maskCtx.createImageData(mask.width, mask.height);
        for (let index = 0; index < alpha.length; index += 1) pixels.data[index * 4 + 3] = Math.round(alpha[index] * 255);
        maskCtx.putImageData(pixels, 0, 0);
        foregroundCtx.globalCompositeOperation = "destination-in";
        foregroundCtx.drawImage(mask, 0, 0, width, height);
        foregroundCtx.globalCompositeOperation = "source-over";
        ctx.drawImage(foreground, 0, 0);
        livePreviewReadyRef.current = true;
        setPreviewReady(true);
        setPreviewStatus("");
      });
      if (!cancelled) animationFrame = requestAnimationFrame(renderNext);
    };
    async function start() {
      try {
        const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm");
        segmenter = await ImageSegmenter.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter_landscape/float16/latest/selfie_segmenter_landscape.tflite",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          outputConfidenceMasks: true,
        });
        if (!cancelled) renderNext();
      } catch {
        if (!cancelled) setPreviewStatus("Live camera effects could not load — your original camera is still ready.");
      }
    }
    start();
    return () => {
      cancelled = true;
      if (animationFrame) cancelAnimationFrame(animationFrame);
      segmenter?.close();
    };
  }, [liveBackground, mode, localReady, facing, backgroundSrc]);

  useEffect(() => {
    onReadyChange?.(mode === "solo" ? localReady && !cameraError : localReady && remoteReady && !cameraError);
  }, [remoteReady, localReady, cameraError, mode, onReadyChange]);

  useImperativeHandle(ref, () => ({
    capture: () => {
      if (mode === "solo" && liveBackground && livePreviewReadyRef.current && previewCanvasRef.current) return previewCanvasRef.current.toDataURL("image/png");
      const canvas = captureCanvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return null;
      if (mode === "solo") {
        const video = localVideoRef.current;
        if (!video?.videoWidth) return null;
        const { w, h } = fitDims(video.videoWidth, video.videoHeight);
        canvas.width = w;
        canvas.height = h;
        drawMirrored(ctx, video, w, h, facing === "user");
      } else {
        const first = role === "host" ? localVideoRef.current : remoteVideoRef.current;
        const second = role === "host" ? remoteVideoRef.current : localVideoRef.current;
        if (!first?.videoWidth || !second?.videoWidth) return null;
        canvas.width = MAX_EDGE;
        canvas.height = Math.round(MAX_EDGE * 0.75);
        drawMirrored(ctx, first, canvas.width / 2, canvas.height, true, 0);
        drawMirrored(ctx, second, canvas.width / 2, canvas.height, true, canvas.width / 2);
      }
      return canvas.toDataURL("image/png");
    },
    hasLiveBackground: () => mode === "solo" && liveBackground && livePreviewReadyRef.current,
  }));

  return (
    <div className="relative w-full overflow-hidden rounded-[28px] bg-black" style={{ aspectRatio: mode === "shared" ? "4/3" : "3/4" }}>
      {mode === "solo" ? <>
        <video ref={localVideoRef} autoPlay muted playsInline onLoadedMetadata={() => setLocalReady(true)} className={`h-full w-full object-cover ${previewReady ? "opacity-0" : "opacity-100"}`} style={{ transform: facing === "user" ? "scaleX(-1)" : "none" }} />
        <canvas ref={previewCanvasRef} className={`absolute inset-0 h-full w-full object-cover ${previewReady ? "opacity-100" : "opacity-0"}`} />
        {liveBackground && !previewReady && !cameraError && <div className="absolute inset-x-0 bottom-0 bg-black/55 px-4 py-3 text-center font-mono text-[11px] text-[var(--color-flash-dim)]">{previewStatus || "Preparing live cutout…"}</div>}
      </> : <div className="flex h-full w-full">
        <video ref={role === "host" ? localVideoRef : remoteVideoRef} autoPlay muted={role === "host"} playsInline onLoadedMetadata={() => role === "host" && setLocalReady(true)} className="h-full w-1/2 object-cover" style={{ transform: "scaleX(-1)" }} />
        <video ref={role === "host" ? remoteVideoRef : localVideoRef} autoPlay muted={role === "guest"} playsInline onLoadedMetadata={() => role === "guest" && setLocalReady(true)} className="h-full w-1/2 border-l border-[var(--color-line)] object-cover" style={{ transform: "scaleX(-1)" }} />
      </div>}
      {flashKey ? <div key={flashKey} className="flash-pop pointer-events-none absolute inset-0 bg-[var(--color-flash)]" /> : null}
      {mode === "shared" && !remoteReady && <div className="absolute inset-0 flex items-center justify-center bg-black/60 px-6 text-center font-mono text-sm text-[var(--color-flash-dim)]">{connectionStatus || "Connecting…"}</div>}
      {cameraError && <div className="absolute inset-0 flex items-center justify-center bg-black/80 px-6 text-center text-sm text-[var(--color-flash-dim)]">{cameraError}</div>}
      <button type="button" onClick={() => setFacing((value) => (value === "user" ? "environment" : "user"))} aria-label="Flip camera" className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-lg text-[var(--color-flash)] backdrop-blur">⟳</button>
      <canvas ref={captureCanvasRef} className="hidden" />
    </div>
  );
});

function fitDims(width: number, height: number) {
  const scale = MAX_EDGE / Math.max(width, height);
  return scale >= 1 ? { w: width, h: height } : { w: Math.round(width * scale), h: Math.round(height * scale) };
}

function drawMirrored(ctx: CanvasRenderingContext2D, video: HTMLVideoElement, width: number, height: number, mirror: boolean, offsetX = 0) {
  ctx.save();
  ctx.translate(offsetX, 0);
  if (mirror) { ctx.translate(width, 0); ctx.scale(-1, 1); }
  drawCover(ctx, video, 0, 0, width, height);
  ctx.restore();
}

function drawCover(ctx: CanvasRenderingContext2D, image: HTMLImageElement | HTMLVideoElement, dx: number, dy: number, dw: number, dh: number) {
  const width = image instanceof HTMLVideoElement ? image.videoWidth : image.width;
  const height = image instanceof HTMLVideoElement ? image.videoHeight : image.height;
  const sourceRatio = width / height;
  const targetRatio = dw / dh;
  let sx = 0; let sy = 0; let sw = width; let sh = height;
  if (sourceRatio > targetRatio) { sw = height * targetRatio; sx = (width - sw) / 2; } else { sh = width / targetRatio; sy = (height - sh) / 2; }
  ctx.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
}
