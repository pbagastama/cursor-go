import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number, decimals = 1) {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

/** Guess a Monaco language id from a file name. */
export function languageFromFilename(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    mjs: "javascript",
    cjs: "javascript",
    json: "json",
    html: "html",
    htm: "html",
    css: "css",
    scss: "scss",
    less: "less",
    md: "markdown",
    mdx: "markdown",
    py: "python",
    go: "go",
    rs: "rust",
    java: "java",
    c: "c",
    h: "c",
    cpp: "cpp",
    hpp: "cpp",
    cc: "cpp",
    cs: "csharp",
    php: "php",
    rb: "ruby",
    sh: "shell",
    bash: "shell",
    zsh: "shell",
    yml: "yaml",
    yaml: "yaml",
    toml: "ini",
    ini: "ini",
    sql: "sql",
    xml: "xml",
    svg: "xml",
    vue: "html",
    svelte: "html",
    dockerfile: "dockerfile",
    graphql: "graphql",
    gql: "graphql",
  };
  if (name.toLowerCase() === "dockerfile") return "dockerfile";
  return map[ext] ?? "plaintext";
}

export function iconColorFromFilename(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    ts: "#3178c6",
    tsx: "#3178c6",
    js: "#f7df1e",
    jsx: "#f7df1e",
    json: "#cbcb41",
    html: "#e34c26",
    css: "#563d7c",
    scss: "#c6538c",
    md: "#83a9ff",
    py: "#3572A5",
    go: "#00ADD8",
    rs: "#dea584",
    java: "#b07219",
    php: "#4F5D95",
    rb: "#701516",
    vue: "#41b883",
    svg: "#ffb13b",
    yml: "#cb171e",
    yaml: "#cb171e",
  };
  return map[ext] ?? "#8b8ba7";
}

export function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
