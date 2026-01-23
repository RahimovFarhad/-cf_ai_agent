# Phases (Cloudflare AI Agent Project)

Project: **Project Assistant Agent**
Core: Chat-based project manager with persistent backlog + GitHub issue sync.

---

## Phase 0 — Project Definition (DONE)
**Goal:** lock scope so build is demoable.

### Deliverable
- One demo flow:
  1) describe project
  2) generate backlog
  3) change task status
  4) sync to GitHub issues
  5) refresh → memory persists

---

## Phase 1 — Routing + Agent Instance Selection (DONE)
**Goal:** requests route to a specific agent instance (per session/user).

### Requirements
- Worker routes `/api/agent` → correct Agent instance using `sessionId`
- Agent responds to HTTP requests via `onRequest`

### Acceptance Criteria
- `curl /api/agent` with a session id returns JSON from agent
- missing session id returns 401 (or similar)
- different session ids route to different agent instances (to be proven once state exists)

### Status
✅ Completed (curl test confirmed)

---

## Phase 2 — Realtime Transport (WebSocket) + JSON Protocol
**Goal:** support live chat / realtime UI.

### Requirements
- Pages (or minimal frontend) opens WebSocket to `/api/agent?session=...`
- WebSocket messages use JSON protocol (no raw strings)
- Agent can parse, validate, and respond

### Message Protocol (minimum)
Client → Agent:
- `{ "type": "chat", "text": "..." }`
- `{ "type": "command", "name": "...", "args": {...} }`

Agent → Client:
- `{ "type": "assistant", "text": "..." }`
- `{ "type": "status", "text": "..." }`
- `{ "type": "error", "text": "..." }`

### Acceptance Criteria
- WS connect works
- send `{type:"chat"}` → agent replies `{type:"assistant"}`
- invalid JSON triggers `{type:"error"}` not crash

### Status
✅ Completed (websocket connection tested)
---

## Phase 3 — State Model + Persistence
**Goal:** agent becomes a real stateful backend.

### Requirements
Agent state includes:
- `projectSummary`
- `stack[]`
- `tasks[]` (id, title, status, priority, tags, acceptance criteria)
- `updatedAt`
- optional: `decisions[]`

Persist state (Durable Objects / Agents state storage)

### Acceptance Criteria
- “create backlog” results in tasks stored
- refresh page → tasks still exist
- state can be retrieved via an HTTP endpoint or WS push
- agent broadcasts updated state after changes

---

## Phase 4 — LLM Integration (Rubric #1)
**Goal:** LLM drives app behavior (not chat wrapper).

### Requirements
- Workers AI Llama model (or external LLM)
- LLM produces **structured outputs** (tool calls / JSON actions)
- agent executes actions safely (validation)

### Tools (minimum)
- `set_project(summary, stack)`
- `create_task(title, priority, tags)`
- `move_task(taskId, status)`

### Acceptance Criteria
- natural language input changes state (tasks) via LLM actions
- tool validation prevents nonsense updates

---

## Phase 5 — Workflow / Coordination (Rubric #2)
**Goal:** implement multi-step orchestration and state coordination.

### Requirements
At least one multi-step operation such as:
- generate backlog pipeline (extract → propose tasks → store)
- “sync to github” pipeline (loop tasks → create issues → save mapping)
- progress events streamed during multi-step work

### Coordination Guarantees
- idempotency: repeated sync does not duplicate issues
- ordering: updates happen consistently per project/session

### Acceptance Criteria
- multi-step workflow executes
- state reflects intermediate + final steps
- duplicate calls do not cause duplicates

---

## Phase 6 — GitHub OAuth + Issue Sync
**Goal:** integrate with real external API to prove tool + workflow capability.

### Requirements
- GitHub OAuth App
- `/auth/github/start`
- `/auth/github/callback`
- store token server-side, linked to session/user
- select repo (manual input is fine initially)

### GitHub Actions
- create issue
- optionally: comment / label

### Acceptance Criteria
- user can connect GitHub
- agent creates GitHub issues for tasks
- tasks store mapping `taskId → issueUrl/issueNumber`
- UI shows clickable GitHub issue links

---

## Phase 7 — UI + Demo Polish
**Goal:** make it obviously “agentic + stateful”, not a wrapper.

### Requirements
- simple Kanban view (Backlog / In Progress / Done)
- “Sync to GitHub” button
- status indicators + progress messages
- memory indicator (loaded X tasks)

### Acceptance Criteria
- clean 90-second demo possible
- refresh demonstrates persistence
- repo looks professional (README + setup instructions)

---

## Final Submission Checklist
- [ ] README: how to run + demo steps
- [ ] Architecture diagram (optional but strong)
- [ ] rubic mapping section: “LLM / Coordination / Input / Memory”
- [ ] GitHub OAuth documented
- [ ] no secrets committed
