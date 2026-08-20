"use client";

import Image from "next/image";
import { PoseGuide } from "@/lib/types";

/** Top-of-camera pose reference. Add imageSrc when the event meme is selected. */
export function PoseGuideCard({ pose }: { pose: PoseGuide }) {
  return (
    <section className="flex min-h-24 items-center gap-3 rounded-2xl border border-[var(--color-line)] bg-[var(--color-ink-soft)] p-3">
      {pose.imageSrc ? (
        <Image src={pose.imageSrc} alt={`${pose.name} pose reference`} width={92} height={72} className="h-[72px] w-[92px] rounded-xl object-cover" />
      ) : (
        <div className="flex h-[72px] w-[92px] shrink-0 items-center justify-center rounded-xl bg-black/20 px-2 text-center font-mono text-[10px] uppercase tracking-wide text-[var(--color-lavender)]">
          meme guide pending
        </div>
      )}
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-lavender)]">pose for this shot</p>
        <h2 className="mt-1 font-display text-lg font-bold italic text-[var(--color-flash)]">{pose.name}</h2>
        <p className="mt-1 text-xs leading-snug text-[var(--color-flash-dim)]/70">{pose.description}</p>
      </div>
    </section>
  );
}
