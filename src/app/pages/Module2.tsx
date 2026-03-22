import React from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  CheckCircle2,
  AlertTriangle,
  CloudUpload,
  Cpu,
  Database,
  ShieldAlert,
} from "lucide-react";
import { demoData } from "../data/demoData";
import {
  C,
  DataCard,
  CardHeader,
  ModuleHeader,
  ProgressBar,
  SourceBadge,
  MetaChip,
  EvidenceListItem,
  RevealBlock,
} from "../components/shared";
import { usePersistentModuleFlow } from "../hooks/usePersistentModuleFlow";

const pipelineLabels = [
  "点位数据归并",
  "链路校验与补传对账",
  "风险模型打分",
  "预处理建议输出",
];

const icons = [Database, CloudUpload, Cpu, ShieldAlert];

export default function Module2() {
  const { diagnosis, batch } = demoData;
  const {
    progress,
    currentStepLabel,
    revealCount,
    isComplete,
    remainingSeconds,
    statusText,
    stepProgressPct,
    rerun,
  } = usePersistentModuleFlow("cloud", {
    durationMs: 10000,
    stepLabels: ["点位归并", "补传对账", "风险建模", "建议输出"],
  });
  const flowStatusDetail = isComplete
    ? "状态：风险诊断流程已完成"
    : `状态：风险诊断计算中 · 预计剩余 ${remainingSeconds}s`;

  const radarData = diagnosis.risk_dimensions.map((item) => ({
    subject: item.name,
    value: item.score,
    fullMark: 100,
  }));

  return (
    <div>
      <ModuleHeader
        step={2}
        title="锰渣批次风险诊断与预处理判定"
        description="云端中枢 · 将采样数据转化为风险等级、超标项与预处理建议"
        deliverables={["风险等级", "超标证据", "预处理建议"]}
        accentColor={C.blue}
        statusLabel={isComplete ? "诊断完成" : currentStepLabel}
        statusColor={isComplete ? C.green : C.blue}
      />

      <div
        style={{
          padding: "12px 16px",
          borderRadius: "12px",
          border: `1px solid ${C.borderSubtle}`,
          background: "rgba(59,130,246,0.08)",
          marginBottom: "16px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", gap: "16px" }}>
          <div>
            <div style={{ fontSize: "11px", color: C.textMuted }}>诊断处理流</div>
            <div style={{ fontSize: "13px", fontWeight: 700, color: C.textSecondary, marginTop: "2px" }}>{currentStepLabel}</div>
            <div style={{ fontSize: "10px", color: C.textMuted, marginTop: "4px" }}>{flowStatusDetail}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {isComplete && (
              <button
                onClick={rerun}
                style={{
                  border: `1px solid ${C.blue}55`,
                  background: "rgba(59,130,246,0.14)",
                  color: C.blue,
                  borderRadius: "999px",
                  padding: "4px 10px",
                  fontSize: "10px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                重新上传
              </button>
            )}
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: C.blue }}>{statusText}</div>
              <div style={{ fontSize: "10px", color: C.textMuted, marginTop: "4px" }}>
                {isComplete ? "预计剩余 0s" : `预计剩余 ${remainingSeconds}s`}
              </div>
              <div style={{ fontSize: "10px", color: C.textMuted }}>阶段进度 {Math.round(stepProgressPct)}%</div>
            </div>
          </div>
        </div>
        <ProgressBar value={progress} accent={C.blue} height={6} />
      </div>

      <RevealBlock show={revealCount >= 2} delayMs={80}>
        <div
          style={{
            background: "linear-gradient(135deg, rgba(239,68,68,0.1), rgba(245,158,11,0.08))",
            border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: "14px",
            padding: "16px 20px",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            gap: "20px",
            flexWrap: "wrap",
          }}
        >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <AlertTriangle size={28} color={C.red} />
          <div>
            <div style={{ fontSize: "11px", color: C.textMuted }}>综合风险等级</div>
            <div style={{ fontSize: "28px", fontWeight: 800, color: C.red }}>
              {diagnosis.risk_level}风险
            </div>
          </div>
        </div>
        <MetaChip label="综合分数" value={`${diagnosis.risk_score}/100`} color={C.red} />
        <MetaChip label="模型版本" value={diagnosis.model_version} color={C.blue} />
        <MetaChip label="判定可信度" value={`${Math.round(diagnosis.confidence * 100)}%`} color={C.green} />
        <MetaChip label="诊断时间" value={batch.timestamps.diagnosed_at} />
        <SourceBadge type={diagnosis.source_type} />
        </div>
      </RevealBlock>

      <div style={{ display: "grid", gridTemplateColumns: "0.95fr 1.1fr 1fr", gap: "16px", marginBottom: "16px" }}>
        <DataCard>
          <CardHeader title="云端处理管线" subtitle="上传、校验、建模、输出" accent={C.blue} />
          <div style={{ padding: "16px" }}>
            {pipelineLabels.map((label, index) => {
              const Icon = icons[index];
              const done = index < 3 || progress >= 100;
              return (
                <div key={label}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "10px 12px",
                      borderRadius: "10px",
                      background: done ? `${C.blue}14` : "transparent",
                      border: done ? `1px solid ${C.blue}35` : `1px solid transparent`,
                    }}
                  >
                    <div
                      style={{
                        width: "34px",
                        height: "34px",
                        borderRadius: "9px",
                        background: done ? `${C.blue}22` : `${C.borderSubtle}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: done ? C.blue : C.textMuted,
                      }}
                    >
                      {done ? <CheckCircle2 size={15} /> : <Icon size={15} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "12px", fontWeight: 600, color: done ? C.textPrimary : C.textMuted }}>
                        {label}
                      </div>
                      <div style={{ fontSize: "10px", color: C.textMuted, marginTop: "2px" }}>
                        {index === 0 && "采样点位与批次上下文合并"}
                        {index === 1 && "SP-02 延迟补传已对账成功"}
                        {index === 2 && "风险维度分值与置信度已输出"}
                        {index === 3 && "生成预处理建议并进入路由寻优"}
                      </div>
                    </div>
                  </div>
                  {index < pipelineLabels.length - 1 && (
                    <div style={{ display: "flex", justifyContent: "center", height: "14px" }}>
                      <div style={{ width: "1px", background: `${C.blue}33` }} />
                    </div>
                  )}
                </div>
              );
            })}

            <div style={{ marginTop: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ fontSize: "11px", color: C.textMuted }}>处理进度</span>
                <span style={{ fontSize: "11px", fontWeight: 700, color: C.blue }}>
                  {Math.round(progress)}%
                </span>
              </div>
              <ProgressBar value={progress} accent={C.blue} height={5} />
            </div>
          </div>
        </DataCard>

        {revealCount >= 3 ? (
        <RevealBlock show={revealCount >= 3} delayMs={120}>
        <DataCard>
          <CardHeader title="风险维度雷达" subtitle="风险维度--触发" accent={C.purple} />
          <div style={{ padding: "12px 16px" }}>
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(6,182,212,0.15)" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fill: C.textSecondary, fontSize: 12 }}
                />
                <Radar
                  name="风险评分"
                  dataKey="value"
                  stroke={C.red}
                  fill={C.red}
                  fillOpacity={0.2}
                  strokeWidth={2}
                  dot={{ fill: C.red, r: 4, strokeWidth: 0 }}
                />
                <Tooltip
                  contentStyle={{
                    background: C.bgCard,
                    border: `1px solid ${C.borderSubtle}`,
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: C.textPrimary,
                  }}
                  formatter={(value: number) => [`${value}/100`, "风险评分"]}
                />
              </RadarChart>
            </ResponsiveContainer>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "8px" }}>
              {diagnosis.risk_dimensions.map((item) => (
                <MetaChip key={item.name} label={item.name} value={`${item.score} / 100`} color={item.score >= 80 ? C.red : item.score >= 60 ? C.amber : C.green} />
              ))}
            </div>
          </div>
        </DataCard>
        </RevealBlock>
        ) : (
          <DataCard>
            <CardHeader title="风险维度雷达" subtitle="建模处理中" accent={C.purple} />
            <div style={{ padding: "20px 16px", color: C.textMuted, fontSize: "12px" }}>
              正在计算各风险维度权重与评分，请稍候...
            </div>
          </DataCard>
        )}

        {revealCount >= 4 ? (
        <RevealBlock show={revealCount >= 4} delayMs={180}>
        <DataCard>
          <CardHeader
            title="AI 结论"
            subtitle="证据聚合"
            accent={C.green}
          />
          <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: "10px" }}>
            <EvidenceListItem
              title="综合判定"
              detail={`风险等级 ${diagnosis.risk_level}，综合分数 ${diagnosis.risk_score}/100，可信度 ${Math.round(diagnosis.confidence * 100)}%。`}
              right={<SourceBadge type={diagnosis.source_type} />}
            />
            {diagnosis.pretreatment_advice.map((item, index) => (
              <EvidenceListItem
                key={item}
                title={`预处理建议 ${index + 1}`}
                detail={`${item}：由 ${diagnosis.evidence[index]?.metric ?? "关键指标"} 触发。`}
              />
            ))}
          </div>
        </DataCard>
        </RevealBlock>
        ) : (
          <DataCard>
            <CardHeader title="AI 结论" subtitle="等待建议输出" accent={C.green} />
            <div style={{ padding: "20px 16px", color: C.textMuted, fontSize: "12px" }}>
              预处理建议将在风险建模结束后生成。
            </div>
          </DataCard>
        )}
      </div>

      <RevealBlock show={isComplete} delayMs={220}>
      <DataCard>
        <CardHeader
          title="诊断证据明细"
          subtitle="指标--测得值--阈值--判定依据--结论"
          accent={C.red}
        />
        <div style={{ padding: "12px 16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr 1.3fr 1.8fr", gap: "10px", fontSize: "10px", color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "10px" }}>
            <div>指标</div>
            <div>测得值</div>
            <div>阈值</div>
            <div>判定依据</div>
            <div>结论</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {diagnosis.evidence.map((item) => (
              <div
                key={item.metric}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.2fr 1fr 1fr 1.3fr 1.8fr",
                  gap: "10px",
                  padding: "10px 12px",
                  borderRadius: "10px",
                  border: `1px solid ${C.borderSubtle}`,
                  background: C.bgCardHover,
                  alignItems: "start",
                }}
              >
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: C.textPrimary }}>{item.metric}</div>
                  <div style={{ marginTop: "4px" }}>
                    <SourceBadge type={item.source_type} />
                  </div>
                </div>
                <div style={{ fontSize: "12px", fontWeight: 700, color: C.red }}>
                  {item.measured_value} {item.unit}
                </div>
                <div style={{ fontSize: "11px", color: C.textSecondary }}>
                  {item.threshold} {item.threshold_unit}
                </div>
                <div style={{ fontSize: "11px", color: C.textMuted, lineHeight: 1.5 }}>
                  {item.standard_ref}
                </div>
                <div style={{ fontSize: "11px", color: C.textSecondary, lineHeight: 1.5 }}>
                  <div style={{ color: C.textPrimary, fontWeight: 600 }}>{item.conclusion}</div>
                  <div style={{ marginTop: "4px", color: C.textMuted }}>{item.severity_reason}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </DataCard>
      </RevealBlock>
    </div>
  );
}
