import type { MaterialId } from "../data/demoData";
import type { DemoRuntimeState, FlowModuleKey } from "./runtimeTypes";

async function parseJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String(payload.message)
        : `HTTP ${response.status}`;
    throw new Error(message);
  }
  return payload as T;
}

export async function fetchDemoRuntimeState() {
  const response = await fetch("/api/demo-runtime");
  return parseJson<DemoRuntimeState>(response);
}

export async function persistSelectedMaterialId(selectedMaterialId: MaterialId) {
  const response = await fetch("/api/demo-runtime/material", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ selectedMaterialId }),
  });

  return parseJson<DemoRuntimeState>(response);
}

export async function persistFlowTransition(
  moduleKey: FlowModuleKey,
  action: "start" | "restart" | "complete",
) {
  const response = await fetch(`/api/demo-runtime/flows/${moduleKey}/${action}`, {
    method: "POST",
  });

  return parseJson<DemoRuntimeState>(response);
}

export async function resetDemoRuntimeState() {
  const response = await fetch("/api/demo-runtime/reset", {
    method: "POST",
  });

  return parseJson<DemoRuntimeState>(response);
}
