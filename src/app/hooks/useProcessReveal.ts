import { useEffect, useMemo, useState } from "react";

type UseProcessRevealOptions = {
  durationMs?: number;
  stepLabels: string[];
  resetKeys?: Array<string | number | boolean | null | undefined>;
  enabled?: boolean;
  initialProgress?: number;
};

export function useProcessReveal({
  durationMs = 1800,
  stepLabels,
  resetKeys = [],
  enabled = true,
  initialProgress = 0,
}: UseProcessRevealOptions) {
  const [progress, setProgress] = useState(initialProgress);
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setProgress(initialProgress);
      setElapsedMs(0);
      return;
    }
    setProgress(0);
    setElapsedMs(0);
    let frameId = 0;
    let startTime = 0;

    const easeInOutCubic = (t: number) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const animate = (timestamp: number) => {
      if (startTime === 0) {
        startTime = timestamp;
      }
      const elapsed = timestamp - startTime;
      const raw = Math.min(1, elapsed / durationMs);
      const eased = easeInOutCubic(raw);
      setProgress(eased * 100);
      setElapsedMs(Math.min(durationMs, elapsed));

      if (raw < 1) {
        frameId = window.requestAnimationFrame(animate);
      }
    };

    frameId = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frameId);
  }, [durationMs, enabled, initialProgress, ...resetKeys]);

  const currentStepIndex = useMemo(() => {
    if (stepLabels.length === 0) return 0;
    const index = Math.min(
      stepLabels.length - 1,
      Math.floor((progress / 100) * stepLabels.length),
    );
    return index;
  }, [progress, stepLabels.length]);

  const currentStepLabel = stepLabels[currentStepIndex] ?? "";
  const revealCount = Math.max(
    1,
    Math.min(stepLabels.length, Math.ceil((progress / 100) * stepLabels.length)),
  );
  const remainingMs = Math.max(0, durationMs - elapsedMs);
  const remainingSeconds = Math.ceil(remainingMs / 1000);
  const stepSpan = stepLabels.length > 0 ? 100 / stepLabels.length : 100;
  const stepProgressPct = stepSpan > 0
    ? Math.min(100, Math.max(0, ((progress - currentStepIndex * stepSpan) / stepSpan) * 100))
    : progress;
  const statusText = progress >= 100 ? "已完成" : "运行中";

  return {
    progress,
    currentStepLabel,
    currentStepIndex,
    revealCount,
    isComplete: progress >= 100,
    elapsedMs,
    remainingMs,
    remainingSeconds,
    stepProgressPct,
    statusText,
  };
}
