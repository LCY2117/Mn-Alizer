import type { FlowStateMap } from "./runtimeTypes";

export function getBatchStatusLabel(flowStates: FlowStateMap) {
  if (flowStates.market.status === "completed") return "商业闭环完成，待方案交付";
  if (flowStates.market.status === "running") return "商业闭环生成中";

  if (flowStates.twin.status === "completed") return "性能核算完成，待商业闭环生成";
  if (flowStates.twin.status === "running") return "性能与价值核算中";

  if (flowStates["ai-brain"].status === "completed") return "方案已生成，待性能核算";
  if (flowStates["ai-brain"].status === "running") return "AI 路线寻优中";

  if (flowStates.cloud.status === "completed") return "诊断完成，待方案下发";
  if (flowStates.cloud.status === "running") return "云端诊断处理中";

  if (flowStates.edge.status === "completed") return "采样完成，待云端诊断";
  if (flowStates.edge.status === "running") return "现场采样与数据归档中";

  return "待启动现场采样";
}
