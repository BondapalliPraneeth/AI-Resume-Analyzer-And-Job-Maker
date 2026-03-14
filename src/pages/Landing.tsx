import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, FileSearch, Target, Lightbulb, BarChart3, Sparkles } from "lucide-react";

const features = [
  {
    icon: FileSearch,
    title: "Smart Resume Parsing",
    description: "Extract skills, experience, and education from your resume automatically.",
  },
  {
    icon: Target,
    title: "Job Match Scoring",
    description: "Get a precise match percentage between your resume and any job description.",
  },
  {
    icon: BarChart3,
    title: "ATS Compatibility",
    description: "Check how well your resume performs with Applicant Tracking Systems.",
  },
  {
    icon: Lightbulb,
    title: "Improvement Tips",
    description: "Receive actionable suggestions to strengthen your application.",
  },
];

const steps = [
  { step: "01", title: "Upload Resume", description: "Upload your resume in PDF or paste as text." },
  { step: "02", title: "Paste Job Description", description: "Copy and paste the job listing you're targeting." },
  { step: "03", title: "Get Results", description: "View your match score, missing skills, and improvement tips." },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground">ResumeAI</span>
          </div>
          <Button size="sm" onClick={() => navigate("/analyze")}>
            Get Started
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="dot-grid">
        <div className="max-w-4xl mx-auto px-6 py-24 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border bg-card text-sm text-muted-foreground mb-6">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            AI-powered resume analysis
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4">
            Land your dream job with
            <br />
            <span className="text-primary">data-driven insights</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Analyze your resume against any job description. Get your ATS score,
            match percentage, and personalized improvement suggestions in seconds.
          </p>
          <Button size="lg" onClick={() => navigate("/analyze")} className="gap-2">
            Analyze Resume <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-card border-y">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-2xl font-semibold text-center mb-12 text-foreground">
            How it works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((s) => (
              <div key={s.step} className="text-center">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-semibold text-sm mb-4">
                  {s.step}
                </div>
                <h3 className="font-semibold text-foreground mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-2xl font-semibold text-center mb-12 text-foreground">
            Key Features
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="border rounded-lg p-6 bg-card hover:border-primary/30 transition-colors"
              >
                <f.icon className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold text-foreground mb-1">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-card border-t">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-semibold text-foreground mb-4">
            Ready to optimize your resume?
          </h2>
          <p className="text-muted-foreground mb-8">
            Start your free analysis now and get actionable insights in seconds.
          </p>
          <Button size="lg" onClick={() => navigate("/analyze")} className="gap-2">
            Start Analyzing <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            ResumeAI
          </div>
          <p>© {new Date().getFullYear()} ResumeAI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
