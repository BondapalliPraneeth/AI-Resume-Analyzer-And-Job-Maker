import { supabase } from "@/integrations/supabase/client";
import type { AnalysisResult } from "@/types/analysis";

export async function analyzeResumeWithAI(
  resumeText: string,
  jobDescription: string
): Promise<AnalysisResult> {
  const { data, error } = await supabase.functions.invoke("analyze-resume", {
    body: { resumeText, jobDescription },
  });

  if (error) {
    throw new Error(error.message || "AI analysis failed");
  }

  // Map AI response to our AnalysisResult type
  const ai = data as {
    resume_skills: { technical: string[]; tools: string[]; soft_skills: string[]; languages: string[] };
    jd_skills: { technical: string[]; tools: string[]; soft_skills: string[]; languages: string[] };
    matched_skills: string[];
    missing_skills: string[];
    match_score: number;
    ats_score: number;
    suggestions: string[];
    learning_resources: { skill: string; suggestion: string }[];
  };

  const allResumeSkills = [
    ...ai.resume_skills.technical,
    ...ai.resume_skills.tools,
    ...ai.resume_skills.soft_skills,
    ...ai.resume_skills.languages,
  ];

  return {
    resumeData: {
      name: "",
      email: "",
      phone: "",
      skills: allResumeSkills,
      education: [],
      projects: [],
      experience: [],
    },
    matchScore: ai.match_score,
    atsScore: ai.ats_score,
    matchedSkills: ai.matched_skills,
    missingSkills: ai.missing_skills,
    suggestions: ai.suggestions,
    learningResources: ai.learning_resources,
    analyzedAt: new Date().toISOString(),
  };
}
