"use client";

import Image from "next/image";

/** Pose references are image-based so each guide can be replaced by an event meme. */
export function PoseGuideOverlay({ imageSrc, className }: { imageSrc?: string; className?: string }) {
  if (!imageSrc) return null;

  return <Image src={imageSrc} alt="" aria-hidden="true" fill sizes="100vw" className={`${className ?? ""} object-contain`} />;
}
