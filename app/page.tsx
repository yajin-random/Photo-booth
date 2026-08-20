"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { randomRoomId } from "@/lib/peer";

export default function Home() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");

  function startShared() {
    const id = randomRoomId();
    router.push(`/booth/${id}?mode=shared&role=host`);
  }

  function joinShared(e: React.FormEvent) {
    e.preventDefault();
    const code = joinCode.trim().toLowerCase();
    if (code.length >= 4) router.push(`/booth/${code}?mode=shared&role=guest`);
  }

  function startSolo() {
    router.push(`/booth/${randomRoomId(4)}?mode=solo`);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-between px-6 pb-10 pt-14">
      <div>
        <div className="mb-10 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-[var(--color-lavender)]">
          <span className="h-2 w-2 rounded-full bg-[var(--color-shutter)]" />
          private link · no account
        </div>

        <h1 className="font-display text-[3.4rem] font-black italic leading-[0.92] text-[var(--color-flash)]">
          Two-up
          <br />
          <span className="not-italic text-[var(--color-shutter)]">booth.</span>
        </h1>

        <p className="mt-5 max-w-xs text-[15px] leading-relaxed text-[var(--color-flash-dim)]">
          Pose together, snap it, peel the background out, sticker it up. The strip drops the second you shoot it —
          nothing leaves your phone.
        </p>
      </div>

      <div className="mt-10 flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={startShared}
            className="group flex h-16 items-center justify-between rounded-2xl bg-[var(--color-flash)] px-6 text-left text-[var(--color-ink)] active:scale-[0.98]"
          >
            <span>
              <span className="block font-display text-xl font-bold italic">Start shared booth</span>
              <span className="block font-mono text-[11px] text-[var(--color-ink)]/60">for two — send the link</span>
            </span>
            <span className="font-display text-2xl">→</span>
          </button>

          <button
            type="button"
            onClick={startSolo}
            className="flex h-16 items-center justify-between rounded-2xl border border-[var(--color-line)] px-6 text-left text-[var(--color-flash)] active:scale-[0.98]"
          >
            <span>
              <span className="block font-display text-xl font-bold italic">Start solo booth</span>
              <span className="block font-mono text-[11px] text-[var(--color-flash-dim)]/60">just this device</span>
            </span>
            <span className="font-display text-2xl">→</span>
          </button>
        </div>

        <form onSubmit={joinShared} className="flex flex-col gap-2">
          <label htmlFor="join" className="font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--color-flash-dim)]/70">
            Got a room code from your partner?
          </label>
          <div className="flex gap-2">
            <input
              id="join"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="ab12cd"
              maxLength={8}
              className="h-12 flex-1 rounded-xl border border-[var(--color-line)] bg-transparent px-4 font-mono text-sm tracking-wider text-[var(--color-flash)] placeholder:text-[var(--color-flash-dim)]/40 focus:border-[var(--color-shutter)] focus:outline-none"
            />
            <button
              type="submit"
              className="h-12 rounded-xl bg-[var(--color-gold)] px-5 font-semibold text-[var(--color-ink)] active:scale-95"
            >
              Join
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
