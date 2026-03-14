export interface ResumeData {
  name: string;
  email: string;
  phone: string;
  skills: string[];
  education: { degree: string; institution: string; year: string }[];
  projects: { name: string; description: string }[];
  experience: { company: string; role: string; duration: string }[];
}

export interface AnalysisResult {
  resumeData: ResumeData;
  matchScore: number;
  atsScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  suggestions: string[];
  learningResources: { skill: string; suggestion: string }[];
  analyzedAt: string;
}

export interface AnalysisHistory {
  id: string;
  jobTitle: string;
  matchScore: number;
  atsScore: number;
  analyzedAt: string;
  result: AnalysisResult;
}
