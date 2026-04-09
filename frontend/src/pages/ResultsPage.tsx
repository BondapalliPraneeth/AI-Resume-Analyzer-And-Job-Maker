import { DashboardLayout } from "@/components/DashboardLayout";
import { useAnalysisStore } from "@/stores/analysisStore";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, CheckCircle2, XCircle, Lightbulb, BookOpen } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useEffect, useState } from "react";

export default function ResultsPage() {
  const result = useAnalysisStore((s) => s.currentResult);
  const navigate = useNavigate();
  const [animatedMatch, setAnimatedMatch] = useState(0);
  const [animatedAts, setAnimatedAts] = useState(0);

  useEffect(() => {
    if (!result) return;
    const t1 = setTimeout(() => setAnimatedMatch(result.matchScore), 100);
    const t2 = setTimeout(() => setAnimatedAts(result.atsScore), 200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [result]);

  if (!result) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-24">
          <p className="text-muted-foreground mb-4">No analysis results yet.</p>
          <Button onClick={() => navigate("/analyze")}>Start Analysis</Button>
        </div>
      </DashboardLayout>
    );
  }

  const pieData = [
    { name: "Matched", value: result.matchedSkills.length },
    { name: "Missing", value: result.missingSkills.length },
  ];
  const PIE_COLORS = ["hsl(160, 84%, 39%)", "hsl(38, 92%, 50%)"];

  const barData = [
    { name: "Matched", count: result.matchedSkills.length, fill: "hsl(160, 84%, 39%)" },
    { name: "Missing", count: result.missingSkills.length, fill: "hsl(38, 92%, 50%)" },
  ];

  const scoreColor = (score: number) =>
    score >= 70 ? "text-success" : score >= 40 ? "text-warning" : "text-destructive";

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate("/analyze")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Analysis Results</h1>
            <p className="text-sm text-muted-foreground">
              {new Date(result.analyzedAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Score Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-sm font-medium text-muted-foreground mb-1">Job Match</p>
              <p className={`text-4xl font-bold ${scoreColor(result.matchScore)}`}>
                {animatedMatch}%
              </p>
              <Progress value={animatedMatch} className="mt-3 h-2" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-sm font-medium text-muted-foreground mb-1">ATS Score</p>
              <p className={`text-4xl font-bold ${scoreColor(result.atsScore)}`}>
                {animatedAts}%
              </p>
              <Progress value={animatedAts} className="mt-3 h-2" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-sm font-medium text-muted-foreground mb-1">Matched Skills</p>
              <p className="text-4xl font-bold text-success">{result.matchedSkills.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-sm font-medium text-muted-foreground mb-1">Missing Skills</p>
              <p className="text-4xl font-bold text-warning">{result.missingSkills.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Skill Overlap</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Skills Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData}>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {barData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Skills Lists */}
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" /> Matched Skills
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {result.matchedSkills.length > 0 ? (
                  result.matchedSkills.map((s) => (
                    <Badge key={s} variant="secondary" className="bg-success/10 text-success border-success/20">
                      {s}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No matched skills found.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <XCircle className="h-4 w-4 text-warning" /> Missing Skills
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {result.missingSkills.length > 0 ? (
                  result.missingSkills.map((s) => (
                    <Badge key={s} variant="secondary" className="bg-warning/10 text-warning border-warning/20">
                      {s}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No missing skills — great match!</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Suggestions */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-primary" /> Improvement Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {result.suggestions.map((s, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="text-primary font-medium shrink-0">{i + 1}.</span>
                  <span className="text-foreground">{s}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Learning Resources */}
        {result.learningResources.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" /> Learning Suggestions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {result.learningResources.slice(0, 8).map((lr, i) => (
                  <li key={i} className="text-sm text-foreground">
                    <span className="font-medium text-warning">{lr.skill}:</span>{" "}
                    {lr.suggestion}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
