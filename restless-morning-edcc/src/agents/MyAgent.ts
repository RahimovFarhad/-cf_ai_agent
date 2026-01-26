import { sanitizeToolSelectionResponse } from "@/helper/SanitizeAiReponse";
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
  QueryTaskStatus: 'query_status',
  ERROR: 'error',
  STATUS: 'status',
};

interface ChatMessage{
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
    text?: string;
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

interface Settings{
    autoRejectThreshold: number;
    flagThreshold: number;
    allowThreshold: number;
    logLimit: number; // Optional limit on number of logs to store
}

interface CustomerState {
  moderationLogs: ModerationLog[]; // Array to store moderation logs
  stats: Stats; // Statistics for the customer
  settings: Settings;
  aiContext: ChatMessage[] // Chats with Agent by the admin
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
                    text: requestData.text,
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
            const userQuery = data.text;
            
            (this.state as CustomerState).aiContext.unshift({
            role: 'user', 
            text: userQuery, 
            timestamp: Date.now()
            });

            connection.send(JSON.stringify({
                type: MessageType.QueryTaskStatus,
                text: `Executing your query...`,
            }));

            // Decompose and execute
            const translatedQuery = await this.translateQueryToUnderstableByAI(userQuery);
            const decomposition = await this.decomposeQuery(translatedQuery);
            const finalAnswer = await this.executeTasks(connection, decomposition.tasks, translatedQuery);

            (this.state as CustomerState).aiContext.unshift({
                role: 'assistant', 
                text: finalAnswer, 
                timestamp: Date.now()
            });

            connection.send(JSON.stringify({
                type: MessageType.ASSISTANT,
                text: finalAnswer,
            }));
            
            await this.saveState();
        } catch (error) {
            console.log(error)
            connection.send(
                JSON.stringify({
                type: MessageType.ERROR,
                text: "Error processing message",
                }),
            );
        }

    }

    async selectHelperMethod(userQuery: string, previousData?: any[]) {
        userQuery = this.sanitizeInput(userQuery);


        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const toolSelectionResponse = await this.env.AI.run("@cf/meta/llama-4-scout-17b-16e-instruct", {
        messages: [
            {
            role: "system",
            content: `
                You are a TOOL ROUTER for an admin dashboard.

                Here is the previous data you have access to in order to understand context better: ${JSON.stringify(previousData || [])}

                ALWAYS RETURN VALID JSON.

                You DO NOT answer the user.
                You ONLY choose one tool + params.

                OUTPUT RULE (strict):
                Return ONLY one valid JSON object. No markdown. No extra text.
                {
                "tool": "toolName",
                "params": { ... },
                }

                Time Context:
                - Current date and time (now): ${new Date().toISOString()}
                - Start of today: ${todayStart.toISOString()}
                - End of today: ${new Date(todayStart.getTime() + 86400000 - 1).toISOString()}

                ━━━━━━━━━━━━━━━━━━━━
                FUNCTION USE-CASES (pick the best match)
                ━━━━━━━━━━━━━━━━━━━━

                A) getStats()
                Use when the user asks for:
                - overall totals across all time (total, approved, rejected, flagged)
                - overall averages across all time (averageScore)
                - percentages/rates that require totals
                Params must be {}.

                B) getSettings()
                Use when the user asks for:
                - thresholds/config values (allow/flag/reject thresholds, limits)
                Params must be {}.

                C) getRecentLogs(count)
                Use when the user asks for:
                - the most recent activity/logs/requests
                - "last", "latest", "most recent", "recent", "last N"
                and there is NO additional filtering requested (no date range, no userId, no decision, no score).
                Params: {"count": number} only.

                D) searchLogs(criteria)
                Use when the user asks for ANY filtering, including:
                - time ranges (only ISO 8601 format)
                - specific user
                - score threshold/range
                - specific decision (approved/rejected/flagged)
                - any combination of the above
                Params must use only the allowed fields for criteria.

                E) getAiContext(limit)
                Use when the user asks for:
                - chat history / conversation recap / what we discussed
                Params: {"limit": number} only.

                F) getFullContext()
                Use ONLY if the question is genuinely vague AND needs multiple data types.
                Params must be {}.

                ━━━━━━━━━━━━━━━━━━━━
                PARAM CONTRACTS (strict)
                ━━━━━━━━━━━━━━━━━━━━

                Allowed tools and params:

                - getStats: {}
                - getSettings: {}
                - getFullContext: {}
                - getRecentLogs: {"count": number}  (optional; if missing, omit params or use {})
                - getAiContext: {"limit": number}   (optional; if missing, omit params or use {})
                - searchLogs: {
                    "userId"?: string,
                    "minScore"?: number,
                    "decision"?: "approved" | "rejected" | "flagged",
                    "startTime"?: string (ISO 8601),
                    "endTime"?: string (ISO 8601)
                }

                HARD PARAM RULES:
                - NEVER invent filters. Include a filter only if the user explicitly asked for it.
                - NEVER output null. If not needed, OMIT the field.
                - NEVER include unknown fields (e.g. count inside searchLogs is invalid).
                - For decision: use ONLY "approved" | "rejected" | "flagged".
                - For "all decisions" queries: OMIT decision (do not use "all").

                CRITICAL:
                Return ONLY the VALID JSON object.
            `

            },
            {
            role: "user",
            content: `
                Select the BEST tool to answer this query: "${userQuery}"
            `
            }
        ],
        temperature: 0.1
        });


        console.log("Raw tool selection response:", toolSelectionResponse.response);
        const rawSelection = toolSelectionResponse.response || '';
        // check if it is already a JSON, not a string
        if (typeof rawSelection === 'string') {
            const selection = rawSelection
        .trim()
        .replace(/^```json\s*/i, '')  // remove ```json
        .replace(/^```\s*/i, '')      // remove ``` (no language)
        .replace(/\s*```$/, ''); 
            const parsed = JSON.parse(selection);
            return parsed;
        }
        return rawSelection;

    }

    async callTool(selectedHelperMethod: {tool: string, params: any}) {
        let toolResult: any;

        switch (selectedHelperMethod.tool) {
            case 'getStats':
                toolResult = this.getStats();
                break;
            case 'getRecentLogs':
                toolResult = this.getRecentLogs(selectedHelperMethod.params?.count);
                break;
            case 'getAiContext':
                toolResult = this.getAiContext(selectedHelperMethod.params?.count);
                break;
            case 'getSettings':
                toolResult = this.getSettings();
                break;
            case 'searchLogs':
                toolResult = this.searchLogs(selectedHelperMethod.params || {});
                break;
            default:
                toolResult = this.getFullContext();
        }
        return toolResult;

    }

    private getStats(): Stats{
        return (this.state as CustomerState).stats;
    }

    private getRecentLogs(count: number = 10): ModerationLog[] {
        return (this.state as CustomerState).moderationLogs.slice(0, count);
    }

    private getAiContext(limit: number = 10): ChatMessage[] {
        return (this.state as CustomerState).aiContext.slice(0, limit);
    }

    private getSettings(): Settings {
        return (this.state as CustomerState).settings;
    }

    private getFullContext(): {
        stats: Stats, moderationLogs: ModerationLog[], settings: Settings, aiContext: ChatMessage[], totalLogsLength: number, totalAiContextLength: number
    } {
        const state = this.state as CustomerState;
        return {
            stats: state.stats,
            moderationLogs: state.moderationLogs.slice(0, 20),
            settings: state.settings,
            aiContext: state.aiContext.slice(0, 10),
            totalLogsLength: state.moderationLogs.length,
            totalAiContextLength: state.aiContext.length
        }
    }

    private searchLogs(criteria: {userId?: string, minScore?: number, decision?: string, upperLimit?: number, lowerLimit?: number}):
    {totalMatched: number, logs: ModerationLog[]} {
        const logs = (this.state as CustomerState).moderationLogs;
        const filteredLogs = logs.filter(log => {
            if (criteria.userId && log.userId !== criteria.userId) return false;
            if (criteria.minScore && log.score < criteria.minScore) return false;
            if (criteria.decision && log.decision !== criteria.decision) return false;
            if (criteria.upperLimit && log.timestamp > criteria.upperLimit) return false;
            if (criteria.lowerLimit && log.timestamp < criteria.lowerLimit) return false;
            return true;
        }); 
        // parse the length of filtered logs to it
        return {
            totalMatched: filteredLogs.length,
            logs: filteredLogs.slice(0, 50) // limit to first 50 results
        };
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

    async translateQueryToUnderstableByAI(userQuery: string): Promise<string> {
        try {
            const translationResponse = await this.env.AI.run("@cf/meta/llama-3.1-8b-instruct-fast", {
                messages: [
                {
                    role: "system",
                    content: `
                        You are a QUERY TRANSLATOR. Your job is to convert user queries into clear, unambiguous language that an AI can understand.

                        Ensure that the translated query is specific about what data is needed, avoiding vague terms.
                        It is important to use keywords like "Calculate", "Fetch", "Return", "for userId 'X'", "for the last month", etc. to make the intent explicit.
    
                        OUTPUT RULE:
                        Return a JSON object with a single field "translatedQuery" containing the clear query string.
    
                        Example Input: "What is the rejection rate for user123 last month?"
                        Example Output: { "translatedQuery": "Calculate the rejection rate for userId 'user123' for the last month." }

                    `
                },
                {
                    role: "user",
                    content: `
                        Translate this query into clear language for an AI to understand: "${userQuery}"
                    `
                }
                ],
                temperature: 0.1
            });
    
            console.log("Raw translation response:", translationResponse.response);
            const rawTranslation = translationResponse.response || '';
            const parsed = JSON.parse(rawTranslation);
    
            return parsed.translatedQuery || userQuery;
        } catch (error) {
            return userQuery;
        }

    }

    async decomposeQuery(userQuery: string): Promise<DecompositionResponse> {
        userQuery = this.sanitizeInput(userQuery);
        console.log("Decomposing user query:", userQuery);
        
        const decompositionResponse = await this.env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
            messages: [
            {
                role: "system",
                content: `
                    You are a QUERY DECOMPOSER. Break queries into tasks and return ONLY valid JSON.

                    CRITICAL: If a query can be done in 1 task, do not split it.
                    CRITICAL: ANY dataset, subset of logs, or filtered group that can be obtained via tool parameters MUST be retrieved via toolSelection. Synthesis must NOT create or filter datasets.
                    CRITICAL: If any information is needed, you MUST create a toolSelection task. Never hallucinate or assume data.
                    CRITICAL: If a task uses previous task outputs, then you need to formulate its Direct Order accordingly. 

                    Chat history is provided for context resolution only (pronouns like "them", "those", etc.).

                    The tasks will be executed by another AI agent with tool access. Your job is PLANNING, not answering.

                    If the task needs data retrieval, it MUST be toolSelection.
                    If the task needs analysis, comparison, arithmetic, or explanation, it MUST be synthesis.

                    ━━━━━━━━━━━━━━━━━━
                    DEFINITION: "DATA RETRIEVABLE BY TOOL"
                    This includes:
                    • Any logs filtered by time, userId, decision, or score 
                    • Any subset of logs defined by tool parameters
                    • Any dataset that could be returned by calling a tool with filters
                    • Any configuration or stats data
                    • ANY combination of the above

                    These are NOT "analysis". These are DATASETS and must be toolSelection tasks.

                    ━━━━━━━━━━━━━━━━━━
                    TOOLS DON'T INCLUDE:
                    • Any form of analysis, counting, or aggregation over logs
                    • Any arithmetic (rates, averages, percentages)
                    • Any comparison
                    • Any formatting or explanation
                    • ANY operation that inspects or processes raw logs

                    These are synthesis tasks ONLY.
                    ━━━━━━━━━━━━━━━━━━


                    AVAILABLE TOOLS:
                    - getStats: {}
                    - getSettings: {}
                    - getFullContext: {}
                    - getRecentLogs: {"count": number} 
                    - getAiContext: {"limit": number}
                    - searchLogs: {
                        "userId"?: string,
                        "minScore"?: number,
                        "decision"?: "approved" | "rejected" | "flagged",
                        "startTime"?: string (ISO 8601),
                        "endTime"?: string (ISO 8601)
                    }

                    ━━━━━━━━━━━━━━━━━━
                    EXECUTION TYPES
                    - toolSelection:
                        Purpose: Retrieve datasets OR deterministic scalar aggregates derived directly from tool output.
                        Allowed operations:
                        • Calling tools
                        • Filtering via tool parameters
                        • Returning counts/unique IDs/min/max directly computed from tool response
                        NOT allowed:
                        • Explanations
                        • Final user answers

                    - synthesis:
                        Purpose: Produce final response using outputs from toolSelection.
                        Allowed operations:
                        • Arithmetic on scalars (rates, averages, percentages)
                        • Comparison
                        • Formatting and explanation
                        STRICTLY FORBIDDEN:
                        • Filtering logs
                        • Counting logs that meet conditions
                        • Creating subsets of logs
                        • Iterating over raw logs
                        • Computing aggregates from raw lists
                    ━━━━━━━━━━━━━━━━━━

                    TOOLS USE-CASES

                    A) getStats()
                    Use for global totals/averages across ALL TIME only.

                    B) getSettings()
                    Use for configuration/thresholds.

                    C) getRecentLogs(count)
                    Use ONLY for "recent/latest/last N" with NO filters. It only returns the logs without any filters. If filters are needed, use searchLogs.

                    D) searchLogs(criteria)
                    Use for ANY filtered dataset:
                    • date ranges (ISO 8601 only) // used for tasks needing to get logs from specific timeframes
                    • userId // specific user's logs
                    • decision (approved/rejected/flagged)
                    • score
                    • ANY combination

                    E) getAiContext(limit)
                    Use for chat recap/history.

                    F) getFullContext()
                    Use only when intent is unclear AND multiple data types are required.

                    ━━━━━━━━━━━━━━━━━━
                    METRIC DECOMPOSITION RULE (VERY IMPORTANT)

                    If the user asks for:
                    • rate
                    • percentage
                    • ratio
                    • average of a subset
                    • "how many X out of Y"

                    Then you MUST:
                    1) Create toolSelection tasks to retrieve EACH required dataset component using filters
                    2) Return scalar counts from those tasks
                    3) Use synthesis ONLY to perform the final math

                    Synthesis must NEVER derive numerator/denominator by inspecting logs.
                    ━━━━━━━━━━━━━━━━━━

                    RULES:
                    1. LAST task MUST be synthesis
                    2. Simple query: [toolSelection] → [synthesis]
                    3. Complex query: multiple toolSelection → synthesis
                    4. Conversation only: synthesis only

                    ━━━━━━━━━━━━━━━━━━
                    DIRECT ORDER RULES

                    Direct orders must be executable commands, not analysis.

                    GOOD:
                    "Fetch logs from yesterday with decision='rejected' and return rejectedCount"
                    "Fetch logs for userId X and return totalCount"

                    BAD:
                    "Analyze logs"
                    "Figure out rejection rate"

                    Always translate user language into tool language.

                    ━━━━━━━━━━━━━━━━━━
                    SELF-CHECK BEFORE OUTPUT

                    Verify:
                    • No synthesis task contains filtering/counting/aggregation over logs
                    • All subsets of logs are created via toolSelection using filters
                    • Metrics are computed only from scalars returned by tools

                    If violation exists → restructure tasks.

                    Return ONLY valid JSON.

                `
            },
            {
                role: "user",
                content: `
                    <Query>
                        ${userQuery}
                    </Query>

                    <ChatHistory>
                        ${(this.state as CustomerState).aiContext.slice(0, 10).reverse().map(msg => `<${msg.role}>${msg.text}</${msg.role}>`).join('\n')}
                    </ChatHistory>

                    Return the decomposition as per the rules.
                `
            }
            ],
            temperature: 0.1,
            response_format: {
                type: "json_schema",
                json_schema: {
                    type: "object",
                    additionalProperties: false,
                    required: ["tasks"],
                    properties: {
                    tasks: {
                        type: "array",
                        minItems: 1,
                        items: {
                        type: "object",
                        required: ["id", "intent", "directOrder", "executionType", "previousTasksDependency"],
                        additionalProperties: false,
                        properties: {
                            id: { type: "string", pattern: "^task_[0-9]+$" },
                            intent: { type: "string" },
                            directOrder: { type: "string" },
                            executionType: { type: "string", enum: ["toolSelection", "synthesis"] },
                            previousTasksDependency: { type: "array", items: { type: "string" } },
                        }
                        }
                    }
                    }
                }
            }
        });

        if (!decompositionResponse.response) {
            throw new Error("No response from decomposition AI");
        }
        console.log("Raw decomposition response:", decompositionResponse.response); 

        let parsed = decompositionResponse.response;

        // If it's a string, parse it. If it's already an object, use it directly.
        if (typeof parsed === 'string') {
            parsed = JSON.parse(parsed);
        }
        this.validateDecomposition(parsed);
        return parsed;
    }

    private validateDecomposition(decomposition: DecompositionResponse): void {
    const { tasks } = decomposition;
    
    if (!tasks || tasks.length === 0) {
        throw new Error("Decomposition must contain at least one task");
    }
    
    // CRITICAL: Last task must be synthesis
    const lastTask = tasks[tasks.length - 1];
    if (lastTask.executionType !== "synthesis") {
        throw new Error(`Last task must be synthesis, but got ${lastTask.executionType}`);
    }
    
    // Validate task IDs are sequential
    tasks.forEach((task, index) => {
        const expectedId = `task_${index + 1}`;
        if (task.id !== expectedId) {
        console.warn(`Task ID mismatch: expected ${expectedId}, got ${task.id}`);
        }
    });
    
    // Validate dependencies reference earlier tasks
    tasks.forEach((task, index) => {
        if (task.previousTasksDependency) {
        task.previousTasksDependency.forEach(depId => {
            const depIndex = tasks.findIndex(t => t.id === depId);
            if (depIndex === -1) {
            throw new Error(`Task ${task.id} depends on non-existent task ${depId}`);
            }
            if (depIndex >= index) {
            throw new Error(`Task ${task.id} depends on task ${depId} which comes after it`);
            }
        });
        }
        
        // Validate synthesis tasks have dependencies (except if it's the only task)
        if (task.executionType === "synthesis" && task.previousTasksDependency.length == 0 && tasks.length > 1) {
        console.warn(`Task ${task.id} is synthesis in multi-task flow but has no previous tasks dependency`);
        }
    });
    
    console.log(`Decomposition validated: ${tasks.length} task(s), last task is synthesis ✓`);
    }

    async executeTasks(connection: any, tasks: Task[], userQuery: string) {
        const taskResults = new Map<string, {query: string, result: any}>(); // let's make it store task id, task query, and result
        
        connection?.send(JSON.stringify({
            type: MessageType.QueryTaskStatus,
            text: `Your query has been decomposed into ${tasks.length} task(s).`
        }));
        
        for (const task of tasks) {
            console.log(`Executing ${task.id}: ${task.intent}...`);
            connection?.send(JSON.stringify({
                type: MessageType.QueryTaskStatus,
                text: `Executing task ${task.id} / ${tasks.length}...`
            }));

            const previousData = task.previousTasksDependency?.map(depId => ({
                taskId: depId,
                query: taskResults.get(depId)?.query,
                result: taskResults.get(depId)?.result
            })) || [];

            // Get previous data if needed
            
            if (task.executionType === "toolSelection") {
                // Call tool and get data

                const method = await this.selectHelperMethod(task.directOrder, previousData);
                const sanitizedMethod = sanitizeToolSelectionResponse(userQuery, method);

                console.log(`Selected tool for ${task.id}:`, sanitizedMethod);
                const toolResult = await this.callTool(sanitizedMethod);
                console.log(`Tool result for ${task.id}:`, toolResult);
                
                // Store result
                taskResults.set(task.id, {query: task.directOrder, result: toolResult});
            
            } 
            else if (task.executionType === "synthesis") {
                // Generate answer
                const answer = await this.synthesizeTask(task, previousData, userQuery);
                taskResults.set(task.id, {query: task.directOrder, result: answer});
            }
        }
        
        // Return final answer (last task is always synthesis)
        const lastTask = tasks[tasks.length - 1];
        return taskResults.get(lastTask.id)?.result;
    }

    async synthesizeTask(task: Task, previousData: any[], userQuery: string) {
        const response = await this.env.AI.run('@cf/meta/llama-4-scout-17b-16e-instruct', {
            messages: [
            {
                role: 'system',
                content: `
                You are answering a the User Query. Your answer will be sent directly to the user.

                CRITICAL:
                Do not include any calculation, analysis steps, tool call details, or programming logic in your answer.

                CRITICAL:
                Always returned the asked question in a user-friendly tone, do not try to find loopholes to avoid answering.

                CRITCAL:
                Formulate your answer in a user-friendly tone. This answer will be sent directly to the client-side user. Don't include any json, markdown, or internal details, unless asked explicitly by the user.

                Follow Task to perform by strictly using Data. Be clear and concise. 
                Your answer will be sent directly to the user, so avoid internal details. Use a user-friendly tone.
                Do not reference "tasks" or "tool calls" in your answer, just provide the information requested.
                Formulate your answer in a way that it is directly forwarded to the <Task to perform>

                CRITICAL: If any information is needed, you can only use <Data>. Never hallucinate or assume data.

                `
            },
            {
                role: 'user',
                content: `
                    <User Query> ${userQuery} </User Query>

                    <Task to perform>
                     ${task.directOrder}
                    </Task to perform>

                    <Data>  // previousData is an array of {taskId, query, result} each result shows the output of its query
                      ${JSON.stringify(previousData)}  
                    </Data>

                    Provide answer.`
            }
            ],
            temperature: 0.2,
            response_format: {
            type: "json_schema",
            json_schema: {
                type: "object",
                required: ["answer"],
                properties: {
                answer: { type: "string" }
                }
            }
            }
        });
        
        let output = response.response;
        if (typeof output === 'string') output = JSON.parse(output);
        return output.answer;
    }
}
interface DecompositionResponse {
  tasks: Array<Task>;
}
interface Task {
    id: string;
    intent: string;
    directOrder: string;
    executionType: 'toolSelection' | 'synthesis';
    previousTasksDependency: string[];
  }