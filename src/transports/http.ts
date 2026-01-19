import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import express, { Request, Response } from "express";
import { randomUUID } from "node:crypto";

export async function startHTTPTransport(server: Server, port: number): Promise<void> {
  const app = express();

  // Store active transports by session ID
  const transports = new Map<string, StreamableHTTPServerTransport>();

  // Middleware for parsing JSON
  app.use(express.json());

  // Health check endpoint
  app.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", server: "mcp-template", version: "1.0.0" });
  });

  // Single MCP endpoint for all communication - POST method
  app.post("/mcp", async (req: Request, res: Response) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    
    if (sessionId) {
      console.error(`Received MCP POST request for session: ${sessionId}`);
    } else {
      console.error("Received MCP POST request without session ID");
    }

    try {
      let transport: StreamableHTTPServerTransport;

      if (sessionId && transports.has(sessionId)) {
        // Reuse existing transport for this session
        transport = transports.get(sessionId)!;
        console.error(`Reusing existing transport for session: ${sessionId}`);
      } else if (!sessionId && isInitializeRequest(req.body)) {
        // New initialization request - create new transport
        console.error("Creating new transport for initialization request");
        
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (newSessionId) => {
            console.error(`Session initialized with ID: ${newSessionId}`);
            transports.set(newSessionId, transport);
          },
        });

        // Set up onclose handler to clean up transport
        transport.onclose = () => {
          const sid = transport.sessionId;
          if (sid && transports.has(sid)) {
            console.error(`Transport closed for session ${sid}, removing from map`);
            transports.delete(sid);
          }
        };

        // Connect the transport to the MCP server
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
        return;
      } else {
        // Invalid request
        console.error("Invalid request: no session ID and not an initialization request");
        return res.status(400).json({
          jsonrpc: "2.0",
          error: {
            code: -32000,
            message: "Bad Request: No valid session ID provided or not an initialization request",
          },
          id: null,
        });
      }

      // Handle the request with existing transport
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error("Error handling MCP POST request:", error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: "Internal server error",
          },
          id: null,
        });
      }
    }
  });

  // Single MCP endpoint - GET method for SSE streaming
  app.get("/mcp", async (req: Request, res: Response) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;

    if (!sessionId || !transports.has(sessionId)) {
      console.error(`Invalid or missing session ID for GET request: ${sessionId}`);
      return res.status(400).send("Invalid or missing session ID");
    }

    const lastEventId = req.headers["last-event-id"] as string | undefined;
    if (lastEventId) {
      console.error(`Client reconnecting with Last-Event-ID: ${lastEventId}`);
    } else {
      console.error(`Establishing new SSE stream for session ${sessionId}`);
    }

    const transport = transports.get(sessionId)!;
    await transport.handleRequest(req, res);
  });

  // Single MCP endpoint - DELETE method for session termination
  app.delete("/mcp", async (req: Request, res: Response) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;

    if (!sessionId || !transports.has(sessionId)) {
      console.error(`Invalid or missing session ID for DELETE request: ${sessionId}`);
      return res.status(400).send("Invalid or missing session ID");
    }

    console.error(`Received session termination request for session ${sessionId}`);

    try {
      const transport = transports.get(sessionId)!;
      await transport.handleRequest(req, res);
    } catch (error) {
      console.error("Error handling session termination:", error);
      if (!res.headersSent) {
        res.status(500).send("Error processing session termination");
      }
    }
  });

  // Start the HTTP server
  app.listen(port, () => {
    console.error(`MCP Template Server running on http://localhost:${port}`);
    console.error(`MCP endpoint: http://localhost:${port}/mcp`);
    console.error(`  - POST /mcp: Client-to-server messages`);
    console.error(`  - GET /mcp: Server-to-client SSE streaming`);
    console.error(`  - DELETE /mcp: Session termination`);
    console.error(`Health check: http://localhost:${port}/health`);
  });

  // Handle server shutdown
  process.on("SIGINT", async () => {
    console.error("Shutting down server...");
    for (const [sessionId, transport] of transports.entries()) {
      try {
        console.error(`Closing transport for session ${sessionId}`);
        await transport.close();
      } catch (error) {
        console.error(`Error closing transport for session ${sessionId}:`, error);
      }
    }
    transports.clear();
    console.error("Server shutdown complete");
    process.exit(0);
  });
}
