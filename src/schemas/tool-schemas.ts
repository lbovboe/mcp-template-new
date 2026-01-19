import { z } from "zod";

export const GetTimeToolSchema = z.object({
  timezone: z.string().optional().describe("Timezone (e.g., 'America/New_York', 'UTC')"),
});

export const EchoToolSchema = z.object({
  message: z.string().describe("Message to echo back"),
});

export type GetTimeToolInput = z.infer<typeof GetTimeToolSchema>;
export type EchoToolInput = z.infer<typeof EchoToolSchema>;
