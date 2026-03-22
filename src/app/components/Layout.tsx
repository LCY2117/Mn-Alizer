import React, { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router";
import {
  Radio,
  CloudCog,
  Brain,
  Layers,
  Network,
  Zap,
  ChevronRight,
} from "lucide-react";
import { demoData } from "../data/demoData";
import { useDemoContext } from "../context/DemoContext";
import { getBatchStatusLabel } from "../context/flowStatus";
import { C, MetaChip, SourceBadge } from "./shared";
import { AssistantDrawer } from "./AssistantDrawer";
import { buildAssistantContext } from "../assistant/context";
import { verifyGatePassword } from "../gate/api";
import { clearGateToken, getGateToken } from "../gate/storage";
import type { FlowModuleKey } from "../context/runtimeTypes";

const navItems = [
  {
    path: "/",
    flowKey: "edge" as FlowModuleKey,
    step: 1,
    label: "边缘感知",
    businessTitle: "锰渣堆场原位采样与现场感知",
    sublabel: "Edge Perception",
    icon: Radio,
    accent: "#06b6d4",
    stageLabel: "采样中",
    summary: "先完成锰渣点位采样、视频接入和复核，给后续风险诊断提供可信原始数据。",
    primaryAction: "提交采样数据并生成诊断输入",
  },
  {
    path: "/cloud",
    flowKey: "cloud" as FlowModuleKey,
    step: 2,
    label: "云端中枢",
    businessTitle: "锰渣批次风险诊断与预处理判定",
    sublabel: "Cloud Hub",
    icon: CloudCog,
    accent: "#3b82f6",
    stageLabel: "AI 诊断",
    summary: "把采样值转化为风险等级、超标证据和预处理建议，明确这一批锰渣的核心处置难点。",
    primaryAction: "输出风险诊断并进入路线决策",
  },
  {
    path: "/ai-brain",
    flowKey: "ai-brain" as FlowModuleKey,
    step: 3,
    label: "AI 大脑",
    businessTitle: "锰渣资源化路径决策与配方寻优",
    sublabel: "AI Engine",
    icon: Brain,
    accent: "#8b5cf6",
    stageLabel: "配方寻优",
    summary: "比较四类资源化路线，筛出最优去向并输出配方、推荐理由和证据依据。",
    primaryAction: "生成最优利用方案",
  },
  {
    path: "/twin",
    flowKey: "twin" as FlowModuleKey,
    step: 4,
    label: "数字孪生",
    businessTitle: "资源化方案性能预测与价值核算",
    sublabel: "Digital Twin",
    icon: Layers,
    accent: "#10b981",
    stageLabel: "价值核算",
    summary: "验证方案的强度、合规与经济性，证明这条路线既能做成，也值得做。",
    primaryAction: "生成实施测算与商业方案",
  },
  {
    path: "/market",
    flowKey: "market" as FlowModuleKey,
    step: 5,
    label: "商业闭环",
    businessTitle: "资源化产品供需撮合与低碳价值管理",
    sublabel: "Market Loop",
    icon: Network,
    accent: "#f59e0b",
    stageLabel: "供需撮合",
    summary: "把方案真正落到买家、运输和交付层，形成可签约、可交付、可核算的商业闭环。",
    primaryAction: "重新上传采集数据",
  },
];

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    flowStates,
    selectedMaterial,
    runtimeReady,
    runtimeError,
    resetRuntimeState,
  } = useDemoContext();
  const [gatePassword, setGatePassword] = useState("");
  const [gateVerified, setGateVerified] = useState(() => !import.meta.env.VITE_APP_GATE_ENABLED || Boolean(getGateToken()));
  const [gateSubmitting, setGateSubmitting] = useState(false);
  const [gateError, setGateError] = useState<string | null>(null);
  const currentIdx = navItems.findIndex((n) =>
    n.path === "/" ? location.pathname === "/" : location.pathname?.startsWith(n.path)
  );
  const safeIdx = currentIdx >= 0 ? currentIdx : 0;
  const highestUnlockedIdx = navItems.reduce((highest, item, index) => {
    if (index === 0) {
      return highest;
    }
    const previousItem = navItems[index - 1];
    return flowStates[previousItem.flowKey].status === "completed" ? index : highest;
  }, 0);
  const currentItem = navItems[safeIdx];
  const prevItem = safeIdx > 0 ? navItems[safeIdx - 1] : null;
  const nextItem = safeIdx < navItems.length - 1 ? navItems[safeIdx + 1] : null;
  const isCurrentFlowCompleted =
    flowStates[currentItem.flowKey].status === "completed";
  const nextActionEnabled = nextItem ? isCurrentFlowCompleted : true;
  const batchStatusLabel = getBatchStatusLabel(flowStates);

  useEffect(() => {
    if (safeIdx > highestUnlockedIdx) {
      navigate(navItems[highestUnlockedIdx].path, { replace: true });
    }
  }, [highestUnlockedIdx, navigate, safeIdx]);

  useEffect(() => {
    document.title = `${currentItem.businessTitle}｜${demoData.project.project_name}`;
  }, [currentItem.businessTitle]);
  const assistantContext = buildAssistantContext({
    moduleKey: currentItem.flowKey,
    routePath: location.pathname,
    moduleTitle: currentItem.businessTitle,
    moduleLabel: currentItem.label,
    moduleSummary: currentItem.summary,
    selectedMaterialId: selectedMaterial.material_id,
    flowState: flowStates[currentItem.flowKey],
  });
  const gateEnabled = useMemo(() => Boolean(import.meta.env.VITE_APP_GATE_ENABLED), []);

  const submitGate = async () => {
    if (!gateEnabled) {
      setGateVerified(true);
      return;
    }
    setGateSubmitting(true);
    setGateError(null);
    try {
      await verifyGatePassword(gatePassword);
      setGateVerified(true);
      setGatePassword("");
    } catch (error) {
      clearGateToken();
      setGateVerified(false);
      setGateError(error instanceof Error ? error.message : "访问授权失败");
    } finally {
      setGateSubmitting(false);
    }
  };

  if (gateEnabled && !gateVerified) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "radial-gradient(circle at top, rgba(6,182,212,0.16), transparent 28%), #040c1c",
          color: C.textPrimary,
          fontFamily: "'Inter', 'PingFang SC', 'Microsoft YaHei', sans-serif",
          padding: "24px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "380px",
            borderRadius: "18px",
            border: `1px solid ${C.borderSubtle}`,
            background: "rgba(4,12,28,0.92)",
            boxShadow: "0 24px 60px rgba(2, 8, 23, 0.5)",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          <div>
            <div style={{ fontSize: "22px", fontWeight: 700 }}>{demoData.project.project_name}</div>
            <div style={{ fontSize: "12px", color: C.textMuted, marginTop: "6px", lineHeight: 1.7 }}>
              当前系统已启用访问口令。输入口令后再进入主系统和 AI 助手。
            </div>
          </div>
          <input
            type="password"
            value={gatePassword}
            onChange={(event) => setGatePassword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && gatePassword.trim() && !gateSubmitting) {
                void submitGate();
              }
            }}
            placeholder="请输入访问口令"
            style={{
              height: "46px",
              borderRadius: "12px",
              border: `1px solid ${gateError ? C.red : C.borderSubtle}`,
              background: "rgba(15,23,42,0.88)",
              color: C.textPrimary,
              padding: "0 14px",
              fontSize: "14px",
              outline: "none",
            }}
          />
          {gateError && <div style={{ fontSize: "12px", color: C.red }}>{gateError}</div>}
          <button
            onClick={() => void submitGate()}
            disabled={!gatePassword.trim() || gateSubmitting}
            style={{
              height: "46px",
              borderRadius: "12px",
              border: `1px solid ${gatePassword.trim() && !gateSubmitting ? C.borderActive : C.borderSubtle}`,
              background: gatePassword.trim() && !gateSubmitting ? "rgba(6,182,212,0.16)" : "rgba(71,85,105,0.18)",
              color: gatePassword.trim() && !gateSubmitting ? C.cyan : C.textMuted,
              fontSize: "14px",
              fontWeight: 700,
              cursor: gatePassword.trim() && !gateSubmitting ? "pointer" : "not-allowed",
            }}
          >
            {gateSubmitting ? "验证中..." : "进入系统"}
          </button>
        </div>
      </div>
    );
  }

  if (!runtimeReady) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#040c1c",
          color: C.textPrimary,
          fontFamily: "'Inter', 'PingFang SC', 'Microsoft YaHei', sans-serif",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "8px" }}>
            正在同步服务器运行状态
          </div>
          <div style={{ fontSize: "12px", color: C.textMuted }}>
            读取当前路线选择和处理流程进度。
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        width: "100vw",
        background: C.bgBase,
        overflow: "hidden",
        fontFamily: "'Inter', 'PingFang SC', 'Microsoft YaHei', sans-serif",
      }}
    >
      <style>{`
        @keyframes scanMove {
          0% { top: 0%; }
          100% { top: 100%; }
        }
        @keyframes dataPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes nodeFloat {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
        .scan-anim {
          animation: scanMove 4s linear infinite;
        }
        .data-pulse {
          animation: dataPulse 2s ease-in-out infinite;
        }
        .node-float {
          animation: nodeFloat 3s ease-in-out infinite;
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(6,182,212,0.3); border-radius: 2px; }
      `}</style>

      {/* ── Top Header ─────────────────────────────────────────────── */}
      <header
        style={{
          minHeight: "72px",
          background: "rgba(4,12,28,0.95)",
          borderBottom: `1px solid ${C.borderSubtle}`,
          display: "flex",
          alignItems: "center",
          padding: "0 20px",
          gap: "20px",
          backdropFilter: "blur(12px)",
          flexShrink: 0,
          zIndex: 20,
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "7px",
              background: "linear-gradient(135deg, #06b6d4, #3b82f6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Zap size={14} color="white" />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
            <span style={{ fontSize: "15px", fontWeight: 700, color: "#e2e8f0", letterSpacing: "-0.02em" }}>
              {demoData.project.project_name}
            </span>
            <span style={{ fontSize: "10px", color: C.textMuted }}>
              {demoData.project.demo_title}
            </span>
          </div>
          <span
            style={{
              fontSize: "10px",
              fontWeight: 500,
              color: "#06b6d4",
              background: "rgba(6,182,212,0.12)",
              border: "1px solid rgba(6,182,212,0.3)",
              borderRadius: "4px",
              padding: "1px 6px",
            }}
          >
            {demoData.project.version}
          </span>
        </div>

        <div style={{ width: "1px", height: "20px", background: C.borderSubtle }} />

        {/* Batch Info */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, flexWrap: "wrap" }}>
          <div>
            <span style={{ fontSize: "10px", fontWeight: 500, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Batch ID
            </span>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "#06b6d4", letterSpacing: "0.04em" }}>
              {demoData.batch.batch_id}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981" }} className="animate-pulse" />
            <span style={{ fontSize: "12px", fontWeight: 500, color: C.textSecondary }}>
              {demoData.batch.site_name}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "11px", color: C.textMuted }}>N {demoData.batch.lat}° · E {demoData.batch.lng}°</span>
          </div>
          <MetaChip label="设备编号" value={demoData.batch.device_id} color={C.cyan} />
          <MetaChip label="任务单号" value={demoData.batch.job_ticket_id} color={C.blue} />
          <MetaChip label="采样开始" value={demoData.batch.timestamps.sampling_started} />
          <MetaChip label="数据更新" value={demoData.batch.timestamps.updated_at} />
          <div
            style={{
              padding: "3px 10px",
              background: "rgba(16,185,129,0.12)",
              border: "1px solid rgba(16,185,129,0.3)",
              borderRadius: "20px",
              fontSize: "12px",
              fontWeight: 600,
              color: "#10b981",
            }}
          >
            {demoData.batch.total_quantity_tons.toLocaleString()} 吨
          </div>
          <div
            style={{
              padding: "3px 10px",
              background: "rgba(139,92,246,0.12)",
              border: "1px solid rgba(139,92,246,0.3)",
              borderRadius: "20px",
              fontSize: "12px",
              fontWeight: 600,
              color: "#a78bfa",
            }}
          >
            当前路线 · {selectedMaterial.material_name}
          </div>
          <div
            style={{
              padding: "3px 10px",
              background: "rgba(6,182,212,0.12)",
              border: "1px solid rgba(6,182,212,0.3)",
              borderRadius: "20px",
              fontSize: "12px",
              fontWeight: 600,
              color: "#67e8f9",
            }}
          >
            当前责任节点 · {demoData.batch.current_owner}
          </div>
        </div>

        {/* Journey flow indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {navItems.map((item, i) => {
            const isCompleted = flowStates[item.flowKey].status === "completed";
            const isUnlocked = i <= highestUnlockedIdx;
            const isCurrent = i === safeIdx;
            const circleBg = isCompleted
              ? `${item.accent}30`
              : isCurrent
                ? "rgba(255,255,255,0.04)"
                : "transparent";
            const circleBorder = isCompleted
              ? item.accent
              : isCurrent
                ? "#f8fafc"
                : isUnlocked
                  ? C.textMuted
                  : C.borderSubtle;
            const circleColor = isCompleted
              ? item.accent
              : isCurrent
                ? "#f8fafc"
                : isUnlocked
                  ? C.textSecondary
                  : C.textMuted;

            return (
              <React.Fragment key={item.step}>
                <div
                  title={
                    isCompleted
                      ? `${item.businessTitle} · 已完成`
                      : isCurrent
                        ? `${item.businessTitle} · 当前步骤`
                        : isUnlocked
                          ? `${item.businessTitle} · 可进入`
                          : `${item.businessTitle} · 未解锁`
                  }
                  style={{
                    width: "22px",
                    height: "22px",
                    borderRadius: "50%",
                    background: circleBg,
                    border: `1px solid ${circleBorder}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "10px",
                    fontWeight: 700,
                    color: circleColor,
                    transition: "all 0.3s ease",
                    boxShadow: isCurrent ? "0 0 0 3px rgba(248,250,252,0.08)" : "none",
                  }}
                >
                  {item.step}
                </div>
                {i < navItems.length - 1 && (
                  <ChevronRight
                    size={10}
                    color={isCompleted ? item.accent : isUnlocked ? C.textMuted : C.borderSubtle}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        <div style={{ width: "1px", height: "20px", background: C.borderSubtle }} />

        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
          <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#06b6d4" }} className="animate-pulse" />
          <span style={{ fontSize: "11px", fontWeight: 500, color: C.textSecondary }}>
            {batchStatusLabel}
          </span>
          <SourceBadge type={demoData.batch.source_type} />
          {runtimeError && (
            <span style={{ fontSize: "11px", color: C.red }}>
              状态同步异常
            </span>
          )}
        </div>
      </header>

      {/* ── Body ───────────────────────────────────────────────────── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Sidebar */}
        <aside
          style={{
            width: "200px",
            flexShrink: 0,
            background: "rgba(4,12,28,0.8)",
            borderRight: `1px solid ${C.borderSubtle}`,
            display: "flex",
            flexDirection: "column",
            padding: "16px 0",
            gap: "4px",
          }}
        >
          <div style={{ padding: "0 12px 12px", borderBottom: `1px solid ${C.borderSubtle}`, marginBottom: "8px" }}>
            <div style={{ fontSize: "10px", fontWeight: 600, color: C.textMuted, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              处理流程
            </div>
          </div>

          {navItems.map((item, i) => {
            const Icon = item.icon;
            const isActive =
              item.path === "/"
                ? location.pathname === "/"
                : location.pathname?.startsWith(item.path) ?? false;
            const isPast = i < currentIdx;
            const isCompleted = flowStates[item.flowKey].status === "completed";
            const isUnlocked = i <= highestUnlockedIdx;
            const statusLabel = isCompleted
              ? "已完成"
              : isUnlocked
                ? i === safeIdx
                  ? "进行中"
                  : "可进入"
                : "待解锁";

            return (
              <NavLink
                key={item.path}
                to={isUnlocked ? item.path : location.pathname}
                onClick={(event) => {
                  if (!isUnlocked) {
                    event.preventDefault();
                  }
                }}
                style={{ textDecoration: "none" }}
              >
                <div
                  style={{
                    margin: "0 10px",
                    borderRadius: "10px",
                    padding: "10px 12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    background: isActive ? `${item.accent}18` : "transparent",
                    border: isActive ? `1px solid ${item.accent}40` : "1px solid transparent",
                    cursor: isUnlocked ? "pointer" : "not-allowed",
                    transition: "all 0.2s ease",
                    position: "relative",
                    opacity: isUnlocked ? 1 : 0.45,
                  }}
                >
                  {isActive && (
                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        top: "50%",
                        transform: "translateY(-50%)",
                        width: "3px",
                        height: "20px",
                        background: item.accent,
                        borderRadius: "0 2px 2px 0",
                      }}
                    />
                  )}
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "7px",
                      background: isActive
                        ? `${item.accent}25`
                        : isCompleted || isPast
                          ? `${item.accent}15`
                          : `${C.borderSubtle}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      color: isActive
                        ? item.accent
                        : isCompleted || isPast
                          ? `${item.accent}90`
                          : isUnlocked
                            ? C.textMuted
                            : C.textMuted,
                    }}
                  >
                    <Icon size={14} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "13px", fontWeight: isActive ? 600 : 500, color: isActive ? item.accent : isCompleted || isPast ? C.textSecondary : C.textMuted }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: "10px", color: C.textMuted }}>{item.sublabel}</div>
                    <div style={{ fontSize: "10px", color: isCompleted ? "#10b981" : isUnlocked ? C.textMuted : "#f59e0b", marginTop: "2px" }}>
                      {isUnlocked ? statusLabel : "请先完成上一流程"}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      color: isActive ? item.accent : C.textMuted,
                      opacity: 0.6,
                    }}
                  >
                    {String(item.step).padStart(2, "0")}
                  </div>
                </div>

                {/* Connector */}
                {i < navItems.length - 1 && (
                  <div
                    style={{
                      margin: "2px auto",
                      width: "1px",
                      height: "12px",
                      background: isCompleted || isPast || isActive ? `${item.accent}50` : C.borderSubtle,
                    }}
                  />
                )}
              </NavLink>
            );
          })}

          <div style={{ flex: 1 }} />

          {/* Bottom: demo note */}
          <div
            style={{
              margin: "0 10px",
              padding: "10px 12px",
              background: "rgba(245,158,11,0.08)",
              border: "1px solid rgba(245,158,11,0.2)",
              borderRadius: "10px",
            }}
          >
            <div style={{ fontSize: "10px", fontWeight: 600, color: "#f59e0b", marginBottom: "4px" }}>
              Demo 模式
            </div>
            <div style={{ fontSize: "10px", color: C.textMuted, lineHeight: 1.5 }}>
              部分数据基于demo mode，标注来源可查
            </div>
            <button
              onClick={() => resetRuntimeState()}
              style={{
                marginTop: "10px",
                width: "100%",
                height: "34px",
                borderRadius: "8px",
                border: `1px solid ${C.borderSubtle}`,
                background: "rgba(148,163,184,0.08)",
                color: C.textSecondary,
                fontSize: "11px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              一键重置流程
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main
          style={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
            padding: "24px",
            background: C.bgBase,
          }}
        >
          <Outlet />
          <div
            style={{
              position: "sticky",
              bottom: 0,
              marginTop: "20px",
              paddingTop: "12px",
              background:
                "linear-gradient(180deg, rgba(4,12,28,0), rgba(4,12,28,0.92) 35%, rgba(4,12,28,0.98) 100%)",
            }}
          >
            <div
              style={{
                border: `1px solid ${C.borderSubtle}`,
                borderRadius: "16px",
                background: "rgba(7,20,40,0.92)",
                backdropFilter: "blur(12px)",
                padding: "14px 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "16px",
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "4px",
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: currentItem.accent,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                    }}
                  >
                    STEP 0{currentItem.step} · {currentItem.stageLabel}
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      color: C.textSecondary,
                    }}
                  >
                    {currentItem.businessTitle}
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      color: "#a78bfa",
                      background: "rgba(139,92,246,0.12)",
                      border: "1px solid rgba(139,92,246,0.25)",
                      borderRadius: "999px",
                      padding: "2px 8px",
                    }}
                  >
                    当前路线 · {selectedMaterial.material_name}
                  </span>
                </div>
                <div style={{ fontSize: "13px", color: C.textSecondary, lineHeight: 1.5 }}>
                  {currentItem.summary}
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                {prevItem && (
                  <button
                    onClick={() => navigate(prevItem.path)}
                    style={{
                      padding: "10px 14px",
                      borderRadius: "10px",
                      border: `1px solid ${C.borderSubtle}`,
                      background: "transparent",
                      color: C.textSecondary,
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    返回上一步
                  </button>
                )}
                <button
                  onClick={() => {
                    if (nextActionEnabled) {
                      navigate(nextItem ? nextItem.path : "/");
                    }
                  }}
                  style={{
                    padding: "10px 16px",
                    borderRadius: "10px",
                    border: `1px solid ${nextActionEnabled ? `${currentItem.accent}55` : C.borderSubtle}`,
                    background: nextActionEnabled ? `${currentItem.accent}20` : "rgba(148,163,184,0.08)",
                    color: nextActionEnabled ? currentItem.accent : C.textMuted,
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: nextActionEnabled ? "pointer" : "not-allowed",
                    boxShadow: nextActionEnabled ? `0 0 24px ${currentItem.accent}15` : "none",
                    opacity: nextActionEnabled ? 1 : 0.7,
                  }}
                  disabled={!nextActionEnabled}
                >
                  {nextItem && !nextActionEnabled ? "请先完成当前流程" : currentItem.primaryAction}
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
      <AssistantDrawer
        moduleKey={currentItem.flowKey}
        routePath={location.pathname}
        moduleTitle={currentItem.businessTitle}
        moduleSummary={currentItem.summary}
        selectedMaterialId={selectedMaterial.material_id}
        context={assistantContext}
      />
    </div>
  );
}
