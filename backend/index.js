import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const PORT = Number(process.env.PORT ?? 8080);
const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET;
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "http://localhost:5173";

if (!MONGODB_URI) throw new Error("Missing MONGODB_URI");
if (!JWT_SECRET) throw new Error("Missing JWT_SECRET");

await mongoose.connect(MONGODB_URI);

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use(
  cors({
    origin: CORS_ORIGIN.split(",").map((s) => s.trim()),
    credentials: true,
  })
);

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

// ✅ Root route — fixes the GET / 404
app.get("/", (_req, res) => res.json({ ok: true, message: "Job Maker API is running" }));



app.get("/health", (_req, res) => res.json({ ok: true }));

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
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const user = await User.findById(userId).lean();
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  return res.json({ user: { id: String(user._id), email: user.email, displayName: user.displayName ?? "" } });
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
  const userId = req.user?.sub;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const body = z
    .object({
      jobTitle: z.string().min(1).max(200),
      matchScore: z.number().min(0).max(100),
      atsScore: z.number().min(0).max(100),
      analyzedAt: z.string().min(1),
      result: z.unknown(),
    })
    .safeParse(req.body);

  if (!body.success) {
    return res.status(400).json({ error: "Invalid input", issues: body.error.issues });
  }

  const analyzedAt = new Date(body.data.analyzedAt);
  if (Number.isNaN(analyzedAt.getTime())) {
    return res.status(400).json({
      error: "Invalid input",
      issues: [{ path: ["analyzedAt"], message: "Invalid datetime" }],
    });
  }

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

// ✅ Export app for Vercel (serverless), only listen locally
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`API listening on :${PORT}`);
  });
}

export default app;
