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

/** Guess a Monaco language id from a file name (Go, Rust, Java/Spring Boot, …). */
export function languageFromFilename(name: string): string {
  const lower = name.toLowerCase();
  const base = lower.split("/").pop() ?? lower;

  // Go
  if (
    base === "go.mod" ||
    base === "go.sum" ||
    base === "gopkg.lock" ||
    base.endsWith(".go")
  ) {
    return "go";
  }

  // Rust
  if (
    base === "cargo.toml" ||
    base === "cargo.lock" ||
    base === "rust-toolchain" ||
    base === "rust-toolchain.toml" ||
    base.endsWith(".rs")
  ) {
    return base.endsWith(".rs") ? "rust" : "ini";
  }

  // Java / Spring Boot project files
  if (base.endsWith(".java") || base.endsWith(".jsp") || base.endsWith(".jspx")) {
    return "java";
  }
  if (
    base === "pom.xml" ||
    base === "build.gradle" ||
    base === "build.gradle.kts" ||
    base === "settings.gradle" ||
    base === "settings.gradle.kts" ||
    base === "gradle.properties" ||
    base.endsWith(".gradle") ||
    base.endsWith(".gradle.kts")
  ) {
    // Maven POM → xml; Gradle Kotlin DSL → kotlin-ish plaintext; Groovy gradle → java-ish
    if (base.endsWith(".xml") || base === "pom.xml") return "xml";
    if (base.endsWith(".kts")) return "kotlin";
    if (base.endsWith(".properties") || base === "gradle.properties") return "ini";
    return "java"; // build.gradle (Groovy) — java highlighter is closest built-in
  }
  if (
    base === "application.properties" ||
    base === "bootstrap.properties" ||
    (base.startsWith("application-") && base.endsWith(".properties"))
  ) {
    return "ini";
  }
  if (
    base === "application.yml" ||
    base === "application.yaml" ||
    base === "bootstrap.yml" ||
    base === "bootstrap.yaml" ||
    (base.startsWith("application-") &&
      (base.endsWith(".yml") || base.endsWith(".yaml")))
  ) {
    return "yaml";
  }
  if (base === "mvnw" || base === "mvnw.cmd" || base === "gradlew" || base === "gradlew.bat") {
    return "shell";
  }

  if (base === "dockerfile" || base.startsWith("dockerfile.")) return "dockerfile";
  if (base === "makefile" || base === "gnumakefile") return "shell";

  const ext = base.includes(".") ? base.split(".").pop()! : "";
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
    mod: "go",
    sum: "go",
    rs: "rust",
    java: "java",
    jsp: "html",
    kt: "kotlin",
    kts: "kotlin",
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
    properties: "ini",
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
    proto: "plaintext",
  };
  return map[ext] ?? "plaintext";
}

/** Preferred tab size for a language. */
export function tabSizeForLanguage(language: string): number {
  if (
    language === "go" ||
    language === "rust" ||
    language === "python" ||
    language === "java" ||
    language === "kotlin"
  ) {
    return 4;
  }
  return 2;
}

export function iconColorFromFilename(name: string): string {
  const lower = name.toLowerCase();
  const base = lower.split("/").pop() ?? lower;
  if (base === "go.mod" || base === "go.sum" || base.endsWith(".go")) {
    return "#00ADD8";
  }
  if (
    base === "cargo.toml" ||
    base === "cargo.lock" ||
    base.endsWith(".rs")
  ) {
    return "#dea584";
  }
  // Java / Spring Boot
  if (base.endsWith(".java") || base === "pom.xml") return "#b07219";
  if (
    base.startsWith("application") &&
    (base.endsWith(".yml") ||
      base.endsWith(".yaml") ||
      base.endsWith(".properties"))
  ) {
    return "#6db33f"; // Spring green
  }
  if (
    base === "build.gradle" ||
    base === "build.gradle.kts" ||
    base.endsWith(".gradle") ||
    base.endsWith(".gradle.kts")
  ) {
    return "#02303a";
  }

  const ext = base.includes(".") ? base.split(".").pop()! : "";
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
    mod: "#00ADD8",
    rs: "#dea584",
    toml: "#9c4221",
    java: "#b07219",
    kt: "#A97BFF",
    kts: "#A97BFF",
    xml: "#e37933",
    properties: "#6db33f",
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
