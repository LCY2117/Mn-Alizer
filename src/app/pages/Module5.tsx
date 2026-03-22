import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { CheckCircle2, Leaf, Truck } from "lucide-react";
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

const TYPE_COLORS: Record<string, string> = {
  铁路工程: C.cyan,
  预制构件: C.blue,
  商混站: C.green,
};

export default function Module5() {
  const { buyers, carbon, batch, documents, roi, performance } = demoData;
  const { selectedMaterial, selectedMaterialId, setSelectedMaterialId } =
    useDemoContext();
  const [previewDocId, setPreviewDocId] = useState<string | null>(
    buyers.find((buyer) => buyer.required_material === selectedMaterialId)?.document_id ?? null,
  );
  const [isPlanConfirmed, setIsPlanConfirmed] = useState(false);

  const filteredBuyers = buyers.filter(
    (buyer) => buyer.required_material === selectedMaterialId,
  );
  const carbonData = carbon[selectedMaterialId as keyof typeof carbon];
  const previewDoc =
    documents.find((doc) => doc.doc_id === previewDocId) ?? null;
  const {
    progress,
    currentStepLabel,
    revealCount,
    isComplete,
    remainingSeconds,
    statusText,
    stepProgressPct,
    rerun,
  } = usePersistentModuleFlow("market", {
    durationMs: 9000,
    stepLabels: ["筛选目标客户", "生成合同摘要", "核算运输成本", "输出碳资产"],
  });

  const totalTons = filteredBuyers.reduce(
    (sum, buyer) => sum + buyer.planned_quantity_tons,
    0,
  );
  const totalTransport = filteredBuyers.reduce(
    (sum, buyer) => sum + buyer.estimated_transport_cost_cny,
    0,
  );

  const carbonChartData = Object.entries(carbon).map(([materialId, value]) => ({
    id: materialId,
    name:
      demoData.materials.find((material) => material.material_id === materialId)
        ?.material_name ?? materialId,
    tco2e: value.reduction_tco2e,
  }));

  const marketSummary = useMemo(() => {
    if (filteredBuyers.length === 0) {
      return "当前路线暂无直接商机卡，需补充目标客户或应用场景。";
    }
    return filteredBuyers.map((buyer) => buyer.match_reason).join("；");
  }, [filteredBuyers]);

  const selectedBuyer = useMemo(() => {
    return filteredBuyers.find((buyer) => buyer.document_id === previewDocId) ?? filteredBuyers[0] ?? null;
  }, [filteredBuyers, previewDocId]);

  useEffect(() => {
    setIsPlanConfirmed(false);
  }, [selectedMaterialId]);
  const flowStatusDetail = isComplete
    ? "状态：供需匹配与交付生成已完成"
    : `状态：供需匹配与交付生成中 · 预计剩余 ${remainingSeconds}s`;

  const openPlanDocument = () => {
    const url = new URL(`${window.location.origin}/plan-document`);
    url.searchParams.set("materialId", selectedMaterial.material_id);
    if (selectedBuyer) {
      url.searchParams.set("buyerId", selectedBuyer.buyer_id);
    }
    window.open(url.toString(), "_blank", "noopener,noreferrer");
  };

  return (
    <div>
      <ModuleHeader
        step={5}
        title="资源化产品供需撮合与低碳价值管理"
        description="商业闭环 · 连接买方需求、运输测算、方案交付与碳收益管理"
        deliverables={["目标买家", "交付方案", "碳收益结果"]}
        accentColor={C.amber}
        statusLabel={isComplete ? `${filteredBuyers.length} 个买家匹配` : currentStepLabel}
        statusColor={isComplete ? C.green : C.amber}
      />

      <div
        style={{
          padding: "12px 16px",
          borderRadius: "12px",
          border: `1px solid ${C.borderSubtle}`,
          background: "rgba(245,158,11,0.1)",
          marginBottom: "16px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", gap: "16px" }}>
          <div>
            <div style={{ fontSize: "11px", color: C.textMuted }}>商业闭环生成流</div>
            <div style={{ fontSize: "13px", fontWeight: 700, color: C.textSecondary, marginTop: "2px" }}>{currentStepLabel}</div>
            <div style={{ fontSize: "10px", color: C.textMuted, marginTop: "4px" }}>{flowStatusDetail}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {isComplete && (
              <button
                onClick={rerun}
                style={{
                  border: `1px solid ${C.amber}55`,
                  background: "rgba(245,158,11,0.14)",
                  color: C.amber,
                  borderRadius: "999px",
                  padding: "4px 10px",
                  fontSize: "10px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                重新生成
              </button>
            )}
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: C.amber }}>{statusText}</div>
              <div style={{ fontSize: "10px", color: C.textMuted, marginTop: "4px" }}>
                {isComplete ? "预计剩余 0s" : `预计剩余 ${remainingSeconds}s`}
              </div>
              <div style={{ fontSize: "10px", color: C.textMuted }}>阶段进度 {Math.round(stepProgressPct)}%</div>
            </div>
          </div>
        </div>
        <div style={{ height: "6px", background: "rgba(245,158,11,0.18)", borderRadius: "999px", overflow: "hidden" }}>
          <div style={{ width: `${progress}%`, height: "100%", background: "linear-gradient(90deg, rgba(245,158,11,0.7), rgba(245,158,11,1))" }} />
        </div>
      </div>

      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
        {demoData.materials.map((material) => {
          const isActive = material.material_id === selectedMaterialId;
          return (
            <button
              key={material.material_id}
              onClick={() => {
                setSelectedMaterialId(material.material_id);
                const nextBuyer = buyers.find((buyer) => buyer.required_material === material.material_id);
                setPreviewDocId(nextBuyer?.document_id ?? null);
              }}
              style={{
                padding: "8px 12px",
                borderRadius: "999px",
                border: `1px solid ${isActive ? C.amber : C.borderSubtle}`,
                background: isActive ? "rgba(245,158,11,0.16)" : "transparent",
                color: isActive ? C.amber : C.textSecondary,
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
        <MetaChip label="当前路线" value={selectedMaterial.material_name} color={C.amber} />
        <MetaChip label="已匹配需求量" value={`${totalTons.toLocaleString()} 吨`} color={C.cyan} />
        <MetaChip label="运输总成本" value={`¥${totalTransport.toLocaleString()}`} color={C.blue} />
        <MetaChip label="碳收益" value={`¥${carbonData.forward_revenue_cny.toLocaleString()}`} color={C.green} />
      </div>
      </RevealBlock>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr 1fr", gap: "16px", marginBottom: "16px" }}>
        <DataCard>
          <CardHeader title="商机池" subtitle="目标买家 + 当前联系阶段" accent={C.amber} />
          <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: "10px" }}>
            {filteredBuyers.length > 0 ? (
              filteredBuyers.map((buyer) => {
                const color = TYPE_COLORS[buyer.buyer_type] || C.cyan;
                const isActive = previewDocId === buyer.document_id;
                return (
                  <div
                    key={buyer.buyer_id}
                    style={{
                      padding: "12px",
                      borderRadius: "12px",
                      border: `1px solid ${isActive ? `${color}60` : `${color}25`}`,
                      background: isActive ? `${color}12` : `${color}08`,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
                      <div>
                        <div style={{ fontSize: "13px", fontWeight: 700, color: C.textPrimary }}>
                          {buyer.buyer_name}
                        </div>
                        <div style={{ fontSize: "11px", color: C.textMuted, marginTop: "3px" }}>
                          {buyer.buyer_type} · {buyer.distance_km} km · 匹配度 {buyer.match_score}
                        </div>
                      </div>
                      <SourceBadge type={buyer.source_type} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "10px" }}>
                      <MetaChip label="需求量" value={`${buyer.planned_quantity_tons.toLocaleString()} 吨`} color={color} />
                      <MetaChip label="有效期" value={buyer.quote_valid_until} color={C.amber} />
                      <MetaChip label="联系阶段" value={buyer.contact_stage} color={C.green} />
                      <MetaChip label="运输费" value={`¥${buyer.estimated_transport_cost_cny.toLocaleString()}`} color={C.blue} />
                    </div>
                    <div style={{ fontSize: "11px", color: C.textMuted, lineHeight: 1.5, marginTop: "10px" }}>
                      {buyer.match_reason}
                    </div>
                    <button
                      onClick={() => setPreviewDocId(buyer.document_id)}
                      style={{
                        marginTop: "10px",
                        width: "100%",
                        padding: "8px",
                        borderRadius: "8px",
                        border: `1px solid ${color}55`,
                        background: `${color}18`,
                        color,
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      查看合同摘要
                    </button>
                  </div>
                );
              })
            ) : (
              <EvidenceListItem
                title="暂无直接买家"
                detail="当前路线还没有直接绑定的商机池，需要补应用场景或目标客户。"
              />
            )}
          </div>
        </DataCard>

        {revealCount >= 2 ? (
        <RevealBlock show={revealCount >= 2} delayMs={120}>
        <DataCard>
          <CardHeader title="交易与派单预览" subtitle="合同摘要、派单逻辑、运输口径" accent={C.cyan} />
          <RevealBlock key={`${selectedMaterialId}-${previewDocId ?? "none"}`} show delayMs={0}>
          <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: "10px" }}>
            {previewDoc ? (
              <>
                <EvidenceListItem
                  title={previewDoc.title}
                  detail={`${previewDoc.doc_type} · ${previewDoc.owner} · ${previewDoc.status} · ${previewDoc.summary}`}
                  right={<SourceBadge type={previewDoc.source_type} />}
                />
                {filteredBuyers
                  .filter((buyer) => buyer.document_id === previewDoc.doc_id)
                  .map((buyer) => (
                    <div
                      key={buyer.buyer_id}
                      style={{
                        padding: "12px",
                        borderRadius: "12px",
                        border: `1px solid ${C.borderSubtle}`,
                        background: C.bgCardHover,
                      }}
                    >
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px" }}>
                        <MetaChip label="供货对象" value={buyer.buyer_name} color={C.textPrimary} />
                        <MetaChip label="材料类别" value={selectedMaterial.material_name} color={C.amber} />
                        <MetaChip label="数量" value={`${buyer.planned_quantity_tons.toLocaleString()} 吨`} color={C.cyan} />
                        <MetaChip label="运距" value={`${buyer.distance_km} km`} color={C.blue} />
                        <MetaChip label="预计运输费" value={`¥${buyer.estimated_transport_cost_cny.toLocaleString()}`} color={C.green} />
                        <MetaChip label="签约状态" value={buyer.contact_stage} color={C.amber} />
                      </div>
                    </div>
                  ))}
                <EvidenceListItem
                  title="撮合说明"
                  detail={marketSummary}
                  right={<Truck size={14} color={C.cyan} />}
                />
              </>
            ) : (
              <EvidenceListItem title="合同摘要待生成" detail="当前路线无直接单据，需由市场端新建商机后再生成派单单。" />
            )}
          </div>
          </RevealBlock>
        </DataCard>
        </RevealBlock>
        ) : (
          <DataCard>
            <CardHeader title="交易与派单预览" subtitle="合同摘要生成中" accent={C.cyan} />
            <div style={{ padding: "20px 16px", color: C.textMuted, fontSize: "12px" }}>
              正在根据当前路线生成供货对象、数量、运距和签约状态...
            </div>
          </DataCard>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {revealCount >= 4 ? (
          <RevealBlock show={revealCount >= 4} delayMs={180}>
          <DataCard glowing accent={C.green}>
            <CardHeader
              title="碳资产证据"
              subtitle={`当前路线 · ${selectedMaterial.material_name}`}
              accent={C.green}
              right={<SourceBadge type={carbonData.source_type} />}
            />
            <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <MetaChip label="减排量" value={`${carbonData.reduction_tco2e.toLocaleString()} tCO₂e`} color={C.green} />
                <MetaChip label="远期收益" value={`¥${carbonData.forward_revenue_cny.toLocaleString()}`} color={C.amber} />
              </div>
              <EvidenceListItem title="核算方法" detail={carbonData.method_note} />
              <EvidenceListItem title="因子来源" detail={carbonData.factor_source} />
            </div>
          </DataCard>
          </RevealBlock>
          ) : (
            <DataCard glowing accent={C.green}>
              <CardHeader title="碳资产证据" subtitle="碳收益核算中" accent={C.green} />
              <div style={{ padding: "20px 16px", color: C.textMuted, fontSize: "12px" }}>
                正在根据当前路线汇总减排量、收益和因子来源...
              </div>
            </DataCard>
          )}

          {revealCount >= 4 ? (
          <RevealBlock show={revealCount >= 4} delayMs={220}>
          <DataCard>
            <CardHeader title="四路线碳减排对比" subtitle="同一批次下的碳收益差异" accent={C.green} />
            <div style={{ padding: "12px 16px" }}>
              <ResponsiveContainer width="100%" height={170}>
                <BarChart data={carbonChartData}>
                  <CartesianGrid strokeDasharray="2 2" stroke="rgba(6,182,212,0.08)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: C.textMuted, fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: C.textMuted, fontSize: 9 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: C.bgCard,
                      border: `1px solid ${C.borderSubtle}`,
                      borderRadius: "8px",
                      fontSize: "11px",
                      color: C.textPrimary,
                    }}
                    formatter={(value: number) => [`${value} tCO₂e`, "减排量"]}
                  />
                  <Bar dataKey="tco2e" radius={[4, 4, 0, 0]}>
                    {carbonChartData.map((item) => (
                      <Cell
                        key={item.id}
                        fill={item.id === selectedMaterialId ? C.green : "rgba(16,185,129,0.45)"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </DataCard>
          </RevealBlock>
          ) : null}
        </div>
      </div>

      <RevealBlock show={isComplete} delayMs={260}>
      <DataCard>
        <CardHeader title="商业闭环判断" subtitle="不是有没有买家，而是买家是否与路线和证据匹配" accent={C.amber} />
        <div style={{ padding: "12px 16px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
          <EvidenceListItem
            title="路线与需求匹配"
            detail={filteredBuyers.length > 0 ? `${selectedMaterial.material_name} 已挂接 ${filteredBuyers.length} 个商机对象。` : `${selectedMaterial.material_name} 当前暂无直接买方，需要新建商机。`}
            right={<CheckCircle2 size={14} color={filteredBuyers.length > 0 ? C.green : C.amber} />}
          />
          <EvidenceListItem
            title="运输口径"
            detail={filteredBuyers.length > 0 ? `累计运输费 ¥${totalTransport.toLocaleString()}，以 ${demoData.roi.transport_cost_per_ton_km} 元/吨·km 为基线校核。` : "暂无运输测算。"}
            right={<Truck size={14} color={C.cyan} />}
          />
          <EvidenceListItem
            title="碳资产口径"
            detail={`${selectedMaterial.material_name} 当前展示减排 ${carbonData.reduction_tco2e} tCO₂e，收益基于演示核算口径。`}
            right={<Leaf size={14} color={C.green} />}
          />
        </div>
      </DataCard>
      </RevealBlock>

      <RevealBlock show={isComplete} delayMs={320}>
      <DataCard style={{ marginTop: "16px" }}>
        <CardHeader title="方案确认与交付" subtitle="确认当前路线后，导出可交付的实施方案文档" accent={C.green} />
        <div style={{ padding: "16px", display: "grid", gridTemplateColumns: "1.2fr auto", gap: "16px", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: C.textPrimary }}>
              {selectedMaterial.material_name} · {isPlanConfirmed ? "已确认方案" : "待确认方案"}
            </div>
            <div style={{ fontSize: "12px", color: C.textMuted, marginTop: "6px", lineHeight: 1.7 }}>
              {selectedBuyer
                ? `当前将以 ${selectedBuyer.buyer_name} 为优先对接对象，按 ${selectedBuyer.planned_quantity_tons.toLocaleString()} 吨进行交付测算。`
                : "当前路线尚未锁定具体买方，但可以先导出实施方案单。"}
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "10px" }}>
              <MetaChip label="推荐路线" value={selectedMaterial.material_name} color={C.amber} />
              <MetaChip label="确认状态" value={isPlanConfirmed ? "已确认" : "待确认"} color={isPlanConfirmed ? C.green : C.textMuted} />
              <MetaChip label="下载格式" value="Markdown 方案单" color={C.blue} />
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px", flexShrink: 0 }}>
            <button
              onClick={() => setIsPlanConfirmed(true)}
              disabled={isPlanConfirmed}
              style={{
                minWidth: "112px",
                padding: "10px 14px",
                borderRadius: "10px",
                border: `1px solid ${C.green}55`,
                background: isPlanConfirmed ? "rgba(16,185,129,0.1)" : "rgba(16,185,129,0.18)",
                color: C.green,
                fontSize: "12px",
                fontWeight: 700,
                cursor: isPlanConfirmed ? "default" : "pointer",
              }}
            >
              {isPlanConfirmed ? "方案已确认" : "确认当前方案"}
            </button>
            <button
              onClick={openPlanDocument}
              disabled={!isPlanConfirmed}
              style={{
                minWidth: "112px",
                padding: "10px 14px",
                borderRadius: "10px",
                border: `1px solid ${C.blue}55`,
                background: !isPlanConfirmed ? "rgba(59,130,246,0.08)" : "rgba(59,130,246,0.18)",
                color: !isPlanConfirmed ? C.textMuted : C.blue,
                fontSize: "12px",
                fontWeight: 700,
                cursor: !isPlanConfirmed ? "not-allowed" : "pointer",
              }}
            >
              打开方案文档
            </button>
          </div>
        </div>
      </DataCard>
      </RevealBlock>
    </div>
  );
}
