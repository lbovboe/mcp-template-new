# MCP Template Server

A Model Context Protocol (MCP) server template built with Node.js and TypeScript.

## Features

- **Tools**: 
  - `get_time`: Get current time in any timezone
  - `echo`: Echo back messages
- **Resources**: Server information resource
- **Dual Transport**: Supports both stdio and Streamable HTTP (single `/mcp` endpoint)

## Installation

```bash
npm install
```

## Build

```bash
npm run build
```

## Usage

### Development Mode (with tsx)

**Stdio mode** (for MCP clients like Claude Desktop):
```bash
npm run dev:mcp
```

**HTTP mode** (for HTTP-based clients, using Streamable HTTP transport):
```bash
npm run dev:mcp:http
# Server runs on http://localhost:3001

# Custom port:
npm run dev:mcp:http:port 3002
```

### Production Mode

**Stdio mode**:
```bash
npm run start:mcp
```

**HTTP mode**:
```bash
npm run start:mcp:http
# Or with custom port:
npm run start:mcp:http:port 3002
```

## Configuration for Claude Desktop

Add to your Claude Desktop config file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "mcp-template": {
      "command": "node",
      "args": ["/path/to/mcp-template/build/index.js"]
    }
  }
}
```

Or use tsx for development:

```json
{
  "mcpServers": {
    "mcp-template": {
      "command": "npx",
      "args": ["-y", "tsx", "/path/to/mcp-template/src/index.ts"]
    }
  }
}
```

## Testing with HTTP Mode (Streamable HTTP)

The new Streamable HTTP transport uses a **single `/mcp` endpoint** for all communication (POST, GET, DELETE methods).

### Key Differences from Old SSE Transport

**Old (Deprecated) SSE Transport:**
- Two endpoints: `/sse` (GET for streaming) and `/message` (POST for requests)
- Session ID passed as query parameter

**New Streamable HTTP Transport:**
- Single endpoint: `/mcp` 
- POST /mcp: Client sends requests
- GET /mcp: Client establishes SSE streaming for server-initiated notifications
- DELETE /mcp: Client terminates session
- Session ID passed in `Mcp-Session-Id` header

### Testing Steps

1. Start the server:
```bash
npm run dev:mcp:http
```

2. Test the health endpoint:
```bash
curl http://localhost:3001/health
```

3. Initialize a session (first request must be initialize):

**Option A: Using `-i` flag (includes headers, cleaner output):**
```bash
curl -i -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {
        "name": "test-client",
        "version": "1.0.0"
      }
    }
  }'
```

**Option B: Using `-v` flag (verbose, shows full request and response):**
```bash
curl -v -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {
        "name": "test-client",
        "version": "1.0.0"
      }
    }
  }'
```

**Important Notes:**
- The `-i` flag shows response headers only (cleaner)
- The `-v` flag shows both request and response headers (verbose, for debugging)
- The `Accept` header must include both `application/json` and `text/event-stream` to properly support the Streamable HTTP protocol
- Look for the `mcp-session-id` header in the response (e.g., `mcp-session-id: e75aa1e2-8327-47fe-b670-a49f6a694e64`)
- Copy this session ID to use in subsequent requests

4. List tools (replace `<session-id>` with the value from step 3):
```bash
curl -i -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: <session-id>" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list"
  }'
```

Example with actual session ID:
```bash
curl -i -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: e75aa1e2-8327-47fe-b670-a49f6a694e64" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list"
  }'
```

5. Call a tool:
```bash
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: <session-id>" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "echo",
      "arguments": {
        "message": "Hello from Streamable HTTP!"
      }
    }
  }'
```

6. Establish SSE streaming (optional, for server-initiated notifications):
```bash
curl -X GET http://localhost:3001/mcp \
  -H "Mcp-Session-Id: <session-id>" \
  -H "Accept: text/event-stream"
```

7. Terminate session:
```bash
curl -X DELETE http://localhost:3001/mcp \
  -H "Mcp-Session-Id: <session-id>"
```

## Migration from SSE Transport

This template has been updated to use the new **Streamable HTTP transport** instead of the deprecated `SSEServerTransport`.

### What Changed?

**Before (Deprecated SSE Transport):**
- Used `SSEServerTransport` from `@modelcontextprotocol/sdk/server/sse.js`
- Required two endpoints:
  - `GET /sse` - for server-to-client streaming
  - `POST /message?sessionId=<id>` - for client-to-server messages
- Session ID passed as query parameter

**After (New Streamable HTTP Transport):**
- Uses `StreamableHTTPServerTransport` from `@modelcontextprotocol/sdk/server/streamableHttp.js`
- Single endpoint `/mcp` with three HTTP methods:
  - `POST /mcp` - for all client-to-server messages
  - `GET /mcp` - for server-to-client SSE streaming (optional)
  - `DELETE /mcp` - for session termination
- Session ID passed in `Mcp-Session-Id` header
- Requires `Accept: application/json, text/event-stream` header

### Benefits of Streamable HTTP

1. **Simplified Architecture**: Single endpoint instead of two
2. **Better Scalability**: Easier to load balance and manage
3. **Standards Compliance**: Follows HTTP best practices
4. **Future-Proof**: The new MCP specification standard (as of 2025-03-26)

## Project Structure

This project follows a modular architecture for better maintainability and scalability:

```
mcp-template/
├── src/
│   ├── index.ts              # Main entry point
│   ├── config/               # Configuration
│   │   └── index.ts         # Server config and argument parsing
│   ├── types/               # TypeScript type definitions
│   │   └── index.ts         # Shared types
│   ├── schemas/             # Zod validation schemas
│   │   └── tool-schemas.ts  # Tool input validation
│   ├── tools/               # Tool implementations
│   │   ├── index.ts         # Tool registry and exports
│   │   ├── get-time.ts      # Get time tool
│   │   └── echo.ts          # Echo tool
│   ├── resources/           # Resource implementations
│   │   ├── index.ts         # Resource registry
│   │   └── info.ts          # Server info resource
│   ├── server/              # MCP server setup
│   │   └── mcp-server.ts    # Server creation and handlers
│   └── transports/          # Transport layer
│       ├── stdio.ts         # Standard I/O transport
│       └── http.ts          # HTTP/SSE transport
├── build/                    # Compiled JavaScript (after build)
├── package.json
├── tsconfig.json
├── README.md
└── ARCHITECTURE.md           # Detailed architecture documentation
```

## Customization

### Adding a New Tool

1. **Create schema** in `src/schemas/tool-schemas.ts`:
```typescript
export const MyToolSchema = z.object({
  param: z.string().describe("Parameter description"),
});
```

2. **Create tool** in `src/tools/my-tool.ts`:
```typescript
import { Tool } from "./index.js";
import { MyToolSchema } from "../schemas/tool-schemas.js";

export const myTool: Tool = {
  name: "my_tool",
  description: "Tool description",
  inputSchema: { /* ... */ },
  handler: async (args: any) => {
    const parsed = MyToolSchema.safeParse(args);
    // ... implement logic
    return { content: [{ type: "text", text: result }] };
  },
};
```

3. **Export** in `src/tools/index.ts`:
```typescript
export { myTool } from "./my-tool.js";
```

4. **Register** in `src/index.ts`:
```typescript
const server = createMCPServer(
  serverConfig,
  [getTimeTool, echoTool, myTool], // Add here
  [infoResource]
);
```

### Adding a New Resource

Follow the same pattern as tools but in the `src/resources/` directory.

For detailed architecture information and extension patterns, see [ARCHITECTURE.md](./ARCHITECTURE.md).

## License

ISC
