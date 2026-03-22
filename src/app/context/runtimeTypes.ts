export type FlowModuleKey = "edge" | "cloud" | "ai-brain" | "twin" | "market";

export type FlowStatus = "idle" | "running" | "completed";

export type FlowState = {
  runId: number;
  status: FlowStatus;
  completedAt: string | null;
};

export type FlowStateMap = Record<FlowModuleKey, FlowState>;

export type DemoRuntimeState = {
  selectedMaterialId: string;
  flowStates: FlowStateMap;
};
