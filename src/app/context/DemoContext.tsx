import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { demoData, type MaterialId } from "../data/demoData";
import {
  fetchDemoRuntimeState,
  persistFlowTransition,
  persistSelectedMaterialId,
  resetDemoRuntimeState,
} from "./runtimeApi";
import type { DemoRuntimeState, FlowModuleKey, FlowStateMap } from "./runtimeTypes";

type DemoContextValue = {
  selectedMaterialId: MaterialId;
  setSelectedMaterialId: React.Dispatch<React.SetStateAction<MaterialId>>;
  selectedMaterial: (typeof demoData.materials)[number];
  flowStates: FlowStateMap;
  restartFlow: (key: FlowModuleKey) => void;
  markFlowStarted: (key: FlowModuleKey) => void;
  markFlowCompleted: (key: FlowModuleKey) => void;
  resetRuntimeState: () => void;
  runtimeReady: boolean;
  runtimeError: string | null;
};

const defaultMaterialId =
  demoData.materials.find((material) => material.is_recommended)?.material_id ??
  demoData.materials[0].material_id;

const DemoContext = createContext<DemoContextValue | undefined>(undefined);

const defaultFlowStates: FlowStateMap = {
  edge: { runId: 0, status: "idle", completedAt: null },
  cloud: { runId: 0, status: "idle", completedAt: null },
  "ai-brain": { runId: 0, status: "idle", completedAt: null },
  twin: { runId: 0, status: "idle", completedAt: null },
  market: { runId: 0, status: "idle", completedAt: null },
};

const defaultRuntimeState: DemoRuntimeState = {
  selectedMaterialId: defaultMaterialId,
  flowStates: defaultFlowStates,
};

function cloneDefaultRuntimeState(): DemoRuntimeState {
  return {
    selectedMaterialId: defaultRuntimeState.selectedMaterialId,
    flowStates: {
      edge: { ...defaultRuntimeState.flowStates.edge },
      cloud: { ...defaultRuntimeState.flowStates.cloud },
      "ai-brain": { ...defaultRuntimeState.flowStates["ai-brain"] },
      twin: { ...defaultRuntimeState.flowStates.twin },
      market: { ...defaultRuntimeState.flowStates.market },
    },
  };
}

function sanitizeRuntimeState(runtime: DemoRuntimeState): DemoRuntimeState {
  const materialExists = demoData.materials.some(
    (material) => material.material_id === runtime.selectedMaterialId,
  );

  return {
    selectedMaterialId: materialExists
      ? (runtime.selectedMaterialId as MaterialId)
      : defaultMaterialId,
    flowStates: {
      edge: runtime.flowStates.edge ?? defaultFlowStates.edge,
      cloud: runtime.flowStates.cloud ?? defaultFlowStates.cloud,
      "ai-brain": runtime.flowStates["ai-brain"] ?? defaultFlowStates["ai-brain"],
      twin: runtime.flowStates.twin ?? defaultFlowStates.twin,
      market: runtime.flowStates.market ?? defaultFlowStates.market,
    },
  };
}

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [runtimeState, setRuntimeState] =
    useState<DemoRuntimeState>(cloneDefaultRuntimeState);
  const [runtimeReady, setRuntimeReady] = useState(false);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);

  const selectedMaterialId = runtimeState.selectedMaterialId as MaterialId;
  const flowStates = runtimeState.flowStates;

  useEffect(() => {
    let cancelled = false;

    async function loadRuntimeState() {
      try {
        const response = await fetchDemoRuntimeState();
        if (cancelled) {
          return;
        }
        setRuntimeState(sanitizeRuntimeState(response));
        setRuntimeError(null);
      } catch (error) {
        if (cancelled) {
          return;
        }
        setRuntimeError(error instanceof Error ? error.message : "运行时状态加载失败");
      } finally {
        if (!cancelled) {
          setRuntimeReady(true);
        }
      }
    }

    void loadRuntimeState();

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedMaterial = useMemo(() => {
    return (
      demoData.materials.find(
        (material) => material.material_id === selectedMaterialId,
      ) ?? demoData.materials[0]
    );
  }, [selectedMaterialId]);

  const setSelectedMaterialId: React.Dispatch<React.SetStateAction<MaterialId>> = (updater) => {
    let nextMaterialId = selectedMaterialId;

    setRuntimeState((current) => {
      nextMaterialId =
        typeof updater === "function"
          ? (updater(current.selectedMaterialId as MaterialId) as MaterialId)
          : updater;

      return {
        ...current,
        selectedMaterialId: nextMaterialId,
      };
    });

    void persistSelectedMaterialId(nextMaterialId)
      .then((response) => {
        setRuntimeState(sanitizeRuntimeState(response));
        setRuntimeError(null);
      })
      .catch((error) => {
        setRuntimeError(
          error instanceof Error ? error.message : "路线选择同步失败",
        );
      });
  };

  const restartFlow = (key: FlowModuleKey) => {
    setRuntimeState((current) => ({
      ...current,
      flowStates: {
        ...current.flowStates,
        [key]: {
          runId: current.flowStates[key].runId + 1,
          status: "running",
          completedAt: null,
        },
      },
    }));

    void persistFlowTransition(key, "restart")
      .then((response) => {
        setRuntimeState(sanitizeRuntimeState(response));
        setRuntimeError(null);
      })
      .catch((error) => {
        setRuntimeError(error instanceof Error ? error.message : "流程状态同步失败");
      });
  };

  const markFlowStarted = (key: FlowModuleKey) => {
    setRuntimeState((current) => {
      if (current.flowStates[key].status === "running") {
        return current;
      }
      return {
        ...current,
        flowStates: {
          ...current.flowStates,
          [key]: {
            ...current.flowStates[key],
            status: "running",
          },
        },
      };
    });

    void persistFlowTransition(key, "start")
      .then((response) => {
        setRuntimeState(sanitizeRuntimeState(response));
        setRuntimeError(null);
      })
      .catch((error) => {
        setRuntimeError(error instanceof Error ? error.message : "流程状态同步失败");
      });
  };

  const markFlowCompleted = (key: FlowModuleKey) => {
    setRuntimeState((current) => {
      if (current.flowStates[key].status === "completed") {
        return current;
      }
      return {
        ...current,
        flowStates: {
          ...current.flowStates,
          [key]: {
            ...current.flowStates[key],
            status: "completed",
            completedAt: new Date().toISOString(),
          },
        },
      };
    });

    void persistFlowTransition(key, "complete")
      .then((response) => {
        setRuntimeState(sanitizeRuntimeState(response));
        setRuntimeError(null);
      })
      .catch((error) => {
        setRuntimeError(error instanceof Error ? error.message : "流程状态同步失败");
      });
  };

  const resetRuntimeState = () => {
    setRuntimeState(cloneDefaultRuntimeState());
    void resetDemoRuntimeState()
      .then((response) => {
        setRuntimeState(sanitizeRuntimeState(response));
        setRuntimeError(null);
      })
      .catch((error) => {
        setRuntimeError(error instanceof Error ? error.message : "重置运行状态失败");
      });
  };

  return (
    <DemoContext.Provider
      value={{
        selectedMaterialId,
        setSelectedMaterialId,
        selectedMaterial,
        flowStates,
        restartFlow,
        markFlowStarted,
        markFlowCompleted,
        resetRuntimeState,
        runtimeReady,
        runtimeError,
      }}
    >
      {children}
    </DemoContext.Provider>
  );
}

export function useDemoContext() {
  const context = useContext(DemoContext);

  if (!context) {
    throw new Error("useDemoContext must be used within a DemoProvider");
  }

  return context;
}
