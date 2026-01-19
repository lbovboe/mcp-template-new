# Migration Guide: Monolithic to Modular Architecture

This document explains the refactoring from a single-file implementation to a modular architecture.

## What Changed

### Before: Single File (`index.ts`)
- All code in one 365-line file
- Tools, resources, server setup, and transport logic mixed together
- Difficult to maintain and extend
- Hard to test individual components

### After: Modular Architecture
- Code split into 7 logical modules across 11 files
- Clear separation of concerns
- Easy to add new tools and resources
- Each module can be tested independently

## File Mapping

| Old Location | New Location | Purpose |
|-------------|--------------|---------|
| `index.ts` lines 19-25 | `schemas/tool-schemas.ts` | Zod validation schemas |
| `index.ts` lines 42-74 | `tools/get-time.ts`, `tools/echo.ts` | Tool definitions |
| `index.ts` lines 76-134 | `server/mcp-server.ts` | Tool execution logic |
| `index.ts` lines 136-174 | `resources/info.ts` | Resource implementations |
| `index.ts` lines 177-185 | `config/index.ts` | Configuration |
| `index.ts` lines 188-192 | `transports/stdio.ts` | Stdio transport |
| `index.ts` lines 194-348 | `transports/http.ts` | HTTP transport |
| `index.ts` lines 28-39, 350-364 | `server/mcp-server.ts`, `index.ts` | Server setup and main |

## Benefits

### 1. **Easier to Add New Tools**

**Before** (edit multiple sections in one file):
```typescript
// 1. Add schema at top
const NewToolSchema = z.object({ ... });

// 2. Scroll down ~40 lines, add to tool list
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // ... existing tools
      { name: "new_tool", ... }, // Add here
    ],
  };
});

// 3. Scroll down ~30 more lines, add handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  // ... existing handlers
  if (name === "new_tool") { // Add handler here
    // ... implementation
  }
});
```

**After** (create one new file):
```typescript
// Create src/tools/new-tool.ts
import { Tool } from "./index.js";

export const newTool: Tool = {
  name: "new_tool",
  description: "...",
  inputSchema: { ... },
  handler: async (args) => { ... },
};

// Export in src/tools/index.ts
export { newTool } from "./new-tool.js";

// Register in src/index.ts
const server = createMCPServer(
  serverConfig,
  [getTimeTool, echoTool, newTool], // Add here
  [infoResource]
);
```

### 2. **Better Code Organization**

Each module has a single responsibility:
- `tools/` - Only tool implementations
- `resources/` - Only resource implementations
- `transports/` - Only communication logic
- `schemas/` - Only validation logic
- `server/` - Only MCP server setup
- `config/` - Only configuration

### 3. **Improved Testability**

Each module can be tested in isolation:
```typescript
// Test a tool directly
import { echoTool } from "./tools/echo";

const result = await echoTool.handler({ message: "test" });
expect(result.content[0].text).toBe("Echo: test");
```

### 4. **Type Safety**

Centralized type definitions in `types/`:
```typescript
export interface Tool {
  name: string;
  description: string;
  inputSchema: object;
  handler: (args: any) => Promise<CallToolResult>;
}
```

All tools must conform to this interface.

### 5. **Scalability**

Easy to grow the codebase:
- Add 100+ tools without a 1000+ line file
- Multiple developers can work on different tools simultaneously
- Clear patterns for new contributors

## No Breaking Changes

The external API remains the same:
- Same command-line arguments
- Same tool names and signatures
- Same resource URIs
- Same HTTP endpoints
- Same stdio protocol

Existing integrations (Claude Desktop config, HTTP clients) continue to work without modification.

## Code Size Comparison

| Metric | Before | After |
|--------|--------|-------|
| Largest file | 365 lines | 158 lines (http.ts) |
| Total files | 1 | 11 source files |
| Average file size | 365 lines | 33 lines |
| Tool implementation | Mixed in 1 file | 1 file per tool |

## Next Steps

1. Review [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed module documentation
2. Try adding a new tool following the patterns
3. Run `npm run build` to verify everything compiles
4. Test with `npm run dev:mcp` or `npm run dev:mcp:http`

## Questions?

The modular architecture follows industry best practices for Node.js/TypeScript projects:
- Separation of concerns
- Single responsibility principle
- Dependency injection
- Registry pattern for dynamic routing
