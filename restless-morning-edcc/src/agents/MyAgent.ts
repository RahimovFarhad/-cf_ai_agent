import { Agent, type Connection, type WSMessage } from "agents";

export interface Env extends Cloudflare.Env{
    MyAgent: DurableObjectNamespace<MyAgent>;
    AI: any;
}

// Message types matching the frontend
const MessageType = {
  // Client → Server
  CHAT: 'chat',
  COMMAND: 'command',
  SYNC: 'sync',
  
  // Server → Client
  ASSISTANT: 'assistant',
  STATUS: 'status',
  STATE: 'state',
  ERROR: 'error'
};


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

  async onConnect(connection: Connection) {
    console.log("New WebSocket connection established:", connection.id);

    connection.send(
      JSON.stringify({
        type: MessageType.STATUS,
        text: "Connection established",
      }),
    );
    // Initialize connection-specific state
    connection.setState({ connectedAt: Date.now() });
  }

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
      const data = JSON.parse(message);
      console.log("Received message:", data);

      if (data.type === MessageType.CHAT) {
        // Handle chat messages
        connection.send(
          JSON.stringify({
            type: MessageType.ASSISTANT,
            text: "I received your message: " + data.text,
          }),
        );
      } else if (data.type === MessageType.COMMAND) {
        // Handle command messages
        connection.send(
          JSON.stringify({
            type: MessageType.STATUS,
            text: "Command received: " + data.text,
          }),
        );
      } else if (data.type === MessageType.SYNC) {
        // Handle sync messages
        connection.send(
          JSON.stringify({
            type: MessageType.STATE,
            state: this.state,
          }),
        );
      }
      else {
        connection.send(
          JSON.stringify({
            type: MessageType.ERROR,
            text: "Unknown message type",
          }),
        );
      }
    } catch (error) {
      connection.send(
        JSON.stringify({
          type: MessageType.ERROR,
          text: "Error processing message",
        }),
      );
    }

  }

  async onClose(connection: Connection) {
    console.log("WebSocket connection closed:", connection.id);
    const state = connection.state;
    console.log("Connection state at disconnect:", state);
  }
}