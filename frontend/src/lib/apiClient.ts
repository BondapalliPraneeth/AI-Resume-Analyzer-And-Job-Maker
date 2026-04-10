import type { AnalysisHistory, AnalysisResult } from "@/types/analysis";
import type { AuthUser } from "@/contexts/AuthContext";

// 🔥 HARD-CODED BACKEND URL
const API_URL = "https://resume-backend-72zx.onrender.com";

async function request<T>(
  path: string,
  opts: RequestInit & { token?: string } = {}
): Promise<T> {
  const headers = new Headers(opts.headers);
  headers.set("Content-Type", "application/json");
  if (opts.token) headers.set("Authorization", `Bearer ${opts.token}`);

  const res = await fetch(`${API_URL}${path}`, { ...opts, headers });
  const isJson = res.headers.get("content-type")?.includes("application/json");
  const payload: unknown = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    const msg =
      typeof payload === "object" &&
      payload !== null &&
      "error" in payload &&
      typeof (payload as { error: unknown }).error === "string"
        ? (payload as { error: string }).error
        : `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return payload as T;
}

export const api = {
  signup: (input: { email: string; password: string; displayName?: string }) =>
    request<{ token: string; user: AuthUser }>("/auth/signup", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  login: (input: { email: string; password: string }) =>
    request<{ token: string; user: AuthUser }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  getMe: (token: string) => request<{ user: AuthUser }>("/me", { token }),

  listHistory: (token: string) =>
    request<{ history: AnalysisHistory[] }>("/history", { token }),

  createHistory: (
    token: string,
    input: {
      jobTitle: string;
      matchScore: number;
      atsScore: number;
      analyzedAt: string;
      result: AnalysisResult;
    }
  ) =>
    request<{ id: string }>("/history", {
      method: "POST",
      token,
      body: JSON.stringify(input),
    }),
};
