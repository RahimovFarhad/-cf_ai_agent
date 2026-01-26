1) 
    Objective: Create Phases.md that splits a project into maximum 10 Phases, each having their main objectives
    Project: ShieldFlow – An Cloudflare-native AI-Powered application that moderates text inputs, scores them based on their toxicity levels, returns a decision ("approve", "reject", "flag") and a reason why to make the decision. 
    Main features: Moderation tool (main logic), Admin Panel (showing total request count, and decisions), Admin Chat Interface 
    Requied to include: {
        "LLM (recommend using Llama 3.3 on Workers AI), or an external LLM of your choice", 
        "Workflow / coordination (using Workflows, Workers or Durable Objects)",
        "User input via chat using Pages",
        "Memory"
    }
    Complexity: Medium
    Approximated Completion Time: ~20 hrs


2)  Generate auth.ts class having following methods:
        hmacHex(key: string, secret: string): Promise<string> //Hashes the key
        readBearer(req: Request): string | null  //extracts the payload of bearer token

3) Show me the best approach to send apiKey from WebSocket connection on server-side, and extract it on server-side

4) Generate me a frontend demo page index.html (css and javascipt all in one) to use all the features. I am going to provide you a minimized version of MyAgent.ts class, which has only interfaces, and main lines of server functions that have interaction with client. 

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

                async onRequest(req: Request): Promise<Response> { 
                    if (url.pathname === "/moderate" && req.method === "POST") {
                        try {
                            const requestData: ModerateRequest = await req.json();

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

                async onConnect(connection: Connection)
                async onClose(connection: Connection)

                async onMessage(connection: Connection, message: WSMessage) {
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
                        connection.send(
                            JSON.stringify({
                            type: MessageType.ASSISTANT,
                            text: reply,
                            }),
                        );
                    } catch (error) {
                        connection.send(
                            JSON.stringify({
                            type: MessageType.ERROR,
                            text: "Error processing message",
                            }),
                        );
                    }

                }
            }


5) My Cloudflare Durable Objects seems to have inconsistency on persisting the memory: {
    "Adding a new Durable Object (guaranteed that it is a completely different instance) resets the other's memory",
    "The memory of a DO gets deleted after a while"
    }. Here is my MyAgent.ts structure:
        export class MyAgentSql extends Agent<Env> 
            async onRequest(req: Request): 
            async initialize()
            async saveState()
            async onConnect(connection: Connection)
            async onMessage(connection: Connection, message: WSMessage)
            broadcast(message: string)
            async onClose(connection: Connection)
    Ignore unnecessary details, make an in-depth search on StackOverflow, Cloudflare Documentation, and Cloudflare developer forums. If you find a direct reason, say it. If there are multiple reasons, or there is ambiguity, then list top 3 reasons, and how they can be solved. 

6) I am using llama-3.1-8b-instruct model on Cloudflare Workers AI, and to parse the user text to it and ask for moderation. I have a security concern: How to avoid prompt injection by a malicious user? Show me an easy-to-implement yet a secure approach. 

7) I am on Phase 5 now, and I want to enable admin to chat with the agent. Here is the flow:
    admin (client-side) input -> server -> llama ai (now ai should determine which helper method it needs to answer) -> server (based on the answer ai returns, server picks the helper method to send the data to ai) -> llama (answers the user question based on the data by the helper method) -> server -> admin

    Help me to generate useful helper methods based on agent's memory:

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

8) Sometimes AI model used to select the tools to use hallucinates. Make me a sanitizeToolSelectionResponse method to avoid parsing wrong params or functions. 

9) Given my index.html, make me a professional and simple react (vite) + tailwind website showcasing the same features with my index.html, but with a better design. The website should open with a landing page. Landing page needs to have a hero which takes full screen height, and shows title, gives a small explanation about the project, and should have 2 buttons: Launch Live Demo and How It Works. How It works section should have 3 cards: 1-Integrate API, 2-AI Analysis, 3-Get Results. And lastly, include a section to briefly write which features of I have used, mainly from Cloudflare. 
