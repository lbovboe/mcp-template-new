# MCP Template Server

A Model Context Protocol (MCP) server template built with Node.js and TypeScript.

## Features

- **Tools**: 
  - `get_time`: Get current time in any timezone
  - `echo`: Echo back messages
- **Resources**: Server information resource
- **Dual Transport**: Supports both stdio and SSE (Server-Sent Events)

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
npm run dev
```

**SSE mode** (for HTTP-based clients):
```bash
npm run dev:sse
# Server runs on http://localhost:3001

# Custom port:
npm run dev:sse:port 3002
```

### Production Mode

**Stdio mode**:
```bash
npm start
```

**SSE mode**:
```bash
npm start -- --sse
# Or with custom port:
npm start -- --sse --port 3002
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

## Testing with SSE Mode

1. Start the server:
```bash
npm run dev:sse
```

2. Test the health endpoint:
```bash
curl http://localhost:3001/health
```

3. Connect via SSE:
```bash
curl http://localhost:3001/sse
```

4. Send messages (in another terminal, use the sessionId from the SSE connection):
```bash
curl -X POST "http://localhost:3001/message?sessionId=<session-id>" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }'
```

## Project Structure

```
mcp-template/
├── src/
│   └── index.ts          # Main server code
├── build/                # Compiled JavaScript (after build)
├── package.json
├── tsconfig.json
└── README.md
```

## Customization

To add your own tools and resources:

1. Define tool schemas using Zod in `src/index.ts`
2. Add tool definitions in the `ListToolsRequestSchema` handler
3. Implement tool logic in the `CallToolRequestSchema` handler
4. Add resources in the `ListResourcesRequestSchema` handler
5. Implement resource reads in the `ReadResourceRequestSchema` handler

## License

ISC
