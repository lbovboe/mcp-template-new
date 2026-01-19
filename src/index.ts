#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import express from "express";
import { Request, Response } from "express";

// Define your tool schemas
const GetTimeToolSchema = z.object({
  timezone: z.string().optional().describe("Timezone (e.g., 'America/New_York', 'UTC')"),
});

const EchoToolSchema = z.object({
  message: z.string().describe("Message to echo back"),
});

// Create the MCP server
const server = new Server(
  {
    name: "mcp-template",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_time",
        description: "Get the current time in a specified timezone",
        inputSchema: {
          type: "object",
          properties: {
            timezone: {
              type: "string",
              description: "Timezone (e.g., 'America/New_York', 'UTC')",
            },
          },
        },
      },
      {
        name: "echo",
        description: "Echo back a message",
        inputSchema: {
          type: "object",
          properties: {
            message: {
              type: "string",
              description: "Message to echo back",
            },
          },
          required: ["message"],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "get_time") {
      const parsed = GetTimeToolSchema.safeParse(args);
      if (!parsed.success) {
        throw new Error(`Invalid arguments: ${parsed.error}`);
      }

      const timezone = parsed.data.timezone || "UTC";
      const date = new Date();
      const timeString = date.toLocaleString("en-US", {
        timeZone: timezone,
        dateStyle: "full",
        timeStyle: "long",
      });

      return {
        content: [
          {
            type: "text",
            text: `Current time in ${timezone}: ${timeString}`,
          },
        ],
      };
    }

    if (name === "echo") {
      const parsed = EchoToolSchema.safeParse(args);
      if (!parsed.success) {
        throw new Error(`Invalid arguments: ${parsed.error}`);
      }

      return {
        content: [
          {
            type: "text",
            text: `Echo: ${parsed.data.message}`,
          },
        ],
      };
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: `Error: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

// List available resources
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: "mcp://info",
        name: "Server Information",
        description: "Information about this MCP server",
        mimeType: "text/plain",
      },
    ],
  };
});

// Handle resource reads
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  if (uri === "mcp://info") {
    return {
      contents: [
        {
          uri,
          mimeType: "text/plain",
          text: `MCP Template Server v1.0.0
          
This is an example MCP server that provides:
- Time utilities
- Echo functionality
- Custom resources

Built with the Model Context Protocol SDK.`,
        },
      ],
    };
  }

  throw new Error(`Unknown resource: ${uri}`);
});

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const mode = args.includes("--sse") ? "sse" : "stdio";
  const port = args.includes("--port")
    ? parseInt(args[args.indexOf("--port") + 1], 10) || 3001
    : 3001;

  return { mode, port };
}

// Start server with stdio transport
async function startStdio() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP Template Server running on stdio");
}

// Start server with SSE transport
async function startSSE(port: number) {
  const app = express();

  // Store active SSE transports by session ID
  const transports = new Map<string, SSEServerTransport>();

  // Middleware for parsing JSON
  app.use(express.json());

  // Health check endpoint
  app.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", server: "mcp-template", version: "1.0.0" });
  });

  // SSE endpoint for MCP communication
  app.get("/sse", async (req: Request, res: Response) => {
    console.error("New SSE connection established");

    const transport = new SSEServerTransport("/message", res);
    
    // Store the transport with its session ID BEFORE connecting
    const sessionId = transport.sessionId;
    transports.set(sessionId, transport);
    console.error(`SSE session registered: ${sessionId}`);
    
    await server.connect(transport);

    // Handle client disconnect
    req.on("close", () => {
      console.error("SSE connection closed");
      transports.delete(sessionId);
      console.error(`SSE session removed: ${sessionId}`);
    });
  });

  // POST endpoint for sending messages to the server
  app.post("/message", async (req: Request, res: Response) => {
    const sessionId = req.query.sessionId as string;
    
    if (!sessionId) {
      console.error("POST /message - Missing sessionId parameter");
      return res.status(400).json({ 
        error: "Missing sessionId parameter",
        message: "Please provide a sessionId query parameter. Example: POST /message?sessionId=<session-id>"
      });
    }

    const transport = transports.get(sessionId);
    
    if (!transport) {
      console.error(`POST /message - Session not found: ${sessionId}`);
      console.error(`Active sessions: ${Array.from(transports.keys()).join(", ")}`);
      return res.status(404).json({ 
        error: "Session not found",
        message: `No active SSE session found for sessionId: ${sessionId}`,
        activeSessions: Array.from(transports.keys())
      });
    }

    // Handle the incoming message through the transport
    try {
      console.error(`POST /message - Handling message for session: ${sessionId}`);
      await transport.handlePostMessage(req, res, req.body);
    } catch (error) {
      console.error("Error handling message:", error);
      if (!res.headersSent) {
        res.status(500).json({ 
          error: "Internal server error",
          message: error instanceof Error ? error.message : String(error)
        });
      }
    }
  });

  // Start the HTTP server
  app.listen(port, () => {
    console.error(`MCP Template Server running on http://localhost:${port}`);
    console.error(`SSE endpoint: http://localhost:${port}/sse`);
    console.error(`Message endpoint: http://localhost:${port}/message`);
    console.error(`Health check: http://localhost:${port}/health`);
  });
}

// Main entry point
async function main() {
  const { mode, port } = parseArgs();

  if (mode === "sse") {
    await startSSE(port);
  } else {
    await startStdio();
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
