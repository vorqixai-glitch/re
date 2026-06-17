import express, { Request, Response, NextFunction } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import Stripe from "stripe";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
// @ts-ignore
import archiver from "archiver";

const app = express();
const PORT = 3000;

app.use(express.json());

// Set up data storage (JSON fallback)
const DATA_FILE = path.join(process.cwd(), "data.json");
let users: any[] = [];
let projects: any[] = [];
let payments: any[] = [];

function loadData() {
  if (fs.existsSync(DATA_FILE)) {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    users = data.users || [];
    projects = data.projects || [];
    payments = data.payments || [];
  } else {
    saveData();
  }
}
function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ users, projects, payments }, null, 2));
}

loadData();

// Configure SDKs
let ai: GoogleGenAI | null = null;
let stripeClient: Stripe | null = null;

function getAi() {
  if (!ai) {
    if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY missing");
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return ai;
}

function getStripe() {
  if (!stripeClient && process.env.STRIPE_SECRET_KEY) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeClient;
}

const JWT_SECRET = process.env.JWT_SECRET || "default_development_secret";

// Auth Middleware
function authMiddleware(req: any, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// ---------------------------
// Auth Routes
// ---------------------------
app.post("/api/auth/register", (req, res) => {
  const { email, password } = req.body;
  if (users.find(u => u.email === email)) return res.status(400).json({ error: "User already exists" });
  
  const user = { id: uuidv4(), email, password, created_at: new Date().toISOString() };
  users.push(user);
  saveData();

  const token = jwt.sign({ id: user.id, email }, JWT_SECRET, { expiresIn: "24h" });
  res.json({ token, user: { id: user.id, email } });
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const token = jwt.sign({ id: user.id, email }, JWT_SECRET, { expiresIn: "24h" });
  res.json({ token, user: { id: user.id, email } });
});

app.get("/api/auth/me", authMiddleware, (req: any, res) => {
  res.json({ user: req.user });
});

// ---------------------------
// Generate SaaS Route
// ---------------------------
app.post("/api/generate", authMiddleware, async (req: any, res) => {
  try {
    const { idea } = req.body;
    const aiClient = getAi();
    
    const response = await aiClient.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `You are a SaaS builder AI. Generate a structured business blueprint for the following SaaS idea: "${idea}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            problem: { type: Type.STRING },
            solution: { type: Type.STRING },
            features: { type: Type.ARRAY, items: { type: Type.STRING } },
            pricing: {
              type: Type.OBJECT,
              properties: {
                free: { type: Type.STRING },
                pro: { type: Type.STRING },
                enterprise: { type: Type.STRING }
              }
            },
            mvp_steps: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["name", "problem", "solution", "features", "pricing", "mvp_steps"]
        }
      }
    });

    if (!response.text) throw new Error("No response generated.");
    
    let blueprint;
    const rawText = response.text.trim();
    try {
      // Direct parser
      blueprint = JSON.parse(rawText);
    } catch (e) {
      // Clean up markdown block wrapping if present
      const cleanText = rawText.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim();
      try {
        blueprint = JSON.parse(cleanText);
      } catch (subErr) {
        // Find JSON with regex match if there was leading/trailing chatter
        const jsonMatch = rawText.match(/```json\s*([\s\S]*?)\s*```/i) || rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            blueprint = JSON.parse(jsonMatch[1] || jsonMatch[0]);
          } catch (finalErr) {
            throw new Error("Could not parse AI output: " + rawText);
          }
        } else {
          throw new Error("Could not parse AI output: " + rawText);
        }
      }
    }

    const project = {
      id: "saas_" + uuidv4(),
      user_id: req.user.id,
      ...blueprint,
      created_at: new Date().toISOString(),
      is_public: true,
      unlocked_by: [] // Array of user IDs that paid to unlock
    };

    projects.push(project);
    saveData();

    res.json(project);
  } catch (error: any) {
    console.error("AI Generation Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate SaaS" });
  }
});

// ---------------------------
// Marketplace & Detail Routes
// ---------------------------
app.get("/api/market", (req, res) => {
  const publicProjects = projects.filter(p => p.is_public).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  res.json(publicProjects);
});

app.get("/api/saas/:id", (req, res) => {
  const project = projects.find(p => p.id === req.params.id);
  if (!project) return res.status(404).json({ error: "Project not found" });
  res.json(project);
});

// ---------------------------
// Export & Monetization Routes
// ---------------------------
app.post("/api/checkout", authMiddleware, async (req: any, res) => {
  const { projectId } = req.body;
  const project = projects.find(p => p.id === projectId);
  if (!project) return res.status(404).json({ error: "Project not found" });

  const stripe = getStripe();
  if (!stripe) {
    // If Stripe is not configured, automatically unlock for MVP demo purposes
    if (!project.unlocked_by) project.unlocked_by = [];
    project.unlocked_by.push(req.user.id);
    saveData();
    return res.json({ success: true, dummy: true });
  }

  const appUrl = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: `Unlock Export: ${project.name}` },
            unit_amount: 1900, // $19.00
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${appUrl}/saas/${projectId}?success=true`,
      cancel_url: `${appUrl}/saas/${projectId}?canceled=true`,
      metadata: { projectId, userId: req.user.id }
    });

    res.json({ id: session.id, url: session.url });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/unlock/:id", authMiddleware, (req: any, res) => {
  // Normally called by Stripe Webhook. We'll use a local bypass route for simpler setup
  const project = projects.find(p => p.id === req.params.id);
  if (!project) return res.status(404).json({ error: "Project not found" });
  
  if (!project.unlocked_by) project.unlocked_by = [];
  if (!project.unlocked_by.includes(req.user.id)) {
    project.unlocked_by.push(req.user.id);
    saveData();
  }
  
  res.json({ success: true });
});

app.get("/api/export/:id", (req: any, res) => { // Normally authenticated, checking query params instead because frontend 'a href' download
  const token = req.query.token;
  if (!token) return res.status(401).json({ error: "Missing token" });
  
  let userId;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    userId = payload.id;
  } catch (e) {
    return res.status(401).json({ error: "Invalid token" });
  }

  const project = projects.find(p => p.id === req.params.id);
  if (!project) return res.status(404).json({ error: "Project not found" });

  const isOwner = project.user_id === userId;
  const isUnlocked = project.unlocked_by?.includes(userId);
  if (!isOwner && !isUnlocked) return res.status(403).json({ error: "You must unlock this project to export" });

  // Generate ZIP
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${project.name.replace(/\s+/g, "_")}_saas_kit.zip"`);

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', (err) => { 
    console.error("ZIP Generation error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to generate ZIP archive" });
    }
  });
  archive.pipe(res);

  // README
  archive.append(`# ${project.name}\n\n## The Problem\n${project.problem}\n\n## The Solution\n${project.solution}\n\n## Features\n${project.features.map((f: string) => `- ${f}`).join('\n')}\n\n## MVP Steps\n${project.mvp_steps.map((s: string, i: number) => `${i + 1}. ${s}`).join('\n')}\n`, { name: 'README.md' });

  // Backend starter
  archive.append(`import express from "express";\nconst app = express();\napp.get("/", (req, res) => res.send("${project.name} API"));\napp.listen(3000);`, { name: 'backend/server.js' });
  
  // Frontend template
  archive.append(`<!DOCTYPE html>\n<html>\n<head><title>${project.name}</title></head>\n<body><h1>${project.name} MVP</h1>\n<p>${project.solution}</p>\n</body>\n</html>`, { name: 'frontend/index.html' });


  archive.finalize();
});

// ---------------------------
// Vite Middleware / Startup
// ---------------------------
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
