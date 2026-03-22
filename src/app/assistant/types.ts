import type { FlowModuleKey } from "../context/runtimeTypes";

export type AssistantRole = "user" | "assistant";

export type AssistantMessage = {
  id: string;
  role: AssistantRole;
  content: string;
};

export type AssistantRequest = {
  moduleKey: FlowModuleKey;
  routePath: string;
  selectedMaterialId: string | null;
  question: string;
  conversation: Array<{
    role: AssistantRole;
    content: string;
  }>;
  context: {
    summary: string;
    pageData: Record<string, unknown>;
  };
};

export type AssistantResponse = {
  answer: string;
  model: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  warning?: string;
};
