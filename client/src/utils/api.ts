// client/src/utils/api.ts
const API =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") ?? "http://localhost:3001";

type ApiErrorShape = {
  error?: unknown;
  message?: unknown;
};

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function getErrorMessage(payload: unknown, fallback: string) {
  if (!isObject(payload)) return fallback;

  const maybe = payload as ApiErrorShape;

  if (typeof maybe.error === "string" && maybe.error.trim()) return maybe.error;
  if (typeof maybe.message === "string" && maybe.message.trim()) return maybe.message;

  return fallback;
}

async function parseJson(res: Response): Promise<unknown> {
  // Don’t trust content-type; just try json
  return await res.json().catch(() => ({}));
}

async function parse<T>(res: Response): Promise<T> {
  const payload = await parseJson(res);

  if (!res.ok) {
    const msg = getErrorMessage(payload, `Request failed (${res.status})`);
    throw new Error(msg);
  }

  return payload as T;
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`);
  return await parse<T>(res);
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return await parse<T>(res);
}

export async function apiGetOverlay(proposalId: string, userId: string) {
  const res = await fetch(`${API}/api/hangouts/${proposalId}/overlay`, {
    headers: { "x-user-id": userId },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || "Failed to load overlay");
  return json;
}

export async function apiLockProposal(proposalId: string, userId: string) {
  const res = await fetch(`${API}/api/hangouts/${proposalId}/lock`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-user-id": userId },
    body: JSON.stringify({}), // keep body so proxies don't strip POST
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || "Failed to lock proposal");
  return json;
}

export async function apiGetFinal(proposalId: string, userId: string) {
  const res = await fetch(`${API}/api/hangouts/${proposalId}/final`, {
    headers: { "x-user-id": userId },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || "Final not ready");
  return json;
}
