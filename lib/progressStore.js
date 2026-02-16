const fs = require("fs/promises");
const path = require("path");

const DATA_FILE = path.join(__dirname, "..", "data", "progress.json");

const DEFAULT_PROGRESS = {
  goal: "Study Algebra",
  totalTopics: 5,
  completed: []
};

function normalizeProgressShape(data) {
  return {
    goal: typeof data.goal === "string" ? data.goal : DEFAULT_PROGRESS.goal,
    totalTopics:
      Number.isInteger(data.totalTopics) && data.totalTopics > 0
        ? data.totalTopics
        : DEFAULT_PROGRESS.totalTopics,
    completed: Array.isArray(data.completed)
      ? data.completed.filter((item) => typeof item === "string" && item.trim())
      : []
  };
}

async function ensureDataFile() {
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(DEFAULT_PROGRESS, null, 2), "utf8");
  }
}

async function readProgress() {
  await ensureDataFile();

  const raw = await fs.readFile(DATA_FILE, "utf8");
  try {
    const parsed = JSON.parse(raw);
    return normalizeProgressShape(parsed);
  } catch {
    await writeProgress(DEFAULT_PROGRESS);
    return { ...DEFAULT_PROGRESS };
  }
}

async function writeProgress(progress) {
  const normalized = normalizeProgressShape(progress);
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(normalized, null, 2), "utf8");
}

function getProgressSummary(progress) {
  const safe = normalizeProgressShape(progress);
  const completedCount = safe.completed.length;
  const percent = Math.round((completedCount / safe.totalTopics) * 100);

  return {
    goal: safe.goal,
    totalTopics: safe.totalTopics,
    completed: safe.completed,
    percent
  };
}

async function markTopicComplete(topic) {
  const cleanTopic = String(topic || "").trim();
  if (!cleanTopic) {
    throw new Error("Topic is required.");
  }

  const progress = await readProgress();
  const exists = progress.completed.some(
    (item) => item.toLowerCase() === cleanTopic.toLowerCase()
  );

  if (!exists) {
    progress.completed.push(cleanTopic);
    await writeProgress(progress);
  }

  return getProgressSummary(progress);
}

module.exports = {
  readProgress,
  writeProgress,
  getProgressSummary,
  markTopicComplete
};
