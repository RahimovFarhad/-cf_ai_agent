import { getAgentByName } from 'agents';
import { MyAgent, type Env } from './agents/MyAgent';

function getCustomerIdFromRequest(request: Request): string | null {
  const url = new URL(request.url);
  return request.headers.get("X-Customer-Id") || url.searchParams.get("X-Customer-Id") || url.searchParams.get("customer");
}

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext) {
    const url = new URL(request.url);

    const endpoints = ["/api/agent", "/moderate", "/ws", "/state"];

    if (!endpoints.includes(url.pathname)) {
      return new Response("Not found", { status: 404 });
    }

    var customerId = getCustomerIdFromRequest(request);
    if (!customerId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const agent = await getAgentByName(env.MyAgent, customerId);
      return agent.fetch(request);
      
     
    }
  
} satisfies ExportedHandler<Env>;

export { MyAgent };