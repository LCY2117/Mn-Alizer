import type { VideoSession } from "./types";

const JSON_HEADERS = {
  "Content-Type": "application/json",
};

function assertOk(response: Response) {
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response;
}

export function buildSignalWsUrl(sessionId: string, role: "viewer" | "publisher", token: string) {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws/stream/${sessionId}?role=${role}&token=${token}`;
}

export async function createStreamSession(deviceLabel?: string) {
  const response = await fetch("/api/stream-sessions", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(deviceLabel ? { deviceLabel } : {}),
  });
  return (await assertOk(response).json()) as VideoSession;
}

export async function listStreamSessions() {
  const response = await fetch("/api/stream-sessions");
  return (await assertOk(response).json()) as VideoSession[];
}

export async function getStreamSession(sessionId: string) {
  const response = await fetch(`/api/stream-sessions/${sessionId}`);
  return (await assertOk(response).json()) as VideoSession;
}

export async function deleteStreamSession(sessionId: string) {
  const response = await fetch(`/api/stream-sessions/${sessionId}`, {
    method: "DELETE",
  });
  assertOk(response);
}
