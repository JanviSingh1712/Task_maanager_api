/**
 * api/index.js
 *
 * WHY THIS STRUCTURE FOR VERCEL:
 * Vercel runs serverless functions, not persistent servers.
 * Instead of app.listen(), we export the Express app directly.
 * Vercel intercepts incoming requests and passes them to this handler.
 *
 * STORAGE NOTE:
 * Vercel's filesystem is read-only in production — we cannot write to
 * a JSON file between requests. So we use an IN-MEMORY array instead.
 * Data resets on cold starts (this is normal for serverless demos).
 * For persistent data, swap the store with MongoDB Atlas / PlanetScale.
 */

const express = require("express");
const cors = require("cors");

const app = express();

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors({ origin: "*" })); // allow all origins (tighten in production)
app.use(express.json());

// Serve static files from frontend directory (for local development)
app.use(express.static("frontend"));

// ── In-Memory Task Store ────────────────────────────────────────────────────
// Seeded with sample tasks so the UI isn't empty on first load
let tasks = [
  {
    id: 1,
    title: "Set up Node.js & Express project",
    description:
      "Initialise package.json, install dependencies, scaffold folder structure",
    completed: true,
    priority: "high",
    createdAt: new Date("2024-01-01").toISOString(),
    updatedAt: new Date("2024-01-01").toISOString(),
  },
  {
    id: 2,
    title: "Build RESTful CRUD API",
    description:
      "Implement GET, POST, PUT, DELETE endpoints with full validation",
    completed: true,
    priority: "high",
    createdAt: new Date("2024-01-02").toISOString(),
    updatedAt: new Date("2024-01-02").toISOString(),
  },
  {
    id: 3,
    title: "Deploy to Vercel",
    description:
      "Configure vercel.json, use serverless functions, push to GitHub",
    completed: false,
    priority: "medium",
    createdAt: new Date("2024-01-03").toISOString(),
    updatedAt: new Date("2024-01-03").toISOString(),
  },
  {
    id: 4,
    title: "Write project documentation",
    description: "Document API endpoints, setup steps, and usage examples",
    completed: false,
    priority: "low",
    createdAt: new Date("2024-01-04").toISOString(),
    updatedAt: new Date("2024-01-04").toISOString(),
  },
];

// Auto-incrementing ID — always higher than any existing id
let nextId = Math.max(...tasks.map((t) => t.id)) + 1;

// ── Helper: unique ID ───────────────────────────────────────────────────────
const genId = () => nextId++;

// ── Routes ──────────────────────────────────────────────────────────────────

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "TaskFlow API is running on Vercel",
    tasks: tasks.length,
  });
});

// GET /tasks — return all tasks
app.get("/tasks", (req, res) => {
  res.status(200).json({ count: tasks.length, tasks });
});

// GET /tasks/:id — return one task
app.get("/tasks/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "ID must be a number" });

  const task = tasks.find((t) => t.id === id);
  if (!task) return res.status(404).json({ error: `Task ${id} not found` });

  res.status(200).json(task);
});

// POST /tasks — create a task
app.post("/tasks", (req, res) => {
  const {
    title,
    description = "",
    completed = false,
    priority = "medium",
  } = req.body;

  if (!title || typeof title !== "string" || !title.trim())
    return res
      .status(400)
      .json({ error: "title is required and must be a non-empty string" });

  if (typeof completed !== "boolean")
    return res.status(400).json({ error: "completed must be true or false" });

  if (!["low", "medium", "high"].includes(priority))
    return res
      .status(400)
      .json({ error: "priority must be low, medium, or high" });

  const now = new Date().toISOString();
  const task = {
    id: genId(),
    title: title.trim(),
    description: description.trim(),
    completed,
    priority,
    createdAt: now,
    updatedAt: now,
  };

  tasks.push(task);
  res.status(201).json(task);
});

// PUT /tasks/:id — update a task
app.put("/tasks/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "ID must be a number" });

  const idx = tasks.findIndex((t) => t.id === id);
  if (idx === -1)
    return res.status(404).json({ error: `Task ${id} not found` });

  const { title, description, completed, priority } = req.body;

  if (
    title !== undefined &&
    (!title || typeof title !== "string" || !title.trim())
  )
    return res.status(400).json({ error: "title must be a non-empty string" });

  if (completed !== undefined && typeof completed !== "boolean")
    return res.status(400).json({ error: "completed must be a boolean" });

  if (priority !== undefined && !["low", "medium", "high"].includes(priority))
    return res
      .status(400)
      .json({ error: "priority must be low, medium, or high" });

  tasks[idx] = {
    ...tasks[idx],
    ...(title !== undefined && { title: title.trim() }),
    ...(description !== undefined && { description: description.trim() }),
    ...(completed !== undefined && { completed }),
    ...(priority !== undefined && { priority }),
    updatedAt: new Date().toISOString(),
  };

  res.status(200).json(tasks[idx]);
});

// DELETE /tasks/:id — delete a task
app.delete("/tasks/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "ID must be a number" });

  const idx = tasks.findIndex((t) => t.id === id);
  if (idx === -1)
    return res.status(404).json({ error: `Task ${id} not found` });

  const [deleted] = tasks.splice(idx, 1);
  res.status(200).json({ message: `Task ${id} deleted`, deletedTask: deleted });
});

// ── 404 catch-all ───────────────────────────────────────────────────────────
app.use((req, res) => {
  res
    .status(404)
    .json({ error: `Route ${req.method} ${req.originalUrl} not found` });
});

// ── Export for Vercel (do NOT call app.listen here) ────────────────────────
// When running locally with nodemon, we start the server the normal way.
if (process.env.NODE_ENV !== "production" && require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`\n✅  TaskFlow API  →  http://localhost:${PORT}/api/health`);
    console.log(`🌐  Open frontend →  frontend/index.html\n`);
  });
}

module.exports = app; // Vercel calls this as a serverless function
