import { ServerConfig } from "../types/index.js";

export const serverConfig: ServerConfig = {
  name: "mcp-template",
  version: "1.0.0",
};

export function parseArgs() {
  const args = process.argv.slice(2);
  const mode = args.includes("--http") ? "http" : "stdio";
  const port = args.includes("--port")
    ? parseInt(args[args.indexOf("--port") + 1], 10) || 3001
    : 3001;

  return { mode, port } as const;
}
