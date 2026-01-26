import { getAgentByName } from 'agents';
import { MyAgentSql, type Env } from './agents/MyAgent';
import { hmacHex, readBearer } from './auth';

async function resolveCustomerIdFromApiKey(env: Env, apiKey: string): Promise<string | null> {
  const hash = await hmacHex(apiKey, env.API_KEY_HMAC_SECRET);

  type KeyRecord = {customerId: string; status: "active" | "disabled"};
  const rec = await env.SHIELDFLOW_KV.get("key:"+hash, "json") as KeyRecord | null;

  if (!rec || rec.status !== "active") {
    return null;
  }
  var id = rec.customerId;

  if (id){
    id = id.trim().toLowerCase();
  }
  
  return id;
}

async function createApiKey(env: Env, customerId: string) {
  // Generate a random API key
  const apiKey = "demo-" + crypto.randomUUID(); // or use a more sophisticated generator
  
  // Hash it
  const hash = await hmacHex(apiKey, env.API_KEY_HMAC_SECRET);
  
  // Store in KV
  await env.SHIELDFLOW_KV.put(
    `key:${hash}`,
    JSON.stringify({
      customerId,
      status: "active",
      createdAt: new Date().toISOString()
    })
  );
  
  // Return the plaintext key (ONLY TIME IT'S VISIBLE)
  return apiKey;
}

function readWsApiKey(request: Request): string | null {
  return new URL(request.url).searchParams.get("apiKey");
}


const ALLOWED_ORIGINS = new Set([
  "http://localhost:5173",
  "https://cf-ai-agent-f41.pages.dev"
  // add your Pages dev/prod domains:
  // "https://your-site.pages.dev",
  // "https://yourcustomdomain.com",
]);

function corsHeaders(origin: string | null) {
  const allowOrigin = origin && ALLOWED_ORIGINS.has(origin) ? origin : ""; // empty = not allowed

  return {
    ...(allowOrigin ? { "Access-Control-Allow-Origin": allowOrigin } : {}),
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Customer-Id",
    "Access-Control-Max-Age": "86400",
    // Only set this if you use cookies/credentials:
    // "Access-Control-Allow-Credentials": "true",
    "Vary": "Origin",
  };
}

function withCors(req: Request, res: Response) {
  const origin = req.headers.get("Origin");
  const headers = new Headers(res.headers);

  for (const [k, v] of Object.entries(corsHeaders(origin))) {
    if (v !== "") headers.set(k, v);
  }

  return new Response(res.body, { status: res.status, headers });
}

function handleOptions(req: Request) {
  const origin = req.headers.get("Origin");
  if (!origin || !ALLOWED_ORIGINS.has(origin)) {
    return new Response("CORS origin not allowed", { status: 403 });
  }
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}




export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext) {
    if (request.method === "OPTIONS") return handleOptions(request);

    const url = new URL(request.url);

    const endpoints = ["/api/agent", "/moderate", "/ws", "/state", "/demo/generate-apiKey"];

    if (!endpoints.includes(url.pathname)) {
      return withCors(request, new Response("Not found", { status: 404 }));
    }

    if (url.pathname === "/demo/generate-apiKey"){
      const body = await request.json() as any;
      const cid: string | null = body["Demo-Customer-Id"] ?? null;
      if (!cid) {
        return withCors(request,
          new Response(JSON.stringify({ error: "Demo-Customer-Id header required" }), { 
            status: 401,
            headers: { "Content-Type": "application/json" }
          })
        );
      }
      const demoKey = await createApiKey(env, cid);
      return withCors(request,
        new Response(JSON.stringify({ 
            demoKey, 
            customerId: cid,
            message: "Store this key securely - it won't be shown again"
          }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        })
      );
    }

    const apiKey = url.pathname === "/ws" ? readWsApiKey(request) : readBearer(request);

    if (!apiKey) {
        return withCors(request, new Response("Unauthorized", { status: 401 }));
    }

    const customerId = await resolveCustomerIdFromApiKey(env, apiKey);
    
    
    if (!customerId) {
      return withCors(request, new Response("Unauthorized", { status: 401 }));
    }
    
    console.log("route", url.pathname, "customerId=", customerId);
    const agent = await getAgentByName(env.MyAgent, customerId);

    const res = await agent.fetch(request);

    return url.pathname === "/ws" ? res : withCors(request, res);

  }
} satisfies ExportedHandler<Env>;

export { MyAgentSql };
export {MyAgentSql as Chat}
