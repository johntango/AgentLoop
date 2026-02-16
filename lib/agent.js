const {
  readProgress,
  getProgressSummary,
  markTopicComplete
} = require("./progressStore");

const MAX_ITERS = 3;
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
let agentsSdkPromise = null;

function ensureApiKey() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY environment variable.");
  }
}

async function getAgentsSdk() {
  if (!agentsSdkPromise) {
    agentsSdkPromise = import("@openai/agents");
  }

  return agentsSdkPromise;
}

function buildPlannerSystemPrompt() {
  return [
    "You are a concise study progress assistant.",
    "Keep responses short and human-friendly.",
    "You can call these tools:",
    "1) update_progress(args): marks a topic complete.",
    "   args: { topic: string }",
    "   returns: { goal, totalTopics, completed, percent }",
    "2) get_progress(args): gets progress summary.",
    "   args: {}",
    "   returns: { goal, totalTopics, completed, percent }",
    "Output ONLY valid JSON (no markdown), using one of:",
    '{ "type": "tool_call", "tool": "update_progress", "args": { "topic": "linear equations" } }',
    '{ "type": "tool_call", "tool": "get_progress", "args": {} }',
    '{ "type": "final", "text": "..." }'
  ].join("\n");
}

async function get_progress() {
  const progress = await readProgress();
  return getProgressSummary(progress);
}

async function update_progress({ topic }) {
  return markTopicComplete(topic);
}

function toolSchemasForContext() {
  return [
    {
      name: "update_progress",
      description: "Mark a topic complete and persist it.",
      parameters: {
        type: "object",
        required: ["topic"],
        properties: {
          topic: { type: "string" }
        }
      },
      returns: {
        type: "object",
        properties: {
          goal: { type: "string" },
          totalTopics: { type: "number" },
          completed: { type: "array", items: { type: "string" } },
          percent: { type: "number" }
        }
      }
    },
    {
      name: "get_progress",
      description: "Read current study progress.",
      parameters: {
        type: "object",
        properties: {}
      },
      returns: {
        type: "object",
        properties: {
          goal: { type: "string" },
          totalTopics: { type: "number" },
          completed: { type: "array", items: { type: "string" } },
          percent: { type: "number" }
        }
      }
    }
  ];
}

async function planActionWithAgents(inputContext) {
  const [{ Agent, run }, { z }] = await Promise.all([
    getAgentsSdk(),
    import("zod")
  ]);

  const plannerActionSchema = z.union([
    z.object({
      type: z.literal("tool_call"),
      tool: z.enum(["update_progress", "get_progress"]),
      args: z.object({
        topic: z.string().optional()
      })
    }),
    z.object({
      type: z.literal("final"),
      text: z.string()
    })
  ]);

  const plannerAgent = new Agent({
    name: "Study Progress Planner",
    model: MODEL,
    instructions: buildPlannerSystemPrompt(),
    outputType: plannerActionSchema
  });

  const runResult = await run(plannerAgent, inputContext, {
    maxTurns: 1
  });

  return runResult.finalOutput;
}

async function synthesizeFinalWithAgents(context) {
  const { Agent, run } = await getAgentsSdk();

  const responseAgent = new Agent({
    name: "Study Progress Responder",
    model: MODEL,
    instructions:
      "Write a concise, human-friendly final response based on the latest tool results."
  });

  const result = await run(responseAgent, context, { maxTurns: 1 });
  return String(result.finalOutput || "").trim();
}

async function runAgentLoop(userMessage) {
  const cleanMessage = String(userMessage || "").trim();
  if (!cleanMessage) {
    throw new Error("Message is required.");
  }

  ensureApiKey();
  const current = await get_progress();

  const tools = {
    update_progress,
    get_progress
  };

  const messages = [
    { role: "system", content: buildPlannerSystemPrompt() },
    {
      role: "user",
      content: [
        `User message: ${cleanMessage}`,
        `Current progress: ${JSON.stringify(current)}`,
        `Tool metadata: ${JSON.stringify(toolSchemasForContext())}`
      ].join("\n")
    }
  ];

  let finalReply = "";

  for (let i = 0; i < MAX_ITERS; i += 1) {
    let action;

    try {
      action = await planActionWithAgents(JSON.stringify(messages.slice(-8)));
    } catch {
      messages.push({
        role: "user",
        content:
          "Your last output was not valid JSON. Reformat it as a valid JSON object only."
      });
      continue;
    }

    if (action?.type === "final" && typeof action.text === "string") {
      finalReply = action.text.trim();
      break;
    }

    if (action?.type === "tool_call" && typeof action.tool === "string") {
      const toolName = action.tool;
      const tool = tools[toolName];
      if (!tool) {
        messages.push({
          role: "user",
          content: `Unknown tool: ${toolName}. Use update_progress or get_progress.`
        });
        continue;
      }

      try {
        const args = action.args && typeof action.args === "object" ? action.args : {};
        const result = await tool(args);
        messages.push({ role: "assistant", content: JSON.stringify(action) });
        messages.push({
          role: "user",
          content: `TOOL_RESULT ${JSON.stringify({ tool: toolName, result })}`
        });
      } catch (error) {
        messages.push({ role: "assistant", content: JSON.stringify(action) });
        messages.push({
          role: "user",
          content: `TOOL_ERROR ${String(error.message || error)}`
        });
      }
    }
  }

  if (!finalReply) {
    const fallbackText = await synthesizeFinalWithAgents(
      JSON.stringify(messages.slice(-6))
    );
    finalReply = fallbackText || "Progress updated.";
  }

  const latestProgress = await get_progress();
  return { reply: finalReply, progress: latestProgress };
}

module.exports = {
  runAgentLoop,
  update_progress,
  get_progress
};
