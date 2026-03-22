import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { CheckCircle2, Star, ShieldCheck, FileSearch } from "lucide-react";
import { demoData } from "../data/demoData";
import {
  C,
  DataCard,
  CardHeader,
  ModuleHeader,
  SourceBadge,
  ScoreRing,
  MetaChip,
  EvidenceListItem,
  RevealBlock,
} from "../components/shared";
import { useDemoContext } from "../context/DemoContext";
import { usePersistentModuleFlow } from "../hooks/usePersistentModuleFlow";

const MATERIAL_ACCENTS: Record<string, string> = {
  low_carbon_binder: C.cyan,
  roadbase_repair: C.green,
  soft_soil_stabilizer: C.blue,
  soil_remediation: C.purple,
};

export default function Module3() {
  const { materials, documents } = demoData;
  const { selectedMaterialId, setSelectedMaterialId, selectedMaterial } =
    useDemoContext();
  const {
    progress,
    currentStepLabel,
    revealCount,
    isComplete,
    remainingSeconds,
    statusText,
    stepProgressPct,
    rerun,
  } = usePersistentModuleFlow("ai-brain", {
    durationMs: 9000,
    stepLabels: ["路线筛选", "匹配计算", "证据聚合", "输出推荐"],
  });
  const accent = MATERIAL_ACCENTS[selectedMaterialId] || C.cyan;
  const flowStatusDetail = isComplete
    ? "状态：路线筛选与配方寻优已完成"
    : `状态：路线筛选与配方寻优中 · 预计剩余 ${remainingSeconds}s`;

  const relatedDocs = documents.filter(
    (doc) =>
      selectedMaterial.evidence_refs.includes(doc.doc_id) ||
      selectedMaterial.evidence_refs.includes(doc.related_material ?? ""),
  );

  const matchData = materials.map((item) => ({
    id: item.material_id,
    name: item.material_name,
    score: item.match_score,
  }));

  return (
    <div>
      <ModuleHeader
        step={3}
        title="锰渣资源化路径决策与配方寻优"
        description="AI 大脑 · 比较四类资源化路线，输出最优去向与配方依据"
        deliverables={["推荐路线", "配方 BOM", "推荐依据"]}
        accentColor={C.purple}
        statusLabel={isComplete ? "路线审查完成" : currentStepLabel}
        statusColor={isComplete ? C.green : C.purple}
      />

      <div
        style={{
          padding: "12px 16px",
          borderRadius: "12px",
          border: `1px solid ${C.borderSubtle}`,
          background: "rgba(139,92,246,0.08)",
          marginBottom: "16px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", gap: "16px" }}>
          <div>
            <div style={{ fontSize: "11px", color: C.textMuted }}>AI 寻优进度</div>
            <div style={{ fontSize: "13px", fontWeight: 700, color: C.textSecondary, marginTop: "2px" }}>{currentStepLabel}</div>
            <div style={{ fontSize: "10px", color: C.textMuted, marginTop: "4px" }}>{flowStatusDetail}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {isComplete && (
              <button
                onClick={rerun}
                style={{
                  border: `1px solid ${C.purple}55`,
                  background: "rgba(139,92,246,0.14)",
                  color: C.purple,
                  borderRadius: "999px",
                  padding: "4px 10px",
                  fontSize: "10px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                重新寻优
              </button>
            )}
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: C.purple }}>{statusText}</div>
              <div style={{ fontSize: "10px", color: C.textMuted, marginTop: "4px" }}>
                {isComplete ? "预计剩余 0s" : `预计剩余 ${remainingSeconds}s`}
              </div>
              <div style={{ fontSize: "10px", color: C.textMuted }}>阶段进度 {Math.round(stepProgressPct)}%</div>
            </div>
          </div>
        </div>
        <div style={{ height: "6px", background: "rgba(139,92,246,0.18)", borderRadius: "999px", overflow: "hidden" }}>
          <div style={{ width: `${progress}%`, height: "100%", background: "linear-gradient(90deg, rgba(139,92,246,0.6), rgba(139,92,246,1))" }} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "16px" }}>
        {materials.map((material) => {
          const isActive = material.material_id === selectedMaterialId;
          const isRecommended = material.is_recommended;
          const materialAccent = MATERIAL_ACCENTS[material.material_id] || C.cyan;
          return (
            <div
              key={material.material_id}
              onClick={() => setSelectedMaterialId(material.material_id)}
              style={{
                background: isActive ? `${materialAccent}15` : C.bgCard,
                border: `1px solid ${isActive ? `${materialAccent}60` : C.borderSubtle}`,
                borderRadius: "14px",
                padding: "16px",
                cursor: "pointer",
                position: "relative",
                boxShadow: isActive ? `0 0 20px ${materialAccent}18` : "none",
              }}
            >
              {isRecommended && (
                <div
                  style={{
                    position: "absolute",
                    top: "10px",
                    right: "10px",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "2px 8px",
                    borderRadius: "999px",
                    background: `${C.green}20`,
                    border: `1px solid ${C.green}45`,
                  }}
                >
                  <Star size={8} color={C.green} fill={C.green} />
                  <span style={{ fontSize: "9px", fontWeight: 700, color: C.green }}>首推</span>
                </div>
              )}
              <ScoreRing score={material.match_score} size={72} accent={materialAccent} />
              <div style={{ fontSize: "14px", fontWeight: 700, color: isActive ? materialAccent : C.textPrimary, marginTop: "8px" }}>
                {material.material_name}
              </div>
              <div style={{ fontSize: "11px", color: C.textMuted, lineHeight: 1.5, marginTop: "4px" }}>
                {material.reason}
              </div>
              <div style={{ display: "flex", gap: "6px", marginTop: "10px", flexWrap: "wrap" }}>
                <SourceBadge type={isRecommended ? "literature" : "demo_assumption"} />
                <span style={{ fontSize: "10px", color: isRecommended ? C.green : C.amber }}>
                  {material.eligibility}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
        <DataCard glowing accent={accent}>
          <CardHeader
            title={`路线审查卡 · ${selectedMaterial.material_name}`}
            subtitle="推荐、阻塞项、使用场景和不确定性"
            accent={accent}
            right={<SourceBadge type={selectedMaterial.is_recommended ? "literature" : "demo_assumption"} />}
          />
          <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
              <MetaChip label="可推荐性" value={selectedMaterial.eligibility} color={selectedMaterial.is_recommended ? C.green : C.amber} />
              <MetaChip label="预期场景" value={selectedMaterial.expected_use_case} color={accent} />
              <MetaChip label="证据引用" value={`${selectedMaterial.evidence_refs.length} 条`} color={C.blue} />
            </div>

            <EvidenceListItem
              title="推荐原因"
              detail={selectedMaterial.reason}
              right={
                selectedMaterial.is_recommended ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", color: C.green, fontSize: "11px", fontWeight: 700 }}>
                    <CheckCircle2 size={14} />
                    AI 首推
                  </div>
                ) : undefined
              }
            />

            <EvidenceListItem
              title="触发条件"
              detail={selectedMaterial.decision_triggers.join("；")}
              right={<ShieldCheck size={14} color={accent} />}
            />

            <EvidenceListItem
              title="当前不确定性"
              detail={selectedMaterial.uncertainty_note}
              right={<SourceBadge type="demo_assumption" />}
            />

            <div>
              <div style={{ fontSize: "11px", color: C.textMuted, marginBottom: "6px" }}>阻塞项</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {(selectedMaterial.blockers.length > 0 ? selectedMaterial.blockers : ["无明显阻塞项"]).map((blocker) => (
                  <div
                    key={blocker}
                    style={{
                      padding: "9px 10px",
                      borderRadius: "8px",
                      background: selectedMaterial.blockers.length > 0 ? "rgba(245,158,11,0.08)" : "rgba(16,185,129,0.08)",
                      border: `1px solid ${selectedMaterial.blockers.length > 0 ? "rgba(245,158,11,0.24)" : "rgba(16,185,129,0.24)"}`,
                      fontSize: "11px",
                      color: selectedMaterial.blockers.length > 0 ? C.textSecondary : C.green,
                    }}
                  >
                    {blocker}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DataCard>

        {revealCount >= 3 ? (
        <RevealBlock show={revealCount >= 3} delayMs={120}>
        <DataCard>
          <CardHeader title="配方与证据引用" subtitle="BOM + 文档锚点" accent={accent} />
          <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: "10px" }}>
            {selectedMaterial.bom.map((item) => (
              <div
                key={item.name}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.2fr 0.7fr 0.8fr 0.7fr",
                  gap: "10px",
                  padding: "10px 12px",
                  background: C.bgCardHover,
                  border: `1px solid ${C.borderSubtle}`,
                  borderRadius: "10px",
                  alignItems: "center",
                }}
              >
                <div style={{ fontSize: "12px", fontWeight: 600, color: C.textPrimary }}>{item.name}</div>
                <div style={{ fontSize: "12px", color: accent, fontWeight: 700 }}>{item.pct}%</div>
                <div style={{ fontSize: "11px", color: C.textSecondary }}>
                  {item.unit_price_cny_per_ton === null ? "待补充" : item.unit_price_cny_per_ton === 0 ? "废渣入料" : `¥${item.unit_price_cny_per_ton}/吨`}
                </div>
                <SourceBadge type={item.source_type} />
              </div>
            ))}

            <div style={{ marginTop: "4px" }}>
              <div style={{ fontSize: "11px", color: C.textMuted, marginBottom: "8px" }}>证据引用</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {relatedDocs.length > 0 ? (
                  relatedDocs.map((doc) => (
                    <EvidenceListItem
                      key={doc.doc_id}
                      title={doc.title}
                      detail={`${doc.doc_type} · ${doc.owner} · ${doc.status} · ${doc.summary}`}
                      right={<SourceBadge type={doc.source_type} />}
                    />
                  ))
                ) : (
                  <EvidenceListItem title="证据待补" detail="当前路线暂无直接文档锚点，需后续补实验或业务资料。" />
                )}
              </div>
            </div>
          </div>
        </DataCard>
        </RevealBlock>
        ) : (
          <DataCard>
            <CardHeader title="配方与证据引用" subtitle="证据聚合中" accent={accent} />
            <div style={{ padding: "20px 16px", color: C.textMuted, fontSize: "12px" }}>
              正在汇总 BOM、文档锚点和路线不确定性...
            </div>
          </DataCard>
        )}
      </div>

      <RevealBlock show={isComplete} delayMs={220}>
      <DataCard>
        <CardHeader title="四路线评分审查" subtitle="不仅有分数，还要能解释为什么高低有别" accent={C.purple} />
        <div style={{ padding: "8px 8px 12px" }}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={matchData} layout="vertical" margin={{ top: 0, right: 40, left: 12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(6,182,212,0.08)" horizontal={false} />
              <XAxis
                type="number"
                domain={[0, 100]}
                tick={{ fill: C.textMuted, fontSize: 10 }}
                axisLine={{ stroke: C.borderSubtle }}
                tickLine={false}
              />
              <YAxis
                dataKey="name"
                type="category"
                tick={{ fill: C.textSecondary, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={110}
              />
              <Tooltip
                contentStyle={{
                  background: C.bgCard,
                  border: `1px solid ${C.borderSubtle}`,
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: C.textPrimary,
                }}
                formatter={(value: number) => [`${value} 分`, "匹配度"]}
              />
              <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                {matchData.map((entry) => (
                  <Cell
                    key={entry.id}
                    fill={entry.id === selectedMaterialId ? MATERIAL_ACCENTS[entry.id] : `${MATERIAL_ACCENTS[entry.id]}70`}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ marginTop: "10px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
            {materials.map((material) => (
              <MetaChip
                key={material.material_id}
                label={material.material_name}
                value={material.blockers.length > 0 ? `阻塞 ${material.blockers.length} 条` : "阻塞 0 条"}
                color={material.blockers.length > 0 ? C.amber : C.green}
              />
            ))}
          </div>
        </div>
      </DataCard>
      </RevealBlock>
    </div>
  );
}
