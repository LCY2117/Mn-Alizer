import React, { useEffect, useMemo, useRef, useState } from "react";
import { Bot, LoaderCircle, MessageSquare, Send, Sparkles, X } from "lucide-react";
import type { FlowModuleKey } from "../context/runtimeTypes";
import { C } from "./shared";
import { askAssistant } from "../assistant/api";
import type { AssistantMessage } from "../assistant/types";

const QUICK_QUESTIONS = [
  "解释当前页面在做什么",
  "为什么推荐当前路线",
  "请总结本页核心证据",
  "当前方案的关键技术依据是什么",
];

let messageSeed = 0;
const FLOATING_BUTTON_WIDTH = 170;
const FLOATING_BUTTON_HEIGHT = 56;
const FLOATING_BUTTON_MARGIN = 24;

function createMessageId(role: AssistantMessage["role"]) {
  const randomPart =
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${messageSeed++}-${Math.random().toString(16).slice(2, 10)}`;

  return `${role}-${randomPart}`;
}

function getDefaultFloatingPosition() {
  if (typeof window === "undefined") {
    return { x: 0, y: 0 };
  }

  return {
    x: Math.max(
      FLOATING_BUTTON_MARGIN,
      window.innerWidth - FLOATING_BUTTON_WIDTH - FLOATING_BUTTON_MARGIN,
    ),
    y: Math.max(
      FLOATING_BUTTON_MARGIN,
      window.innerHeight - FLOATING_BUTTON_HEIGHT - 104,
    ),
  };
}

function clampFloatingPosition(x: number, y: number) {
  if (typeof window === "undefined") {
    return { x, y };
  }

  return {
    x: Math.min(
      Math.max(FLOATING_BUTTON_MARGIN, x),
      Math.max(
        FLOATING_BUTTON_MARGIN,
        window.innerWidth - FLOATING_BUTTON_WIDTH - FLOATING_BUTTON_MARGIN,
      ),
    ),
    y: Math.min(
      Math.max(FLOATING_BUTTON_MARGIN, y),
      Math.max(
        FLOATING_BUTTON_MARGIN,
        window.innerHeight - FLOATING_BUTTON_HEIGHT - FLOATING_BUTTON_MARGIN,
      ),
    ),
  };
}

type AssistantDrawerProps = {
  moduleKey: FlowModuleKey;
  routePath: string;
  moduleTitle: string;
  moduleSummary: string;
  selectedMaterialId: string | null;
  context: {
    summary: string;
    pageData: Record<string, unknown>;
  };
};

function createMessage(role: AssistantMessage["role"], content: string): AssistantMessage {
  return {
    id: createMessageId(role),
    role,
    content,
  };
}

export function AssistantDrawer({
  moduleKey,
  routePath,
  moduleTitle,
  moduleSummary,
  selectedMaterialId,
  context,
}: AssistantDrawerProps) {
  const assistantEnabled = import.meta.env.VITE_ENABLE_AI_ASSISTANT !== "false";
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [buttonPosition, setButtonPosition] = useState(getDefaultFloatingPosition);
  const activeRequestRef = useRef(0);
  const dragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);
  const headerSummary = useMemo(
    () => `${moduleTitle} · ${moduleSummary}`,
    [moduleSummary, moduleTitle],
  );

  useEffect(() => {
    const handleResize = () => {
      setButtonPosition((current) =>
        clampFloatingPosition(current.x, current.y),
      );
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([
        createMessage(
          "assistant",
          `我是锰智助手。当前页面是“${moduleTitle}”。你可以直接问我推荐理由、风险证据、ROI 含义，或使用下方快捷问题。`,
        ),
      ]);
    }
  }, [messages.length, moduleTitle, open]);

  const handleClose = () => {
    activeRequestRef.current += 1;
    setOpen(false);
    setInput("");
    setMessages([]);
    setError(null);
    setLoading(false);
  };

  const sendQuestion = async (question: string) => {
    const trimmed = question.trim();
    if (!trimmed || loading) return;

    const nextMessages = [...messages, createMessage("user", trimmed)];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setError(null);
    const requestId = activeRequestRef.current + 1;
    activeRequestRef.current = requestId;

    try {
      const response = await askAssistant({
        moduleKey,
        routePath,
        selectedMaterialId,
        question: trimmed,
        conversation: nextMessages.map((item) => ({
          role: item.role,
          content: item.content,
        })),
        context,
      });

      if (requestId !== activeRequestRef.current) {
        return;
      }
      setMessages((current) => [
        ...current,
        createMessage("assistant", response.answer),
      ]);
    } catch (err) {
      if (requestId !== activeRequestRef.current) {
        return;
      }
      setError(err instanceof Error ? err.message : "助手响应失败");
    } finally {
      if (requestId === activeRequestRef.current) {
        setLoading(false);
      }
    }
  };

  if (!assistantEnabled) {
    return null;
  }

  return (
    <>
      <button
        onPointerDown={(event) => {
          dragStateRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            originX: buttonPosition.x,
            originY: buttonPosition.y,
            moved: false,
          };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const drag = dragStateRef.current;
          if (!drag || drag.pointerId !== event.pointerId) return;

          const deltaX = event.clientX - drag.startX;
          const deltaY = event.clientY - drag.startY;
          if (!drag.moved && Math.hypot(deltaX, deltaY) > 4) {
            drag.moved = true;
          }
          if (!drag.moved) return;

          setButtonPosition(
            clampFloatingPosition(drag.originX + deltaX, drag.originY + deltaY),
          );
        }}
        onPointerUp={(event) => {
          const drag = dragStateRef.current;
          if (!drag || drag.pointerId !== event.pointerId) return;
          event.currentTarget.releasePointerCapture(event.pointerId);
          dragStateRef.current = null;
          if (!drag.moved) {
            setOpen(true);
          }
        }}
        onPointerCancel={(event) => {
          const drag = dragStateRef.current;
          if (!drag || drag.pointerId !== event.pointerId) return;
          event.currentTarget.releasePointerCapture(event.pointerId);
          dragStateRef.current = null;
        }}
        style={{
          position: "fixed",
          left: `${buttonPosition.x}px`,
          top: `${buttonPosition.y}px`,
          zIndex: 40,
          display: "flex",
          alignItems: "center",
          gap: "10px",
          border: `1px solid ${C.purple}55`,
          background: "linear-gradient(135deg, rgba(139,92,246,0.2), rgba(6,182,212,0.16))",
          color: "#f8fafc",
          borderRadius: "999px",
          padding: "12px 16px",
          cursor: "grab",
          boxShadow: "0 12px 30px rgba(2,6,23,0.35)",
          backdropFilter: "blur(14px)",
          userSelect: "none",
          touchAction: "none",
        }}
        title="拖动可移动位置，点击打开锰智助手"
      >
        <Bot size={18} />
        <div style={{ textAlign: "left" }}>
          <div style={{ fontSize: "12px", fontWeight: 700 }}>锰智助手</div>
          <div style={{ fontSize: "10px", color: "rgba(226,232,240,0.72)" }}>拖动位置 / 点击打开</div>
        </div>
      </button>

      {open && (
        <>
          <div
            onClick={handleClose}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(2,6,23,0.48)",
              zIndex: 45,
            }}
          />
          <aside
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              bottom: 0,
              width: "420px",
              maxWidth: "calc(100vw - 24px)",
              background: "linear-gradient(180deg, rgba(7,20,40,0.98), rgba(4,12,28,0.98))",
              borderLeft: `1px solid ${C.borderSubtle}`,
              zIndex: 50,
              display: "flex",
              flexDirection: "column",
              boxShadow: "-20px 0 60px rgba(2,6,23,0.45)",
            }}
          >
            <div
              style={{
                padding: "18px 18px 14px",
                borderBottom: `1px solid ${C.borderSubtle}`,
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: "12px",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Sparkles size={16} color={C.purple} />
                  <div style={{ fontSize: "16px", fontWeight: 800, color: C.textPrimary }}>锰智助手</div>
                </div>
                <div style={{ fontSize: "12px", color: C.textSecondary, marginTop: "6px", lineHeight: 1.6 }}>
                  {headerSummary}
                </div>
                <div style={{ fontSize: "11px", color: C.textMuted, marginTop: "8px", lineHeight: 1.6 }}>
                  当前状态：{context.summary}
                </div>
              </div>
              <button
                onClick={handleClose}
                style={{
                  border: `1px solid ${C.borderSubtle}`,
                  background: "transparent",
                  color: C.textSecondary,
                  borderRadius: "999px",
                  width: "32px",
                  height: "32px",
                  cursor: "pointer",
                }}
              >
                <X size={16} />
              </button>
            </div>

            <div
              style={{
                padding: "14px 18px 0",
                display: "flex",
                flexWrap: "wrap",
                gap: "8px",
              }}
            >
              {QUICK_QUESTIONS.map((question) => (
                <button
                  key={question}
                  onClick={() => void sendQuestion(question)}
                  disabled={loading}
                  style={{
                    border: `1px solid ${C.borderSubtle}`,
                    background: "rgba(15,23,42,0.58)",
                    color: C.textSecondary,
                    borderRadius: "999px",
                    padding: "8px 10px",
                    fontSize: "11px",
                    fontWeight: 600,
                    cursor: loading ? "not-allowed" : "pointer",
                    opacity: loading ? 0.6 : 1,
                  }}
                >
                  {question}
                </button>
              ))}
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "14px 18px" }}>
              {messages.length === 0 ? (
                <div
                  style={{
                    border: `1px dashed ${C.borderSubtle}`,
                    borderRadius: "14px",
                    padding: "18px",
                    color: C.textMuted,
                    fontSize: "12px",
                    lineHeight: 1.7,
                  }}
                >
                  打开助手后，你可以让它解释当前页面、总结证据或生成答辩话术。
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      style={{
                        alignSelf: message.role === "user" ? "flex-end" : "stretch",
                        maxWidth: message.role === "user" ? "86%" : "100%",
                        padding: "12px 14px",
                        borderRadius: message.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                        background:
                          message.role === "user"
                            ? "rgba(59,130,246,0.18)"
                            : "rgba(15,23,42,0.7)",
                        border:
                          message.role === "user"
                            ? "1px solid rgba(59,130,246,0.28)"
                            : `1px solid ${C.borderSubtle}`,
                        color: C.textPrimary,
                        fontSize: "12px",
                        lineHeight: 1.7,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {message.content}
                    </div>
                  ))}
                  {loading && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        color: C.textMuted,
                        fontSize: "12px",
                      }}
                    >
                      <LoaderCircle size={14} className="animate-spin" />
                      锰智助手正在整理回答...
                    </div>
                  )}
                </div>
              )}
              {error && (
                <div
                  style={{
                    marginTop: "12px",
                    borderRadius: "10px",
                    border: `1px solid ${C.red}40`,
                    background: "rgba(239,68,68,0.12)",
                    padding: "10px 12px",
                    color: "#fecaca",
                    fontSize: "11px",
                    lineHeight: 1.6,
                  }}
                >
                  {error}
                </div>
              )}
            </div>

            <div style={{ padding: "14px 18px 18px", borderTop: `1px solid ${C.borderSubtle}` }}>
              <div style={{ position: "relative" }}>
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void sendQuestion(input);
                    }
                  }}
                  placeholder="请输入问题，例如：为什么推荐当前路线？"
                  rows={4}
                  style={{
                    width: "100%",
                    resize: "none",
                    borderRadius: "14px",
                    border: `1px solid ${C.borderSubtle}`,
                    background: "rgba(2,6,23,0.68)",
                    color: C.textPrimary,
                    padding: "14px 46px 14px 14px",
                    fontSize: "12px",
                    lineHeight: 1.6,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
                <button
                  onClick={() => void sendQuestion(input)}
                  disabled={loading || !input.trim()}
                  style={{
                    position: "absolute",
                    right: "10px",
                    bottom: "10px",
                    width: "32px",
                    height: "32px",
                    borderRadius: "999px",
                    border: `1px solid ${C.purple}45`,
                    background: loading || !input.trim() ? "rgba(100,116,139,0.18)" : "rgba(139,92,246,0.18)",
                    color: loading || !input.trim() ? C.textMuted : C.purple,
                    cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                  }}
                >
                  {loading ? <LoaderCircle size={14} className="animate-spin" /> : <Send size={14} />}
                </button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "8px", color: C.textMuted, fontSize: "10px" }}>
                <MessageSquare size={12} />
                回答仅基于当前项目数据与少量通识解释；未覆盖数据会明确说明。
              </div>
            </div>
          </aside>
        </>
      )}
    </>
  );
}
