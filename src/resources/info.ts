import { Resource } from "./index.js";

export const infoResource: Resource = {
  uri: "mcp://info",
  name: "Server Information",
  description: "Information about this MCP server",
  mimeType: "text/plain",
  handler: async (uri: string) => {
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
  },
};
