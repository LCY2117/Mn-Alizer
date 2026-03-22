import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildSignalWsUrl } from "./api";
import { getIceServers } from "./iceServers";
import type { SignalMessage, StreamSessionStatus, VideoSession } from "./types";

const ICE_SERVERS = getIceServers();

function getDeviceLabel(session: VideoSession | null) {
  const ua = navigator.userAgent;
  if (/iphone/i.test(ua)) return session?.deviceLabel || "iPhone 采集终端";
  if (/android/i.test(ua)) return session?.deviceLabel || "Android 采集终端";
  return session?.deviceLabel || "浏览器采集终端";
}

export function usePublisherRtc(session: VideoSession | null, token: string | null) {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const heartbeatTimerRef = useRef<number | null>(null);
  const [phase, setPhase] = useState<StreamSessionStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [permissionState, setPermissionState] = useState<"prompt" | "granted" | "denied">("prompt");

  const secureCameraSupported = useMemo(() => {
    return Boolean(navigator.mediaDevices?.getUserMedia) && (window.isSecureContext || window.location.hostname === "localhost");
  }, []);

  const cleanup = useCallback((nextPhase?: StreamSessionStatus) => {
    if (heartbeatTimerRef.current) {
      window.clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
    wsRef.current?.close();
    wsRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (nextPhase) {
      setPhase(nextPhase);
    }
  }, []);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  const sendOffer = useCallback(async (peer: RTCPeerConnection, ws: WebSocket) => {
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    ws.send(JSON.stringify({ type: "offer", sdp: offer } satisfies SignalMessage));
  }, []);

  const startCapture = useCallback(async () => {
    if (!session || !token) {
      setError("会话不可用");
      return;
    }
    if (!secureCameraSupported) {
      setError("当前环境不是安全上下文，摄像头无法启用。");
      setPhase("error");
      return;
    }

    cleanup();
    setPhase("connecting");
    setError(null);

    try {
      const media = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      setPermissionState("granted");
      streamRef.current = media;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = media;
      }

      const peer = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      media.getTracks().forEach((track) => peer.addTrack(track, media));
      pcRef.current = peer;

      const ws = new WebSocket(buildSignalWsUrl(session.sessionId, "publisher", token));
      wsRef.current = ws;

      peer.onicecandidate = (event) => {
        if (event.candidate && ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: "ice-candidate",
              candidate: event.candidate.toJSON(),
            } satisfies SignalMessage),
          );
        }
      };

      peer.onconnectionstatechange = () => {
        const state = peer.connectionState;
        if (state === "connected") {
          setPhase("live");
          ws.send(JSON.stringify({ type: "status", status: "live" } satisfies SignalMessage));
        } else if (state === "disconnected" || state === "failed") {
          setPhase("reconnecting");
          ws.send(JSON.stringify({ type: "status", status: "reconnecting" } satisfies SignalMessage));
        } else if (state === "closed") {
          setPhase("ended");
        }
      };

      ws.onopen = async () => {
        await sendOffer(peer, ws);

        const sendHeartbeat = () => {
          const settings = streamRef.current?.getVideoTracks()[0]?.getSettings();
          const connection = (navigator as Navigator & {
            connection?: { effectiveType?: string };
          }).connection;
          ws.send(
            JSON.stringify({
              type: "heartbeat",
              deviceLabel: getDeviceLabel(session),
              meta: {
                networkType: connection?.effectiveType ?? "unknown",
                width: settings?.width ?? null,
                height: settings?.height ?? null,
                facingMode,
              },
            } satisfies SignalMessage),
          );
        };

        sendHeartbeat();
        heartbeatTimerRef.current = window.setInterval(sendHeartbeat, 2500);
      };

      ws.onmessage = async (event) => {
        const message = JSON.parse(event.data) as SignalMessage;
        if (message.type === "viewer-ready") {
          await sendOffer(peer, ws);
          return;
        }
        if (message.type === "answer") {
          await peer.setRemoteDescription(new RTCSessionDescription(message.sdp));
          return;
        }
        if (message.type === "ice-candidate") {
          try {
            await peer.addIceCandidate(new RTCIceCandidate(message.candidate));
          } catch {
            // Ignore race conditions during renegotiation.
          }
        }
        if (message.type === "status" && message.session?.status === "ended") {
          cleanup("ended");
        }
      };

      ws.onerror = () => {
        setPhase("error");
        setError("信令连接失败");
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "摄像头启动失败";
      setPermissionState("denied");
      setPhase("error");
      setError(message);
      cleanup();
    }
  }, [cleanup, facingMode, secureCameraSupported, sendOffer, session, token]);

  const stopCapture = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "status", status: "ended" } satisfies SignalMessage));
    }
    cleanup("ended");
  }, [cleanup]);

  const toggleCamera = useCallback(async () => {
    setFacingMode((current) => (current === "environment" ? "user" : "environment"));
  }, []);

  useEffect(() => {
    if (phase === "live" || phase === "connecting" || phase === "reconnecting") {
      void startCapture();
    }
    // Intentionally restart capture when facing mode changes during a live session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  return {
    localVideoRef,
    phase,
    error,
    permissionState,
    secureCameraSupported,
    facingMode,
    startCapture,
    stopCapture,
    toggleCamera,
  };
}
