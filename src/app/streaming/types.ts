export type StreamSessionStatus =
  | "idle"
  | "waiting"
  | "connecting"
  | "live"
  | "reconnecting"
  | "ended"
  | "error";

export type VideoSession = {
  sessionId: string;
  deviceLabel: string;
  status: StreamSessionStatus;
  publisherConnected: boolean;
  viewerConnected: boolean;
  createdAt: string;
  connectedAt: string | null;
  endedAt?: string | null;
  lastHeartbeatAt: string | null;
  viewerToken: string;
  publisherToken: string;
  publisherUrl: string;
  heartbeatMeta?: Record<string, unknown> | null;
};

export type StreamStats = {
  fps: number | null;
  bitrateKbps: number | null;
  width: number | null;
  height: number | null;
  packetsLost: number | null;
  rttMs: number | null;
};

export type SignalMessage =
  | { type: "viewer-ready" }
  | { type: "offer"; sdp: RTCSessionDescriptionInit; from?: "viewer" | "publisher" }
  | { type: "answer"; sdp: RTCSessionDescriptionInit; from?: "viewer" | "publisher" }
  | { type: "ice-candidate"; candidate: RTCIceCandidateInit; from?: "viewer" | "publisher" }
  | { type: "heartbeat"; deviceLabel?: string; meta?: Record<string, unknown> }
  | { type: "status"; status: StreamSessionStatus; session?: VideoSession };
