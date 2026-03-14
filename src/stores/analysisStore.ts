import { create } from "zustand";
import { AnalysisHistory, AnalysisResult } from "@/types/analysis";
import { supabase } from "@/integrations/supabase/client";

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

    // Save to database
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from("analysis_history").insert([{
          user_id: user.id,
          job_title: entry.jobTitle,
          match_score: entry.matchScore,
          ats_score: entry.atsScore,
          result: result as unknown as Json,
        }]).then();
      }
    });

    set((state) => ({
      currentResult: result,
      history: [entry, ...state.history].slice(0, 50),
    }));
  },
  clearResult: () => set({ currentResult: null }),
  loadHistory: async () => {
    const { data } = await supabase
      .from("analysis_history")
      .select("*")
      .order("analyzed_at", { ascending: false })
      .limit(50);

    if (data) {
      const history: AnalysisHistory[] = data.map((row) => ({
        id: row.id,
        jobTitle: row.job_title,
        matchScore: row.match_score,
        atsScore: row.ats_score,
        analyzedAt: row.analyzed_at,
        result: row.result as unknown as AnalysisResult,
      }));
      set({ history });
    }
  },
}));
