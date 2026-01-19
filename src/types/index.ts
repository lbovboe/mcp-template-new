export interface ServerConfig {
  name: string;
  version: string;
}

export interface StartupConfig {
  mode: "http" | "stdio";
  port: number;
}
