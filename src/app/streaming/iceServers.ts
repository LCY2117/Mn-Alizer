function parseTurnUrls(rawValue: string | undefined) {
  if (!rawValue) return [];
  return rawValue
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function getIceServers(): RTCIceServer[] {
  const turnUrls = parseTurnUrls(import.meta.env.VITE_TURN_URLS);
  const turnUsername = import.meta.env.VITE_TURN_USERNAME;
  const turnCredential = import.meta.env.VITE_TURN_CREDENTIAL;

  const servers: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];

  if (turnUrls.length > 0 && turnUsername && turnCredential) {
    servers.push({
      urls: turnUrls,
      username: turnUsername,
      credential: turnCredential,
    });
  }

  return servers;
}
