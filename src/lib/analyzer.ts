import { AnalysisResult, ResumeData } from "@/types/analysis";

// Normalize skill names for comparison
function normalizeSkill(skill: string): string {
  return skill
    .toLowerCase()
    .replace(/\.js$/i, "")
    .replace(/\.ts$/i, "")
    .replace(/\s+/g, "")
    .trim();
}

// Extract skills from job description text
export function extractJobSkills(jobDescription: string): string[] {
  const commonSkills = [
    "React", "Angular", "Vue", "Next.js", "Node.js", "Express", "Python",
    "Django", "Flask", "Java", "Spring", "C++", "C#", ".NET", "Go", "Rust",
    "TypeScript", "JavaScript", "HTML", "CSS", "Tailwind", "Bootstrap",
    "MongoDB", "PostgreSQL", "MySQL", "Redis", "Firebase", "Supabase",
    "AWS", "Azure", "GCP", "Docker", "Kubernetes", "CI/CD", "Git",
    "GraphQL", "REST", "API", "Microservices", "Agile", "Scrum",
    "Machine Learning", "Deep Learning", "NLP", "TensorFlow", "PyTorch",
    "Data Science", "SQL", "NoSQL", "Linux", "Terraform", "Jenkins",
    "Figma", "UI/UX", "Responsive Design", "Testing", "Jest", "Cypress",
    "Redux", "Zustand", "Prisma", "Drizzle", "Swift", "Kotlin",
    "React Native", "Flutter", "Electron", "Webpack", "Vite",
    "OAuth", "JWT", "Authentication", "Authorization", "SASS", "LESS",
    "Storybook", "Playwright", "Vitest", "Mocha", "Chai",
  ];

  const found: string[] = [];
  const lowerDesc = jobDescription.toLowerCase();

  for (const skill of commonSkills) {
    if (lowerDesc.includes(skill.toLowerCase())) {
      found.push(skill);
    }
  }

  return [...new Set(found)];
}

// Parse resume text for skills
export function extractResumeSkills(resumeText: string): string[] {
  return extractJobSkills(resumeText);
}

// Simple resume data extraction from text
export function parseResumeText(text: string): ResumeData {
  const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
  const phoneMatch = text.match(/[\+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{7,}/);

  const lines = text.split("\n").filter(Boolean);
  const name = lines[0]?.trim() || "Unknown";

  return {
    name,
    email: emailMatch?.[0] || "",
    phone: phoneMatch?.[0] || "",
    skills: extractResumeSkills(text),
    education: [],
    projects: [],
    experience: [],
  };
}

// Main analysis function
export function analyzeResume(
  resumeText: string,
  jobDescription: string
): AnalysisResult {
  const resumeSkills = extractResumeSkills(resumeText);
  const jobSkills = extractJobSkills(jobDescription);

  const normalizedResume = resumeSkills.map(normalizeSkill);

  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];

  for (const skill of jobSkills) {
    const norm = normalizeSkill(skill);
    if (normalizedResume.includes(norm)) {
      matchedSkills.push(skill);
    } else {
      missingSkills.push(skill);
    }
  }

  const matchScore =
    jobSkills.length > 0
      ? Math.round((matchedSkills.length / jobSkills.length) * 100)
      : 0;

  // ATS score factors
  const hasEmail = /[\w.-]+@[\w.-]+\.\w+/.test(resumeText);
  const hasPhone = /[\+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{7,}/.test(resumeText);
  const hasEducation = /education|degree|university|college|bachelor|master/i.test(resumeText);
  const hasExperience = /experience|work|position|role|intern/i.test(resumeText);
  const hasProjects = /project|built|developed|created|implemented/i.test(resumeText);
  const wordCount = resumeText.split(/\s+/).length;
  const goodLength = wordCount > 150 && wordCount < 1500;

  let atsScore = 0;
  if (hasEmail) atsScore += 10;
  if (hasPhone) atsScore += 10;
  if (hasEducation) atsScore += 15;
  if (hasExperience) atsScore += 20;
  if (hasProjects) atsScore += 15;
  if (goodLength) atsScore += 10;
  atsScore += Math.min(20, matchedSkills.length * 4);

  atsScore = Math.min(100, atsScore);

  // Generate suggestions
  const suggestions: string[] = [];
  if (missingSkills.length > 0) {
    suggestions.push(
      `Add these missing skills to your resume: ${missingSkills.slice(0, 5).join(", ")}`
    );
  }
  if (!hasEmail) suggestions.push("Include your email address in the resume.");
  if (!hasPhone) suggestions.push("Add a phone number for contact.");
  if (!hasEducation) suggestions.push("Add an education section with your degree details.");
  if (!hasExperience) suggestions.push("Include work experience with measurable achievements.");
  if (!hasProjects) suggestions.push("Add a projects section showcasing relevant work.");
  if (wordCount < 150) suggestions.push("Your resume seems too short. Add more detail about your experience.");
  if (wordCount > 1500) suggestions.push("Consider condensing your resume to be more focused.");
  if (matchScore < 50) {
    suggestions.push("Tailor your resume to include more keywords from the job description.");
  }

  const learningResources = missingSkills.map((skill) => ({
    skill,
    suggestion: `Learn ${skill} through online courses, documentation, and hands-on projects.`,
  }));

  return {
    resumeData: parseResumeText(resumeText),
    matchScore,
    atsScore,
    matchedSkills,
    missingSkills,
    suggestions,
    learningResources,
    analyzedAt: new Date().toISOString(),
  };
}
