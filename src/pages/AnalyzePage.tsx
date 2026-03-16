import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DashboardLayout } from "@/components/DashboardLayout";
import { analyzeResume } from "@/lib/analyzer";
import { useAnalysisStore } from "@/stores/analysisStore";
import { Upload, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

function flattenJsonResume(json: Record<string, unknown>): string {
  const lines: string[] = [];

  const str = (v: unknown): string => (typeof v === "string" ? v.trim() : String(v ?? "")).trim();

  // Personal info
  if (json.name) lines.push(`Name: ${str(json.name)}`);
  if (json.email) lines.push(`Email: ${str(json.email)}`);
  if (json.phone) lines.push(`Phone: ${str(json.phone)}`);
  if (json.location ?? json.address) lines.push(`Location: ${str(json.location ?? json.address)}`);

  // Summary / Objective
  const summary = json.summary ?? json.objective ?? json.profile ?? json.about;
  if (summary) lines.push(`\nProfessional Summary:\n${str(summary)}`);

  // Skills – handle both flat arrays and grouped objects
  if (Array.isArray(json.skills)) {
    const skillStrings = json.skills.map((s: unknown) =>
      typeof s === "object" && s !== null ? str((s as Record<string, unknown>).name ?? (s as Record<string, unknown>).skill) : str(s)
    ).filter(Boolean);
    if (skillStrings.length) lines.push(`\nSkills: ${skillStrings.join(", ")}`);
  }

  // Work Experience
  const experience = json.experience ?? json.work ?? json.workExperience ?? json.employment;
  if (Array.isArray(experience)) {
    lines.push("\nWork Experience:");
    for (const exp of experience as Record<string, unknown>[]) {
      const role = str(exp.role ?? exp.title ?? exp.position ?? exp.jobTitle);
      const company = str(exp.company ?? exp.organization ?? exp.employer);
      const duration = str(exp.duration ?? exp.dates ?? exp.period ?? exp.date);
      lines.push(`  ${role} at ${company}${duration ? ` (${duration})` : ""}`);
      if (exp.description) lines.push(`    ${str(exp.description)}`);
      if (Array.isArray(exp.responsibilities)) {
        for (const r of exp.responsibilities) lines.push(`    - ${str(r)}`);
      }
      if (Array.isArray(exp.highlights)) {
        for (const h of exp.highlights) lines.push(`    - ${str(h)}`);
      }
    }
  }

  // Education
  const education = json.education ?? json.academics;
  if (Array.isArray(education)) {
    lines.push("\nEducation:");
    for (const edu of education as Record<string, unknown>[]) {
      const degree = str(edu.degree ?? edu.qualification ?? edu.course);
      const school = str(edu.institution ?? edu.school ?? edu.university ?? edu.college);
      const year = str(edu.year ?? edu.dates ?? edu.graduationYear ?? edu.date);
      lines.push(`  ${degree} from ${school}${year ? ` (${year})` : ""}`);
      if (edu.gpa ?? edu.grade ?? edu.cgpa) lines.push(`    GPA/Grade: ${str(edu.gpa ?? edu.grade ?? edu.cgpa)}`);
    }
  }

  // Projects
  if (Array.isArray(json.projects)) {
    lines.push("\nProjects:");
    for (const proj of json.projects as Record<string, unknown>[]) {
      const name = str(proj.name ?? proj.title);
      const desc = str(proj.description);
      lines.push(`  ${name}${desc ? `: ${desc}` : ""}`);
      if (Array.isArray(proj.technologies)) lines.push(`    Technologies: ${(proj.technologies as unknown[]).map(str).join(", ")}`);
    }
  }

  // Certifications
  const certs = json.certifications ?? json.certificates;
  if (Array.isArray(certs)) {
    lines.push("\nCertifications:");
    for (const c of certs as Record<string, unknown>[]) {
      lines.push(`  - ${str(typeof c === "string" ? c : (c.name ?? c.title))}`);
    }
  }

  // Languages
  if (Array.isArray(json.languages)) {
    const langs = json.languages.map((l: unknown) =>
      typeof l === "string" ? l : str((l as Record<string, unknown>).name ?? (l as Record<string, unknown>).language)
    ).filter(Boolean);
    if (langs.length) lines.push(`\nLanguages: ${langs.join(", ")}`);
  }

  // Fallback: if nothing was extracted, stringify the whole JSON readably
  if (lines.length === 0) {
    return JSON.stringify(json, null, 2);
  }

  return lines.join("\n");
}

export default function AnalyzePage() {
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const setResult = useAnalysisStore((s) => s.setResult);
  const navigate = useNavigate();

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setFileName(file.name);

      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;

        const looksLikeJson = (s: string) => {
          const t = s.trimStart();
          return t.startsWith("{") || t.startsWith("[");
        };

        const isJsonFile = file.name.toLowerCase().endsWith(".json");

        // If JSON file (or content looks like JSON), parse and keep as pretty JSON
        if (isJsonFile || looksLikeJson(text)) {
          try {
            const json = JSON.parse(text);
            setResumeText(JSON.stringify(json, null, 2));
            toast.success(`Loaded JSON resume: ${file.name}`);
          } catch {
            if (isJsonFile) {
              toast.error("Invalid JSON file. Please check the format.");
            } else {
              setResumeText(text);
              toast.success(`Loaded ${file.name}`);
            }
          }
        } else {
          setResumeText(text);
          toast.success(`Loaded ${file.name}`);
        }
      };
      reader.readAsText(file);
    },
    []
  );

  const handleAnalyze = async () => {
    if (!resumeText.trim() || !jobDescription.trim()) {
      toast.error("Please provide both resume and job description.");
      return;
    }
    setIsAnalyzing(true);
    // Simulate processing delay
    await new Promise((r) => setTimeout(r, 1500));
    const result = analyzeResume(resumeText, jobDescription);
    setResult(result, jobDescription.slice(0, 60));
    setIsAnalyzing(false);
    navigate("/results");
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground">Analyze Resume</h1>
          <p className="text-muted-foreground mt-1">
            Upload your resume and paste a job description to get started.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Resume Input */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Resume</CardTitle>
              <CardDescription>Upload a file or paste your resume text</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 cursor-pointer hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  accept=".txt,.json,.pdf,.docx"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                {fileName ? (
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    <FileText className="h-5 w-5 text-primary" />
                    {fileName}
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">
                      Click to upload (.txt, .json)
                    </span>
                  </>
                )}
              </label>
              <Textarea
                placeholder="Or paste your resume text here..."
                className="min-h-[200px] text-sm"
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
              />
            </CardContent>
          </Card>

          {/* Job Description Input */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Job Description</CardTitle>
              <CardDescription>Paste the job listing you're targeting</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Paste the full job description here..."
                className="min-h-[320px] text-sm"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
              />
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 flex justify-end">
          <Button
            size="lg"
            onClick={handleAnalyze}
            disabled={isAnalyzing || !resumeText.trim() || !jobDescription.trim()}
            className="gap-2"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Analyzing...
              </>
            ) : (
              "Analyze Resume"
            )}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
