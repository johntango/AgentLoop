# Agent Study Progress Tracker

A simple Node.js + Express app with a minimal browser UI and an agent-style loop powered by `@openai/agents`.

## Prerequisites

- Node.js 18+
- An OpenAI API key in the environment:

```bash
export OPENAI_API_KEY=your_key_here
```

For CI, store `OPENAI_API_KEY` in GitHub Secrets.

## Run locally

```bash
npm install
npm start
```

Then open `http://localhost:3000`.

## Environment variables

- `OPENAI_API_KEY` (required)
- `PORT` (optional, default: `3000`)
- `OPENAI_MODEL` (optional, default: `gpt-4o-mini`)

## API endpoints

- `GET /` — serves the UI
- `POST /api/message` — body: `{ "message": "..." }`
- `POST /api/complete` — body: `{ "topic": "..." }`
- `GET /api/progress` — returns current progress summary

Here is the prompt I used:
Generate a complete Node.js project that implements a simple Agent-based study progress tracker using JavaScript, Express, and a minimal browser UI.
Use the @openai/agents library.

Requirements:

1. Project should be plain JavaScript (no TypeScript) and use Node 18+ runtime.
2. Use Express for the backend server.
3. Use the OpenAI packages to run an agent-style loop:
   - Use `@openai/agents`
   - The app must read the API key from `process.env.OPENAI_API_KEY`. (I will set this in GitHub Secrets.)
4. Implement two tools that the agent can call:
   - `update_progress({ topic })` — marks a topic complete and persists progress.
   - `get_progress()` — returns `{ goal, totalTopics, completed, percent }`.
5. Memory persistence:
   - Use a simple JSON file (`data/progress.json`) to persist progress so restarts keep state.
   - Provide helper functions `readProgress()` and `writeProgress()`.
6. Agent logic:
   - A planner prompt should be sent to the model describing the available tools (name, description, parameters & return shape) and instruct the model to output structured JSON for actions:
     - Example action types: `{ "type": "tool_call", "tool": "update_progress", "args": { "topic": "linear equations" } }` or `{ "type": "final", "text": "..." }`.
   - The server should parse the model output (assume JSON) and run the corresponding tool. Allow up to 3 planning iterations and then synthesize the final answer.
   - If parsing fails, ask the model to reformat.
7. HTTP API:
   - `GET /` — serve a simple HTML UI.
   - `POST /api/message` — accepts `{ message: "..." }` from the UI, runs the agent loop, returns `{ reply, progress }`.
   - `POST /api/complete` — accepts `{ topic }`, marks topic complete (calls update_progress) and returns updated progress.
   - `GET /api/progress` — returns the current progress JSON.
8. UI:
   - A single page with:
     - An input box for user message and "Send" button.
     - A display area that shows conversation messages.
     - A panel showing current progress (goal, totalTopics, completed list, %).
     - A quick action to mark a topic complete (text input + button) that calls `/api/complete`.
   - Use plain HTML/CSS/vanilla JS (no framework) and fetch API to talk to backend.
9. package.json & scripts:
   - `npm install` should install dependencies.
   - `npm start` should run the server (node index.js).
10. README:
    - Short instructions for running locally:
      - `export OPENAI_API_KEY=...` or mention GitHub Secrets for CI.
      - `npm install`
      - `npm start`
11. Safety & errors:
    - Validate user input server-side.
    - Catch tool errors and return helpful messages.
12. Keep the code readable and well-commented.

File structure to generate (suggested):

- package.json
- index.js (Express server + agent loop)
- lib/agent.js (planner + executor + tool registration)
- lib/progressStore.js (read/write JSON helpers)
- public/index.html (UI)
- public/app.js (frontend JS)
- data/progress.json (initial seed: { "goal":"Study Algebra", "totalTopics":5, "completed": [] })
- README.md

Please produce the complete project files and code, ready to run. Make the backend port configurable via `PORT` env var (default 3000). Make the agent use concise system instructions so responses are short and human-friendly.
