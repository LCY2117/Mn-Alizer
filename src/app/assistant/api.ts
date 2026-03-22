import type { AssistantRequest, AssistantResponse } from "./types";
import { clearGateToken } from "../gate/storage";
import { getGateHeader } from "../gate/api";

export async function askAssistant(payload: AssistantRequest) {
  const response = await fetch("/api/assistant", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getGateHeader(),
    },
    body: JSON.stringify(payload),
  });

  const data = (await response.json().catch(() => null)) as
    | AssistantResponse
    | { message?: string }
    | null;

  if (!response.ok) {
    if (response.status === 401) {
      clearGateToken();
    }
    throw new Error(data && "message" in data && data.message ? data.message : `HTTP ${response.status}`);
  }

  return data as AssistantResponse;
}
