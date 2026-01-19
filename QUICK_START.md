# Quick Start Guide

Get started with the MCP Template Server in 5 minutes.

## Installation

```bash
git clone <your-repo>
cd mcp-template
npm install
npm run build
```

## Basic Usage

### Run in Development Mode

```bash
# Stdio mode (for Claude Desktop)
npm run dev:mcp

# HTTP mode (for web/API clients)
npm run dev:mcp:http
```

### Run in Production Mode

```bash
npm run start:mcp        # stdio
npm run start:mcp:http   # HTTP on port 3001
```

## Adding Your First Tool

Let's create a "reverse string" tool:

### 1. Create the Schema

Edit `src/schemas/tool-schemas.ts`:

```typescript
export const ReverseToolSchema = z.object({
  text: z.string().describe("Text to reverse"),
});

export type ReverseToolInput = z.infer<typeof ReverseToolSchema>;
```

### 2. Create the Tool

Create `src/tools/reverse.ts`:

```typescript
import { Tool } from "./index.js";
import { ReverseToolSchema } from "../schemas/tool-schemas.js";

export const reverseTool: Tool = {
  name: "reverse",
  description: "Reverse a string",
  inputSchema: {
    type: "object",
    properties: {
      text: {
        type: "string",
        description: "Text to reverse",
      },
    },
    required: ["text"],
  },
  handler: async (args: any) => {
    const parsed = ReverseToolSchema.safeParse(args);
    if (!parsed.success) {
      throw new Error(`Invalid arguments: ${parsed.error}`);
    }

    const reversed = parsed.data.text.split("").reverse().join("");

    return {
      content: [
        {
          type: "text",
          text: reversed,
        },
      ],
    };
  },
};
```

### 3. Export the Tool

Edit `src/tools/index.ts`:

```typescript
export { getTimeTool } from "./get-time.js";
export { echoTool } from "./echo.js";
export { reverseTool } from "./reverse.js";  // Add this line
```

### 4. Register the Tool

Edit `src/index.ts`:

```typescript
import { getTimeTool, echoTool, reverseTool } from "./tools/index.js";

const server = createMCPServer(
  serverConfig,
  [getTimeTool, echoTool, reverseTool],  // Add reverseTool here
  [infoResource]
);
```

### 5. Build and Test

```bash
npm run build
npm run dev:mcp:http
```

In another terminal:

```bash
# Initialize session
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
      "clientInfo": {"name": "test", "version": "1.0.0"}
    }
  }'

# Copy the session ID from the response header, then:

curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: <your-session-id>" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "reverse",
      "arguments": {"text": "Hello World"}
    }
  }'
```

Expected output:
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "dlroW olleH"
      }
    ]
  }
}
```

## Adding Your First Resource

Resources provide static or dynamic data. Let's create a "status" resource:

### 1. Create the Resource

Create `src/resources/status.ts`:

```typescript
import { Resource } from "./index.js";

export const statusResource: Resource = {
  uri: "mcp://status",
  name: "Server Status",
  description: "Current server status and statistics",
  mimeType: "application/json",
  handler: async (uri: string) => {
    const status = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString(),
    };

    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(status, null, 2),
        },
      ],
    };
  },
};
```

### 2. Export and Register

Export in `src/resources/index.ts`:

```typescript
export { infoResource } from "./info.js";
export { statusResource } from "./status.js";  // Add this
```

Register in `src/index.ts`:

```typescript
import { infoResource, statusResource } from "./resources/index.js";

const server = createMCPServer(
  serverConfig,
  [getTimeTool, echoTool],
  [infoResource, statusResource]  // Add statusResource
);
```

### 3. Test

```bash
npm run build
npm run dev:mcp:http

# In another terminal:
curl -X POST http://localhost:3001/mcp \
  -H "Mcp-Session-Id: <session-id>" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "resources/read",
    "params": {"uri": "mcp://status"}
  }'
```

## Common Patterns

### Tool with Multiple Parameters

```typescript
const CalculateToolSchema = z.object({
  operation: z.enum(["add", "subtract", "multiply", "divide"]),
  a: z.number(),
  b: z.number(),
});
```

### Tool with Optional Parameters

```typescript
const SearchToolSchema = z.object({
  query: z.string(),
  limit: z.number().optional().default(10),
  offset: z.number().optional().default(0),
});
```

### Async Tool (API calls, file I/O)

```typescript
handler: async (args: any) => {
  const parsed = MyToolSchema.safeParse(args);
  if (!parsed.success) {
    throw new Error(`Invalid arguments: ${parsed.error}`);
  }

  // Async operation
  const data = await fetch("https://api.example.com/data");
  const result = await data.json();

  return {
    content: [{ type: "text", text: JSON.stringify(result) }],
  };
}
```

### Error Handling

```typescript
handler: async (args: any) => {
  try {
    const parsed = MyToolSchema.safeParse(args);
    if (!parsed.success) {
      throw new Error(`Invalid arguments: ${parsed.error}`);
    }

    // Your logic here
    const result = doSomething(parsed.data);

    return {
      content: [{ type: "text", text: result }],
    };
  } catch (error) {
    throw new Error(`Tool failed: ${error.message}`);
  }
}
```

## Next Steps

- Read [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed module documentation
- See [MIGRATION.md](./MIGRATION.md) to understand the refactoring
- Check [README.md](./README.md) for full documentation
- Explore the existing tools in `src/tools/` for examples

## Tips

1. **Keep tools focused**: Each tool should do one thing well
2. **Validate inputs**: Always use Zod schemas for validation
3. **Handle errors**: Throw descriptive errors for better debugging
4. **Test frequently**: Rebuild and test after each change
5. **Follow patterns**: Use existing tools as templates

## Troubleshooting

### Build fails
```bash
rm -rf build/
npm run build
```

### Server won't start
- Check port 3001 isn't already in use
- Verify `npm install` completed successfully
- Check for syntax errors in your code

### Tool not appearing
- Did you export it from `tools/index.ts`?
- Did you register it in `src/index.ts`?
- Did you rebuild with `npm run build`?

### Invalid arguments error
- Check your Zod schema matches the inputSchema
- Verify required fields are marked correctly
- Test with simple inputs first
