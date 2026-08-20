# Two-Up Booth

A mobile-first, in-browser photo booth for two. Pose together (with a top-mounted guide), preview
an on-device background cutout against a random stock background, shoot a 3-2-1 countdown, decorate
with stickers, and get an instant
downloadable photo strip — all client-side, no backend, no account.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Camera access works on `localhost` without HTTPS, but testing the
**shared booth** between two separate devices on your home network will not work over plain HTTP —
see below.

## Deploy to Vercel

```bash
git init && git add -A && git commit -m "init"
```

Push to a GitHub repo (private is fine), then on [vercel.com](https://vercel.com) choose
**New Project → Import** and pick the repo. No configuration needed — it's a static/serverless
Next.js app. Vercel gives you HTTPS by default, which `getUserMedia` requires on real devices.

## How the shared (two-person) booth works

There's no backend: `/booth/[roomId]` derives two fixed PeerJS ids from the room code
(`twoup-<roomId>-host` and `twoup-<roomId>-guest`) and the two browsers connect directly to each
other over WebRTC, using PeerJS's free public broker only to introduce them. Whoever taps
**Start shared booth** is the host; the link they copy/send opens the same room as the guest.
Both video feeds are drawn into one canvas (split-frame) for the countdown and capture.

Test this locally with **two HTTPS tunnels or a deployed Vercel preview** — plain `http://` on your
LAN won't satisfy `getUserMedia` on a second device.

## What's stubbed vs. real

- **Pose guides** are intentionally awaiting your meme images. Add a local public asset (for example,
  `/pose-guides/back-to-back.webp`) to the matching entry in `lib/booth-content.ts`; it will appear
  above the camera. No stand-in art is shown until then.
- **Stickers** are emoji glyphs (`lib/booth-content.ts`) rendered directly on the canvas via
  `react-konva`, so there's nothing to source or license — add more by adding entries to
  `STICKERS`.
- **Live background replacement** uses `@imgly/background-removal` (in-browser WASM/ONNX, no API key).
  It processes low-resolution frames sequentially before capture, so speed depends on the device; the
  first run downloads a ~40-80MB model that the browser then caches. The solo booth includes a random
  stock-background picker; shared mode retains its direct peer-to-peer camera composition.

## Project structure

```
app/
  page.tsx                 landing page
  booth/[roomId]/page.tsx  booth flow (setup → shoot → sticker → strip)
  manifest.ts, icon.tsx    Add to Home Screen support
components/
  CameraView.tsx           getUserMedia + PeerJS compositing + capture()
  PoseGuideOverlay.tsx      optional meme-image pose overlay
  CountdownTimer.tsx
  StickerEditor.tsx / StickerCanvasInner.tsx   Konva-based sticker placement
  PhotoStripPreview.tsx     final strip composite + download
lib/
  peer.ts                   PeerJS helpers
  bgRemoval.ts               background-removal wrapper
  booth-content.ts           pose + sticker data
  types.ts
```

## Notes

- No `localStorage`/analytics/tracking — everything lives in React state for the session.
- The final strip screen returns to `/sixmonths2026/index.html#final-note`. If the booth is hosted on a
  different domain, set `NEXT_PUBLIC_SIXMONTHS_RETURN_URL` to
  `https://YOUR-DEPLOYED-SITE/sixmonths2026/index.html#final-note` in that deployment's environment
  variables.
- Built and type-checked against Next.js 16 / React 19; `npm run build` and `npx tsc --noEmit` both
  pass clean.
