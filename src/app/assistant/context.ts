import { demoData } from "../data/demoData";
import type { FlowModuleKey } from "../context/runtimeTypes";

type FlowSnapshot = {
  status: "idle" | "running" | "completed";
  completedAt: string | null;
};

type BuildAssistantContextInput = {
  moduleKey: FlowModuleKey;
  routePath: string;
  moduleTitle: string;
  moduleLabel: string;
  moduleSummary: string;
  selectedMaterialId: string;
  flowState: FlowSnapshot;
};

export function buildAssistantContext({
  moduleKey,
  routePath,
  moduleTitle,
  moduleLabel,
  moduleSummary,
  selectedMaterialId,
  flowState,
}: BuildAssistantContextInput) {
  const material =
    demoData.materials.find((item) => item.material_id === selectedMaterialId) ??
    demoData.materials[0];
  const performance =
    demoData.performance[selectedMaterialId as keyof typeof demoData.performance] ?? null;
  const roi =
    demoData.roi.by_material[selectedMaterialId as keyof typeof demoData.roi.by_material] ?? null;
  const carbon =
    demoData.carbon[selectedMaterialId as keyof typeof demoData.carbon] ?? null;
  const buyers = demoData.buyers.filter(
    (buyer) => buyer.required_material === selectedMaterialId,
  );

  const base = {
    project: demoData.project,
    batch: demoData.batch,
    module: {
      key: moduleKey,
      routePath,
      title: moduleTitle,
      label: moduleLabel,
      summary: moduleSummary,
    },
    flow: flowState,
    selectedMaterial: material,
  };

  const pageDataByModule: Record<FlowModuleKey, Record<string, unknown>> = {
    edge: {
      ...base,
      sampling: {
        overview: {
          water_content_pct: demoData.sampling.water_content_pct,
          ph: demoData.sampling.ph,
          soluble_manganese_mg_l: demoData.sampling.soluble_manganese_mg_l,
          ammonia_nitrogen_mg_l: demoData.sampling.ammonia_nitrogen_mg_l,
          particle_size_distribution: demoData.sampling.particle_size_distribution,
        },
        sample_points: demoData.sampling.sample_points,
      },
    },
    cloud: {
      ...base,
      sampling: {
        overview: {
          water_content_pct: demoData.sampling.water_content_pct,
          ph: demoData.sampling.ph,
          soluble_manganese_mg_l: demoData.sampling.soluble_manganese_mg_l,
          ammonia_nitrogen_mg_l: demoData.sampling.ammonia_nitrogen_mg_l,
        },
      },
      diagnosis: demoData.diagnosis,
    },
    "ai-brain": {
      ...base,
      diagnosis: {
        risk_level: demoData.diagnosis.risk_level,
        risk_score: demoData.diagnosis.risk_score,
        pretreatment_advice: demoData.diagnosis.pretreatment_advice,
      },
      materials: demoData.materials.map((item) => ({
        material_id: item.material_id,
        material_name: item.material_name,
        match_score: item.match_score,
        is_recommended: item.is_recommended,
        eligibility: item.eligibility,
        reason: item.reason,
        blockers: item.blockers,
        expected_use_case: item.expected_use_case,
        bom: item.bom,
      })),
    },
    twin: {
      ...base,
      performance,
      roi: {
        traditional_cost_per_ton: demoData.roi.traditional_cost_per_ton,
        traditional_total_cost: demoData.roi.traditional_total_cost,
        selected: roi,
      },
      standards: performance?.standard_badges ?? [],
    },
    market: {
      ...base,
      buyers,
      carbon,
      roi: {
        selected: roi,
      },
      documents: demoData.documents.filter(
        (doc) =>
          doc.related_material === selectedMaterialId ||
          buyers.some((buyer) => buyer.document_id === doc.doc_id),
      ),
    },
  };

  return {
    summary: `${moduleTitle}：${moduleSummary}。当前推荐路线为${material.material_name}，当前流程状态为${flowState.status}。`,
    pageData: pageDataByModule[moduleKey],
  };
}
