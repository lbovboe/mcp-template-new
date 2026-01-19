import { Tool } from "./index.js";
import { EchoToolSchema } from "../schemas/tool-schemas.js";

export const echoTool: Tool = {
  name: "echo",
  description: "Echo back a message",
  inputSchema: {
    type: "object",
    properties: {
      message: {
        type: "string",
        description: "Message to echo back",
      },
    },
    required: ["message"],
  },
  handler: async (args: any) => {
    const parsed = EchoToolSchema.safeParse(args);
    if (!parsed.success) {
      throw new Error(`Invalid arguments: ${parsed.error}`);
    }

    return {
      content: [
        {
          type: "text",
          text: `Echo: ${parsed.data.message}`,
        },
      ],
    };
  },
};
