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

console.log("ENV CHECK:", process.env.OPENAI_API_KEY);
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

if (!MONGODB_URI) throw new Error("Missing MONGODB_URI");
if (!JWT_SECRET) throw new Error("Missing JWT_SECRET");

await mongoose.connect(MONGODB_URI);

const app = express();
app.use(express.json({ limit: "5mb" }));
app.use(cors({
  origin: "*",
  credentials: true,
  })
);

// Root route
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
const VALID_SKILLS = [
  "java", "python", "javascript", "react", "node", "mongodb",
  "sql", "html", "css", "communication", "sales", "marketing",
  "negotiation", "leadership", "excel", "powerpoint"
];

// ==================== ANALYZE ROUTE (FIXED) ====================
console.log("🔥 NEW ANALYZER CODE RUNNING");
app.post("/analyze", async (req, res) => {
  try {
    const { resumeText, jobDescription } = req.body;

    if (!resumeText || !jobDescription) {
      return res.status(400).json({ error: "Missing data" });
    }

    // -------- RESUME PROMPT (STRICT) --------
    const resumePrompt = `
You are a strict resume parser.

Extract ONLY real skills explicitly mentioned.

STRICT RULES:
- No guessing
- No inference
- No short words (<3 letters)
- Ignore words like: go, good, basic, etc.
- Only include real skills like Java, Python, SQL, Communication

Return JSON:
{ "skills": [] }

Resume:
${resumeText}
`;

    const resumeRes = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: resumePrompt }],
      temperature: 0
    });

    let resumeData;
    try {
      resumeData = JSON.parse(resumeRes.choices[0].message.content);
    } catch {
      resumeData = { skills: [] };
    }

    // -------- JD PROMPT --------
    const jdPrompt = `
Extract required skills from this job description.

Return JSON:
{ "skills": [] }

Job Description:
${jobDescription}
`;

    const jdRes = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: jdPrompt }],
      temperature: 0
    });

    let jdData;
    try {
      jdData = JSON.parse(jdRes.choices[0].message.content);
    } catch {
      jdData = { skills: [] };
    }

    // -------- MATCHING (FINAL FIX) --------

   // -------- HARD FILTER (FINAL FIX) --------

// normalize helper
const normalize = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]/g, "").trim();

// ---------- RESUME SKILLS ----------
const resumeSkills = (resumeData.skills || [])
  .map(s => s.trim())
  .filter(skill => {
    const n = normalize(skill);

    // remove garbage
    if (n.length < 3) return false;

    // allow only known skills
    return VALID_SKILLS.includes(n);
  });

// ---------- JD SKILLS ----------
const jdSkills = (jdData.skills || [])
  .map(s => s.trim())
  .filter(skill => {
    const n = normalize(skill);
    if (n.length < 3) return false;

    return VALID_SKILLS.includes(n);
  });

// ---------- MATCH ----------
const matched = resumeSkills.filter(skill =>
  jdSkills.includes(skill)
);

// ---------- SCORE ----------
const score = jdSkills.length
  ? Math.round((matched.length / jdSkills.length) * 100)
  : 0;

    // ---------- DEBUG (OPTIONAL) ----------
    console.log("RAW AI:", resumeData.skills);
    console.log("FINAL:", resumeSkills);

    // ---------- RESPONSE ----------
    return res.json({
      resumeSkills,
      jdSkills,
      matched,
      score
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Analysis failed" });
  }
});


// ==================== IMPORTANT FIX FOR RENDER ====================
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
