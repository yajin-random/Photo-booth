"use client";

import { use, useRef, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { CameraView, CameraViewHandle } from "@/components/CameraView";
import { CountdownTimer } from "@/components/CountdownTimer";
import { StickerEditor } from "@/components/StickerEditor";
import { PhotoStripPreview } from "@/components/PhotoStripPreview";
import { PoseGuideCard } from "@/components/PoseGuideOverlay";
import { CAMERA_FILTERS, POSE_GUIDES, STOCK_BACKGROUNDS, STRIP_LAYOUTS, type CameraFilterId, type StripLayoutId } from "@/lib/booth-content";
import { CapturedFrame } from "@/lib/types";
import { PeerRole } from "@/lib/peer";

const FINAL_NOTE_PATH = "/sixmonths2026/index.html#final-note";

type Stage = "setup" | "shooting" | "sticker" | "strip";

export default function BoothPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params);
  const search = useSearchParams();
  const router = useRouter();
  const mode = (search.get("mode") === "shared" ? "shared" : "solo") as "solo" | "shared";
  const role = (search.get("role") as PeerRole) ?? "host";
  const finalNoteUrl = process.env.NEXT_PUBLIC_SIXMONTHS_RETURN_URL || FINAL_NOTE_PATH;

  const [stage, setStage] = useState<Stage>("setup");
  const [poseId, setPoseId] = useState(POSE_GUIDES[0].id);
  const [liveBackground, setLiveBackground] = useState(true);
  const [backgroundIndex, setBackgroundIndex] = useState(0);
  const [filterId, setFilterId] = useState<CameraFilterId>("none");
  const [stripLayoutId, setStripLayoutId] = useState<StripLayoutId>("3x1");
  const [cameraReady, setCameraReady] = useState(false);
  const [countingDown, setCountingDown] = useState(false);
  const [flashKey, setFlashKey] = useState(0);
  const [frames, setFrames] = useState<CapturedFrame[]>([]);

  const cameraRef = useRef<CameraViewHandle>(null);
  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/booth/${roomId}?mode=shared&role=guest` : "";
  const selectedPose = POSE_GUIDES.find((pose) => pose.id === poseId) ?? POSE_GUIDES[0];
  const selectedBackground = STOCK_BACKGROUNDS[backgroundIndex];
  const selectedFilter = CAMERA_FILTERS.find((filter) => filter.id === filterId) ?? CAMERA_FILTERS[0];
  const selectedLayout = STRIP_LAYOUTS.find((layout) => layout.id === stripLayoutId) ?? STRIP_LAYOUTS[0];

  async function handleCapture() {
    const dataUrl = cameraRef.current?.capture();
    if (!dataUrl) return;
    setFlashKey((k) => k + 1);

    const frame: CapturedFrame = {
      id: `${Date.now()}`,
      dataUrl,
      originalDataUrl: dataUrl,
      bgRemoved: cameraRef.current?.hasLiveBackground() ?? false,
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
    if (frames.length >= selectedLayout.shots) {
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
          setPoseId={setPoseId}
          liveBackground={liveBackground}
          setLiveBackground={setLiveBackground}
          selectedBackground={selectedBackground}
          setBackgroundIndex={setBackgroundIndex}
          filterId={filterId}
          setFilterId={setFilterId}
          stripLayoutId={stripLayoutId}
          setStripLayoutId={setStripLayoutId}
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
            shot {frames.length + 1} of {selectedLayout.shots} · {POSE_GUIDES.find((p) => p.id === poseId)?.name}
          </p>
          <PoseGuideCard pose={selectedPose} />
          <div className="relative w-full">
            <CameraView
              ref={cameraRef}
              mode={mode}
              roomId={roomId}
              role={role}
              liveBackground={liveBackground && mode === "solo"}
              backgroundSrc={selectedBackground.src}
              filterCss={selectedFilter.css}
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

      {stage === "sticker" && currentFrame && (
        <div className="flex flex-col items-center gap-4">
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
          <PhotoStripPreview frames={frames} roomLabel={mode === "shared" ? `room ${roomId}` : "two-up booth"} columns={selectedLayout.columns as 1 | 3} />
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
  setPoseId,
  liveBackground,
  setLiveBackground,
  selectedBackground,
  setBackgroundIndex,
  filterId,
  setFilterId,
  stripLayoutId,
  setStripLayoutId,
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
  setPoseId: (id: string) => void;
  liveBackground: boolean;
  setLiveBackground: (v: boolean) => void;
  selectedBackground: (typeof STOCK_BACKGROUNDS)[number];
  setBackgroundIndex: (index: number) => void;
  filterId: CameraFilterId;
  setFilterId: (id: CameraFilterId) => void;
  stripLayoutId: StripLayoutId;
  setStripLayoutId: (id: StripLayoutId) => void;
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

      <PoseGuideCard pose={POSE_GUIDES.find((pose) => pose.id === poseId) ?? POSE_GUIDES[0]} />

      <div className="relative w-full">
        <CameraView
          ref={cameraRef}
          mode={mode}
          roomId={roomId}
          role={role}
          liveBackground={liveBackground && mode === "solo"}
          backgroundSrc={selectedBackground.src}
          filterCss={(CAMERA_FILTERS.find((filter) => filter.id === filterId) ?? CAMERA_FILTERS[0]).css}
          onReadyChange={setCameraReady}
        />
      </div>

      <div className="rounded-2xl border border-[var(--color-line)] p-4">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-[var(--color-flash-dim)]/70">Choose background</p>
        <div className="grid grid-cols-2 gap-2">
          {STOCK_BACKGROUNDS.map((background, index) => (
            <button
              key={background.id}
              type="button"
              onClick={() => setBackgroundIndex(index)}
              className={`relative h-20 overflow-hidden rounded-xl border text-left ${selectedBackground.id === background.id ? "border-[var(--color-shutter)] ring-2 ring-[var(--color-shutter)]" : "border-[var(--color-line)]"}`}
            >
              <Image src={background.src} alt="" fill sizes="(max-width: 768px) 50vw, 180px" className="object-cover" />
              <span className="absolute inset-x-0 bottom-0 bg-black/55 px-2 py-1 text-xs font-semibold text-white">{background.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--color-line)] p-4">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-[var(--color-flash-dim)]/70">Camera filter</p>
        <div className="flex flex-wrap gap-2">
          {CAMERA_FILTERS.map((filter) => (
            <button key={filter.id} type="button" onClick={() => setFilterId(filter.id)} className={`rounded-full border px-3 py-2 text-xs font-semibold ${filterId === filter.id ? "border-[var(--color-gold)] bg-[var(--color-gold)] text-[var(--color-ink)]" : "border-[var(--color-line)] text-[var(--color-flash-dim)]"}`}>{filter.name}</button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--color-line)] p-4">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-[var(--color-flash-dim)]/70">Strip format</p>
        <div className="grid grid-cols-3 gap-2">
          {STRIP_LAYOUTS.map((layout) => (
            <button key={layout.id} type="button" onClick={() => setStripLayoutId(layout.id)} className={`rounded-xl border px-2 py-3 text-center ${stripLayoutId === layout.id ? "border-[var(--color-shutter)] bg-[var(--color-shutter)] text-[var(--color-flash)]" : "border-[var(--color-line)] text-[var(--color-flash-dim)]"}`}>
              <span className="block font-display text-base font-bold italic">{layout.id}</span>
              <span className="mt-1 block font-mono text-[10px]">{layout.detail}</span>
            </button>
          ))}
        </div>
      </div>

      <label className="flex items-center justify-between rounded-2xl border border-[var(--color-line)] px-4 py-3.5">
        <span>
          <span className="block text-sm font-medium">Live background replacement</span>
          <span className="block font-mono text-[11px] text-[var(--color-flash-dim)]/60">runs on-device before you take the photo</span>
        </span>
        <input
          type="checkbox"
          checked={liveBackground}
          disabled={mode === "shared"}
          onChange={(e) => setLiveBackground(e.target.checked)}
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
