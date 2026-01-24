import { getAgentByName } from 'agents';
import { MyAgent, type Env } from './agents/MyAgent';
import { hmacHex, readBearer } from './auth';

async function resolveCustomerIdFromApiKey(env: Env, apiKey: string): Promise<string | null> {
  const hash = await hmacHex(apiKey, env.API_KEY_HMAC_SECRET);

  type KeyRecord = {customerId: string; status: "active" | "disabled"};
  console.log(apiKey, hash);
  const rec = await env.SHIELDFLOW_KV.get("key:"+hash, "json") as KeyRecord | null;
  console.log(rec)
  if (!rec || rec.status !== "active") {
    return null;
  }
  
  return rec.customerId;
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


export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext) {
    const url = new URL(request.url);

    const endpoints = ["/api/agent", "/moderate", "/ws", "/state", "/demo/generate-apiKey"];

    if (!endpoints.includes(url.pathname)) {
      return new Response("Not found", { status: 404 });
    }

    if (url.pathname === "/demo/generate-apiKey"){
      const cid: string | null = request.headers.get("Demo-Customer-Id");
      if (!cid) {
        return new Response(JSON.stringify({ error: "Demo-Customer-Id header required" }), { 
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }
      const demoKey = await createApiKey(env, cid);
      return new Response(JSON.stringify({ 
          demoKey, 
          customerId: cid,
          message: "Store this key securely - it won't be shown again"
        }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
      });
    }

    var apiKey: string | null;
    if (url.pathname === "/ws") {
      // Extract API key from Sec-WebSocket-Protocol header
      const protocols = request.headers.get('Sec-WebSocket-Protocol');
      apiKey = protocols?.split(',').map(p => p.trim())[1] as string | null; // Second value
    } else {
      apiKey = readBearer(request);
    }
    if (!apiKey) {
        return new Response("Unauthorized", { status: 401 });
    }

    const customerId = await resolveCustomerIdFromApiKey(env, apiKey);

    if (!customerId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const agent = await getAgentByName(env.MyAgent, customerId);
    return agent.fetch(request);
  }
} satisfies ExportedHandler<Env>;

export { MyAgent };