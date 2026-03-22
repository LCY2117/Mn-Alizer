import { useEffect } from "react";
import { useDemoContext } from "../context/DemoContext";
import type { FlowModuleKey } from "../context/runtimeTypes";
import { useProcessReveal } from "./useProcessReveal";

export function usePersistentModuleFlow(
  moduleKey: FlowModuleKey,
  options: {
    durationMs: number;
    stepLabels: string[];
    autoStart?: boolean;
  },
) {
  const {
    flowStates,
    restartFlow,
    markFlowStarted,
    markFlowCompleted,
    runtimeReady,
  } = useDemoContext();
  const flow = flowStates[moduleKey];
  const enabled = flow.status === "running";
  const autoStart = options.autoStart ?? true;

  useEffect(() => {
    if (runtimeReady && autoStart && flow.status === "idle") {
      markFlowStarted(moduleKey);
    }
  }, [autoStart, flow.status, markFlowStarted, moduleKey, runtimeReady]);

  const reveal = useProcessReveal({
    durationMs: options.durationMs,
    stepLabels: options.stepLabels,
    resetKeys: [flow.runId],
    enabled,
    initialProgress: 0,
  });

  useEffect(() => {
    if (flow.status === "running" && reveal.progress >= 100) {
      markFlowCompleted(moduleKey);
    }
  }, [flow.status, markFlowCompleted, moduleKey, reveal.progress]);

  if (flow.status === "completed") {
    return {
      progress: 100,
      currentStepLabel: options.stepLabels[options.stepLabels.length - 1] ?? "",
      currentStepIndex: Math.max(0, options.stepLabels.length - 1),
      revealCount: options.stepLabels.length,
      isComplete: true,
      elapsedMs: options.durationMs,
      remainingMs: 0,
      remainingSeconds: 0,
      stepProgressPct: 100,
      statusText: "已完成" as const,
      start: () => markFlowStarted(moduleKey),
      rerun: () => restartFlow(moduleKey),
      completedAt: flow.completedAt,
      status: flow.status,
    };
  }

  if (flow.status === "idle") {
    return {
      progress: 0,
      currentStepLabel: options.stepLabels[0] ?? "",
      currentStepIndex: 0,
      revealCount: 1,
      isComplete: false,
      elapsedMs: 0,
      remainingMs: options.durationMs,
      remainingSeconds: Math.ceil(options.durationMs / 1000),
      stepProgressPct: 0,
      statusText: "待开始" as const,
      start: () => markFlowStarted(moduleKey),
      rerun: () => restartFlow(moduleKey),
      completedAt: flow.completedAt,
      status: flow.status,
    };
  }

  return {
    ...reveal,
    start: () => markFlowStarted(moduleKey),
    rerun: () => restartFlow(moduleKey),
    completedAt: flow.completedAt,
    status: flow.status,
  };
}
