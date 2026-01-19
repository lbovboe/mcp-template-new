import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export interface Tool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
  handler: (args: any) => Promise<CallToolResult>;
}

export { getTimeTool } from "./get-time.js";
export { echoTool } from "./echo.js";
