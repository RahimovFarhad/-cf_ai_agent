# ShieldFlow

Real-time AI content moderation service built on Cloudflare's edge infrastructure.

**Demo:** https://cf-ai-agent-f41.pages.dev

---

## Architecture
```
┌─────────────────┐        ┌─────────────────┐
│  Admin Client   │        │   API Client    │
│  (Dashboard)    │        │ (Moderation)    │
└────────┬────────┘        └────────┬────────┘
         │ WS (queries)             │ HTTP
         │                          │
         └──────────┬───────────────┘
                    │
         ┌──────────▼──────────────────────────┐
         │     Cloudflare Worker               │
         │  • Routes /moderate & /ws           │
         │  • Validates API keys (KV)          │
         │  • Maps key → customer DO           │
         └──────────┬──────────────────────────┘
                    │
         ┌──────────▼──────────────────────────┐
         │  Durable Object (per customer)      │
         │  • Moderation pipeline              │
         │  • WebSocket connections            │
         │  • Persistent state (stats/logs)    │
         │  • Admin AI agent (query handler)   │
         └──────┬──────────────┬────────────────┘
                │              │
                │              └──────────────┐
                │                             │
    ┌───────────▼───────────┐    ┌────────────▼────────────┐
    │ Workers AI (Llama 3.1)│    │ Workers AI (Llama 4)    │
    │ • Toxicity scoring    │    │ • Query decomposition   │
    │ • Structured output   │    │ • Tool selection        │
    └───────────────────────┘    │ • Natural synthesis     │
                                 └─────────────────────────┘
```
---

## API

### Moderation Endpoint
```bash
POST /moderate
Authorization: Bearer <api-key>
Content-Type: application/json

{
  "text": "Content to moderate",
  "userId": "user123",
  "contentId": "post456",
  "metadata": {}
}
```

**Response:**
```json
{
  "decision": "allow|flag|reject",
  "score": 0.85,
  "reasons": ["Category: hate speech", "Severity: high"],
  "requestId": "req_abc123",
  "timestamp": 1234567890
}
```

### State Endpoint
```bash
GET /state
Authorization: Bearer <api-key>
```

**Response:**
```json
{
  "stats": {
    "total": 150,
    "allow": 120,
    "flag": 20,
    "reject": 10
  },
  "recentLogs": [...],
  "settings": {
    "thresholds": {
      "flag": 0.6,
      "reject": 0.8
    }
  }
}
```

### WebSocket (Real-time)
```bash
GET /ws
Upgrade: websocket
Authorization: Bearer <api-key>
```

Streams moderation events and stats updates in real-time.

---

## Key Features

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Workers AI** | Llama 3.1 | LLM-based toxicity analysis |
| **Durable Objects** | Stateful coordination | Per-customer isolation & persistence |
| **WebSockets** | Real-time transport | Live dashboard updates |
| **KV** | Key-value store | API key registry & customer config |
| **Pages** | Static hosting | Frontend dashboard |

---

## Setup

### Prerequisites
- Cloudflare account with Workers paid plan
- Wrangler CLI installed

### Deploy

```bash
# Clone repository
git clone <repo-url>
cd shieldflow

# Install dependencies
npm install

# Deploy Worker + DO
wrangler deploy

# Deploy Pages (frontend)
cd frontend
npm run build
wrangler pages deploy dist
```

## Demo Flow

1. **Submit content** via API or dashboard
2. **Workers AI analyzes** toxicity using Llama 3.1
3. **Durable Object** stores result and updates stats
4. **WebSocket broadcasts** event to connected dashboards
5. **Dashboard updates** live without refresh
6. **State persists** across sessions per customer
7. **Admin Panel** admin can see the stats and have chat with ai

---

## Rubric Alignment

### LLM Integration
- Workers AI (Llama 3.1) provides toxicity scoring
- Structured JSON output enforced via schema
- Safe fallback on parsing errors

### Coordination
- Durable Objects coordinate per-customer state
- WebSocket broadcasts synchronize multiple clients
- KV manages API key→customer mapping

### External Input
- Accepts arbitrary user content via POST
- Metadata fields for context (userId, contentId)
- Real-time streaming via WebSocket

### Memory
- Persistent stats counter (total, allow, flag, reject)
- Ring buffer stores recent moderation logs
- Settings stored per customer (thresholds, config)

---

## Security

- API keys use HMAC hashing before KV lookup
- Customer isolation via Durable Object namespacing
- No sensitive data logged in plain text
- CORS and origin validation per customer config

---

---

## Development

```bash
# Local development
wrangler dev

# Run tests
npm test

# Type checking
npm run typecheck
```

---
