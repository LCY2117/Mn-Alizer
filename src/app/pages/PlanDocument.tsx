import React, { useEffect, useMemo } from "react";
import { useSearchParams } from "react-router";
import { demoData } from "../data/demoData";
import { C } from "../components/shared";

export default function PlanDocument() {
  const [searchParams] = useSearchParams();
  const materialId = searchParams.get("materialId") ?? demoData.materials[0].material_id;
  const buyerId = searchParams.get("buyerId");

  const material =
    demoData.materials.find((item) => item.material_id === materialId) ?? demoData.materials[0];
  const buyers = demoData.buyers.filter((buyer) => buyer.required_material === material.material_id);
  const buyer = buyers.find((item) => item.buyer_id === buyerId) ?? buyers[0] ?? null;
  const performance = demoData.performance[material.material_id as keyof typeof demoData.performance];
  const roi = demoData.roi.by_material[material.material_id as keyof typeof demoData.roi.by_material];
  const carbon = demoData.carbon[material.material_id as keyof typeof demoData.carbon];
  const totalTons = buyers.reduce((sum, item) => sum + item.planned_quantity_tons, 0);
  const totalTransport = buyers.reduce((sum, item) => sum + item.estimated_transport_cost_cny, 0);
  const relatedDocs = demoData.documents.filter(
    (doc) => material.evidence_refs.includes(doc.doc_id) || material.evidence_refs.includes(doc.related_material ?? ""),
  );

  const strengthRows = useMemo(
    () => [
      { label: "3天强度", value: performance.strength_mpa.d3 },
      { label: "7天强度", value: performance.strength_mpa.d7 },
      { label: "28天强度", value: performance.strength_mpa.d28 },
    ],
    [performance.strength_mpa.d3, performance.strength_mpa.d7, performance.strength_mpa.d28],
  );

  useEffect(() => {
    document.title = `${material.material_name}实施方案｜${demoData.project.project_name}`;
  }, [material.material_name]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#eef2f7",
        color: "#0f172a",
        fontFamily: "'Inter', 'PingFang SC', 'Microsoft YaHei', sans-serif",
      }}
    >
      <style>{`
        @media print {
          .print-actions {
            display: none !important;
          }
          body {
            background: #ffffff !important;
          }
          .print-sheet {
            box-shadow: none !important;
            margin: 0 !important;
            max-width: none !important;
          }
        }
      `}</style>

      <div
        className="print-actions"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid rgba(15,23,42,0.08)",
          padding: "14px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
        }}
      >
        <div>
          <div style={{ fontSize: "16px", fontWeight: 800, color: "#0f172a" }}>
            {demoData.project.demo_title} · 实施方案 / 合同预览
          </div>
          <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
            使用浏览器打印功能可直接打印，或在打印对话框中选择“另存为 PDF”。
          </div>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={() => window.print()} style={actionButtonStyle("#0f766e", "#ccfbf1")}>
            打印
          </button>
          <button onClick={() => window.print()} style={actionButtonStyle("#1d4ed8", "#dbeafe")}>
            下载 PDF
          </button>
        </div>
      </div>

      <div style={{ padding: "28px 20px 48px" }}>
        <div
          className="print-sheet"
          style={{
            maxWidth: "960px",
            margin: "0 auto",
            background: "#ffffff",
            borderRadius: "18px",
            boxShadow: "0 20px 60px rgba(15,23,42,0.12)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "28px 32px",
              background: "linear-gradient(135deg, #0f172a, #164e63)",
              color: "#f8fafc",
            }}
          >
            <div style={{ fontSize: "12px", letterSpacing: "0.12em", opacity: 0.75 }}>
              {demoData.project.project_name} · SOLUTION SHEET
            </div>
            <div style={{ fontSize: "28px", fontWeight: 900, marginTop: "10px" }}>{material.material_name}实施方案单</div>
            <div style={{ fontSize: "14px", marginTop: "8px", opacity: 0.86 }}>
              {demoData.project.demo_title} · 批次 {demoData.batch.batch_id} · 任务单 {demoData.batch.job_ticket_id}
            </div>
          </div>

          <div style={{ padding: "28px 32px", display: "flex", flexDirection: "column", gap: "24px" }}>
            <Section title="一、项目概况">
              <InfoGrid
                items={[
                  ["项目名称", demoData.project.demo_title],
                  ["场地", demoData.batch.site_name],
                  ["处理总量", `${demoData.batch.total_quantity_tons.toLocaleString()} 吨`],
                  ["推荐路线", material.material_name],
                  ["适用场景", material.expected_use_case],
                  ["当前责任节点", demoData.batch.current_owner],
                ]}
              />
            </Section>

            <Section title="二、推荐依据">
              <Paragraph>{material.reason}</Paragraph>
              <BulletList items={material.decision_triggers} />
            </Section>

            <Section title="三、配方组成">
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <Th>组成材料</Th>
                    <Th>配比</Th>
                    <Th>参考单价</Th>
                    <Th>数据来源</Th>
                  </tr>
                </thead>
                <tbody>
                  {material.bom.map((item) => (
                    <tr key={item.name}>
                      <Td>{item.name}</Td>
                      <Td>{item.pct}%</Td>
                      <Td>
                        {item.unit_price_cny_per_ton === null
                          ? "待补充"
                          : item.unit_price_cny_per_ton === 0
                            ? "废渣入料"
                            : `¥${item.unit_price_cny_per_ton}/吨`}
                      </Td>
                      <Td>{item.source_type}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>

            <Section title="四、性能与合规">
              <InfoGrid
                items={strengthRows.map((item) => [item.label, `${item.value ?? "待补"} MPa`])}
              />
              <Paragraph>试验依据：{performance.test_basis}</Paragraph>
              <Paragraph>合规说明：{performance.compliance_note}</Paragraph>
              <Paragraph>标准徽章：{performance.standard_badges.join("、")}</Paragraph>
            </Section>

            <Section title="五、经济测算">
              <InfoGrid
                items={[
                  ["方案单吨成本", `¥${roi.solution_cost_per_ton}/吨`],
                  ["方案总成本", `¥${roi.solution_total_cost.toLocaleString()}`],
                  ["综合节省", `¥${roi.gross_saving.toLocaleString()}`],
                  ["运输敏感性", roi.transport_sensitivity],
                ]}
              />
              <Paragraph>盈利说明：{roi.profitability_note}</Paragraph>
              <BulletList items={roi.cost_basis} />
            </Section>

            <Section title="六、供需与交付">
              <InfoGrid
                items={[
                  ["已匹配需求量", `${totalTons.toLocaleString()} 吨`],
                  ["运输总成本", `¥${totalTransport.toLocaleString()}`],
                  ["当前优先对象", buyer ? buyer.buyer_name : "待补充"],
                  ["联系阶段", buyer ? buyer.contact_stage : "待补充"],
                ]}
              />
              {buyer && (
                <Paragraph>
                  交付对象：{buyer.buyer_name}，需求量 {buyer.planned_quantity_tons.toLocaleString()} 吨，
                  运距 {buyer.distance_km} km，预计运输费 ¥{buyer.estimated_transport_cost_cny.toLocaleString()}。
                </Paragraph>
              )}
            </Section>

            <Section title="七、碳资产说明">
              <InfoGrid
                items={[
                  ["减排量", `${carbon.reduction_tco2e.toLocaleString()} tCO2e`],
                  ["远期收益", `¥${carbon.forward_revenue_cny.toLocaleString()}`],
                  ["核算方法", carbon.method_note],
                  ["因子来源", carbon.factor_source],
                ]}
              />
            </Section>

            <Section title="八、文档锚点">
              {relatedDocs.length > 0 ? (
                <BulletList
                  items={relatedDocs.map(
                    (doc) => `${doc.title} · ${doc.doc_type} · ${doc.owner} · ${doc.status}`,
                  )}
                />
              ) : (
                <Paragraph>当前路线暂无直接文档锚点。</Paragraph>
              )}
            </Section>

            <div style={{ paddingTop: "12px", borderTop: "1px solid rgba(15,23,42,0.08)", color: "#64748b", fontSize: "12px" }}>
              生成时间：{new Date().toLocaleString("zh-CN")} · 系统：{demoData.project.project_name}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function actionButtonStyle(color: string, background: string): React.CSSProperties {
  return {
    border: `1px solid ${color}33`,
    background,
    color,
    borderRadius: "10px",
    padding: "10px 14px",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
  };
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <div style={{ fontSize: "18px", fontWeight: 800, color: "#0f172a", marginBottom: "14px" }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>{children}</div>
    </section>
  );
}

function InfoGrid({ items }: { items: Array<[string, string]> }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "12px" }}>
      {items.map(([label, value]) => (
        <div key={`${label}-${value}`} style={{ padding: "12px 14px", borderRadius: "12px", background: "#f8fafc", border: "1px solid rgba(15,23,42,0.06)" }}>
          <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "6px" }}>{label}</div>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a", lineHeight: 1.5 }}>{value}</div>
        </div>
      ))}
    </div>
  );
}

function Paragraph({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: "14px", color: "#334155", lineHeight: 1.8 }}>{children}</div>;
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul style={{ margin: 0, paddingLeft: "20px", color: "#334155", fontSize: "14px", lineHeight: 1.8 }}>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "14px",
  color: "#334155",
};

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th style={{ textAlign: "left", padding: "12px 14px", background: "#f8fafc", borderBottom: "1px solid rgba(15,23,42,0.08)", color: "#475569" }}>
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td style={{ padding: "12px 14px", borderBottom: "1px solid rgba(15,23,42,0.08)" }}>{children}</td>;
}
