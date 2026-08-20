"use client";

import { use, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CameraView, CameraViewHandle } from "@/components/CameraView";
import { CountdownTimer } from "@/components/CountdownTimer";
import { StickerEditor } from "@/components/StickerEditor";
import { PhotoStripPreview } from "@/components/PhotoStripPreview";
import { POSE_GUIDES } from "@/lib/booth-content";
import { removeImageBackground } from "@/lib/bgRemoval";
import { CapturedFrame } from "@/lib/types";
import { PeerRole } from "@/lib/peer";

const TOTAL_SHOTS = 3;
const FINAL_NOTE_PATH = "/sixmonths2026/index.html#final-note";

type Stage = "setup" | "shooting" | "processing" | "sticker" | "strip";

export default function BoothPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params);
  const search = useSearchParams();
  const router = useRouter();
  const mode = (search.get("mode") === "shared" ? "shared" : "solo") as "solo" | "shared";
  const role = (search.get("role") as PeerRole) ?? "host";
  const finalNoteUrl = process.env.NEXT_PUBLIC_SIXMONTHS_RETURN_URL || FINAL_NOTE_PATH;

  const [stage, setStage] = useState<Stage>("setup");
  const [poseId, setPoseId] = useState(POSE_GUIDES[0].id);
  const [removeBg, setRemoveBg] = useState(true);
  const [cameraReady, setCameraReady] = useState(false);
  const [countingDown, setCountingDown] = useState(false);
  const [flashKey, setFlashKey] = useState(0);
  const [frames, setFrames] = useState<CapturedFrame[]>([]);
  const [processingLabel, setProcessingLabel] = useState("");
  const [bgFailed, setBgFailed] = useState(false);

  const cameraRef = useRef<CameraViewHandle>(null);
  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/booth/${roomId}?mode=shared&role=guest` : "";

  async function handleCapture() {
    const dataUrl = cameraRef.current?.capture();
    if (!dataUrl) return;
    setFlashKey((k) => k + 1);

    let finalUrl = dataUrl;
    let didRemoveBackground = false;
    if (removeBg) {
      setStage("processing");
      setProcessingLabel("Removing background…");
      setBgFailed(false);
      try {
        finalUrl = await removeImageBackground(dataUrl, (p) => {
          if (p.total) setProcessingLabel(`Removing background… ${Math.round((p.current / p.total) * 100)}%`);
        });
        didRemoveBackground = true;
      } catch {
        setBgFailed(true);
        finalUrl = dataUrl;
      }
    }

    const frame: CapturedFrame = {
      id: `${Date.now()}`,
      dataUrl: finalUrl,
      originalDataUrl: dataUrl,
      bgRemoved: didRemoveBackground,
      stickers: [],
    };
    setFrames((prev) => [...prev, frame]);
    setStage("sticker");
  }

  function onStickersDone(frameIndex: number, stickers: CapturedFrame["stickers"], flattened: string) {
    setFrames((prev) => prev.map((f, i) => (i === frameIndex ? { ...f, stickers, dataUrl: flattened } : f)));
    advanceAfterSticker();
  }

  function onStickersSkip() {
    advanceAfterSticker();
  }

  function advanceAfterSticker() {
    if (frames.length >= TOTAL_SHOTS) {
      setStage("strip");
    } else {
      setStage("shooting");
    }
  }

  function retake() {
    setFrames((prev) => prev.slice(0, -1));
    setStage("shooting");
  }

  const currentFrameIndex = frames.length - 1;
  const currentFrame = frames[currentFrameIndex];

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-10 pt-8">
      <header className="mb-4 flex items-center justify-between">
        <button onClick={() => router.push("/")} className="font-mono text-xs text-[var(--color-flash-dim)]/60">
          ← exit
        </button>
        <span className="font-mono text-xs tracking-[0.2em] text-[var(--color-lavender)]">
          {mode === "shared" ? `ROOM ${roomId.toUpperCase()}` : "SOLO"}
        </span>
      </header>

      {stage === "setup" && (
        <SetupScreen
          mode={mode}
          role={role}
          shareUrl={shareUrl}
          poseId={poseId}
          poseGuideSrc={POSE_GUIDES.find((p) => p.id === poseId)?.imageSrc}
          setPoseId={setPoseId}
          removeBg={removeBg}
          setRemoveBg={setRemoveBg}
          cameraReady={cameraReady}
          onStart={() => setStage("shooting")}
          cameraRef={cameraRef}
          setCameraReady={setCameraReady}
          roomId={roomId}
        />
      )}

      {stage === "shooting" && (
        <div className="flex flex-col items-center gap-5">
          <p className="font-mono text-xs text-[var(--color-flash-dim)]/70">
            shot {frames.length + 1} of {TOTAL_SHOTS} · {POSE_GUIDES.find((p) => p.id === poseId)?.name}
          </p>
          <div className="relative w-full">
            <CameraView
              ref={cameraRef}
              mode={mode}
              roomId={roomId}
              role={role}
              poseId={poseId}
              poseGuideSrc={POSE_GUIDES.find((p) => p.id === poseId)?.imageSrc}
              showPoseGuide
              onReadyChange={setCameraReady}
              flashKey={flashKey}
            />
            {countingDown && <CountdownTimer onDone={() => { setCountingDown(false); handleCapture(); }} />}
          </div>
          <button
            type="button"
            disabled={!cameraReady || countingDown}
            onClick={() => setCountingDown(true)}
            className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-[var(--color-flash)] bg-[var(--color-shutter)] active:scale-95 disabled:opacity-40"
            aria-label="Start countdown and shoot"
          />
        </div>
      )}

      {stage === "processing" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--color-flash-dim)] border-t-[var(--color-shutter)]" />
          <p className="font-mono text-sm text-[var(--color-flash-dim)]">{processingLabel}</p>
          <p className="max-w-xs text-center text-xs text-[var(--color-flash-dim)]/60">
            First time is slower — the model downloads once and is cached after that.
          </p>
        </div>
      )}

      {stage === "sticker" && currentFrame && (
        <div className="flex flex-col items-center gap-4">
          {bgFailed && (
            <p className="max-w-sm text-center text-xs text-[var(--color-gold)]">
              Background removal didn&apos;t work on this device — kept the original shot instead.
            </p>
          )}
          <StickerEditor
            photoUrl={currentFrame.dataUrl}
            initialStickers={currentFrame.stickers}
            onDone={(stickers, flattened) => onStickersDone(currentFrameIndex, stickers, flattened)}
            onSkip={onStickersSkip}
          />
          <button type="button" onClick={retake} className="font-mono text-xs text-[var(--color-flash-dim)]/60 underline">
            retake this shot
          </button>
        </div>
      )}

      {stage === "strip" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-6">
          <h2 className="font-display text-2xl font-bold italic text-[var(--color-flash)]">That&apos;s the strip.</h2>
          <PhotoStripPreview frames={frames} roomLabel={mode === "shared" ? `room ${roomId}` : "two-up booth"} />
          <a
            href={finalNoteUrl}
            className="font-mono text-xs text-[var(--color-gold)] underline underline-offset-4"
          >
            return to our story
          </a>
          <button
            type="button"
            onClick={() => {
              setFrames([]);
              setStage("shooting");
            }}
            className="font-mono text-xs text-[var(--color-flash-dim)]/70 underline"
          >
            shoot another strip
          </button>
        </div>
      )}
    </main>
  );
}

function SetupScreen({
  mode,
  role,
  shareUrl,
  poseId,
  poseGuideSrc,
  setPoseId,
  removeBg,
  setRemoveBg,
  cameraReady,
  onStart,
  cameraRef,
  setCameraReady,
  roomId,
}: {
  mode: "solo" | "shared";
  role: PeerRole;
  shareUrl: string;
  poseId: string;
  poseGuideSrc?: string;
  setPoseId: (id: string) => void;
  removeBg: boolean;
  setRemoveBg: (v: boolean) => void;
  cameraReady: boolean;
  onStart: () => void;
  cameraRef: React.RefObject<CameraViewHandle | null>;
  setCameraReady: (v: boolean) => void;
  roomId: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex flex-col gap-5">
      {mode === "shared" && role === "host" && (
        <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-ink-soft)] p-4">
          <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--color-lavender)]">send this to them</p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 truncate font-mono text-xs text-[var(--color-flash)]">{shareUrl || `…/booth/${roomId}`}</code>
            <button
              type="button"
              onClick={async () => {
                if (shareUrl) {
                  await navigator.clipboard.writeText(shareUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }
              }}
              className="h-9 shrink-0 rounded-lg bg-[var(--color-gold)] px-3 text-xs font-semibold text-[var(--color-ink)]"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      )}

      <div className="relative w-full">
        <CameraView
          ref={cameraRef}
          mode={mode}
          roomId={roomId}
          role={role}
          poseId={poseId}
          poseGuideSrc={poseGuideSrc}
          showPoseGuide
          onReadyChange={setCameraReady}
        />
      </div>

      <div>
        <p className="mb-2 font-mono text-[11px] uppercase tracking-widest text-[var(--color-flash-dim)]/70">pose guide</p>
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
          {POSE_GUIDES.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPoseId(p.id)}
              className={`shrink-0 rounded-full border px-4 py-2.5 text-sm ${
                poseId === p.id
                  ? "border-[var(--color-shutter)] bg-[var(--color-shutter)] text-[var(--color-flash)]"
                  : "border-[var(--color-line)] text-[var(--color-flash-dim)]"
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <label className="flex items-center justify-between rounded-2xl border border-[var(--color-line)] px-4 py-3.5">
        <span>
          <span className="block text-sm font-medium">Remove background</span>
          <span className="block font-mono text-[11px] text-[var(--color-flash-dim)]/60">runs on-device, first shot is slower</span>
        </span>
        <input
          type="checkbox"
          checked={removeBg}
          onChange={(e) => setRemoveBg(e.target.checked)}
          className="h-6 w-6 accent-[var(--color-shutter)]"
        />
      </label>

      <button
        type="button"
        disabled={!cameraReady}
        onClick={onStart}
        className="h-14 w-full rounded-full bg-[var(--color-shutter)] font-display text-lg font-bold italic text-[var(--color-flash)] active:scale-[0.98] disabled:opacity-40"
      >
        {cameraReady ? "Let&apos;s shoot" : mode === "shared" ? "Waiting for camera / partner…" : "Waiting for camera…"}
      </button>
    </div>
  );
}
