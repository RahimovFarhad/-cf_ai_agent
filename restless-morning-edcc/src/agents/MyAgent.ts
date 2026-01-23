import { Agent, type Connection, type WSMessage } from "agents";

export interface Env extends Cloudflare.Env{
    MyAgent: DurableObjectNamespace<MyAgent>;
    AI: any;
}

// Message types matching the frontend
const MessageType = {
  // Client → Agent
  MODERATE: 'moderate', // To check if content is appropriate
  QUERY: 'query', // To ask about moderation result
  CONFIG: 'config', // To set configuration options

  // Agent → Client
  MODERATION_RESULT: 'moderation_result',
  ANALYSIS: 'analysis',
  STATS: 'stats',
  ERROR: 'error',
  STATUS: 'status',
};


// Pass the Env as a TypeScript type argument
// Any services connected to your Agent or Worker as Bindings
// are then available on this.env.<BINDING_NAME>
// The core class for creating Agents that can maintain state, orchestrate
// complex AI workflows, schedule tasks, and interact with users and other
// Agents.

// interface AgentState {
//   moderationLogs: unknown[]; // Array to store moderation logs
//   userStats: Record<string, unknown>; // Object to store statistics per user
//   settings: {   
//     autoRejectThreshold: number;
//     flagThreshold: number;
//     allowThreshold: number;
//   };
//   aiContext: unknown[], // Chats with Agent by the admin
//   sessionInfo: {
//     createdAt: number;
//     sessionId: String;
//     connectionCount: number;
//   };
// }

export class MyAgent extends Agent<Env> {
  async onRequest(req: Request): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname === "/moderate" && req.method === "POST") {
      // Handle moderation request
      return new Response("Moderation endpoint hit", { status: 200 });
    }
    else if (url.pathname === "/api/agent") {
      return new Response("Agent API endpoint hit", { status: 200 });
    }
    return new Response("Not Found", { status: 404 });
  }

//   async initialize() { // Initializes the Durable Object's state (as memory)
//     const state = this.state as AgentState;
//     if (!(state.moderationLogs)) {
//       state.moderationLogs = [];
//       state.userStats = {};
//       state.settings = {
//         autoRejectThreshold: 0.7,
//         flagThreshold: 0.3,
//         allowThreshold: 0.3
//       };
//       state.aiContext = [],
//       state.sessionInfo = {
//         createdAt: Date.now(),
//         sessionId: this.ctx.id.toString(),
//         connectionCount: 0
//       };
//     }
//  }

//   async onConnect(connection: Connection) {
//     console.log("New WebSocket connection established:", connection.id);

//     connection.send(
//       JSON.stringify({
//         type: MessageType.STATUS,
//         text: "Connection established",
//       }),
//     );
//     // Initialize connection-specific state
//     connection.setState({ connectedAt: Date.now() });
//   }

//   async onMessage(connection: Connection, message: WSMessage) {
//     if (typeof message !== "string") {
//       connection.send(
//         JSON.stringify({
//           type: MessageType.ERROR,
//           text: "Unsupported message format",
//         }),
//       );
//       return;
//     }

//     try {
//       const data = JSON.parse(message);
//       console.log("Received message:", data);

//       if (data.type === MessageType.CHAT) {
//         // Handle chat messages
//         connection.send(
//           JSON.stringify({
//             type: MessageType.ASSISTANT,
//             text: "I received your message: " + data.text,
//           }),
//         );
//       } else if (data.type === MessageType.COMMAND) {
//         // Handle command messages
//         connection.send(
//           JSON.stringify({
//             type: MessageType.STATUS,
//             text: "Command received: " + data.text,
//           }),
//         );
//       } else if (data.type === MessageType.SYNC) {
//         // Handle sync messages
//         connection.send(
//           JSON.stringify({
//             type: MessageType.STATE,
//             state: this.state,
//           }),
//         );
//       }
//       else {
//         connection.send(
//           JSON.stringify({
//             type: MessageType.ERROR,
//             text: "Unknown message type",
//           }),
//         );
//       }
//     } catch (error) {
//       connection.send(
//         JSON.stringify({
//           type: MessageType.ERROR,
//           text: "Error processing message",
//         }),
//       );
//     }

//   }

//   async onClose(connection: Connection) {
//     console.log("WebSocket connection closed:", connection.id);
//     const state = connection.state;
//     console.log("Connection state at disconnect:", state);
//   }
}