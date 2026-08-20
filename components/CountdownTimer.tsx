"use client";

import { useEffect, useState } from "react";

export function CountdownTimer({ seconds = 3, onDone }: { seconds?: number; onDone: () => void }) {
  const [n, setN] = useState(seconds);

  useEffect(() => {
    if (n <= 0) {
      onDone();
      return;
    }
    const t = setTimeout(() => setN((v) => v - 1), 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n]);

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
      <span key={n} className="countdown-pulse font-display text-[8rem] font-black text-[var(--color-flash)] drop-shadow-[0_4px_24px_rgba(0,0,0,0.55)]">
        {n}
      </span>
    </div>
  );
}
