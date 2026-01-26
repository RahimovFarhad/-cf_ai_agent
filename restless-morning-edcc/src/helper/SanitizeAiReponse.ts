type ToolName =
  | "getStats"
  | "getSettings"
  | "getFullContext"
  | "getRecentLogs"
  | "getAiContext"
  | "searchLogs";

const ALLOWED_TOOLS = new Set<ToolName>([
  "getStats",
  "getSettings",
  "getFullContext",
  "getRecentLogs",
  "getAiContext",
  "searchLogs"
]);

function isNumber(v: any): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function isString(v: any): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.floor(n)));
}

function mentionsDecision(q: string) {
  return /\b(approved|allowed|rejected|blocked|flagged)\b/i.test(q);
}

function mentionsUser(q: string) {
  return /\b(user|userid|from\s+\w+)\b/i.test(q);
}

function mentionsScore(q: string) {
  return /\b(score|above|below|under|over|greater|less|>|<)\b/i.test(q);
}

export function sanitizeToolSelectionResponse(userQuery: string, raw: any) {  
  if (!raw || typeof raw !== "object") {
    throw new Error("Tool selection response is not an object");
  }

  const tool = raw.tool as ToolName;
  if (!ALLOWED_TOOLS.has(tool)) {
    throw new Error(`Unknown tool: ${tool}`);
  }


  const p = raw.params && typeof raw.params === "object" ? raw.params : {};
  const params: any = {};
  const q = userQuery.toLowerCase();

  // ───────────── Tool-specific sanitization ─────────────
  if (tool === "getStats" || tool === "getSettings" || tool === "getFullContext") {
    return { tool, params: {} };
  }

  if (tool === "getRecentLogs") {
    const n = isNumber(p.count) ? p.count : 10;
    return { tool, params: { count: clamp(n, 1, 50) } };
  }

  if (tool === "getAiContext") {
    const n = isNumber(p.limit) ? p.limit : 10;
    return { tool, params: { limit: clamp(n, 1, 50) } };
  }

  // ───────────── searchLogs sanitization ─────────────
  // Convert ISO date strings to timestamps
  if (typeof p.startTime === 'string') {
    const timestamp = new Date(p.startTime).getTime();
    if (!isNaN(timestamp) && timestamp > 1_000_000_000_000) {
      params.lowerLimit = timestamp;
    }
  }
  
  if (typeof p.endTime === 'string') {
    const timestamp = new Date(p.endTime).getTime();
    if (!isNaN(timestamp) && timestamp > 1_000_000_000_000) {
      params.upperLimit = timestamp;
    }
  }

  // Keep timestamps only if valid ms values (fallback)
  if (!params.lowerLimit && isNumber(p.lowerLimit) && p.lowerLimit > 1_000_000_000_000) {
    params.lowerLimit = p.lowerLimit;
  }
  if (!params.upperLimit && isNumber(p.upperLimit) && p.upperLimit > 1_000_000_000_000) {
    params.upperLimit = p.upperLimit;
  }

  // Decision filter
  if (
    mentionsDecision(q) &&
    (p.decision === "approved" ||
      p.decision === "rejected" ||
      p.decision === "flagged")
  ) {
    params.decision = p.decision;
  }

  // User filter
  if (mentionsUser(q) && isString(p.userId)) {
    params.userId = p.userId.trim();
  }

  // Score filter
  if (mentionsScore(q) && isNumber(p.minScore) && p.minScore >= 0) {
    params.minScore = Math.min(p.minScore, 1.0); // Cap at 1.0
  }

  // Fix inverted ranges (upperLimit should be > lowerLimit)
  if (
    params.upperLimit != null &&
    params.lowerLimit != null &&
    params.upperLimit < params.lowerLimit
  ) {
    const tmp = params.upperLimit;
    params.upperLimit = params.lowerLimit;
    params.lowerLimit = tmp;
  }

  return { tool, params };
}

export function sanitizeFinalAnswer(raw: any) {
  if (!raw || typeof raw !== "object") {
    return "Sorry, I couldn't generate a clear answer from the data.";
  }

  let text = typeof raw.answer === "string" ? raw.answer.trim() : "";

  // Prevent overlong responses
  if (text.length > 800) {
    text = text.slice(0, 797) + "...";
  }

  // Fallback if model failed
  if (!text) {
    text = "Sorry, I couldn't generate a clear answer from the data.";
  }

  return text;
}