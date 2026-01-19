# MCP Server Architecture

This document describes the modular architecture of the MCP Template Server.

## Directory Structure

```
src/
├── index.ts                 # Main entry point
├── config/                  # Configuration
│   └── index.ts            # Server config and argument parsing
├── types/                   # TypeScript type definitions
│   └── index.ts            # Shared types
├── schemas/                 # Zod validation schemas
│   └── tool-schemas.ts     # Tool input validation schemas
├── tools/                   # Tool implementations
│   ├── index.ts            # Tool registry and exports
│   ├── get-time.ts         # Get time tool
│   └── echo.ts             # Echo tool
├── resources/               # Resource implementations
│   ├── index.ts            # Resource registry and exports
│   └── info.ts             # Server info resource
├── server/                  # MCP server setup
│   └── mcp-server.ts       # Server creation and request handlers
└── transports/              # Transport layer implementations
    ├── stdio.ts            # Standard I/O transport
    └── http.ts             # HTTP/SSE transport
```

## Module Responsibilities

### `index.ts`
- **Purpose**: Application entry point
- **Responsibilities**: 
  - Parse command-line arguments
  - Initialize server with tools and resources
  - Start appropriate transport (stdio or HTTP)

### `config/`
- **Purpose**: Centralized configuration
- **Responsibilities**:
  - Server metadata (name, version)
  - Command-line argument parsing
  - Environment-specific settings

### `types/`
- **Purpose**: TypeScript type definitions
- **Responsibilities**:
  - Shared interfaces and types
  - Type safety across modules

### `schemas/`
- **Purpose**: Input validation
- **Responsibilities**:
  - Zod schemas for tool inputs
  - Runtime validation
  - Type inference for tool handlers

### `tools/`
- **Purpose**: Tool implementations
- **Responsibilities**:
  - Individual tool logic
  - Tool metadata (name, description, schema)
  - Tool handler functions
- **How to add a new tool**:
  1. Create a new file `tools/my-tool.ts`
  2. Define the tool schema in `schemas/tool-schemas.ts`
  3. Implement the tool following the `Tool` interface
  4. Export from `tools/index.ts`
  5. Register in `index.ts`

### `resources/`
- **Purpose**: Resource implementations
- **Responsibilities**:
  - Individual resource logic
  - Resource metadata (uri, name, description)
  - Resource handler functions
- **How to add a new resource**:
  1. Create a new file `resources/my-resource.ts`
  2. Implement the resource following the `Resource` interface
  3. Export from `resources/index.ts`
  4. Register in `index.ts`

### `server/`
- **Purpose**: MCP server setup
- **Responsibilities**:
  - Server instance creation
  - Request handler registration
  - Tool and resource routing
  - Error handling

### `transports/`
- **Purpose**: Communication layer
- **Responsibilities**:
  - stdio transport for CLI usage
  - HTTP transport for web/API usage
  - Session management (HTTP)
  - Connection lifecycle

## Data Flow

### Tool Execution Flow
```
Client Request
    ↓
Transport Layer (stdio/http)
    ↓
MCP Server (mcp-server.ts)
    ↓
Tool Registry Lookup
    ↓
Schema Validation (Zod)
    ↓
Tool Handler Execution
    ↓
Response
    ↓
Transport Layer
    ↓
Client
```

### Resource Access Flow
```
Client Request
    ↓
Transport Layer (stdio/http)
    ↓
MCP Server (mcp-server.ts)
    ↓
Resource Registry Lookup
    ↓
Resource Handler Execution
    ↓
Response
    ↓
Transport Layer
    ↓
Client
```

## Extension Points

### Adding a New Tool

1. **Create schema** in `schemas/tool-schemas.ts`:
```typescript
export const MyToolSchema = z.object({
  param: z.string().describe("Parameter description"),
});

export type MyToolInput = z.infer<typeof MyToolSchema>;
```

2. **Create tool** in `tools/my-tool.ts`:
```typescript
import { Tool } from "./index.js";
import { MyToolSchema } from "../schemas/tool-schemas.js";

export const myTool: Tool = {
  name: "my_tool",
  description: "Tool description",
  inputSchema: {
    type: "object",
    properties: {
      param: {
        type: "string",
        description: "Parameter description",
      },
    },
    required: ["param"],
  },
  handler: async (args: any) => {
    const parsed = MyToolSchema.safeParse(args);
    if (!parsed.success) {
      throw new Error(`Invalid arguments: ${parsed.error}`);
    }

    // Tool logic here
    const result = doSomething(parsed.data.param);

    return {
      content: [
        {
          type: "text",
          text: result,
        },
      ],
    };
  },
};
```

3. **Export tool** in `tools/index.ts`:
```typescript
export { myTool } from "./my-tool.js";
```

4. **Register tool** in `index.ts`:
```typescript
import { myTool } from "./tools/index.js";

const server = createMCPServer(
  serverConfig,
  [getTimeTool, echoTool, myTool], // Add here
  [infoResource]
);
```

### Adding a New Resource

Similar pattern as tools, but implement the `Resource` interface.

### Adding a New Transport

1. Create a new file in `transports/`
2. Implement transport connection logic
3. Connect to the MCP server instance
4. Add startup logic in `index.ts`

## Benefits of This Architecture

1. **Modularity**: Each module has a single responsibility
2. **Scalability**: Easy to add new tools, resources, or transports
3. **Maintainability**: Changes are isolated to specific modules
4. **Testability**: Each module can be tested independently
5. **Type Safety**: Strong typing throughout with TypeScript
6. **Validation**: Runtime validation with Zod schemas
7. **Separation of Concerns**: Business logic separated from infrastructure
8. **Extensibility**: Clear patterns for adding new functionality

## Design Patterns Used

- **Registry Pattern**: Tool and resource registries for dynamic lookup
- **Factory Pattern**: Server creation with dependency injection
- **Strategy Pattern**: Different transport strategies (stdio/HTTP)
- **Module Pattern**: Encapsulation of related functionality
- **Separation of Concerns**: Clear boundaries between layers
