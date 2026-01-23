import { getAgentByName } from 'agents';
import { MyAgent, type Env } from './agents/MyAgent';

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext) {
    const url = new URL(request.url);

    if (url.pathname === "/api/agent"){
      var session = request.headers.get("session") || url.searchParams.get("session");

      if (!session) {
        return new Response("Unauthorized", { status: 401 });
      }

      const agent = await getAgentByName(env.MyAgent, session);
      return agent.fetch(request);
     
    }
    else{
      return new Response("Not found", { status: 404 });
    }
  }
} satisfies ExportedHandler<Env>;

export { MyAgent };