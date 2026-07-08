export interface FileNode {
  id: string;
  name: string;
  path: string;
  kind: "file" | "directory";
  handle: FileSystemFileHandle | FileSystemDirectoryHandle;
  children?: FileNode[];
  expanded?: boolean;
  loaded?: boolean;
  size?: number;
}

export interface OpenTab {
  id: string;
  name: string;
  path: string;
  language: string;
  content: string;
  original: string;
  handle?: FileSystemFileHandle;
  dirty: boolean;
  size?: number;
  /** Files opened via drag & drop / picker that live outside the workspace tree. */
  ephemeral?: boolean;
}

export type ChatRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
  model?: string;
  /** File paths attached as context. */
  context?: string[];
  streaming?: boolean;
  error?: boolean;
}

export interface AiModel {
  id: string;
  label: string;
  description: string;
  badge?: string;
}

export interface AiSettings {
  provider: "cursor" | "openai" | "custom" | "demo";
  baseUrl: string;
  apiKey: string;
  model: string;
}
