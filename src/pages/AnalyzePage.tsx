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

        // If JSON file, try to parse and flatten to readable text
        if (file.name.endsWith(".json")) {
          try {
            const json = JSON.parse(text);
            const flattened = flattenJsonResume(json);
            setResumeText(flattened);
            toast.success(`Loaded JSON resume: ${file.name}`);
          } catch {
            toast.error("Invalid JSON file. Please check the format.");
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
