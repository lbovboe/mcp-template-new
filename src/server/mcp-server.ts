import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { ServerConfig } from "../types/index.js";
import { Tool } from "../tools/index.js";
import { Resource } from "../resources/index.js";

export function createMCPServer(
  config: ServerConfig,
  tools: Tool[],
  resources: Resource[]
): Server {
  const server = new Server(
    {
      name: config.name,
      version: config.version,
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
    }
  );

  // Create tool registry
  const toolRegistry = new Map(tools.map((tool) => [tool.name, tool]));
  const resourceRegistry = new Map(resources.map((res) => [res.uri, res]));

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })),
    };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      const tool = toolRegistry.get(name);
      if (!tool) {
        throw new Error(`Unknown tool: ${name}`);
      }

      return await tool.handler(args);
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
      resources: resources.map((res) => ({
        uri: res.uri,
        name: res.name,
        description: res.description,
        mimeType: res.mimeType,
      })),
    };
  });

  // Handle resource reads
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;

    const resource = resourceRegistry.get(uri);
    if (!resource) {
      throw new Error(`Unknown resource: ${uri}`);
    }

    return await resource.handler(uri);
  });

  return server;
}
