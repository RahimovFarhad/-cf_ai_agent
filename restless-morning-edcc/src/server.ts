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


export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext) {
    const url = new URL(request.url);

    const endpoints = ["/api/agent", "/moderate", "/ws", "/state"];

    if (!endpoints.includes(url.pathname)) {
      return new Response("Not found", { status: 404 });
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