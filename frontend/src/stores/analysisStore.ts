import { create } from "zustand";
import { AnalysisHistory, AnalysisResult } from "@/types/analysis";
import { api } from "@/lib/apiClient";

interface AnalysisStore {
  currentResult: AnalysisResult | null;
  history: AnalysisHistory[];
  setResult: (result: AnalysisResult, jobTitle?: string) => void;
  clearResult: () => void;
  loadHistory: () => Promise<void>;
}

export const useAnalysisStore = create<AnalysisStore>((set) => ({
  currentResult: null,
  history: [],
  setResult: (result, jobTitle) => {
    const entry: AnalysisHistory = {
      id: crypto.randomUUID(),
      jobTitle: jobTitle || "Untitled Analysis",
      matchScore: result.matchScore,
      atsScore: result.atsScore,
      analyzedAt: result.analyzedAt,
      result,
    };

    const token = localStorage.getItem("auth_token");
    if (token) {
      api
        .createHistory(token, {
          jobTitle: entry.jobTitle,
          matchScore: entry.matchScore,
          atsScore: entry.atsScore,
          analyzedAt: entry.analyzedAt,
          result,
        })
        .catch(() => {});
    }

    set((state) => ({
      currentResult: result,
      history: [entry, ...state.history].slice(0, 50),
    }));
  },
  clearResult: () => set({ currentResult: null }),
  loadHistory: async () => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      set({ history: [] });
      return;
    }
    const { history } = await api.listHistory(token);
    set({
      history: history.map((h) => ({
        ...h,
        result: h.result as unknown as AnalysisResult,
      })),
    });
  },
}));
