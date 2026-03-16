import type { AnalysisHistory, AnalysisResult } from "@/types/analysis";
import type { AuthUser } from "@/contexts/AuthContext";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

async function request<T>(
  path: string,
  opts: RequestInit & { token?: string } = {}
): Promise<T> {
  const headers = new Headers(opts.headers);
  headers.set("Content-Type", "application/json");
  if (opts.token) headers.set("Authorization", `Bearer ${opts.token}`);

  const res = await fetch(`${API_URL}${path}`, { ...opts, headers });
  const isJson = res.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    const msg =
      typeof payload === "object" && payload && "error" in payload
        ? String((payload as any).error)
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
  listHistory: (token: string) => request<{ history: AnalysisHistory[] }>("/history", { token }),
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

