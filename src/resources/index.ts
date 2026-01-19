import { ReadResourceResult } from "@modelcontextprotocol/sdk/types.js";

export interface Resource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
  handler: (uri: string) => Promise<ReadResourceResult>;
}

export { infoResource } from "./info.js";
