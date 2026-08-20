export type RemovalProgress = { key: string; current: number; total: number };

/**
 * Runs client-side background removal on a captured frame.
 * The model (~40-80MB) downloads once and is cached by the browser afterwards.
 */
export async function removeImageBackground(
  source: Blob | string,
  onProgress?: (p: RemovalProgress) => void
): Promise<string> {
  const { removeBackground } = await import("@imgly/background-removal");

  const blob = await removeBackground(source, {
    progress: (key, current, total) => {
      onProgress?.({ key, current, total });
    },
  });

  return URL.createObjectURL(blob);
}

/** Returns the transparent foreground blob for the low-resolution live preview. */
export async function removeImageBackgroundBlob(source: Blob | string): Promise<Blob> {
  const { removeBackground } = await import("@imgly/background-removal");
  return removeBackground(source);
}
