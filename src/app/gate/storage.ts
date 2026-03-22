const GATE_TOKEN_KEY = "mn_gate_token";

export function getGateToken() {
  return window.sessionStorage.getItem(GATE_TOKEN_KEY);
}

export function setGateToken(token: string) {
  window.sessionStorage.setItem(GATE_TOKEN_KEY, token);
}

export function clearGateToken() {
  window.sessionStorage.removeItem(GATE_TOKEN_KEY);
}
