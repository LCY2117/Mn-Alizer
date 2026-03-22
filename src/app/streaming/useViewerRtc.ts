import { useEffect, useMemo, useRef, useState } from "react";
import { buildSignalWsUrl } from "./api";
import { getIceServers } from "./iceServers";
import type { SignalMessage, StreamSessionStatus, StreamStats, VideoSession } from "./types";

const ICE_SERVERS = getIceServers();

const EMPTY_STATS: StreamStats = {
  fps: null,
  bitrateKbps: null,
  width: null,
  height: null,
  packetsLost: null,
  rttMs: null,
};

export function useViewerRtc(session: VideoSession | null) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const statsTimerRef = useRef<number | null>(null);
  const byteStateRef = useRef<{ bytes: number; timestamp: number } | null>(null);
  const [phase, setPhase] = useState<StreamSessionStatus>(session?.status ?? "idle");
  const [stats, setStats] = useState<StreamStats>(EMPTY_STATS);
  const [error, setError] = useState<string | null>(null);

  const sessionMeta = useMemo(
    () => ({
      id: session?.sessionId ?? null,
      token: session?.viewerToken ?? null,
    }),
    [session?.sessionId, session?.viewerToken],
  );

  useEffect(() => {
    setPhase(session?.status ?? "idle");
  }, [session?.status]);

  useEffect(() => {
    if (!sessionMeta.id || !sessionMeta.token) {
      setPhase("idle");
      return;
    }

    let cancelled = false;

    const cleanup = () => {
      if (statsTimerRef.current) {
        window.clearInterval(statsTimerRef.current);
        statsTimerRef.current = null;
      }
      byteStateRef.current = null;
      wsRef.current?.close();
      wsRef.current = null;
      pcRef.current?.getSenders().forEach((sender) => sender.track?.stop());
      pcRef.current?.close();
      pcRef.current = null;
    };

    const ensurePeer = () => {
      if (pcRef.current) return pcRef.current;
      const peer = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      peer.onicecandidate = (event) => {
        if (event.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
          const message: SignalMessage = {
            type: "ice-candidate",
            candidate: event.candidate.toJSON(),
          };
          wsRef.current.send(JSON.stringify(message));
        }
      };
      peer.ontrack = (event) => {
        if (cancelled || !videoRef.current) return;
        const [stream] = event.streams;
        if (stream) {
          videoRef.current.srcObject = stream;
        }
      };
      peer.onconnectionstatechange = () => {
        if (!pcRef.current) return;
        const state = pcRef.current.connectionState;
        if (state === "connected") {
          setPhase("live");
          setError(null);
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: "status", status: "live" }));
          }
        } else if (state === "disconnected" || state === "failed") {
          setPhase("reconnecting");
        } else if (state === "closed") {
          setPhase("ended");
        }
      };
      pcRef.current = peer;
      return peer;
    };

    const startStats = () => {
      if (statsTimerRef.current || !pcRef.current) return;
      statsTimerRef.current = window.setInterval(async () => {
        const peer = pcRef.current;
        if (!peer) return;
        try {
          const report = await peer.getStats();
          let fps: number | null = null;
          let packetsLost: number | null = null;
          let rttMs: number | null = null;
          let width: number | null = null;
          let height: number | null = null;
          let bitrateKbps: number | null = null;

          report.forEach((item) => {
            if (item.type === "inbound-rtp" && item.kind === "video") {
              packetsLost = typeof item.packetsLost === "number" ? item.packetsLost : null;
              if (typeof item.framesPerSecond === "number") {
                fps = Math.round(item.framesPerSecond);
              }
              if (typeof item.bytesReceived === "number") {
                const last = byteStateRef.current;
                if (last) {
                  const deltaBytes = item.bytesReceived - last.bytes;
                  const deltaMs = item.timestamp - last.timestamp;
                  if (deltaMs > 0) {
                    bitrateKbps = Math.round((deltaBytes * 8) / deltaMs);
                  }
                }
                byteStateRef.current = {
                  bytes: item.bytesReceived,
                  timestamp: item.timestamp,
                };
              }
            }
            if (item.type === "track" && item.kind === "video") {
              width = typeof item.frameWidth === "number" ? item.frameWidth : width;
              height = typeof item.frameHeight === "number" ? item.frameHeight : height;
              fps = typeof item.framesPerSecond === "number" ? Math.round(item.framesPerSecond) : fps;
            }
            if (item.type === "candidate-pair" && item.state === "succeeded") {
              rttMs =
                typeof item.currentRoundTripTime === "number"
                  ? Math.round(item.currentRoundTripTime * 1000)
                  : rttMs;
            }
          });

          setStats({
            fps,
            bitrateKbps,
            width,
            height,
            packetsLost,
            rttMs,
          });
        } catch {
          // Keep the last stats.
        }
      }, 1200);
    };

    const ws = new WebSocket(buildSignalWsUrl(sessionMeta.id, "viewer", sessionMeta.token));
    wsRef.current = ws;
    setError(null);
    setPhase(session?.status === "ended" ? "ended" : "waiting");

    ws.onopen = () => {
      ensurePeer();
      startStats();
    };

    ws.onmessage = async (event) => {
      const message = JSON.parse(event.data) as SignalMessage;
      if (message.type === "status" && message.session) {
        setPhase(message.session.status);
        return;
      }

      const peer = ensurePeer();
      if (message.type === "offer") {
        setPhase("connecting");
        await peer.setRemoteDescription(new RTCSessionDescription(message.sdp));
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        ws.send(JSON.stringify({ type: "answer", sdp: answer }));
        return;
      }

      if (message.type === "ice-candidate" && message.candidate) {
        try {
          await peer.addIceCandidate(new RTCIceCandidate(message.candidate));
        } catch {
          // Ignore out-of-order candidates during reconnect.
        }
      }
    };

    ws.onerror = () => {
      setPhase("error");
      setError("信令链路异常");
    };

    ws.onclose = () => {
      setPhase((current) => (current === "live" ? "reconnecting" : current === "ended" ? "ended" : "waiting"));
    };

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [sessionMeta.id, sessionMeta.token]);

  return {
    videoRef,
    phase,
    stats,
    error,
  };
}
