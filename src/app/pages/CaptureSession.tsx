import React, { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router";
import { Camera, CameraOff, RefreshCw, Smartphone, Wifi } from "lucide-react";
import { getStreamSession } from "../streaming/api";
import { usePublisherRtc } from "../streaming/usePublisherRtc";
import type { VideoSession } from "../streaming/types";
import { C, DataCard, SourceBadge } from "../components/shared";

export default function CaptureSession() {
  const { sessionId } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [session, setSession] = useState<VideoSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setError("缺少会话编号");
      return;
    }
    let active = true;
    const load = async () => {
      try {
        const next = await getStreamSession(sessionId);
        if (active) {
          setSession(next);
          setError(null);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "会话不存在");
        }
      }
    };
    void load();
    const timer = window.setInterval(load, 3000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [sessionId]);

  const {
    localVideoRef,
    phase,
    error: rtcError,
    secureCameraSupported,
    facingMode,
    startCapture,
    stopCapture,
    toggleCamera,
  } = usePublisherRtc(session, token);

  const networkType = useMemo(() => {
    const connection = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection;
    return connection?.effectiveType ?? "unknown";
  }, []);

  const sessionEnded = phase === "ended" || session?.status === "ended";
  const captureRunning = phase === "connecting" || phase === "live" || phase === "reconnecting";
  const canStart = secureCameraSupported && !!session && !!token && !captureRunning && !sessionEnded;
  const canToggleCamera = !!session && !sessionEnded && phase !== "connecting";
  const canStop = captureRunning;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(circle at top, rgba(6,182,212,0.14), transparent 32%), #040c1c",
        color: C.textPrimary,
        padding: "24px 16px 40px",
        fontFamily: "'Inter', 'PingFang SC', 'Microsoft YaHei', sans-serif",
      }}
    >
      <div style={{ maxWidth: "480px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              background: "rgba(6,182,212,0.18)",
              border: `1px solid ${C.borderActive}`,
              display: "grid",
              placeItems: "center",
            }}
          >
            <Smartphone size={18} color={C.cyan} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "18px", fontWeight: 700 }}>移动采集终端</div>
            <div style={{ fontSize: "12px", color: C.textMuted }}>
              会话 {sessionId ?? "--"} · {session?.deviceLabel ?? "待识别设备"}
            </div>
          </div>
          <SourceBadge type="demo_assumption" />
        </div>

        <DataCard>
          <div style={{ position: "relative", background: "#020810", minHeight: "420px" }}>
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              style={{
                width: "100%",
                minHeight: "420px",
                objectFit: "cover",
                background: "linear-gradient(135deg, rgba(15,23,42,0.98), rgba(8,47,73,0.88))",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: "auto 12px 12px 12px",
                borderRadius: "12px",
                background: "rgba(4,12,28,0.82)",
                border: `1px solid ${C.borderSubtle}`,
                padding: "10px 12px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
                <div>
                  <div style={{ fontSize: "10px", color: C.textMuted }}>采集状态</div>
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: 700,
                      color: sessionEnded ? C.amber : phase === "live" ? C.green : C.cyan,
                    }}
                  >
                    {phase}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "10px", color: C.textMuted }}>网络</div>
                  <div style={{ fontSize: "12px", color: C.textSecondary }}>{networkType}</div>
                </div>
              </div>
            </div>
          </div>
        </DataCard>

        <DataCard>
          <div style={{ padding: "16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div
              style={{
                padding: "10px 12px",
                borderRadius: "12px",
                border: `1px solid ${C.borderSubtle}`,
                background: C.bgCardHover,
              }}
            >
              <div style={{ fontSize: "10px", color: C.textMuted, marginBottom: "4px" }}>设备标签</div>
              <div style={{ fontSize: "13px", fontWeight: 700 }}>{session?.deviceLabel ?? "--"}</div>
            </div>
            <div
              style={{
                padding: "10px 12px",
                borderRadius: "12px",
                border: `1px solid ${C.borderSubtle}`,
                background: C.bgCardHover,
              }}
            >
              <div style={{ fontSize: "10px", color: C.textMuted, marginBottom: "4px" }}>摄像头方向</div>
              <div style={{ fontSize: "13px", fontWeight: 700 }}>{facingMode}</div>
            </div>
          </div>
        </DataCard>

        {!secureCameraSupported && (
          <DataCard>
            <div style={{ padding: "16px", color: C.amber, fontSize: "13px", lineHeight: 1.7 }}>
              当前不是安全上下文，浏览器不会放行摄像头。部署到 HTTPS 后再测试手机采集。
            </div>
          </DataCard>
        )}

        {(error || rtcError) && (
          <DataCard>
            <div style={{ padding: "16px", color: C.red, fontSize: "13px", lineHeight: 1.7 }}>
              {error || rtcError}
            </div>
          </DataCard>
        )}

        {sessionEnded && (
          <DataCard>
            <div style={{ padding: "16px", color: C.amber, fontSize: "13px", lineHeight: 1.8 }}>
              当前采集会话已完成并结束。如需继续采集，请返回主系统模块一，重新创建新的采集会话后再扫码进入。
            </div>
          </DataCard>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
          <ControlButton
            onClick={() => void startCapture()}
            disabled={!canStart}
            color={C.green}
            active={captureRunning}
          >
            <Camera size={16} />
            {sessionEnded ? "会话已结束" : captureRunning ? "采集中" : "开始采集"}
          </ControlButton>
          <ControlButton onClick={toggleCamera} disabled={!canToggleCamera} color={C.cyan} active={phase === "live"}>
            <RefreshCw size={16} />
            切换镜头
          </ControlButton>
          <ControlButton onClick={stopCapture} disabled={!canStop} color={C.red} active={phase === "live"}>
            <CameraOff size={16} />
            停止采集
          </ControlButton>
        </div>

        <DataCard>
          <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Wifi size={14} color={C.cyan} />
              <span style={{ fontSize: "12px", color: C.textSecondary }}>
                viewer 建链后，桌面端任务执行视图会切到实时视频。
              </span>
            </div>
            <div style={{ fontSize: "11px", color: C.textMuted, lineHeight: 1.7 }}>
              如果开始采集后没有画面，先检查 HTTPS、浏览器摄像头权限和服务端 WebSocket 是否可达。
            </div>
          </div>
        </DataCard>
      </div>
    </div>
  );
}

type ControlButtonProps = {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  color: string;
};

function ControlButton({ children, onClick, disabled = false, active = false, color }: ControlButtonProps) {
  const [pressed, setPressed] = useState(false);

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onPointerDown={() => !disabled && setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      style={actionButtonStyle(color, { disabled, active, pressed })}
    >
      {children}
    </button>
  );
}

function actionButtonStyle(
  color: string,
  options: { disabled?: boolean; active?: boolean; pressed?: boolean } = {},
): React.CSSProperties {
  const { disabled = false, active = false, pressed = false } = options;
  const background = disabled ? "rgba(71, 85, 105, 0.18)" : active ? `${color}30` : `${color}18`;
  const borderColor = disabled ? `${C.borderSubtle}` : active ? `${color}CC` : `${color}55`;
  const shadow = disabled
    ? "none"
    : active || pressed
      ? `0 0 0 1px ${color}22 inset, 0 8px 18px ${color}22`
      : "0 4px 14px rgba(2, 8, 23, 0.22)";

  return {
    minHeight: "52px",
    borderRadius: "14px",
    border: `1px solid ${borderColor}`,
    background,
    color: disabled ? C.textMuted : color,
    fontSize: "13px",
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    cursor: disabled ? "not-allowed" : "pointer",
    transform: pressed ? "translateY(1px) scale(0.985)" : active ? "translateY(0)" : "translateY(0)",
    boxShadow: shadow,
    opacity: disabled ? 0.72 : 1,
    transition:
      "transform 120ms ease, box-shadow 160ms ease, background 160ms ease, border-color 160ms ease, opacity 160ms ease",
    WebkitTapHighlightColor: "transparent",
  };
}
