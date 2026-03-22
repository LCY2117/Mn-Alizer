import express from "express";
import { createServer } from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import { WebSocketServer } from "ws";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    if (!key || process.env[key] !== undefined) continue;
    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.resolve(__dirname, "../dist");
const DEMO_DATA_PATH = path.resolve(__dirname, "../src/imports/demo_data.json");
const RUNTIME_STATE_PATH = path.resolve(__dirname, "./demo-runtime-state.json");
loadEnvFile(path.resolve(__dirname, "../.env"));

const PORT = Number(process.env.PORT || 8787);
const PUBLIC_APP_ORIGIN = (process.env.APP_PUBLIC_ORIGIN || process.env.PUBLIC_ORIGIN || "").replace(/\/$/, "");
const APP_GATE_PASSWORD = process.env.APP_GATE_PASSWORD || "";
const SILICONFLOW_API_KEY = process.env.SILICONFLOW_API_KEY || "";
const SILICONFLOW_BASE_URL = (process.env.SILICONFLOW_BASE_URL || "https://api.siliconflow.cn/v1").replace(/\/$/, "");
const SILICONFLOW_MODEL = process.env.SILICONFLOW_MODEL || "";
const ASSISTANT_SYSTEM_PROMPT = `你是“锰渣智治平台”的页面内AI助手“锰智助手”。

你的任务是基于当前页面上下文，帮助用户解释页面、说明推荐理由、总结证据、生成答辩话术。

硬性规则：
1. 只能依据用户提供的项目上下文和少量通识解释回答。
2. 不得编造任何未在上下文中出现的标准、价格、实验、客户、碳收益、结论或数值。
3. 如果上下文没有给出关键事实，必须明确说明“当前演示数据未覆盖该项，暂不能下结论”。
4. 可以解释通用概念，例如ROI、浸出风险、配方寻优、强度预测，但不得把通识解释伪装成当前项目事实。
5. 回答必须使用中文，尽量简洁、专业、适合项目答辩。

输出格式固定优先为：
结论：
依据：
意义：`;
const FLOW_MODULE_KEYS = ["edge", "cloud", "ai-brain", "twin", "market"];
const defaultFlowStates = {
  edge: { runId: 0, status: "idle", completedAt: null },
  cloud: { runId: 0, status: "idle", completedAt: null },
  "ai-brain": { runId: 0, status: "idle", completedAt: null },
  twin: { runId: 0, status: "idle", completedAt: null },
  market: { runId: 0, status: "idle", completedAt: null },
};

function loadDemoData() {
  try {
    return JSON.parse(fs.readFileSync(DEMO_DATA_PATH, "utf8"));
  } catch {
    return { materials: [] };
  }
}

const demoData = loadDemoData();
const defaultMaterialId =
  demoData.materials?.find?.((material) => material.is_recommended)?.material_id ||
  demoData.materials?.[0]?.material_id ||
  "low_carbon_binder";

function buildDefaultRuntimeState() {
  return {
    selectedMaterialId: defaultMaterialId,
    flowStates: JSON.parse(JSON.stringify(defaultFlowStates)),
  };
}

function normalizeFlowState(moduleKey, flowState, fallback) {
  return {
    runId:
      typeof flowState?.runId === "number" && Number.isFinite(flowState.runId)
        ? flowState.runId
        : fallback.runId,
    status:
      flowState?.status === "idle" ||
      flowState?.status === "running" ||
      flowState?.status === "completed"
        ? flowState.status
        : fallback.status,
    completedAt:
      typeof flowState?.completedAt === "string" || flowState?.completedAt === null
        ? flowState.completedAt
        : fallback.completedAt,
  };
}

function sanitizeRuntimeState(rawState) {
  const base = buildDefaultRuntimeState();
  const validMaterialId = demoData.materials?.some?.(
    (material) => material.material_id === rawState?.selectedMaterialId,
  )
    ? rawState.selectedMaterialId
    : base.selectedMaterialId;

  const flowStates = {};
  for (const moduleKey of FLOW_MODULE_KEYS) {
    flowStates[moduleKey] = normalizeFlowState(
      moduleKey,
      rawState?.flowStates?.[moduleKey],
      base.flowStates[moduleKey],
    );
  }

  return {
    selectedMaterialId: validMaterialId,
    flowStates,
  };
}

function loadRuntimeState() {
  if (!fs.existsSync(RUNTIME_STATE_PATH)) {
    return buildDefaultRuntimeState();
  }

  try {
    const rawState = JSON.parse(fs.readFileSync(RUNTIME_STATE_PATH, "utf8"));
    return sanitizeRuntimeState(rawState);
  } catch {
    return buildDefaultRuntimeState();
  }
}

function saveRuntimeState() {
  fs.writeFileSync(RUNTIME_STATE_PATH, JSON.stringify(demoRuntimeState, null, 2), "utf8");
}

function publicRuntimeState() {
  return sanitizeRuntimeState(demoRuntimeState);
}

const demoRuntimeState = loadRuntimeState();
saveRuntimeState();

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,X-App-Gate-Token");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  next();
});

const sessions = new Map();
const issuedGateTokens = new Set();

function nowIso() {
  return new Date().toISOString();
}

function createGateToken() {
  const token = crypto.randomBytes(24).toString("hex");
  issuedGateTokens.add(token);
  return token;
}

function log(scope, message, meta) {
  const prefix = `[${nowIso()}] [${scope}] ${message}`;
  if (meta !== undefined) {
    console.log(prefix, meta);
    return;
  }
  console.log(prefix);
}

function sanitizeConversation(conversation) {
  if (!Array.isArray(conversation)) return [];
  return conversation
    .filter((item) => item && (item.role === "user" || item.role === "assistant") && typeof item.content === "string")
    .slice(-8)
    .map((item) => ({
      role: item.role,
      content: item.content.trim().slice(0, 4000),
    }))
    .filter((item) => item.content);
}

function extractAssistantText(payload) {
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content === "string") {
    return content.trim();
  }
  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item.text === "string") return item.text;
        return "";
      })
      .join("\n")
      .trim();
  }
  return "";
}

function deriveOriginFromHeaders(headers, fallbackProtocol = "http") {
  if (PUBLIC_APP_ORIGIN) {
    return PUBLIC_APP_ORIGIN;
  }

  const forwardedProto = `${headers["x-forwarded-proto"] || ""}`.split(",")[0];
  const proto = forwardedProto || fallbackProtocol;
  const forwardedHost = `${headers["x-forwarded-host"] || ""}`.split(",")[0];
  const host = forwardedHost || headers.host || `localhost:${PORT}`;
  return `${proto}://${host}`;
}

function deriveOrigin(req) {
  return deriveOriginFromHeaders(req.headers, req.protocol || "http");
}

function updateFlowState(moduleKey, action) {
  const flowState = demoRuntimeState.flowStates[moduleKey];
  if (!flowState) {
    return null;
  }

  if (action === "restart") {
    demoRuntimeState.flowStates[moduleKey] = {
      runId: flowState.runId + 1,
      status: "running",
      completedAt: null,
    };
  } else if (action === "start" && flowState.status !== "running") {
    demoRuntimeState.flowStates[moduleKey] = {
      ...flowState,
      status: "running",
      completedAt: null,
    };
  } else if (action === "complete" && flowState.status !== "completed") {
    demoRuntimeState.flowStates[moduleKey] = {
      ...flowState,
      status: "completed",
      completedAt: nowIso(),
    };
  }

  saveRuntimeState();
  return publicRuntimeState();
}

function resetRuntimeState() {
  const nextState = buildDefaultRuntimeState();
  demoRuntimeState.selectedMaterialId = nextState.selectedMaterialId;
  demoRuntimeState.flowStates = nextState.flowStates;
  saveRuntimeState();
  return publicRuntimeState();
}

function publicSession(session, origin) {
  return {
    sessionId: session.sessionId,
    deviceLabel: session.deviceLabel,
    status: session.status,
    publisherConnected: session.publisherConnected,
    viewerConnected: session.viewerConnected,
    createdAt: session.createdAt,
    connectedAt: session.connectedAt,
    endedAt: session.endedAt,
    lastHeartbeatAt: session.lastHeartbeatAt,
    viewerToken: session.viewerToken,
    publisherToken: session.publisherToken,
    publisherUrl: `${origin}/capture/${session.sessionId}?token=${session.publisherToken}`,
    heartbeatMeta: session.heartbeatMeta,
  };
}

function broadcastStatus(session) {
  const payload = JSON.stringify({
    type: "status",
    session: publicSession(session, session.publicOrigin),
  });
  [session.viewerSocket, session.publisherSocket].forEach((socket) => {
    if (socket?.readyState === 1) {
      socket.send(payload);
    }
  });
}

function queueSignal(session, targetRole, message) {
  if (targetRole === "viewer") {
    session.pendingForViewer.push(message);
  } else {
    session.pendingForPublisher.push(message);
  }
}

function flushSignals(session, role) {
  const socket = role === "viewer" ? session.viewerSocket : session.publisherSocket;
  if (!socket || socket.readyState !== 1) return;
  const queue = role === "viewer" ? session.pendingForViewer : session.pendingForPublisher;
  while (queue.length) {
    socket.send(JSON.stringify(queue.shift()));
  }
}

function requestPublisherOffer(session) {
  const payload = { type: "viewer-ready" };
  if (session.publisherSocket?.readyState === 1) {
    session.publisherSocket.send(JSON.stringify(payload));
  } else {
    queueSignal(session, "publisher", payload);
  }
}

function setSessionStatus(session, nextStatus) {
  const previousStatus = session.status;
  session.status = nextStatus;
  if (nextStatus === "live" && !session.connectedAt) {
    session.connectedAt = nowIso();
  }
  if (nextStatus === "ended" && !session.endedAt) {
    session.endedAt = nowIso();
  }
  if (previousStatus !== nextStatus) {
    log("stream", `session ${session.sessionId} status ${previousStatus} -> ${nextStatus}`, {
      publisherConnected: session.publisherConnected,
      viewerConnected: session.viewerConnected,
    });
  }
  broadcastStatus(session);
}

function createSession(origin, label) {
  const sessionId = crypto.randomUUID();
  const session = {
    sessionId,
    deviceLabel: label || `移动采集终端-${String(sessions.size + 1).padStart(2, "0")}`,
    status: "waiting",
    publisherConnected: false,
    viewerConnected: false,
    createdAt: nowIso(),
    connectedAt: null,
    endedAt: null,
    lastHeartbeatAt: null,
    heartbeatMeta: null,
    viewerToken: crypto.randomBytes(12).toString("hex"),
    publisherToken: crypto.randomBytes(12).toString("hex"),
    publicOrigin: origin,
    viewerSocket: null,
    publisherSocket: null,
    pendingForViewer: [],
    pendingForPublisher: [],
  };
  sessions.set(sessionId, session);
  return session;
}

app.post("/api/stream-sessions", (req, res) => {
  const origin = deriveOrigin(req);
  const label = typeof req.body?.deviceLabel === "string" ? req.body.deviceLabel : undefined;
  const session = createSession(origin, label);
  log("api", `created stream session ${session.sessionId}`, {
    deviceLabel: session.deviceLabel,
    origin,
  });
  res.status(201).json(publicSession(session, origin));
});

app.post("/api/gate/verify", (req, res) => {
  if (!APP_GATE_PASSWORD) {
    res.json({ enabled: false, token: null });
    return;
  }

  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (password !== APP_GATE_PASSWORD) {
    log("gate", "verification failed");
    res.status(401).json({ message: "访问口令错误。" });
    return;
  }

  const token = createGateToken();
  log("gate", "verification succeeded");
  res.json({ enabled: true, token });
});

function requireGate(req, res, next) {
  if (!APP_GATE_PASSWORD) {
    next();
    return;
  }

  const token = `${req.headers["x-app-gate-token"] || ""}`.trim();
  if (!token || !issuedGateTokens.has(token)) {
    res.status(401).json({ message: "请先完成访问授权。" });
    return;
  }

  next();
}

app.get("/api/stream-sessions", (req, res) => {
  const origin = deriveOrigin(req);
  const payload = Array.from(sessions.values())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((session) => publicSession(session, origin));
  log("api", `listed stream sessions (${payload.length})`);
  res.json(payload);
});

app.get("/api/demo-runtime", (_req, res) => {
  res.json(publicRuntimeState());
});

app.post("/api/demo-runtime/material", (req, res) => {
  const selectedMaterialId =
    typeof req.body?.selectedMaterialId === "string" ? req.body.selectedMaterialId : "";

  if (
    !demoData.materials?.some?.(
      (material) => material.material_id === selectedMaterialId,
    )
  ) {
    res.status(400).json({ message: "无效的路线标识。" });
    return;
  }

  demoRuntimeState.selectedMaterialId = selectedMaterialId;
  saveRuntimeState();
  log("runtime", "selected material updated", { selectedMaterialId });
  res.json(publicRuntimeState());
});

app.post("/api/demo-runtime/flows/:moduleKey/:action", (req, res) => {
  const moduleKey = req.params.moduleKey;
  const action = req.params.action;

  if (!FLOW_MODULE_KEYS.includes(moduleKey)) {
    res.status(400).json({ message: "无效的流程标识。" });
    return;
  }

  if (!["start", "restart", "complete"].includes(action)) {
    res.status(400).json({ message: "无效的流程动作。" });
    return;
  }

  const runtimeState = updateFlowState(moduleKey, action);
  if (!runtimeState) {
    res.status(404).json({ message: "流程不存在。" });
    return;
  }

  log("runtime", `flow ${moduleKey} -> ${action}`, runtimeState.flowStates[moduleKey]);
  res.json(runtimeState);
});

app.post("/api/demo-runtime/reset", (_req, res) => {
  const runtimeState = resetRuntimeState();
  log("runtime", "runtime state reset");
  res.json(runtimeState);
});

app.get("/api/stream-sessions/:id", (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) {
    log("api", `stream session ${req.params.id} not found`);
    res.status(404).json({ message: "Session not found" });
    return;
  }
  log("api", `fetched stream session ${session.sessionId}`, {
    status: session.status,
    origin: deriveOrigin(req),
  });
  res.json(publicSession(session, deriveOrigin(req)));
});

app.delete("/api/stream-sessions/:id", (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) {
    log("api", `delete stream session ${req.params.id} failed: not found`);
    res.status(404).json({ message: "Session not found" });
    return;
  }
  log("api", `deleting stream session ${session.sessionId}`);
  setSessionStatus(session, "ended");
  [session.viewerSocket, session.publisherSocket].forEach((socket) => socket?.close(1000, "session-ended"));
  sessions.delete(session.sessionId);
  res.status(204).end();
});

app.post("/api/assistant", requireGate, async (req, res) => {
  if (!SILICONFLOW_API_KEY || !SILICONFLOW_MODEL) {
    log("assistant", "request rejected: missing model configuration");
    res.status(503).json({
      message: "AI 助手未配置完成，请在 .env 中设置 SILICONFLOW_API_KEY 和 SILICONFLOW_MODEL。",
    });
    return;
  }

  const { moduleKey, routePath, selectedMaterialId, question, conversation, context } = req.body ?? {};

  if (
    typeof moduleKey !== "string" ||
    typeof routePath !== "string" ||
    typeof question !== "string" ||
    !context ||
    typeof context.summary !== "string" ||
    typeof context.pageData !== "object"
  ) {
    log("assistant", "request rejected: invalid payload shape");
    res.status(400).json({ message: "AI 助手请求参数不完整。" });
    return;
  }
  if (!question.trim()) {
    log("assistant", "request rejected: empty question");
    res.status(400).json({ message: "请输入问题后再发送。" });
    return;
  }

  const safeConversation = sanitizeConversation(conversation);
  const userPrompt = [
    `当前模块：${moduleKey}`,
    `当前路由：${routePath}`,
    `当前路线：${selectedMaterialId || "未选择"}`,
    `上下文摘要：${context.summary}`,
    `当前页面数据(JSON)：${JSON.stringify(context.pageData)}`,
    `用户问题：${question.trim()}`,
  ].join("\n\n");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  log("assistant", "request started", {
    moduleKey,
    routePath,
    selectedMaterialId: selectedMaterialId || null,
    conversationTurns: safeConversation.length,
    question: question.trim().slice(0, 120),
  });

  try {
    const response = await fetch(`${SILICONFLOW_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SILICONFLOW_API_KEY}`,
      },
      body: JSON.stringify({
        model: SILICONFLOW_MODEL,
        temperature: 0.2,
        messages: [
          { role: "system", content: ASSISTANT_SYSTEM_PROMPT },
          ...safeConversation,
          { role: "user", content: userPrompt },
        ],
      }),
      signal: controller.signal,
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const providerMessage =
        payload?.error?.message ||
        payload?.message ||
        `上游模型接口返回 HTTP ${response.status}`;
      log("assistant", `upstream failed with HTTP ${response.status}`, {
        moduleKey,
        routePath,
        providerMessage,
      });
      res.status(502).json({ message: providerMessage });
      return;
    }

    const answer = extractAssistantText(payload);
    if (!answer) {
      log("assistant", "upstream returned empty answer", {
        moduleKey,
        routePath,
      });
      res.status(502).json({ message: "AI 助手未返回有效内容。" });
      return;
    }

    log("assistant", "request succeeded", {
      model: payload?.model || SILICONFLOW_MODEL,
      totalTokens: payload?.usage?.total_tokens ?? null,
    });
    res.json({
      answer,
      model: payload?.model || SILICONFLOW_MODEL,
      usage: payload?.usage
        ? {
            promptTokens: payload.usage.prompt_tokens,
            completionTokens: payload.usage.completion_tokens,
            totalTokens: payload.usage.total_tokens,
          }
        : undefined,
      warning: payload?.warning,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      log("assistant", "request timed out", {
        moduleKey,
        routePath,
      });
      res.status(504).json({ message: "AI 助手请求超时，请稍后重试。" });
      return;
    }
    log("assistant", "request failed", {
      moduleKey,
      routePath,
      error: error instanceof Error ? error.message : "unknown",
    });
    res.status(500).json({
      message: error instanceof Error ? error.message : "AI 助手调用失败。",
    });
  } finally {
    clearTimeout(timeout);
  }
});

if (process.env.NODE_ENV === "production") {
  app.use(express.static(DIST_DIR));
}

const server = createServer(app);
const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (req, socket, head) => {
  const url = new URL(req.url || "", `http://${req.headers.host}`);
  if (!url.pathname.startsWith("/ws/stream/")) {
    log("ws", `rejected upgrade for path ${url.pathname}`);
    socket.destroy();
    return;
  }

  log("ws", `upgrade accepted for ${url.pathname}`);
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit("connection", ws, req);
  });
});

wss.on("connection", (ws, req) => {
  const url = new URL(req.url || "", `http://${req.headers.host}`);
  const parts = url.pathname.split("/");
  const sessionId = parts[parts.length - 1];
  const role = url.searchParams.get("role");
  const token = url.searchParams.get("token");
  const session = sessions.get(sessionId);

  if (!session || (role !== "viewer" && role !== "publisher")) {
    log("ws", "connection rejected: invalid session or role", {
      sessionId,
      role,
    });
    ws.close(1008, "invalid-session");
    return;
  }

  const validToken =
    role === "viewer" ? token === session.viewerToken : token === session.publisherToken;
  if (!validToken) {
    log("ws", "connection rejected: invalid token", {
      sessionId,
      role,
    });
    ws.close(1008, "invalid-token");
    return;
  }

  if (role === "viewer" && session.viewerSocket && session.viewerSocket.readyState === 1) {
    log("ws", `viewer replaced for session ${sessionId}`);
    session.viewerSocket.close(4000, "viewer-replaced");
  }
  if (role === "publisher" && session.publisherSocket && session.publisherSocket.readyState === 1) {
    log("ws", `publisher rejected because one already exists for session ${sessionId}`);
    ws.close(4001, "publisher-exists");
    return;
  }

  if (role === "viewer") {
    session.viewerSocket = ws;
    session.viewerConnected = true;
  } else {
    session.publisherSocket = ws;
    session.publisherConnected = true;
    session.lastHeartbeatAt = nowIso();
  }
  session.publicOrigin = deriveOriginFromHeaders(req.headers);
  log("ws", `connection established for session ${sessionId}`, {
    role,
    publicOrigin: session.publicOrigin,
  });

  if (session.status !== "ended") {
    setSessionStatus(session, session.publisherConnected && session.viewerConnected ? "connecting" : "waiting");
  } else {
    broadcastStatus(session);
  }
  flushSignals(session, role);
  if (role === "viewer" && session.publisherConnected && session.status !== "ended") {
    requestPublisherOffer(session);
  }

  ws.on("message", (buffer) => {
    let message;
    try {
      message = JSON.parse(buffer.toString());
    } catch {
      return;
    }

    if (message.type === "offer" || message.type === "answer" || message.type === "ice-candidate") {
      if (message.type !== "ice-candidate") {
        log("ws", `received ${message.type} from ${role} for session ${sessionId}`);
      }
      const targetRole = role === "publisher" ? "viewer" : "publisher";
      const targetSocket = targetRole === "viewer" ? session.viewerSocket : session.publisherSocket;
      const payload = { ...message, from: role };
      if (targetSocket?.readyState === 1) {
        targetSocket.send(JSON.stringify(payload));
      } else {
        queueSignal(session, targetRole, payload);
      }
      return;
    }

    if (message.type === "heartbeat") {
      log("ws", `heartbeat from ${role} for session ${sessionId}`, {
        deviceLabel: message.deviceLabel || session.deviceLabel,
        networkType: message.meta?.networkType ?? null,
        width: message.meta?.width ?? null,
        height: message.meta?.height ?? null,
      });
      session.lastHeartbeatAt = nowIso();
      if (typeof message.deviceLabel === "string" && message.deviceLabel.trim()) {
        session.deviceLabel = message.deviceLabel.trim();
      }
      if (message.meta && typeof message.meta === "object") {
        session.heartbeatMeta = message.meta;
      }
      if (session.status !== "live" && session.status !== "ended") {
        setSessionStatus(session, session.viewerConnected ? "connecting" : "waiting");
      } else {
        broadcastStatus(session);
      }
      return;
    }

    if (message.type === "status") {
      log("ws", `received status ${message.status} from ${role} for session ${sessionId}`);
      if (message.status === "live") {
        setSessionStatus(session, "live");
      } else if (message.status === "reconnecting") {
        setSessionStatus(session, "reconnecting");
      } else if (message.status === "ended") {
        setSessionStatus(session, "ended");
      }
    }
  });

  ws.on("close", () => {
    log("ws", `connection closed for session ${sessionId}`, {
      role,
      status: session.status,
    });
    if (role === "viewer") {
      session.viewerConnected = false;
      session.viewerSocket = null;
      if (session.status !== "ended") {
        setSessionStatus(session, session.publisherConnected ? "connecting" : "waiting");
      }
      return;
    }

    session.publisherConnected = false;
    session.publisherSocket = null;
    if (session.status !== "ended") {
      setSessionStatus(session, session.connectedAt ? "reconnecting" : "waiting");
    }
  });
});

if (process.env.NODE_ENV === "production") {
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(DIST_DIR, "index.html"));
  });
}

server.listen(PORT, () => {
log("server", `signal server listening on http://localhost:${PORT}`, {
  publicOrigin: PUBLIC_APP_ORIGIN || null,
  nodeEnv: process.env.NODE_ENV || "development",
  gateEnabled: Boolean(APP_GATE_PASSWORD),
  assistantConfigured: Boolean(SILICONFLOW_API_KEY && SILICONFLOW_MODEL),
});
});
