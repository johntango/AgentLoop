const messagesEl = document.getElementById("messages");
const messageInputEl = document.getElementById("messageInput");
const sendBtnEl = document.getElementById("sendBtn");
const topicInputEl = document.getElementById("topicInput");
const completeBtnEl = document.getElementById("completeBtn");

const goalEl = document.getElementById("goal");
const totalTopicsEl = document.getElementById("totalTopics");
const completedCountEl = document.getElementById("completedCount");
const percentEl = document.getElementById("percent");
const completedListEl = document.getElementById("completedList");

function appendMessage(role, text) {
  const div = document.createElement("div");
  div.className = `msg ${role}`;
  div.textContent = `${role === "user" ? "You" : "Agent"}: ${text}`;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function renderProgress(progress) {
  if (!progress) return;

  goalEl.textContent = progress.goal || "-";
  totalTopicsEl.textContent = String(progress.totalTopics ?? "-");
  completedCountEl.textContent = String(progress.completed?.length || 0);
  percentEl.textContent = String(progress.percent ?? 0);

  completedListEl.innerHTML = "";
  const completed = Array.isArray(progress.completed) ? progress.completed : [];
  if (completed.length === 0) {
    const li = document.createElement("li");
    li.textContent = "No topics completed yet.";
    completedListEl.appendChild(li);
    return;
  }

  completed.forEach((topic) => {
    const li = document.createElement("li");
    li.textContent = topic;
    completedListEl.appendChild(li);
  });
}

async function refreshProgress() {
  const res = await fetch("/api/progress");
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to fetch progress.");
  }
  renderProgress(data);
}

async function sendMessage() {
  const message = messageInputEl.value.trim();
  if (!message) return;

  appendMessage("user", message);
  messageInputEl.value = "";

  try {
    const res = await fetch("/api/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || data.details || "Message request failed.");
    }

    appendMessage("agent", data.reply || "Done.");
    renderProgress(data.progress);
  } catch (error) {
    appendMessage("agent", `Error: ${error.message}`);
  }
}

async function completeTopic() {
  const topic = topicInputEl.value.trim();
  if (!topic) return;

  try {
    const res = await fetch("/api/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || data.details || "Failed to mark topic complete.");
    }

    topicInputEl.value = "";
    appendMessage("agent", data.reply || "Topic marked complete.");
    renderProgress(data.progress);
  } catch (error) {
    appendMessage("agent", `Error: ${error.message}`);
  }
}

sendBtnEl.addEventListener("click", sendMessage);
completeBtnEl.addEventListener("click", completeTopic);
messageInputEl.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    sendMessage();
  }
});
topicInputEl.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    completeTopic();
  }
});

appendMessage("agent", "Hi! Ask me about your study progress.");
refreshProgress().catch((error) => {
  appendMessage("agent", `Error loading progress: ${error.message}`);
});
