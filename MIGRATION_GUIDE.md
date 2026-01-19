# Migration Guide: SSEServerTransport → StreamableHTTPServerTransport

## Overview

This document explains the migration from the deprecated `SSEServerTransport` to the new `StreamableHTTPServerTransport` in the Model Context Protocol (MCP) SDK.

## Why the Change?

As of MCP specification version **2025-03-26**, the HTTP+SSE transport (`SSEServerTransport`) has been deprecated in favor of **Streamable HTTP transport**. The new transport provides:

- **Single unified endpoint** (`/mcp`) instead of two separate endpoints
- **Better scalability** and easier load balancing
- **Standards compliance** with modern HTTP practices
- **Simplified architecture** that's easier to maintain

## Key Differences

### Architecture Comparison

| Aspect | Old (SSEServerTransport) | New (StreamableHTTPServerTransport) |
|--------|-------------------------|-------------------------------------|
| **Package Import** | `@modelcontextprotocol/sdk/server/sse.js` | `@modelcontextprotocol/sdk/server/streamableHttp.js` |
| **Endpoints** | Two: `/sse` (GET) and `/message` (POST) | One: `/mcp` (POST/GET/DELETE) |
| **Session ID Location** | Query parameter (`?sessionId=<id>`) | HTTP header (`Mcp-Session-Id: <id>`) |
| **Client Accept Header** | Not required | Required: `Accept: application/json, text/event-stream` |
| **Methods** | GET for stream, POST for messages | POST for requests, GET for streaming, DELETE for termination |

## Code Changes

### 1. Import Statements

**Before:**
```typescript
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
```

**After:**
```typescript
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { randomUUID } from "node:crypto";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
```

### 2. Endpoint Structure

**Before (Two Endpoints):**
```typescript
// GET /sse - for server-to-client events
app.get("/sse", async (req: Request, res: Response) => {
  const transport = new SSEServerTransport("/message", res);
  const sessionId = transport.sessionId;
  transports.set(sessionId, transport);
  await server.connect(transport);
});

// POST /message - for client-to-server messages
app.post("/message", async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;
  const transport = transports.get(sessionId);
  await transport.handlePostMessage(req, res, req.body);
});
```

**After (Single Endpoint):**
```typescript
// POST /mcp - for all client-to-server messages
app.post("/mcp", async (req: Request, res: Response) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  
  if (sessionId && transports.has(sessionId)) {
    // Reuse existing transport
    const transport = transports.get(sessionId)!;
    await transport.handleRequest(req, res, req.body);
  } else if (!sessionId && isInitializeRequest(req.body)) {
    // Create new transport for initialization
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (newSessionId) => {
        transports.set(newSessionId, transport);
      },
    });
    
    transport.onclose = () => {
      const sid = transport.sessionId;
      if (sid && transports.has(sid)) {
        transports.delete(sid);
      }
    };
    
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } else {
    res.status(400).json({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Bad Request" },
      id: null,
    });
  }
});

// GET /mcp - for server-to-client SSE streaming (optional)
app.get("/mcp", async (req: Request, res: Response) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (!sessionId || !transports.has(sessionId)) {
    return res.status(400).send("Invalid or missing session ID");
  }
  const transport = transports.get(sessionId)!;
  await transport.handleRequest(req, res);
});

// DELETE /mcp - for session termination
app.delete("/mcp", async (req: Request, res: Response) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (!sessionId || !transports.has(sessionId)) {
    return res.status(400).send("Invalid or missing session ID");
  }
  const transport = transports.get(sessionId)!;
  await transport.handleRequest(req, res);
});
```

### 3. Transport Storage

**Before:**
```typescript
const transports = new Map<string, SSEServerTransport>();
```

**After:**
```typescript
const transports = new Map<string, StreamableHTTPServerTransport>();
```

## Client-Side Changes

### Making Requests

**Before:**
```bash
# Connect to SSE endpoint
curl http://localhost:3001/sse

# Send messages (note query parameter)
curl -X POST "http://localhost:3001/message?sessionId=<id>" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

**After:**
```bash
# Initialize session (note Accept header and Mcp-Session-Id in response)
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {"name": "client", "version": "1.0.0"}
    }
  }'

# Send messages (note header instead of query param)
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: <id-from-response>" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'
```

## Important Notes

### Accept Header Requirement

The client **must** send the `Accept` header with both content types:
```
Accept: application/json, text/event-stream
```

If this header is missing, the server will return a `406 Not Acceptable` error.

### Session Management

- **Stateful mode** (default): Server generates and manages session IDs
- **Stateless mode**: Set `sessionIdGenerator: undefined` in transport options

Example for stateless mode:
```typescript
const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: undefined, // No session management
});
```

### Cleanup on Shutdown

Always clean up transports on shutdown:
```typescript
process.on("SIGINT", async () => {
  for (const [sessionId, transport] of transports.entries()) {
    try {
      await transport.close();
    } catch (error) {
      console.error(`Error closing transport for session ${sessionId}:`, error);
    }
  }
  transports.clear();
  process.exit(0);
});
```

## Testing the Migration

After migrating, test the following scenarios:

1. **Health check** (should still work):
   ```bash
   curl http://localhost:3001/health
   ```

2. **Initialize session**:
   ```bash
   curl -X POST http://localhost:3001/mcp \
     -H "Content-Type: application/json" \
     -H "Accept: application/json, text/event-stream" \
     -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}'
   ```

3. **List tools** (with session ID from step 2):
   ```bash
   curl -X POST http://localhost:3001/mcp \
     -H "Content-Type: application/json" \
     -H "Accept: application/json, text/event-stream" \
     -H "Mcp-Session-Id: <session-id>" \
     -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'
   ```

4. **Call a tool**:
   ```bash
   curl -X POST http://localhost:3001/mcp \
     -H "Content-Type: application/json" \
     -H "Accept: application/json, text/event-stream" \
     -H "Mcp-Session-Id: <session-id>" \
     -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"echo","arguments":{"message":"test"}}}'
   ```

## Benefits Summary

✅ **Simplified**: One endpoint instead of two  
✅ **Scalable**: Easier to load balance  
✅ **Standard**: Follows HTTP best practices  
✅ **Modern**: Uses the latest MCP specification  
✅ **Maintainable**: Cleaner architecture  

## References

- [MCP Specification 2025-03-26](https://modelcontextprotocol.io/docs/spec)
- [MCP TypeScript SDK Documentation](https://github.com/modelcontextprotocol/typescript-sdk)
- [Streamable HTTP Transport Guide](https://mcp-framework.com/docs/Transports/http-stream-transport/)

## Need Help?

If you encounter issues during migration:
1. Check that the `Accept` header is properly set
2. Verify session IDs are passed in headers, not query params
3. Ensure you're using the latest version of `@modelcontextprotocol/sdk`
4. Review the example code in this repository's `src/index.ts`
