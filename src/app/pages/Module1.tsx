import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { AlertTriangle, Battery, Plus, QrCode, Radio, Smartphone, Trash2, Video, VideoOff } from "lucide-react";
import { demoData } from "../data/demoData";
import { createStreamSession, deleteStreamSession, listStreamSessions } from "../streaming/api";
import type { VideoSession } from "../streaming/types";
import { useMultiViewerRtc } from "../streaming/useMultiViewerRtc";
import {
  C,
  CardHeader,
  DataCard,
  EvidenceListItem,
  MetaChip,
  ModuleHeader,
  ProgressBar,
  RevealBlock,
  SourceBadge,
  StatCard,
} from "../components/shared";
import { useDemoContext } from "../context/DemoContext";
import { getBatchStatusLabel } from "../context/flowStatus";
import { usePersistentModuleFlow } from "../hooks/usePersistentModuleFlow";

const pointPositions = [
  { x: 96, y: 66 },
  { x: 172, y: 46 },
  { x: 246, y: 72 },
  { x: 196, y: 120 },
  { x: 278, y: 144 },
];

const riskCards = [
  { key: "可溶性锰", threshold: "预警线 2 mg/L", accent: C.red, pct: 91 },
  { key: "氨氮", threshold: "控制线 25 mg/L", accent: C.red, pct: 88 },
  { key: "含水率", threshold: "工艺线 30%", accent: C.amber, pct: 58 },
  { key: "pH", threshold: "范围 6-9", accent: C.green, pct: 32 },
];

export default function Module1() {
  const { sampling, batch } = demoData;
  const { flowStates } = useDemoContext();
  const [streamIdx, setStreamIdx] = useState(0);
  const [sessions, setSessions] = useState<VideoSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [creatingSession, setCreatingSession] = useState(false);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const bootstrappedRef = useRef(false);
  const viewerVideoRef = useRef<HTMLVideoElement | null>(null);
  const {
    progress,
    currentStepLabel,
    remainingSeconds,
    statusText,
    stepProgressPct,
    start,
    rerun,
    isComplete,
    status,
  } = usePersistentModuleFlow("edge", {
    durationMs: 14000,
    stepLabels: ["设备自检", "点位采样", "链路补传", "云端归档"],
    autoStart: false,
  });

  useEffect(() => {
    const timer = setInterval(
      () => setStreamIdx((current) => (current + 1) % sampling.sample_points.length),
      1800,
    );
    return () => clearInterval(timer);
  }, [sampling.sample_points.length]);

  const syncSessions = useCallback(async (bootstrap = false) => {
    try {
      const next = await listStreamSessions();
      if (bootstrap && !bootstrappedRef.current) {
        bootstrappedRef.current = true;
        if (next.length === 0) {
          const created = await createStreamSession("移动采集终端-01");
          setSessions([created]);
          setSelectedSessionId(created.sessionId);
          return;
        }
      }
      setSessions(next);
      setSelectedSessionId((current) => {
        if (current && next.some((item) => item.sessionId === current)) return current;
        return next.find((item) => item.status !== "ended")?.sessionId ?? next[0]?.sessionId ?? null;
      });
      setSessionError(null);
    } catch (error) {
      setSessionError(error instanceof Error ? error.message : "视频会话加载失败");
    }
  }, []);

  useEffect(() => {
    void syncSessions(true);
    const timer = window.setInterval(() => void syncSessions(false), 3000);
    return () => window.clearInterval(timer);
  }, [syncSessions]);

  const createNewSession = useCallback(async () => {
    setCreatingSession(true);
    try {
      const created = await createStreamSession(`移动采集终端-${String(sessions.length + 1).padStart(2, "0")}`);
      setSessions((current) => [created, ...current]);
      setSelectedSessionId(created.sessionId);
      setSessionError(null);
    } catch (error) {
      setSessionError(error instanceof Error ? error.message : "创建会话失败");
    } finally {
      setCreatingSession(false);
    }
  }, [sessions.length]);

  const removeSession = useCallback(
    async (sessionId: string) => {
      setDeletingSessionId(sessionId);
      try {
        await deleteStreamSession(sessionId);
        let nextSessions: VideoSession[] = [];
        setSessions((current) => {
          nextSessions = current.filter((item) => item.sessionId !== sessionId);
          return nextSessions;
        });
        setSelectedSessionId((selected) => {
          if (selected !== sessionId) {
            return selected;
          }
          return (
            nextSessions.find((item) => item.status !== "ended")?.sessionId ??
            nextSessions[0]?.sessionId ??
            null
          );
        });
        setSessionError(null);
      } catch (error) {
        setSessionError(error instanceof Error ? error.message : "删除会话失败");
      } finally {
        setDeletingSessionId(null);
      }
    },
    [],
  );

  const selectedSession = useMemo(
    () => sessions.find((item) => item.sessionId === selectedSessionId) ?? sessions[0] ?? null,
    [selectedSessionId, sessions],
  );

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (!selectedSession?.publisherUrl) {
        setQrDataUrl(null);
        return;
      }
      const dataUrl = await QRCode.toDataURL(selectedSession.publisherUrl, {
        width: 220,
        margin: 1,
        color: { dark: C.cyan, light: "#00000000" },
      });
      if (active) setQrDataUrl(dataUrl);
    };
    void run().catch(() => setQrDataUrl(null));
    return () => {
      active = false;
    };
  }, [selectedSession?.publisherUrl]);

  const { viewerBySessionId, activeViewerSessionIds } = useMultiViewerRtc(sessions, selectedSessionId, 5);
  const selectedViewer = selectedSession ? viewerBySessionId[selectedSession.sessionId] : null;
  const phase = selectedViewer?.phase ?? selectedSession?.status ?? "idle";
  const stats = selectedViewer?.stats ?? {
    fps: null,
    bitrateKbps: null,
    width: null,
    height: null,
    packetsLost: null,
    rttMs: null,
  };
  const viewerError = selectedViewer?.error ?? null;

  useEffect(() => {
    if (!viewerVideoRef.current) return;
    viewerVideoRef.current.srcObject = selectedViewer?.stream ?? null;
  }, [selectedViewer?.stream, selectedSession?.sessionId]);

  const activePoint = sampling.sample_points.find((point) => point.status === "采样中") ?? sampling.sample_points[streamIdx];
  const sampledCount = sampling.sample_points.filter((point) => point.status === "已采").length;
  const reviewCount = sampling.sample_points.filter((point) => point.status === "待复核").length;
  const liveSourceCount = sessions.filter((item) => item.publisherConnected).length;
  const delayedCount = sampling.sample_points.filter((point) => point.upload_status === "延迟补传").length;
  const particles = [
    { key: "<75μm", value: sampling.particle_size_distribution.lt_75um_pct, color: C.cyan },
    { key: "75-500μm", value: sampling.particle_size_distribution["75_to_500um_pct"], color: C.blue },
    { key: ">500μm", value: sampling.particle_size_distribution.gt_500um_pct, color: C.purple },
  ];
  const flowStatusDetail = isComplete
    ? "状态：现场采样流已完成"
    : status === "idle"
      ? "状态：等待启动现场采样流"
      : `状态：现场采样执行中 · 预计剩余 ${remainingSeconds}s`;
  const batchStatusLabel = getBatchStatusLabel(flowStates);

  return (
    <div>
      <ModuleHeader
        step={1}
        title="锰渣堆场原位采样与现场感知"
        description="边缘感知 · 面向高风险堆场的无人采样、视频接入与点位复核"
        deliverables={["采样任务状态", "点位原始数据", "现场视频接入"]}
        accentColor={C.cyan}
        statusLabel={
          status === "idle"
            ? "待启动采样流"
            : selectedSession
              ? `视频 ${phase}`
              : isComplete
                ? "采样完成"
                : currentStepLabel
        }
        statusColor={status === "idle" ? C.amber : streamStateColor(selectedSession ? phase : "waiting")}
      />

      <DataCard style={{ marginBottom: "16px" }}>
        <CardHeader title="现场采样流" subtitle="释放采样与视频接入状态" accent={C.cyan} right={<SourceBadge type={sampling.source_type} />} />
        <div style={{ padding: "0 16px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <div>
              <div style={{ fontSize: "11px", color: C.textMuted }}>当前阶段</div>
              <div style={{ fontSize: "13px", fontWeight: 700, color: C.textSecondary, marginTop: "2px" }}>{currentStepLabel}</div>
              <div style={{ fontSize: "10px", color: C.textMuted, marginTop: "4px" }}>{flowStatusDetail}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              {status === "idle" && (
                <button
                  onClick={start}
                  style={{
                    border: `1px solid ${C.green}55`,
                    background: "rgba(16,185,129,0.14)",
                    color: C.green,
                    borderRadius: "999px",
                    padding: "4px 10px",
                    fontSize: "10px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  开始采样
                </button>
              )}
              {isComplete && (
                <button
                  onClick={rerun}
                  style={{
                    border: `1px solid ${C.cyan}55`,
                    background: "rgba(6,182,212,0.14)",
                    color: C.cyan,
                    borderRadius: "999px",
                    padding: "4px 10px",
                    fontSize: "10px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  重新采样
                </button>
              )}
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: C.cyan }}>{statusText}</div>
                <div style={{ fontSize: "10px", color: C.textMuted, marginTop: "4px" }}>
                  {isComplete ? "预计剩余 0s" : status === "idle" ? `预计总时长 ${remainingSeconds}s` : `预计剩余 ${remainingSeconds}s`}
                </div>
                <div style={{ fontSize: "10px", color: C.textMuted }}>
                  阶段进度 {Math.round(stepProgressPct)}%
                </div>
              </div>
            </div>
          </div>
          <ProgressBar value={progress} accent={C.cyan} height={6} />
        </div>
      </DataCard>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "16px" }}>
        <StatCard label="设备电量" value="68" unit="%" accent={C.green} icon={<Battery size={14} />} sub={`${batch.device_id} · 预计剩余 2.4h`} />
        <StatCard label="采样任务" value={sampledCount} unit={`/${sampling.sample_points.length}`} accent={C.cyan} icon={<Radio size={14} />} sub={`${batch.job_ticket_id} · ${batch.operation_batch}`} />
        <StatCard label="在线视频源" value={liveSourceCount} unit={`/${sessions.length || 1}`} accent={C.blue} icon={<Video size={14} />} sub={selectedSession ? `${selectedSession.deviceLabel} · ${phase}` : "待创建视频会话"} />
        <StatCard label="待复核点" value={reviewCount} unit="个" accent={C.amber} icon={<AlertTriangle size={14} />} sub={reviewCount > 0 ? "存在二次比对任务" : "当前无复核阻塞"} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 0.85fr", gap: "16px", marginBottom: "16px" }}>
        <DataCard glowing accent={C.cyan}>
          <CardHeader title="任务执行视图" subtitle={`现场设备 ${batch.device_id} · 当前责任人 ${batch.operator_team} · viewer 实时接入`} accent={C.cyan} right={<SourceBadge type={selectedSession ? "official" : "demo_assumption"} />} />
          <div style={{ position: "relative", background: "#020810", height: "320px", overflow: "hidden" }}>
            <video ref={viewerVideoRef} autoPlay playsInline muted style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", background: phase === "live" ? "#000" : "linear-gradient(135deg, rgba(2,8,23,0.98), rgba(8,47,73,0.88))" }} />
            {phase !== "live" && (
              <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center", padding: "24px" }}>
                <div>
                  {phase === "waiting" || !selectedSession ? <QrCode size={42} color={C.cyan} /> : phase === "connecting" || phase === "reconnecting" ? <Video size={42} color={C.cyan} /> : <VideoOff size={42} color={C.red} />}
                  <div style={{ fontSize: "18px", fontWeight: 700, color: C.textPrimary, marginTop: "12px" }}>
                    {phase === "waiting" || !selectedSession ? "等待手机扫码接入" : phase === "connecting" ? "移动终端授权中" : phase === "reconnecting" ? "链路重连中" : phase === "ended" ? "采集已停止" : "视频暂不可用"}
                  </div>
                  <div style={{ fontSize: "12px", color: C.textMuted, marginTop: "8px", lineHeight: 1.7 }}>
                    {selectedSession ? `会话 ${selectedSession.sessionId} 已准备，后台已预连 ${activeViewerSessionIds.length} 路 viewer。` : "正在创建默认采集会话..."}
                  </div>
                </div>
              </div>
            )}
            <div style={{ position: "absolute", top: 12, left: 12, display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <MetaChip label="任务单号" value={batch.job_ticket_id} color={C.cyan} />
              <MetaChip label="当前点位" value={activePoint.point_id} color={C.amber} />
              <MetaChip label="视频会话" value={selectedSession?.sessionId ?? "--"} />
            </div>
            <div style={{ position: "absolute", top: 14, right: 12, textAlign: "right" }}>
              <div style={{ fontSize: "10px", color: C.textMuted }}>视频状态</div>
              <div style={{ fontSize: "11px", fontWeight: 700, color: streamStateColor(phase) }}>{phase}</div>
              <div style={{ fontSize: "10px", color: C.textMuted, marginTop: "4px" }}>{stats.width && stats.height ? `${stats.width}×${stats.height}` : "分辨率待建立"}</div>
              <div style={{ fontSize: "10px", color: C.textMuted }}>{stats.fps !== null ? `${stats.fps} fps` : "fps --"} · {stats.bitrateKbps !== null ? `${stats.bitrateKbps} kbps` : "bitrate --"}</div>
            </div>
            <div style={{ position: "absolute", bottom: 14, left: 12, right: 12 }}>
              <div style={{ padding: "8px 10px", background: "rgba(4,12,28,0.82)", border: `1px solid ${C.borderSubtle}`, borderRadius: "10px", display: "flex", justifyContent: "space-between", gap: "12px" }}>
                <div>
                  <div style={{ fontSize: "10px", color: C.textMuted }}>实时采样流</div>
                  <div style={{ fontSize: "12px", color: C.textPrimary, marginTop: "3px" }}>{activePoint.point_id} · pH {activePoint.ph ?? "--"} · Mn {activePoint.soluble_manganese_mg_l ?? "--"} mg/L · NH3-N {activePoint.ammonia_nitrogen_mg_l ?? "--"} mg/L</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "10px", color: C.textMuted }}>链路</div>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: streamStateColor(phase) }}>{viewerError ? "viewer 异常" : selectedSession?.publisherConnected ? "publisher 在线" : "等待 publisher"}</div>
                </div>
              </div>
            </div>
          </div>
        </DataCard>

        <DataCard>
          <CardHeader
            title="视频接入中心"
            subtitle="二维码正式入流 + 多源切换"
            accent={C.blue}
            right={
              <button onClick={() => void createNewSession()} disabled={creatingSession} style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "6px 10px", borderRadius: "8px", border: `1px solid ${C.borderActive}`, background: "rgba(6,182,212,0.12)", color: C.cyan, fontSize: "11px", fontWeight: 700, cursor: "pointer" }}>
                <Plus size={14} />
                {creatingSession ? "创建中" : "新建会话"}
              </button>
            }
          />
          <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ borderRadius: "14px", border: `1px solid ${C.borderSubtle}`, background: "linear-gradient(180deg, rgba(6,182,212,0.12), rgba(4,12,28,0.72))", padding: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                <div>
                  <div style={{ fontSize: "12px", color: C.textSecondary }}>当前二维码</div>
                  <div style={{ fontSize: "11px", color: C.textMuted, marginTop: "4px" }}>手机扫码后进入 "/capture/:sessionId"</div>
                </div>
                <SourceBadge type="official" />
              </div>
              <div style={{ display: "grid", placeItems: "center" }}>
                {qrDataUrl ? <img src={qrDataUrl} alt="stream qr" style={{ width: "180px", height: "180px" }} /> : <div style={{ width: "180px", height: "180px", display: "grid", placeItems: "center", color: C.textMuted }}>生成二维码中...</div>}
              </div>
              <div style={{ fontSize: "10px", color: C.textMuted, marginTop: "10px", lineHeight: 1.6, wordBreak: "break-all" }}>{selectedSession?.publisherUrl ?? "会话地址待生成"}</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <MetaChip label="在线源" value={`${liveSourceCount}`} color={liveSourceCount > 0 ? C.green : C.textMuted} />
              <MetaChip label="链路补传" value={`${delayedCount} 条`} color={delayedCount > 0 ? C.blue : C.textMuted} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "210px", overflowY: "auto" }}>
              {sessions.map((session) => {
                const active = session.sessionId === selectedSession?.sessionId;
                const warmed = activeViewerSessionIds.includes(session.sessionId);
                const sessionPhase = viewerBySessionId[session.sessionId]?.phase ?? session.status;
                return (
                  <div
                    key={session.sessionId}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto",
                      gap: "8px",
                      alignItems: "stretch",
                    }}
                  >
                    <button
                      onClick={() => setSelectedSessionId(session.sessionId)}
                      style={{
                        textAlign: "left",
                        padding: "10px 12px",
                        borderRadius: "12px",
                        border: `1px solid ${active ? C.borderActive : C.borderSubtle}`,
                        background: active ? "rgba(6,182,212,0.12)" : C.bgCardHover,
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
                        <div>
                          <div style={{ fontSize: "12px", fontWeight: 700, color: active ? C.cyan : C.textPrimary }}>{session.deviceLabel}</div>
                          <div style={{ fontSize: "10px", color: C.textMuted, marginTop: "4px" }}>{session.sessionId}</div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Smartphone size={13} color={session.publisherConnected ? C.green : C.textMuted} />
                          <span style={{ fontSize: "10px", fontWeight: 700, color: streamStateColor(sessionPhase) }}>{sessionPhase}</span>
                        </div>
                      </div>
                      <div style={{ fontSize: "10px", color: C.textMuted, marginTop: "8px", display: "flex", justifyContent: "space-between", gap: "8px" }}>
                        <span>最近上报 {session.lastHeartbeatAt ?? "尚未接入"}</span>
                        <span style={{ color: warmed ? C.cyan : C.textMuted }}>{warmed ? "viewer已预连" : "viewer待连接"}</span>
                      </div>
                    </button>
                    <button
                      onClick={() => void removeSession(session.sessionId)}
                      disabled={deletingSessionId === session.sessionId}
                      title="删除会话"
                      style={{
                        width: "38px",
                        borderRadius: "12px",
                        border: `1px solid ${C.borderSubtle}`,
                        background: deletingSessionId === session.sessionId ? "rgba(71,85,105,0.24)" : "rgba(239,68,68,0.08)",
                        color: deletingSessionId === session.sessionId ? C.textMuted : C.red,
                        cursor: deletingSessionId === session.sessionId ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
            {(sessionError || viewerError) && <div style={{ fontSize: "11px", color: C.red, lineHeight: 1.6 }}>{sessionError ?? viewerError}</div>}
          </div>
        </DataCard>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "16px", marginBottom: "16px" }}>
        <RevealBlock show delayMs={80}>
          <DataCard>
            <CardHeader title="任务上下文" subtitle="来源 + 时间 + 责任主体 + 状态" accent={C.blue} />
            <div style={{ padding: "12px 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <MetaChip label="设备编号" value={batch.device_id} color={C.cyan} />
              <MetaChip label="操作批次" value={batch.operation_batch} color={C.blue} />
              <MetaChip label="班组" value={batch.operator_team} />
              <MetaChip label="当前节点" value={batch.current_owner} color={C.amber} />
              <MetaChip label="上云时间" value={batch.timestamps.uploaded_at} />
              <MetaChip label="数据状态" value={batchStatusLabel} color={C.green} />
            </div>
            <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <EvidenceListItem title="补传记录" detail="SP-02 发生 4G 链路抖动，09:24 采样后延迟补传，但 09:49 已完成云端合并。" right={<SourceBadge type="demo_assumption" />} />
              <EvidenceListItem title="待复核记录" detail="SP-04 出现 pH 漂移，现场系统已自动标记为待复核，不影响主流程但要求二次比对。" right={<SourceBadge type="demo_assumption" />} />
            </div>
          </DataCard>
        </RevealBlock>

        <DataCard>
          <CardHeader title="视频链路遥测" subtitle="当前会话状态 + viewer 统计" accent={C.green} right={<SourceBadge type={selectedSession ? "official" : "demo_assumption"} />} />
          <div style={{ padding: "12px 16px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
            <MetaChip label="会话状态" value={selectedSession?.status ?? "waiting"} color={streamStateColor(selectedSession?.status ?? "waiting")} />
            <MetaChip label="设备标签" value={selectedSession?.deviceLabel ?? "--"} color={C.cyan} />
            <MetaChip label="viewer池" value={`${activeViewerSessionIds.length}/5`} color={C.blue} />
            <MetaChip label="RTT" value={stats.rttMs !== null ? `${stats.rttMs} ms` : "--"} color={C.blue} />
            <MetaChip label="丢包" value={stats.packetsLost !== null ? `${stats.packetsLost}` : "--"} color={C.amber} />
            <MetaChip label="FPS" value={stats.fps !== null ? `${stats.fps}` : "--"} color={C.green} />
            <MetaChip label="码率" value={stats.bitrateKbps !== null ? `${stats.bitrateKbps} kbps` : "--"} color={C.cyan} />
          </div>
          <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: "8px" }}>
            <EvidenceListItem title="会话建立说明" detail={selectedSession ? `viewer 已监听 ${selectedSession.sessionId}，publisher 扫码后进入手机采集页。` : "尚未创建会话。"} />
            <EvidenceListItem title="部署要求" detail="手机摄像头采集需要 HTTPS。当前本地阶段可先联调二维码、会话状态和 viewer 连接流程。" right={<SourceBadge type="official" />} />
          </div>
        </DataCard>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: "16px", marginBottom: "16px" }}>
        <RevealBlock show delayMs={120}>
          <DataCard>
            <CardHeader title="采样点位分布" subtitle={`${batch.site_name} · 采样任务执行链`} accent={C.cyan} />
            <div style={{ padding: "12px 16px", position: "relative", height: "250px" }}>
              <svg width="100%" height="100%" viewBox="0 0 360 210">
                <defs>
                  <pattern id="scanGrid2" width="24" height="24" patternUnits="userSpaceOnUse">
                    <path d="M 24 0 L 0 0 0 24" fill="none" stroke="rgba(6,182,212,0.08)" strokeWidth="0.5" />
                  </pattern>
                  <radialGradient id="yardGlow" cx="50%" cy="50%">
                    <stop offset="0%" stopColor="rgba(6,182,212,0.16)" />
                    <stop offset="100%" stopColor="rgba(6,182,212,0.02)" />
                  </radialGradient>
                </defs>
                <rect width="360" height="210" fill="url(#scanGrid2)" rx="10" />
                <ellipse cx="180" cy="105" rx="132" ry="74" fill="url(#yardGlow)" stroke="rgba(6,182,212,0.2)" strokeDasharray="4 3" />
                <polyline points={pointPositions.map((point) => `${point.x},${point.y}`).join(" ")} fill="none" stroke="rgba(6,182,212,0.35)" strokeDasharray="6 4" strokeWidth="1.5" />
                {sampling.sample_points.map((point, index) => {
                  const position = pointPositions[index];
                  const color = point.status === "待复核" ? C.amber : point.status === "采样中" ? C.cyan : C.green;
                  return (
                    <g key={point.point_id}>
                      <circle cx={position.x} cy={position.y} r="10" fill={`${color}18`} stroke={`${color}55`} />
                      <circle cx={position.x} cy={position.y} r="4" fill={color} />
                      <text x={position.x + 10} y={position.y - 8} fill={color} style={{ fontSize: "9px", fontWeight: 700 }}>{point.point_id}</text>
                      <text x={position.x + 10} y={position.y + 4} fill="rgba(148,163,184,0.8)" style={{ fontSize: "8px" }}>{point.status}</text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </DataCard>
        </RevealBlock>

        <RevealBlock show delayMs={180}>
          <DataCard>
            <CardHeader title="入料参数摘要" subtitle="采样均值 + 风险前置观察" accent={C.amber} right={<SourceBadge type={sampling.source_type} />} />
            <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: "12px" }}>
              {riskCards.map((item) => {
                const valueMap: Record<string, string> = {
                  可溶性锰: `${sampling.soluble_manganese_mg_l} mg/L`,
                  氨氮: `${sampling.ammonia_nitrogen_mg_l} mg/L`,
                  含水率: `${sampling.water_content_pct}%`,
                  pH: `${sampling.ph}`,
                };
                return (
                  <div key={item.key}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", marginBottom: "5px" }}>
                      <div>
                        <div style={{ fontSize: "12px", color: C.textSecondary }}>{item.key}</div>
                        <div style={{ fontSize: "10px", color: C.textMuted }}>{item.threshold}</div>
                      </div>
                      <div style={{ fontSize: "13px", fontWeight: 700, color: item.accent }}>{valueMap[item.key]}</div>
                    </div>
                    <ProgressBar value={item.pct} accent={item.accent} height={4} />
                  </div>
                );
              })}
              <div>
                <div style={{ fontSize: "12px", color: C.textSecondary, marginBottom: "6px" }}>粒径分布</div>
                <div style={{ display: "flex", height: "20px", borderRadius: "8px", overflow: "hidden" }}>
                  {particles.map((item) => (
                    <div key={item.key} style={{ width: `${item.value}%`, background: item.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {item.value >= 10 && <span style={{ fontSize: "10px", fontWeight: 700, color: item.color === C.cyan ? "#02131f" : "#fff" }}>{item.value}%</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </DataCard>
        </RevealBlock>
      </div>

      <DataCard>
        <CardHeader title="采样任务执行表" subtitle="点位级时间戳、上传状态、复核状态" accent={C.green} />
        <div style={{ padding: "12px 16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1.2fr 1fr 1fr 1fr 1fr 1.3fr", gap: "10px", fontSize: "10px", color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "10px" }}>
            <div>点位</div>
            <div>时间</div>
            <div>pH</div>
            <div>Mn</div>
            <div>NH3-N</div>
            <div>上传</div>
            <div>复核说明</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {sampling.sample_points.map((point) => (
              <div key={point.point_id} style={{ display: "grid", gridTemplateColumns: "1.1fr 1.2fr 1fr 1fr 1fr 1fr 1.3fr", gap: "10px", padding: "10px 12px", borderRadius: "10px", border: `1px solid ${C.borderSubtle}`, background: point.status === "待复核" ? "rgba(245,158,11,0.08)" : point.upload_status === "延迟补传" ? "rgba(59,130,246,0.08)" : C.bgCardHover, alignItems: "center" }}>
                <div style={{ fontSize: "12px", fontWeight: 700, color: C.textPrimary }}>{point.point_id}</div>
                <div style={{ fontSize: "11px", color: C.textSecondary }}>{point.timestamp}</div>
                <div style={{ fontSize: "11px", color: C.textSecondary }}>{point.ph ?? "--"}</div>
                <div style={{ fontSize: "11px", color: C.textSecondary }}>{point.soluble_manganese_mg_l ?? "--"}</div>
                <div style={{ fontSize: "11px", color: C.textSecondary }}>{point.ammonia_nitrogen_mg_l ?? "--"}</div>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  <SourceBadge type={point.source_type} />
                  <span style={{ fontSize: "10px", color: point.upload_status === "延迟补传" ? C.blue : C.textMuted }}>{point.upload_status}</span>
                </div>
                <div style={{ fontSize: "11px", color: point.status === "待复核" ? C.amber : C.textMuted }}>{point.review_note}</div>
              </div>
            ))}
          </div>
        </div>
      </DataCard>
    </div>
  );
}

function streamStateColor(state: string) {
  if (state === "live") return C.green;
  if (state === "connecting" || state === "waiting") return C.cyan;
  if (state === "reconnecting") return C.amber;
  if (state === "ended" || state === "error") return C.red;
  return C.textMuted;
}
