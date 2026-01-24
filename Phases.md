# ShieldFlow — Phases

A Cloudflare-native AI content moderation service (API + realtime dashboard) with per-customer isolation.

---

## Phase 0 — Scope + Demo Script
**Goal:** lock MVP and avoid scope creep.

**Demo flow (target):**
1) Use a customer identifier (temporary) to isolate state
2) `POST /moderate` returns `{decision, score, reasons}`
3) Dashboard shows live events + stats
4) Refresh dashboard → state persists
5) Add API keys (KV) + revoke/rotate
6) Swap placeholder scoring → Workers AI (Llama)

**Exit criteria**
- You can describe the demo in < 2 minutes.

---

## Phase 1 — Routing + Customer Isolation
**Goal:** route requests to a per-customer Durable Object (Agent).

**Work**
- Worker routes these paths to the Agent:
  - `POST /moderate`
  - `GET /state`
  - `GET /ws` (later)
- Customer selection (temporary):
  - `X-Customer-Id` header OR `?customer=...`
- DO selection:
  - `idFromName(customerId)` / `getAgentByName(..., customerId)`

**Exit criteria**
- Two different customers have separate DO state.

---

## Phase 2 — Moderation API + Persisted State (No Auth, No LLM Yet)
**Goal:** end-to-end pipeline works and state persists.

**Work**
- Define API contract:
  - Request: `{ text, userId?, contentId?, metadata? }`
  - Response: `{ decision, score, reasons, requestId, timestamp }`
- Implement placeholder moderation rules (deterministic)
- DO stores per-customer state:
  - `stats`: total / allow / flag / reject
  - `recentLogs`: ring buffer last N (store preview, not full text)
  - `settings`: thresholds

**Exit criteria**
- `POST /moderate` updates stats/logs
- `GET /state` returns persisted stats/logs (survives refresh)

---

## Phase 3 — Realtime Dashboard Transport (WebSocket)
**Goal:** live streaming of moderation events.

**Work**
- Implement `GET /ws` WebSocket upgrade routed to customer DO
- DO broadcasts on each moderation:
  - new log entry
  - updated stats
- Pages UI connects and renders:
  - live feed
  - stats cards
  - raw JSON panel

**Exit criteria**
- Submitting moderation requests updates dashboard live without refresh.

---

## Phase 4 — API Key Auth (KV Registry)
**Goal:** production-ish auth and customer mapping without a DB.

**Work**
- Use KV for key registry + customer config:
  - `key:<hmac(apiKey)> -> { customerId, status, keyPrefix }`
  - `customer:<customerId> -> { name, allowedOrigins[], thresholds{} }`
- Worker auth:
  - `Authorization: Bearer <apiKey>` → HMAC → KV lookup → customerId

**Exit criteria**
- Invalid/revoked keys rejected
- Valid keys route to correct customer DO

---

## Phase 5 — Workers AI (Llama) Moderation (Rubric: LLM)
**Goal:** LLM drives decisions via structured output.

**Work**
- Call Workers AI model from DO
- Enforce JSON schema output:
  - `score`, `categories[]`, `briefReasons[]`
- Policy mapping:
  - score → Allow/Flag/Reject
- Strict validation + safe fallback

**Exit criteria**
- `/moderate` uses Workers AI and returns consistent structured data.

---

## Phase 6 — Workflow/Coordination Hardening (Rubric: Coordination)
**Goal:** multi-step decision pipeline with correctness properties.

**Work**
- Rate limiting per customer in DO (no races)
- Idempotency using `contentId`:
  - repeated calls return stored result, don’t double-log
- Progress/status events (optional) for UI

**Exit criteria**
- Concurrency doesn’t corrupt stats/log order
- Retries don’t duplicate issues/logs

---

## Phase 7 — Configuration Surface + “Explain” Queries
**Goal:** make it feel like a real service, not just an endpoint.

**Work**
- Config endpoints (auth required):
  - update thresholds/categories
  - allowed origins
- Optional: “explain this decision” / “why are flags spiking?”
  - queries state + LLM summarization

**Exit criteria**
- Config changes affect live moderation behavior and persist.

---

## Phase 8 — Polish + Submission
**Goal:** strong demo + clear documentation.

**Work**
- README (setup, endpoints, demo steps)
- Rubric mapping section: LLM / coordination / input / memory
- Basic architecture diagram
- Error codes, limits, safe logging (no API keys)

**Exit criteria**
- Clean 90–120s demo
- Repo looks production-minded (no secrets, stable endpoints)

---
