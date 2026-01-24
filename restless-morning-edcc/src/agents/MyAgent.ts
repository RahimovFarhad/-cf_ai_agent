import { Agent, type Connection, type WSMessage } from "agents";

export interface Env extends Cloudflare.Env{
    SHIELDFLOW_KV: KVNamespace;
    API_KEY_HMAC_SECRET: string;
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
  STATS: 'stats',
  LOGS: 'logs',
  ASSISTANT: 'assistant',
  ERROR: 'error',
  STATUS: 'status',
};

interface chatMessage{
    text: string;
    role: 'user' | 'assistant' | 'system';
    timestamp?: number;
}

interface ModerateRequest{
    text: string;
    userId?: string; // Id of the user (this is provided by the client)
    metadata?: Record<string, unknown>; // Additional metadata for context
}

interface ModerateResponse{
    decision: 'approved' | 'rejected' | 'flagged';
    reasons: string[];
    score: number; // Toxicity score from 0 to 1
    requestId: string; // Echo back the request ID
    timestamp: number;
}

interface ModerationLog{
    requestId: string;
    timestamp: number;
    userId?: string;
    decision: 'approved' | 'rejected' | 'flagged';
    score: number;
    reasons: string[];
}

interface Stats{
    totalRequests: number;
    approved: number;
    rejected: number;
    flagged: number;
    averageScore: number;
}

interface CustomerState {
  moderationLogs: ModerationLog[]; // Array to store moderation logs
  stats: Stats; // Statistics for the customer
  settings: {   
    autoRejectThreshold: number;
    flagThreshold: number;
    allowThreshold: number;
    logLimit: number; // Optional limit on number of logs to store
  };
  aiContext: chatMessage[] // Chats with Agent by the admin
}

export class MyAgent extends Agent<Env> {
  async onRequest(req: Request): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname === "/moderate" && req.method === "POST") {
        if (!this.state) await this.initialize();

        try {
            const requestData: ModerateRequest = await req.json();

            if (!requestData.text) {
                return new Response("Invalid request", { status: 400 });
            }

            const requestId = await this.generateRequestId();
            const moderationResult = this.moderateContent(requestData.text);
            const decision = this.makeDecision(moderationResult.score);
            const timestamp = Date.now();

            const response: ModerateResponse = {
                decision,
                reasons: moderationResult.reasons,
                score: moderationResult.score,
                requestId,
                timestamp,
            };

            const log: ModerationLog = {
                requestId,
                timestamp,
                userId: requestData.userId,
                decision,
                score: moderationResult.score,
                reasons: moderationResult.reasons,
            };

            this.logModeration(log);

            await this.saveState();

            this.broadcast(JSON.stringify({type: MessageType.MODERATION_RESULT, data: log}));
            this.broadcast(JSON.stringify({type: MessageType.STATS, data: (this.state as CustomerState).stats}));

            return new Response(JSON.stringify(response), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: "Error processing request" }), {
                 status: 500,
                 headers: { "Content-Type": "application/json" },

            });
        }

        
      
    }
    else if (url.pathname === "/api/agent") {
      return new Response("Agent API endpoint hit", { status: 200 });
    }
    else if (url.pathname === "/state") {
        if (!this.state) await this.initialize(); 
        return new Response(JSON.stringify(this.state), {
            headers: { "Content-Type": "application/json" },
        });
    }
    else if (url.pathname === "/ws") {
        const upgrade = req.headers.get("Upgrade") || "";
        if (!upgrade || upgrade.toLowerCase() !== "websocket") {
            return new Response("Expected WebSocket", { status: 400 });
        }

        const [client, server] = Object.values(new WebSocketPair());
        this.ctx.acceptWebSocket(server);

        return new Response(null, {
            status: 101,
            webSocket: client,
        });

       
    }
    return new Response("Not Found", { status: 404 });
  }

  async initialize() { // Initializes the Durable Object's state (as memory)
    const stored = await this.ctx.storage.get<CustomerState>("customerState");

    if (!stored) {
      this.setState({
        moderationLogs: [],
        stats: {
          totalRequests: 0,
          approved: 0,
          rejected: 0,
          flagged: 0,
          averageScore: 0,
        },
        settings: {
          autoRejectThreshold: 0.8,
          flagThreshold: 0.5,
          allowThreshold: 0.2,
          logLimit: 1000,
        },
        aiContext: [],
      });
      await this.saveState();
    } else {
      this.setState(stored);
    }
  } 

  async saveState() {
    if (this.state) {
      await this.ctx.storage.put("customerState", this.state);
    }
  }

  async generateRequestId(): Promise<string> {
    return 'req-' + Date.now() + crypto.randomUUID();
  }

  private moderateContent(text: string): {score:number, reasons:string[]} {
    // Placeholder implementation
    return { score: Math.random(), reasons: ["Sample reason"] };
  }

  private makeDecision(score: number): 'approved' | 'rejected' | 'flagged' {
    const state = this.state as CustomerState;
    if (score >= state.settings.autoRejectThreshold) {
      return 'rejected';
    } else if (score >= state.settings.flagThreshold) {
      return 'flagged';
    } else {
      return 'approved';
    }
  }

  private logModeration(log: ModerationLog) {
    const state = this.state as CustomerState;
    state.moderationLogs.unshift(log);

    // We should set a limit on log size in a real implementation
    state.moderationLogs = state.moderationLogs.slice(0, state.settings.logLimit || 1000);

    state.stats.totalRequests++;
    state.stats[log.decision]++;
    state.stats.averageScore = 
        ((state.stats.averageScore * (state.stats.totalRequests - 1)) + log.score) 
        / state.stats.totalRequests;
  }

  async onConnect(connection: Connection) {
    console.log("New WebSocket connection established:", connection.id);
    if (!this.state) await this.initialize();

    connection.send(
      JSON.stringify({
        type: MessageType.STATS,
        data: (this.state as CustomerState).stats,
      }),
    );

    connection.send(
      JSON.stringify({
        type: MessageType.LOGS,
        data: (this.state as CustomerState).moderationLogs.slice(0, 50),
      }),
    );
    // Initialize connection-specific state
    connection.setState({ connectedAt: Date.now() });
  }

  async onMessage(connection: Connection, message: WSMessage) {
    if (!this.state) await this.initialize();
    if (typeof message !== "string") {
      connection.send(
        JSON.stringify({
          type: MessageType.ERROR,
          text: "Unsupported message format",
        }),
      );
      return;
    }

    try {
      const data = JSON.parse(message);
      console.log("Received message:", data);
      (this.state as CustomerState).aiContext.push({role: 'user', text: data.text, timestamp: Date.now()});

      var reply = `Echo: ${data.text}`;
      connection.send(
        JSON.stringify({
          type: MessageType.ASSISTANT,
          text: reply,
        }),
      );
      (this.state as CustomerState).aiContext.push({role: 'assistant', text: reply, timestamp: Date.now()});
       await this.saveState();
     
    } catch (error) {
      connection.send(
        JSON.stringify({
          type: MessageType.ERROR,
          text: "Error processing message",
        }),
      );
    }

  }

  broadcast(message: string) {
    try {
        this.ctx.getWebSockets().forEach((conn) => {
          conn.send(message);
        });
        console.log("Broadcasted message to all connections");
    } catch (error) {
        console.log("Error broadcasting message:", error);
    }
  }

  async onClose(connection: Connection) {
    console.log("WebSocket connection closed:", connection.id);
    const state = connection.state;
    console.log("Connection state at disconnect:", state);
  }

}