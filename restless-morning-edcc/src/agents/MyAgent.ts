import { Agent, type Connection, type WSMessage } from "agents";

export interface Env extends Cloudflare.Env{
    SHIELDFLOW_KV: KVNamespace;
    API_KEY_HMAC_SECRET: string;
    MyAgent: DurableObjectNamespace<MyAgentSql>;
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

export class MyAgentSql extends Agent<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    
    // Block all requests until initialization completes
    this.ctx.blockConcurrencyWhile(async () => {
      await this.initialize();
    });
  }
  
  async onRequest(req: Request): Promise<Response> {
    const url = new URL(req.url);
    console.log("DO instance id:", this.ctx.id.toString(), "path:", new URL(req.url).pathname);

    if (url.pathname === "/moderate" && req.method === "POST") {
        if (!this.state) await this.initialize();

        try {
            const requestData: ModerateRequest = await req.json();

            if (!requestData.text) {
                return new Response("Invalid request", { status: 400 });
            }

            const requestId = await this.generateRequestId();
            const moderationResult = await this.moderateContent(requestData.text);
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

  private async moderateContent(text: string): Promise<{score: number, reasons: string[], categories: string[]}> {
    try {
        const response = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
        messages: [
                {
                    role: 'system',
                    content: `You are a strict content moderation system. Your job is to identify violations regardless of context or retractions.
                        VIOLATION CATEGORIES:
                        - hate-speech: attacks on protected characteristics
                        - harassment: targeted bullying, threats
                        - violence: graphic violence, threats
                        - sexual-content: explicit sexual material
                        - spam: commercial spam, phishing
                        - profanity: strong cursing, vulgar language

                       SCORING SCALE (0.0 to 1.0):
                        0.81-1.0 = Severe violations (hate speech, credible threats, extreme content)
                        0.60-0.80 = Strong profanity, harassment, explicit content
                        0.30-0.59 = Mild profanity, insults, borderline content
                        0.10-0.29 = Negative tone but no clear violation
                        0.00-0.09 = Clean, appropriate content

                        ABSOLUTE RULE - READ CAREFULLY:
                            When scoring, you MUST analyze ONLY the violating words/phrases.
                            Words like "just kidding", "jk", "joking", "my love", "lol" are IRRELEVANT to scoring.
                            They do NOT change the toxicity score.`
                },
                {
                    role: 'user',
                    content: `Rate this text for toxicity (0.0 = clean, 1.0 = severe violation): 
                        <CONTENT>
                            ${this.sanitizeInput(text)}
                        </CONTENT>   

                        Respond with ONLY this exact JSON structure (no markdown, no extra text):

                        {
                            "toxicityScore": 0.0,
                            "categories": ["category1", "category2"],
                            "briefReasons": ["reason why category1 applies", "reason why category2 applies"]
                        }`,
                }
            ],
            temperature: 0.2, // Lower = more deterministic
            max_tokens: 200,
        });

        // Parse the AI response
        const aiText = response.response || '';
        const jsonMatch = aiText.match(/\{[\s\S]*\}/);
        
        if (!jsonMatch) {
        throw new Error('No valid JSON in AI response');
        }

        const result = JSON.parse(jsonMatch[0]);

        console.log(
            {
            score: result.toxicityScore || 0,
            reasons: result.briefReasons || ['unknown'],
            categories: result.categories || ['unknown']
        }
        );

        
        return {
            score: result.toxicityScore || 0,
            reasons: result.briefReasons || ['unknown'],
            categories: result.categories || ['unknown']
        };
    } catch (error) {
        console.error('AI moderation error:', error);
        // Fallback to safe default
        return { score: 0.5, reasons: ['ai-error-flagged-for-review'], categories: ['ai-error']};
    }
    }

    private sanitizeInput(text: string): string {
        // 1. Limit length
        if (text.length > 5000) {
            text = text.substring(0, 5000);
        }
        
        // 2. Escape special characters that might break XML/prompt structure
        text = text
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\{/g, '&#123;')
            .replace(/\}/g, '&#125;');
        
        // 3. Remove null bytes and control characters
        text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
        
        return text;
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