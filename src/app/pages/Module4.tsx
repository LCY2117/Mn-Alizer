import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { CheckCircle2, TrendingDown, ShieldCheck, FileSearch } from "lucide-react";
import { demoData } from "../data/demoData";
import {
  C,
  DataCard,
  CardHeader,
  ModuleHeader,
  SourceBadge,
  MetaChip,
  EvidenceListItem,
  RevealBlock,
} from "../components/shared";
import { useDemoContext } from "../context/DemoContext";
import { usePersistentModuleFlow } from "../hooks/usePersistentModuleFlow";

const MATERIAL_ACCENTS: Record<string, string> = {
  low_carbon_binder: C.green,
  roadbase_repair: C.blue,
  soft_soil_stabilizer: C.cyan,
  soil_remediation: C.purple,
};

export default function Module4() {
  const { performance, roi, materials, documents } = demoData;
  const { selectedMaterial, selectedMaterialId, setSelectedMaterialId } =
    useDemoContext();
  const selectedPerformance =
    performance[selectedMaterialId as keyof typeof performance];
  const selectedRoi = roi.by_material[selectedMaterialId as keyof typeof roi.by_material];
  const accent = MATERIAL_ACCENTS[selectedMaterialId] || C.green;
  const evidenceDoc =
    documents.find((doc) => doc.doc_id === selectedPerformance.evidence_ref) ?? null;
  const {
    progress,
    currentStepLabel,
    revealCount,
    isComplete,
    remainingSeconds,
    statusText,
    stepProgressPct,
    rerun,
  } = usePersistentModuleFlow("twin", {
    durationMs: 10000,
    stepLabels: ["载入试验锚点", "计算强度面板", "核算 ROI", "输出结论"],
  });

  const strengthData = [
    { day: "3d", value: selectedPerformance.strength_mpa.d3 },
    { day: "7d", value: selectedPerformance.strength_mpa.d7 },
    { day: "28d", value: selectedPerformance.strength_mpa.d28 },
  ];
  const knownStrength =
    selectedPerformance.strength_mpa.d28 ??
    selectedPerformance.strength_mpa.d7 ??
    selectedPerformance.strength_mpa.d3;
  const savingsPct = Math.round(
    ((roi.traditional_cost_per_ton - selectedRoi.solution_cost_per_ton) /
      roi.traditional_cost_per_ton) *
      100,
  );
  const flowStatusDetail = isComplete
    ? "状态：性能与价值核算已完成"
    : `状态：性能与价值核算中 · 预计剩余 ${remainingSeconds}s`;

  return (
    <div>
      <ModuleHeader
        step={4}
        title="资源化方案性能预测与价值核算"
        description="数字孪生 · 联动强度、合规、成本与收益，验证方案可实施性"
        deliverables={["强度预测", "合规结论", "ROI 测算"]}
        accentColor={C.green}
        statusLabel={isComplete ? "核算完成" : currentStepLabel}
        statusColor={isComplete ? C.green : accent}
      />

      <div
        style={{
          padding: "12px 16px",
          borderRadius: "12px",
          border: `1px solid ${C.borderSubtle}`,
          background: `${accent}12`,
          marginBottom: "16px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", gap: "16px" }}>
          <div>
            <div style={{ fontSize: "11px", color: C.textMuted }}>性能与价值核算流</div>
            <div style={{ fontSize: "13px", fontWeight: 700, color: C.textSecondary, marginTop: "2px" }}>{currentStepLabel}</div>
            <div style={{ fontSize: "10px", color: C.textMuted, marginTop: "4px" }}>{flowStatusDetail}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {isComplete && (
              <button
                onClick={rerun}
                style={{
                  border: `1px solid ${accent}55`,
                  background: `${accent}14`,
                  color: accent,
                  borderRadius: "999px",
                  padding: "4px 10px",
                  fontSize: "10px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                重新核算
              </button>
            )}
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: accent }}>{statusText}</div>
              <div style={{ fontSize: "10px", color: C.textMuted, marginTop: "4px" }}>
                {isComplete ? "预计剩余 0s" : `预计剩余 ${remainingSeconds}s`}
              </div>
              <div style={{ fontSize: "10px", color: C.textMuted }}>阶段进度 {Math.round(stepProgressPct)}%</div>
            </div>
          </div>
        </div>
        <div style={{ height: "6px", background: `${accent}20`, borderRadius: "999px", overflow: "hidden" }}>
          <div style={{ width: `${progress}%`, height: "100%", background: `linear-gradient(90deg, ${accent}80, ${accent})` }} />
        </div>
      </div>

      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
        {materials.map((material) => {
          const isActive = material.material_id === selectedMaterialId;
          const materialAccent = MATERIAL_ACCENTS[material.material_id] || C.cyan;
          return (
            <button
              key={material.material_id}
              onClick={() => setSelectedMaterialId(material.material_id)}
              style={{
                padding: "8px 12px",
                borderRadius: "999px",
                border: `1px solid ${isActive ? materialAccent : C.borderSubtle}`,
                background: isActive ? `${materialAccent}20` : "transparent",
                color: isActive ? materialAccent : C.textSecondary,
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {material.material_name}
            </button>
          );
        })}
      </div>

      <RevealBlock show={revealCount >= 2} delayMs={80}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "16px" }}>
        <MetaChip label="当前路线" value={selectedMaterial.material_name} color={accent} />
        <MetaChip label="已知强度锚点" value={knownStrength !== null ? `${knownStrength} MPa` : "待补中试"} color={knownStrength !== null ? accent : C.amber} />
        <MetaChip label="单吨成本" value={`¥${selectedRoi.solution_cost_per_ton}/吨`} color={C.green} />
        <MetaChip label="综合节省" value={`¥${selectedRoi.gross_saving.toLocaleString()}`} color={C.amber} />
      </div>
      </RevealBlock>

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: "16px", marginBottom: "16px" }}>
        <DataCard glowing accent={accent}>
          <CardHeader
            title={`强度与合规 · ${selectedMaterial.material_name}`}
            subtitle="强度曲线、标准徽章、试验依据"
            accent={accent}
            right={<SourceBadge type={selectedPerformance.source_type} />}
          />
          {revealCount >= 2 ? (
          <div style={{ padding: "10px 12px 0" }}>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={strengthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(6,182,212,0.08)" />
                <XAxis dataKey="day" tick={{ fill: C.textMuted, fontSize: 11 }} axisLine={{ stroke: C.borderSubtle }} tickLine={false} />
                <YAxis tick={{ fill: C.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: C.bgCard,
                    border: `1px solid ${C.borderSubtle}`,
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: C.textPrimary,
                  }}
                  formatter={(value: number | null) => [value !== null ? `${value} MPa` : "待补", "强度"]}
                />
                <ReferenceLine y={42.5} stroke="rgba(245,158,11,0.5)" strokeDasharray="4 3" />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={accent}
                  strokeWidth={2.5}
                  dot={{ fill: accent, r: 5, strokeWidth: 0 }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          ) : (
            <div style={{ padding: "20px 16px", color: C.textMuted, fontSize: "12px" }}>
              正在载入试验锚点与合规依据...
            </div>
          )}
          <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: "8px" }}>
            <EvidenceListItem
              title="试验依据"
              detail={selectedPerformance.test_basis}
              right={<SourceBadge type={selectedPerformance.source_type} />}
            />
            <EvidenceListItem
              title="合规说明"
              detail={selectedPerformance.compliance_note}
              right={
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                  {selectedPerformance.standard_badges.map((badge) => (
                    <span
                      key={badge}
                      style={{
                        fontSize: "10px",
                        padding: "3px 8px",
                        borderRadius: "999px",
                        border: `1px solid ${C.borderSubtle}`,
                        color: C.textSecondary,
                      }}
                    >
                      {badge}
                    </span>
                  ))}
                </div>
              }
            />
            {evidenceDoc && (
              <EvidenceListItem
                title={evidenceDoc.title}
                detail={`${evidenceDoc.doc_type} · ${evidenceDoc.owner} · ${evidenceDoc.status} · ${evidenceDoc.summary}`}
                right={<FileSearch size={14} color={accent} />}
              />
            )}
          </div>
        </DataCard>

        {revealCount >= 3 ? (
        <RevealBlock show={revealCount >= 3} delayMs={140}>
        <DataCard glowing accent={C.amber}>
          <CardHeader
            title="分路线 ROI"
            subtitle="单吨成本、总成本、盈利说明、运输敏感性"
            accent={C.amber}
            right={<SourceBadge type={selectedRoi.source_type} />}
          />
          <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <MetaChip label="传统处置" value={`¥${roi.traditional_cost_per_ton}/吨`} color={C.red} />
              <MetaChip label="当前方案" value={`¥${selectedRoi.solution_cost_per_ton}/吨`} color={C.green} />
              <MetaChip label="总成本" value={`¥${selectedRoi.solution_total_cost.toLocaleString()}`} color={C.cyan} />
              <MetaChip label="节省比例" value={`${savingsPct}%`} color={C.amber} />
            </div>

            <div
              style={{
                padding: "14px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, rgba(16,185,129,0.12), rgba(6,182,212,0.08))",
                border: "1px solid rgba(16,185,129,0.3)",
              }}
            >
              <div style={{ fontSize: "11px", color: C.textMuted }}>当前路线综合节省</div>
              <div style={{ fontSize: "32px", fontWeight: 800, color: C.green, marginTop: "4px" }}>
                ¥{(selectedRoi.gross_saving / 10000).toFixed(1)}万
              </div>
              <div style={{ fontSize: "12px", color: C.green, marginTop: "4px" }}>
                相比传统处置单吨节省 ¥{roi.traditional_cost_per_ton - selectedRoi.solution_cost_per_ton}
              </div>
            </div>

            <EvidenceListItem
              title="盈利说明"
              detail={selectedRoi.profitability_note}
              right={<TrendingDown size={14} color={C.green} />}
            />
            <EvidenceListItem
              title="运输敏感性"
              detail={selectedRoi.transport_sensitivity}
              right={<ShieldCheck size={14} color={C.amber} />}
            />

            <div>
              <div style={{ fontSize: "11px", color: C.textMuted, marginBottom: "8px" }}>成本依据</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {selectedRoi.cost_basis.map((item) => (
                  <EvidenceListItem key={item} title="成本锚点" detail={item} />
                ))}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
              <MetaChip label="水泥锚点" value={`¥${roi.market_anchors.cement_price_cny_per_ton}/吨`} color={C.blue} />
              <MetaChip label="石灰锚点" value={`¥${roi.market_anchors.lime_price_cny_per_ton}/吨`} color={C.green} />
              <MetaChip label="粉煤灰锚点" value={`¥${roi.market_anchors.flyash_price_cny_per_ton}/吨`} color={C.cyan} />
            </div>
          </div>
        </DataCard>
        </RevealBlock>
        ) : (
          <DataCard glowing accent={C.amber}>
            <CardHeader title="分路线 ROI" subtitle="收益核算中" accent={C.amber} />
            <div style={{ padding: "20px 16px", color: C.textMuted, fontSize: "12px" }}>
              正在根据当前路线汇总成本锚点、运输敏感性和盈利说明...
            </div>
          </DataCard>
        )}
      </div>

      <RevealBlock show={isComplete} delayMs={220}>
      <DataCard>
        <CardHeader title="路线经济性横向对比" subtitle="同一批次下，四条路线的成本和节省空间不同" accent={C.purple} />
        <div style={{ padding: "12px 16px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
          {materials.map((material) => {
            const item = roi.by_material[material.material_id as keyof typeof roi.by_material];
            const active = material.material_id === selectedMaterialId;
            return (
              <div
                key={material.material_id}
                style={{
                  padding: "12px",
                  borderRadius: "12px",
                  border: `1px solid ${active ? `${accent}60` : C.borderSubtle}`,
                  background: active ? `${accent}12` : C.bgCardHover,
                }}
              >
                <div style={{ fontSize: "13px", fontWeight: 700, color: active ? accent : C.textPrimary }}>
                  {material.material_name}
                </div>
                <div style={{ fontSize: "11px", color: C.textMuted, marginTop: "6px" }}>
                  成本 ¥{item.solution_cost_per_ton}/吨
                </div>
                <div style={{ fontSize: "18px", fontWeight: 800, color: C.green, marginTop: "6px" }}>
                  ¥{(item.gross_saving / 10000).toFixed(1)}万
                </div>
                <div style={{ fontSize: "10px", color: C.textMuted, marginTop: "4px" }}>综合节省</div>
              </div>
            );
          })}
        </div>
      </DataCard>
      </RevealBlock>
    </div>
  );
}
