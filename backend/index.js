import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import OpenAI from "openai";

const PORT = Number(process.env.PORT ?? 8080);
const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET;
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "http://localhost:5173";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

if (!MONGODB_URI) throw new Error("Missing MONGODB_URI");
if (!JWT_SECRET) throw new Error("Missing JWT_SECRET");

await mongoose.connect(MONGODB_URI);

const app = express();
app.use(express.json({ limit: "5mb" }));
app.use(cors({ origin: "*", credentials: true }));

app.get("/", (_req, res) => res.json({ ok: true, message: "Resume Analyzer API Running" }));
app.get("/health", (_req, res) => res.json({ ok: true }));

// ==================== AUTH LOGIC ====================

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    displayName: { type: String, default: "" },
  },
  { timestamps: true }
);

const historySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true, ref: "User" },
    jobTitle: { type: String, required: true },
    matchScore: { type: Number, required: true },
    atsScore: { type: Number, required: true },
    analyzedAt: { type: Date, required: true },
    result: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
const AnalysisHistory = mongoose.model("AnalysisHistory", historySchema);

function signToken(user) {
  return jwt.sign(
    { sub: String(user._id), email: user.email, displayName: user.displayName ?? "" },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function auth(req, res, next) {
  const header = req.headers.authorization ?? "";
  const [type, token] = header.split(" ");
  if (type !== "Bearer" || !token) return res.status(401).json({ error: "Unauthorized" });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    return next();
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
}

// ==================== ROUTES ====================

app.post("/auth/signup", async (req, res) => {
  const body = z
    .object({
      email: z.string().email(),
      password: z.string().min(6),
      displayName: z.string().trim().max(80).optional(),
    })
    .safeParse(req.body);

  if (!body.success) return res.status(400).json({ error: "Invalid input" });
  const { email, password, displayName } = body.data;

  const existing = await User.findOne({ email }).lean();
  if (existing) return res.status(409).json({ error: "Email already in use" });

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ email, passwordHash, displayName: displayName ?? "" });
  const token = signToken(user);

  return res.json({
    token,
    user: { id: String(user._id), email: user.email, displayName: user.displayName ?? "" },
  });
});

app.post("/auth/login", async (req, res) => {
  const body = z
    .object({
      email: z.string().email(),
      password: z.string().min(1),
    })
    .safeParse(req.body);

  if (!body.success) return res.status(400).json({ error: "Invalid input" });
  const { email, password } = body.data;

  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  const token = signToken(user);

  return res.json({
    token,
    user: { id: String(user._id), email: user.email, displayName: user.displayName ?? "" },
  });
});

app.get("/me", auth, async (req, res) => {
  const userId = req.user?.sub;
  const user = await User.findById(userId).lean();
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  return res.json({
    user: { id: String(user._id), email: user.email, displayName: user.displayName ?? "" },
  });
});

app.get("/history", auth, async (req, res) => {
  const userId = req.user?.sub;
  const items = await AnalysisHistory.find({ userId })
    .sort({ analyzedAt: -1 })
    .limit(50)
    .lean();

  return res.json({
    history: items.map((h) => ({
      id: String(h._id),
      jobTitle: h.jobTitle,
      matchScore: h.matchScore,
      atsScore: h.atsScore,
      analyzedAt: new Date(h.analyzedAt).toISOString(),
      result: h.result,
    })),
  });
});

app.post("/history", auth, async (req, res) => {
  const body = z
    .object({
      jobTitle: z.string().min(1).max(200),
      matchScore: z.number().min(0).max(100),
      atsScore: z.number().min(0).max(100),
      analyzedAt: z.string(),
      result: z.unknown(),
    })
    .safeParse(req.body);

  if (!body.success) return res.status(400).json({ error: "Invalid input" });

  const userId = req.user?.sub;
  const analyzedAt = new Date(body.data.analyzedAt);

  const doc = await AnalysisHistory.create({
    userId,
    jobTitle: body.data.jobTitle,
    matchScore: body.data.matchScore,
    atsScore: body.data.atsScore,
    analyzedAt,
    result: body.data.result,
  });

  return res.status(201).json({ id: String(doc._id) });
});

// ==================== WORDS THAT ARE NEVER SKILLS ====================
// These common English words get falsely extracted as skills by the AI.
// "go" → mistaken for Go (programming language)
// "rest" → mistaken for REST (API protocol)
const GENERIC_WORD_BLOCKLIST = new Set([
  "go", "rest", "use", "good", "basic", "work", "lead", "run",
  "help", "make", "able", "skill", "strong", "ability", "experience",
  "knowledge", "understanding", "awareness", "team", "ability",
  "various", "related", "relevant", "preferred", "required",
  "including", "well", "high", "low", "new", "key", "other"
]);

/**
 * Cleans and deduplicates an array of skill strings.
 * Removes: short strings, generic English words, empty values.
 */
function cleanSkills(skills) {
  const seen = new Set();
  return (skills || [])
    .map(s => (s || "").trim())
    .filter(skill => {
      if (!skill) return false;
      const lower = skill.toLowerCase().replace(/[^a-z0-9\s\-\.]/g, "").trim();

      // Remove anything under 3 characters
      if (lower.length < 3) return false;

      // Remove generic English words
      if (GENERIC_WORD_BLOCKLIST.has(lower)) return false;

      // Deduplicate (case-insensitive)
      if (seen.has(lower)) return false;
      seen.add(lower);

      return true;
    });
}

// ==================== ANALYZE ROUTE ====================
app.post("/analyze", async (req, res) => {
  try {
    const { resumeText, jobDescription } = req.body;

    if (!resumeText || !jobDescription) {
      return res.status(400).json({ error: "resumeText and jobDescription are required" });
    }

    // -------- STEP 1: DETECT DOMAIN FROM JD --------
    // We first ask AI what domain/industry this JD belongs to.
    // This makes skill extraction domain-aware.
    const domainPrompt = `
What is the primary industry or domain of this job description?
Reply with ONLY a single short phrase, e.g.: "software engineering", "agriculture", "finance", "healthcare", "marketing".
Do not explain.

Job Description:
${jobDescription}
`;

    const domainRes = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: domainPrompt }],
      temperature: 0,
    });

    const detectedDomain = (domainRes.choices[0].message.content || "general").trim();
    console.log("Detected domain:", detectedDomain);

    // -------- STEP 2: EXTRACT SKILLS FROM RESUME --------
    const resumePrompt = `
You are an expert resume parser. The job is in the "${detectedDomain}" domain.

Extract ONLY real, named skills, tools, technologies, certifications, or domain-specific competencies that are EXPLICITLY mentioned in the resume below.

STRICT RULES:
- Do NOT extract common English words like "go", "rest", "use", "lead", "work", "good", "basic"
- Do NOT extract job titles, company names, or locations
- Do NOT infer or guess skills that are not mentioned
- Include domain-specific skills (e.g., for agriculture: "crop rotation", "soil analysis", "irrigation", "GIS", "pesticide application")
- Include technical skills (e.g., "Python", "Excel", "AutoCAD")
- Include soft skills only if explicitly named (e.g., "communication", "leadership")
- Return ONLY valid JSON, no explanation, no markdown

Output format:
{ "skills": ["skill1", "skill2", "skill3"] }

Resume:
${resumeText}
`;

    const resumeRes = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: resumePrompt }],
      temperature: 0,
    });

    let resumeData;
    try {
      const raw = resumeRes.choices[0].message.content.replace(/```json|```/g, "").trim();
      resumeData = JSON.parse(raw);
    } catch {
      resumeData = { skills: [] };
    }

    // -------- STEP 3: EXTRACT SKILLS FROM JD --------
    const jdPrompt = `
You are an expert job description parser. This JD is in the "${detectedDomain}" domain.

Extract ONLY real, named skills, tools, technologies, certifications, or domain-specific competencies that are REQUIRED or PREFERRED in the job description below.

STRICT RULES:
- Do NOT extract common English words like "go", "rest", "use", "lead", "work", "good", "basic"
- Do NOT extract job titles, company names, or locations
- Do NOT infer skills — only extract what is explicitly mentioned
- Include domain-specific skills (e.g., for agriculture: "crop rotation", "soil analysis", "irrigation", "GIS", "pesticide application", "farm management")
- Include technical skills (e.g., "Python", "Excel", "AutoCAD", "Tractor operation")
- Include soft skills only if explicitly named
- Return ONLY valid JSON, no explanation, no markdown

Output format:
{ "skills": ["skill1", "skill2", "skill3"] }

Job Description:
${jobDescription}
`;

    const jdRes = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: jdPrompt }],
      temperature: 0,
    });

    let jdData;
    try {
      const raw = jdRes.choices[0].message.content.replace(/```json|```/g, "").trim();
      jdData = JSON.parse(raw);
    } catch {
      jdData = { skills: [] };
    }

    // -------- STEP 4: CLEAN SKILLS --------
    // Remove generic words, short strings, and duplicates
    const resumeSkills = cleanSkills(resumeData.skills);
    const jdSkills = cleanSkills(jdData.skills);

    console.log("Resume skills:", resumeSkills);
    console.log("JD skills:", jdSkills);

    // -------- STEP 5: MATCH SKILLS (case-insensitive) --------
    const resumeSkillsLower = resumeSkills.map(s => s.toLowerCase());
    const jdSkillsLower = jdSkills.map(s => s.toLowerCase());

    const matched = jdSkills.filter(skill =>
      resumeSkillsLower.includes(skill.toLowerCase())
    );

    const missing = jdSkills.filter(skill =>
      !resumeSkillsLower.includes(skill.toLowerCase())
    );

    // -------- STEP 6: SCORE --------
    const matchScore = jdSkills.length
      ? Math.round((matched.length / jdSkills.length) * 100)
      : 0;

    // -------- STEP 7: GENERATE IMPROVEMENT SUGGESTIONS --------
    const suggestions = missing.slice(0, 5).map(skill =>
      `Add "${skill}" to your resume if you have experience with it.`
    );

    if (missing.length > 5) {
      suggestions.push(`...and ${missing.length - 5} more missing skills.`);
    }

    // -------- RESPONSE --------
    return res.json({
      domain: detectedDomain,
      resumeSkills,
      jdSkills,
      matched,
      missing,
      score: matchScore,
      suggestions,
    });

  } catch (err) {
    console.error("Analyze error:", err);
    return res.status(500).json({ error: "Analysis failed" });
  }
});

// ==================== START SERVER ====================
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
