import { create } from "zustand";
import { AnalysisHistory, AnalysisResult } from "@/types/analysis";

interface AnalysisStore {
  currentResult: AnalysisResult | null;
  history: AnalysisHistory[];
  setResult: (result: AnalysisResult, jobTitle?: string) => void;
  clearResult: () => void;
}

export const useAnalysisStore = create<AnalysisStore>((set) => ({
  currentResult: null,
  history: JSON.parse(localStorage.getItem("analysis-history") || "[]"),
  setResult: (result, jobTitle) =>
    set((state) => {
      const entry: AnalysisHistory = {
        id: crypto.randomUUID(),
        jobTitle: jobTitle || "Untitled Analysis",
        matchScore: result.matchScore,
        atsScore: result.atsScore,
        analyzedAt: result.analyzedAt,
        result,
      };
      const newHistory = [entry, ...state.history].slice(0, 50);
      localStorage.setItem("analysis-history", JSON.stringify(newHistory));
      return { currentResult: result, history: newHistory };
    }),
  clearResult: () => set({ currentResult: null }),
}));
