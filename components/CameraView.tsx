"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type Peer from "peerjs";
import { answerCalls, callPeer, createPeer, peerIdFor, PeerRole } from "@/lib/peer";
import { PoseGuideOverlay } from "./PoseGuideOverlay";

export type CameraViewHandle = {
  /** Draws the current frame(s) to a hidden canvas and returns a PNG data URL, capped at 1080px on the long edge. */
  capture: () => string | null;
};

type Props = {
  mode: "solo" | "shared";
  roomId?: string;
  role?: PeerRole;
  poseId: string | null;
  poseGuideSrc?: string;
  showPoseGuide: boolean;
  /** Called once the local camera (and, for shared mode, the remote peer) is ready to shoot. */
  onReadyChange?: (ready: boolean) => void;
  flashKey?: number;
};

const MAX_EDGE = 1080;

export const CameraView = forwardRef<CameraViewHandle, Props>(function CameraView(
  { mode, roomId, role, poseId, poseGuideSrc, showPoseGuide, onReadyChange, flashKey },
  ref
) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const peerRef = useRef<Peer | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [localReady, setLocalReady] = useState(false);
  const [remoteReady, setRemoteReady] = useState(mode === "solo");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>("");

  // --- local camera ---
  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | null = null;

    async function start() {
      setCameraError(null);
      setLocalReady(false);
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing, width: { ideal: MAX_EDGE }, height: { ideal: MAX_EDGE } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      } catch {
        setCameraError("Couldn't access the camera. Check your browser's camera permission for this site.");
      }
    }
    start();

    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
      if (localStreamRef.current === stream) localStreamRef.current = null;
    };
  }, [facing]);

  // --- shared-mode peer connection ---
  useEffect(() => {
    if (mode !== "shared" || !roomId || !role) return;
    let cancelled = false;

    async function connect() {
      setRemoteReady(false);
      // wait for local stream
      let tries = 0;
      while (!localStreamRef.current && tries < 100 && !cancelled) {
        await new Promise((r) => setTimeout(r, 100));
        tries++;
      }
      const stream = localStreamRef.current;
      if (!stream || cancelled) return;

      setConnectionStatus(role === "host" ? "Waiting for your partner to join…" : "Connecting to your partner…");

      try {
        const peer = await createPeer(peerIdFor(roomId!, role!));
        if (cancelled) return;
        peerRef.current = peer;

        const onRemoteStream = (remoteStream: MediaStream) => {
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
          setRemoteReady(true);
          setConnectionStatus("Connected");
        };

        answerCalls(peer, stream, onRemoteStream);

        if (role === "guest") {
          const otherId = peerIdFor(roomId!, "host");
          callPeer(peer, otherId, stream, onRemoteStream);
        }
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

  useEffect(() => {
    onReadyChange?.(mode === "solo" ? localReady && !cameraError : localReady && remoteReady && !cameraError);
  }, [remoteReady, localReady, cameraError, mode, onReadyChange]);

  useImperativeHandle(ref, () => ({
    capture: () => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      if (mode === "solo") {
        const v = localVideoRef.current;
        if (!v || !v.videoWidth) return null;
        const { w, h } = fitDims(v.videoWidth, v.videoHeight);
        canvas.width = w;
        canvas.height = h;
        drawMirrored(ctx, v, w, h, facing === "user");
      } else {
        const a = role === "host" ? localVideoRef.current : remoteVideoRef.current;
        const b = role === "host" ? remoteVideoRef.current : localVideoRef.current;
        if (!a || !b || !a.videoWidth || !b.videoWidth) return null;
        const w = MAX_EDGE;
        const h = Math.round(MAX_EDGE * 0.75);
        canvas.width = w;
        canvas.height = h;
        // stacked split-frame: left = person A (host), right = person B (guest)
        drawMirrored(ctx, a, w / 2, h, true, 0);
        drawMirrored(ctx, b, w / 2, h, true, w / 2);
      }

      return canvas.toDataURL("image/png");
    },
  }));

  return (
    <div className="relative w-full overflow-hidden rounded-[28px] bg-black" style={{ aspectRatio: mode === "shared" ? "4/3" : "3/4" }}>
      {mode === "solo" ? (
          <video ref={localVideoRef} autoPlay muted playsInline onLoadedMetadata={() => setLocalReady(true)} className="h-full w-full object-cover" style={{ transform: facing === "user" ? "scaleX(-1)" : "none" }} />
      ) : (
        <div className="flex h-full w-full flex-row">
          <video ref={role === "host" ? localVideoRef : remoteVideoRef} autoPlay muted={role === "host"} playsInline onLoadedMetadata={() => role === "host" && setLocalReady(true)} className="h-full w-1/2 object-cover" style={{ transform: "scaleX(-1)" }} />
          <video ref={role === "host" ? remoteVideoRef : localVideoRef} autoPlay muted={role === "guest"} playsInline onLoadedMetadata={() => role === "guest" && setLocalReady(true)} className="h-full w-1/2 object-cover border-l border-[var(--color-line)]" style={{ transform: "scaleX(-1)" }} />
        </div>
      )}

      {showPoseGuide && poseId && (
        <PoseGuideOverlay imageSrc={poseGuideSrc} className="pointer-events-none absolute inset-0 h-full w-full opacity-50" />
      )}

      {flashKey ? <div key={flashKey} className="flash-pop pointer-events-none absolute inset-0 bg-[var(--color-flash)]" /> : null}

      {mode === "shared" && !remoteReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 px-6 text-center font-mono text-sm text-[var(--color-flash-dim)]">
          {connectionStatus || "Connecting…"}
        </div>
      )}

      {cameraError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 px-6 text-center text-sm text-[var(--color-flash-dim)]">
          {cameraError}
        </div>
      )}

      <button
        type="button"
        onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
        aria-label="Flip camera"
        className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-lg text-[var(--color-flash)] backdrop-blur"
      >
        ⟳
      </button>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
});

function fitDims(vw: number, vh: number) {
  const scale = MAX_EDGE / Math.max(vw, vh);
  if (scale >= 1) return { w: vw, h: vh };
  return { w: Math.round(vw * scale), h: Math.round(vh * scale) };
}

function drawMirrored(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  w: number,
  h: number,
  mirror: boolean,
  offsetX = 0
) {
  ctx.save();
  ctx.translate(offsetX, 0);
  if (mirror) {
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
  }
  // cover-fit the video into w x h
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const targetRatio = w / h;
  const srcRatio = vw / vh;
  let sx = 0,
    sy = 0,
    sw = vw,
    sh = vh;
  if (srcRatio > targetRatio) {
    sw = vh * targetRatio;
    sx = (vw - sw) / 2;
  } else {
    sh = vw / targetRatio;
    sy = (vh - sh) / 2;
  }
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, w, h);
  ctx.restore();
}
