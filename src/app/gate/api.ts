import { clearGateToken, getGateToken, setGateToken } from "./storage";

export async function verifyGatePassword(password: string) {
  const response = await fetch("/api/gate/verify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ password }),
  });

  const data = (await response.json().catch(() => null)) as
    | { enabled?: boolean; token?: string | null; message?: string }
    | null;

  if (!response.ok) {
    throw new Error(data?.message || `HTTP ${response.status}`);
  }

  if (data?.enabled && data.token) {
    setGateToken(data.token);
    return true;
  }

  clearGateToken();
  return false;
}

export function getGateHeader() {
  const token = getGateToken();
  return token ? { "X-App-Gate-Token": token } : {};
}
