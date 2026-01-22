import { Agent } from "agents";

export interface Env extends Cloudflare.Env{
    MyAgent: DurableObjectNamespace<MyAgent>;
    AI: any;
}
// Pass the Env as a TypeScript type argument
// Any services connected to your Agent or Worker as Bindings
// are then available on this.env.<BINDING_NAME>
// The core class for creating Agents that can maintain state, orchestrate
// complex AI workflows, schedule tasks, and interact with users and other
// Agents.

export class MyAgent extends Agent<Env> {
  async onRequest(req: Request): Promise<Response> {
    return new Response(
      JSON.stringify({ 
        message: "Agent is working!",
        session: "test123",
        timestamp: Date.now() 
      }), 
      {
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}