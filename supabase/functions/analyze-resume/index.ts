import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { resumeText, jobDescription } = await req.json();

    if (!resumeText || !jobDescription) {
      return new Response(
        JSON.stringify({ error: "Both resumeText and jobDescription are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are an expert Resume Parsing and ATS Matching engine.

Your task is to analyze a RESUME and a JOB DESCRIPTION and extract ONLY accurate, explicitly mentioned information.

⚠️ CRITICAL RULES (MUST FOLLOW):
- DO NOT hallucinate or guess any skills.
- DO NOT add programming languages, tools, or skills that are not clearly written in the text.
- If a skill is not explicitly present, ignore it completely.
- Do NOT include generic words (like "go", "work", "team", "good", etc.).
- Treat case carefully (Java ≠ JavaScript ≠ Java EE).
- Output must be strictly based on text evidence only.

You MUST return ONLY valid JSON with this exact structure (no markdown, no explanation):
{
  "resume_skills": {
    "technical": [],
    "tools": [],
    "soft_skills": [],
    "languages": []
  },
  "jd_skills": {
    "technical": [],
    "tools": [],
    "soft_skills": [],
    "languages": []
  },
  "matched_skills": [],
  "missing_skills": [],
  "match_score": <number 0-100>,
  "ats_score": <number 0-100>,
  "suggestions": [],
  "learning_resources": [
    { "skill": "<skill name>", "suggestion": "<how to learn it>" }
  ]
}

Rules for matching:
- Java ≠ JavaScript
- React ≠ React Native (unless explicitly stated)
- Do not force matches between unrelated terms
- match_score = percentage of JD skills matched
- ats_score = overall resume quality score considering: contact info presence, section structure, keyword density, formatting quality, and skill match ratio
- suggestions: actionable improvement tips based on gaps found
- learning_resources: for each missing skill, provide a brief learning suggestion`;

    const userPrompt = `RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription}`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content ?? "";

    // Strip markdown fences if present
    const jsonStr = raw.replace(/```json\s*/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(jsonStr);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-resume error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
