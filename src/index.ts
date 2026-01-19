#!/usr/bin/env node

import { createMCPServer } from "./server/mcp-server.js";
import { startStdioTransport } from "./transports/stdio.js";
import { startHTTPTransport } from "./transports/http.js";
import { serverConfig, parseArgs } from "./config/index.js";
import { getTimeTool, echoTool } from "./tools/index.js";
import { infoResource } from "./resources/index.js";

async function main() {
  const { mode, port } = parseArgs();

  // Create the MCP server with all tools and resources
  const server = createMCPServer(
    serverConfig,
    [getTimeTool, echoTool],
    [infoResource]
  );

  // Start the appropriate transport
  if (mode === "http") {
    await startHTTPTransport(server, port);
  } else {
    await startStdioTransport(server);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
