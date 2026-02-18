const path = require("path");
const express = require("express");

const { runAgentLoop } = require("./lib/agent");
const {
  readProgress,
  getProgressSummary,
  markTopicComplete
} = require("./lib/progressStore");

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/api/progress", async (req, res) => {
  try {
    const progress = await readProgress();
    res.json(getProgressSummary(progress));
  } catch (error) {
    res.status(500).json({
      error: "Failed to read progress.",
      details: String(error.message || error)
    });
  }
});

app.post("/api/complete", async (req, res) => {
  const topic = typeof req.body?.topic === "string" ? req.body.topic.trim() : "";

  if (!topic) {
    return res.status(400).json({ error: "Topic is required." });
  }

  try {
    const progress = await markTopicComplete(topic);
    return res.json({
      reply: `Marked \"${topic}\" complete.`,
      progress
    });
  } catch (error) {
    return res.status(500).json({
      error: "Failed to update progress.",
      details: String(error.message || error)
    });
  }
});

app.post("/api/message", async (req, res) => {
  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";

  if (!message) {
    return res.status(400).json({ error: "Message is required." });
  }

  try {
    const result = await runAgentLoop(message);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      error: "Agent request failed.",
      details: String(error.message || error)
    });
  }
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server running at http://localhost:${PORT}`);
});
