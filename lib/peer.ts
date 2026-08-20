import type Peer from "peerjs";
import type { MediaConnection } from "peerjs";

export type PeerRole = "host" | "guest";

/**
 * Deterministic peer ids derived from the room code, so both devices can find
 * each other on PeerJS's free public signaling broker without a backend.
 * Host = whoever opens /booth/[roomId] first and taps "I'm hosting".
 * Guest = the second phone that opens the same link and taps "Join".
 */
export function peerIdFor(roomId: string, role: PeerRole) {
  return `twoup-${roomId}-${role}`;
}

export async function createPeer(id: string): Promise<Peer> {
  const { default: PeerCtor } = await import("peerjs");
  return new Promise((resolve, reject) => {
    const peer = new PeerCtor(id, {
      debug: 1,
    });
    peer.once("open", () => resolve(peer));
    peer.once("error", (err) => reject(err));
  });
}

export function callPeer(
  peer: Peer,
  remoteId: string,
  localStream: MediaStream,
  onRemoteStream: (stream: MediaStream) => void
): MediaConnection {
  const call = peer.call(remoteId, localStream);
  call.on("stream", onRemoteStream);
  return call;
}

export function answerCalls(peer: Peer, localStream: MediaStream, onRemoteStream: (stream: MediaStream) => void) {
  peer.on("call", (call) => {
    call.answer(localStream);
    call.on("stream", onRemoteStream);
  });
}

export function randomRoomId(length = 6) {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < length; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}
