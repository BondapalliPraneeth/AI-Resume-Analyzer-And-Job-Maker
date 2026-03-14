import { DashboardLayout } from "@/components/DashboardLayout";
import { useAnalysisStore } from "@/stores/analysisStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { History, BarChart3, FileText } from "lucide-react";

export default function HistoryPage() {
  const history = useAnalysisStore((s) => s.history);
  const setResult = useAnalysisStore((s) => s.setResult);
  const navigate = useNavigate();

  const viewResult = (id: string) => {
    const entry = history.find((h) => h.id === id);
    if (entry) {
      // Re-set as current result without adding to history again
      useAnalysisStore.setState({ currentResult: entry.result });
      navigate("/results");
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <History className="h-6 w-6 text-primary" /> Analysis History
          </h1>
          <p className="text-muted-foreground mt-1">View your previous resume analyses.</p>
        </div>

        {history.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground mb-4">No analyses yet.</p>
              <Button onClick={() => navigate("/analyze")}>Start Analysis</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {history.map((entry) => (
              <Card
                key={entry.id}
                className="hover:border-primary/30 transition-colors cursor-pointer"
                onClick={() => viewResult(entry.id)}
              >
                <CardContent className="py-4 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {entry.jobTitle}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(entry.analyzedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-6 shrink-0">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Match</p>
                      <p className="text-lg font-semibold text-primary">{entry.matchScore}%</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">ATS</p>
                      <p className="text-lg font-semibold text-foreground">{entry.atsScore}%</p>
                    </div>
                    <Button variant="ghost" size="sm" className="gap-1">
                      <BarChart3 className="h-4 w-4" /> View
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
