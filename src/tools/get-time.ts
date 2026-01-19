import { Tool } from "./index.js";
import { GetTimeToolSchema } from "../schemas/tool-schemas.js";

export const getTimeTool: Tool = {
  name: "get_time",
  description: "Get the current time in a specified timezone",
  inputSchema: {
    type: "object",
    properties: {
      timezone: {
        type: "string",
        description: "Timezone (e.g., 'America/New_York', 'UTC')",
      },
    },
  },
  handler: async (args: any) => {
    const parsed = GetTimeToolSchema.safeParse(args);
    if (!parsed.success) {
      throw new Error(`Invalid arguments: ${parsed.error}`);
    }

    const timezone = parsed.data.timezone || "UTC";
    const date = new Date();
    const timeString = date.toLocaleString("en-US", {
      timeZone: timezone,
      dateStyle: "full",
      timeStyle: "long",
    });

    return {
      content: [
        {
          type: "text",
          text: `Current time in ${timezone}: ${timeString}`,
        },
      ],
    };
  },
};
