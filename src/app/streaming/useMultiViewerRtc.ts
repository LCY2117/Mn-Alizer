import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
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

type ViewerSessionState = {
  phase: StreamSessionStatus;
  stats: StreamStats;
  error: string | null;
  stream: MediaStream | null;
};

type ConnectionRecord = {
  ws: WebSocket | null;
  peer: RTCPeerConnection | null;
  statsTimer: number | null;
  reconnectTimer: number | null;
  byteState: { bytes: number; timestamp: number } | null;
};

const EMPTY_VIEWER_STATE: ViewerSessionState = {
  phase: "idle",
  stats: EMPTY_STATS,
  error: null,
  stream: null,
};

function createEmptyViewerState(phase: StreamSessionStatus = "idle"): ViewerSessionState {
  return {
    phase,
    stats: EMPTY_STATS,
    error: null,
    stream: null,
  };
}

export function useMultiViewerRtc(
  sessions: VideoSession[],
  selectedSessionId: string | null,
  maxConcurrent = 3,
) {
  const [viewerBySessionId, setViewerBySessionId] = useState<Record<string, ViewerSessionState>>({});
  const connectionsRef = useRef<Map<string, ConnectionRecord>>(new Map());
  const unmountedRef = useRef(false);

  const targetSessions = useMemo(() => {
    const available = sessions.filter((session) => session.viewerToken && session.status !== "ended");
    const prioritized: VideoSession[] = [];

    if (selectedSessionId) {
      const selected = available.find((session) => session.sessionId === selectedSessionId);
      if (selected) prioritized.push(selected);
    }

    for (const session of available) {
      if (!prioritized.some((item) => item.sessionId === session.sessionId)) {
        prioritized.push(session);
      }
    }

    return prioritized.slice(0, maxConcurrent);
  }, [maxConcurrent, selectedSessionId, sessions]);

  const targetIds = useMemo(() => new Set(targetSessions.map((session) => session.sessionId)), [targetSessions]);

  const updateViewerState = (sessionId: string, patch: Partial<ViewerSessionState>) => {
    if (unmountedRef.current) return;
    setViewerBySessionId((current) => ({
      ...current,
      [sessionId]: {
        ...(current[sessionId] ?? EMPTY_VIEWER_STATE),
        ...patch,
      },
    }));
  };

  useEffect(() => {
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
      for (const sessionId of Array.from(connectionsRef.current.keys())) {
        cleanupConnection(sessionId, connectionsRef, updateViewerState, "idle");
      }
    };
  }, []);

  useEffect(() => {
    for (const [sessionId] of Array.from(connectionsRef.current.entries())) {
      if (!targetIds.has(sessionId)) {
        cleanupConnection(sessionId, connectionsRef, updateViewerState, "waiting");
      }
    }

    for (const session of targetSessions) {
      if (!connectionsRef.current.has(session.sessionId)) {
        createConnection(session, connectionsRef, updateViewerState);
      }
    }
  }, [targetIds, targetSessions]);

  useEffect(() => {
    setViewerBySessionId((current) => {
      const next = { ...current };
      for (const session of sessions) {
        if (!next[session.sessionId]) continue;
        if (session.status === "ended" && next[session.sessionId].phase !== "ended") {
          next[session.sessionId] = {
            ...next[session.sessionId],
            phase: "ended",
          };
        }
      }
      return next;
    });
  }, [sessions]);

  return {
    viewerBySessionId,
    activeViewerSessionIds: targetSessions.map((session) => session.sessionId),
  };
}

function createConnection(
  session: VideoSession,
  connectionsRef: MutableRefObject<Map<string, ConnectionRecord>>,
  updateViewerState: (sessionId: string, patch: Partial<ViewerSessionState>) => void,
) {
  const sessionId = session.sessionId;
  const connection: ConnectionRecord = {
    ws: null,
    peer: null,
    statsTimer: null,
    reconnectTimer: null,
    byteState: null,
  };

  const resetPeerState = () => {
    if (connection.statsTimer) {
      window.clearInterval(connection.statsTimer);
      connection.statsTimer = null;
    }
    connection.byteState = null;
    connection.peer?.close();
    connection.peer = null;
    connection.ws = null;
  };

  const cleanup = (nextPhase?: StreamSessionStatus) => {
    if (connection.reconnectTimer) {
      window.clearTimeout(connection.reconnectTimer);
      connection.reconnectTimer = null;
    }
    connection.ws?.close();
    resetPeerState();
    connectionsRef.current.delete(sessionId);
    updateViewerState(sessionId, {
      phase: nextPhase ?? "idle",
      stats: EMPTY_STATS,
      stream: null,
    });
  };

  const scheduleReconnect = (nextPhase: StreamSessionStatus) => {
    if (!connectionsRef.current.has(sessionId) || connection.reconnectTimer || session.status === "ended") {
      return;
    }

    connection.ws?.close();
    resetPeerState();
    updateViewerState(sessionId, {
      phase: nextPhase,
      stream: null,
    });

    connection.reconnectTimer = window.setTimeout(() => {
      connection.reconnectTimer = null;
      if (!connectionsRef.current.has(sessionId) || session.status === "ended") {
        return;
      }
      openConnection();
    }, 900);
  };

  const ensurePeer = () => {
    if (connection.peer) return connection.peer;

    const peer = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    peer.onicecandidate = (event) => {
      if (event.candidate && connection.ws?.readyState === WebSocket.OPEN) {
        const message: SignalMessage = {
          type: "ice-candidate",
          candidate: event.candidate.toJSON(),
        };
        connection.ws.send(JSON.stringify(message));
      }
    };
    peer.ontrack = (event) => {
      const [stream] = event.streams;
      if (stream) {
        updateViewerState(sessionId, { stream });
      }
    };
    peer.onconnectionstatechange = () => {
      if (!connection.peer) return;
      const state = connection.peer.connectionState;
      if (state === "connected") {
        updateViewerState(sessionId, { phase: "live", error: null });
        if (connection.ws?.readyState === WebSocket.OPEN) {
          connection.ws.send(JSON.stringify({ type: "status", status: "live" } satisfies SignalMessage));
        }
      } else if (state === "disconnected" || state === "failed") {
        updateViewerState(sessionId, { phase: "reconnecting" });
      } else if (state === "closed") {
        updateViewerState(sessionId, { phase: "ended" });
      }
    };

    connection.peer = peer;
    return peer;
  };

  const startStats = () => {
    if (connection.statsTimer || !connection.peer) return;
    connection.statsTimer = window.setInterval(async () => {
      const peer = connection.peer;
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
            if (typeof item.framesPerSecond === "number") fps = Math.round(item.framesPerSecond);
            if (typeof item.bytesReceived === "number") {
              const last = connection.byteState;
              if (last) {
                const deltaBytes = item.bytesReceived - last.bytes;
                const deltaMs = item.timestamp - last.timestamp;
                if (deltaMs > 0) {
                  bitrateKbps = Math.round((deltaBytes * 8) / deltaMs);
                }
              }
              connection.byteState = {
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
            rttMs = typeof item.currentRoundTripTime === "number" ? Math.round(item.currentRoundTripTime * 1000) : rttMs;
          }
        });

        updateViewerState(sessionId, {
          stats: {
            fps,
            bitrateKbps,
            width,
            height,
            packetsLost,
            rttMs,
          },
        });
      } catch {
        // Keep last stats.
      }
    }, 1200);
  };

  const openConnection = () => {
    const ws = new WebSocket(buildSignalWsUrl(sessionId, "viewer", session.viewerToken));
    connection.ws = ws;

    ws.onopen = () => {
      ensurePeer();
      startStats();
    };

    ws.onmessage = async (event) => {
      const message = JSON.parse(event.data) as SignalMessage;
      if (message.type === "status" && message.session) {
        updateViewerState(sessionId, { phase: message.session.status });
        if (message.session.status === "ended") {
          cleanup("ended");
        }
        return;
      }

      const peer = ensurePeer();
      if (message.type === "offer") {
        updateViewerState(sessionId, { phase: "connecting" });
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
      updateViewerState(sessionId, { phase: "error", error: "信令链路异常" });
    };

    ws.onclose = () => {
      if (session.status === "ended") {
        cleanup("ended");
        return;
      }
      scheduleReconnect(connection.peer?.connectionState === "connected" ? "reconnecting" : "waiting");
    };
  };

  connectionsRef.current.set(sessionId, connection);
  updateViewerState(sessionId, createEmptyViewerState(session.status === "ended" ? "ended" : "waiting"));
  openConnection();
}

function cleanupConnection(
  sessionId: string,
  connectionsRef: MutableRefObject<Map<string, ConnectionRecord>>,
  updateViewerState: (sessionId: string, patch: Partial<ViewerSessionState>) => void,
  nextPhase: StreamSessionStatus,
) {
  const connection = connectionsRef.current.get(sessionId);
  if (!connection) return;

  if (connection.statsTimer) {
    window.clearInterval(connection.statsTimer);
  }
  if (connection.reconnectTimer) {
    window.clearTimeout(connection.reconnectTimer);
  }
  connection.ws?.close();
  connection.peer?.close();
  connectionsRef.current.delete(sessionId);
  updateViewerState(sessionId, {
    phase: nextPhase,
    stats: EMPTY_STATS,
    error: null,
    stream: null,
  });
}
