import { useEffect, useRef } from "react";
import Editor, { type Monaco, type OnMount } from "@monaco-editor/react";
import type { OpenTab } from "@/lib/types";
import { tabSizeForLanguage } from "@/lib/utils";

interface Props {
  tab: OpenTab;
  onChange: (value: string) => void;
  onSave: () => void;
}

/** Languages Monaco ships with that we care about (Go / Rust / Java / Spring, …). */
const BUILTIN_LANGS = new Set([
  "go",
  "rust",
  "java",
  "kotlin",
  "xml",
  "yaml",
  "typescript",
  "javascript",
  "python",
  "json",
  "html",
  "css",
  "markdown",
  "shell",
  "sql",
  "csharp",
  "cpp",
  "c",
  "php",
  "ruby",
  "ini",
  "dockerfile",
  "plaintext",
]);

function defineTheme(monaco: Monaco) {
  monaco.editor.defineTheme("cursorgo-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "6b7280", fontStyle: "italic" },
      { token: "keyword", foreground: "c084fc" },
      { token: "string", foreground: "86efac" },
      { token: "number", foreground: "fca5a5" },
      { token: "type", foreground: "7dd3fc" },
      { token: "function", foreground: "93c5fd" },
      // Go / Rust-ish tokens (Monaco grammars reuse these)
      { token: "identifier", foreground: "e5e7eb" },
      { token: "delimiter", foreground: "9ca3af" },
    ],
    colors: {
      "editor.background": "#0f0f14",
      "editor.foreground": "#e5e7eb",
      "editorLineNumber.foreground": "#3f3f52",
      "editorLineNumber.activeForeground": "#a1a1c0",
      "editor.selectionBackground": "#6366f133",
      "editor.lineHighlightBackground": "#ffffff08",
      "editorCursor.foreground": "#a855f7",
      "editorIndentGuide.background1": "#ffffff10",
      "editorGutter.background": "#0f0f14",
    },
  });
}

function configureLanguages(monaco: Monaco) {
  // Go: tabs are conventional; Monaco go language uses spaces by default in UI —
  // we set insertSpaces false for go via editor options per-tab.
  try {
    monaco.languages.setLanguageConfiguration("go", {
      comments: { lineComment: "//", blockComment: ["/*", "*/"] },
      brackets: [
        ["{", "}"],
        ["[", "]"],
        ["(", ")"],
      ],
      autoClosingPairs: [
        { open: "{", close: "}" },
        { open: "[", close: "]" },
        { open: "(", close: ")" },
        { open: "`", close: "`" },
        { open: '"', close: '"' },
        { open: "'", close: "'" },
      ],
      surroundingPairs: [
        { open: "{", close: "}" },
        { open: "[", close: "]" },
        { open: "(", close: ")" },
        { open: "`", close: "`" },
        { open: '"', close: '"' },
        { open: "'", close: "'" },
      ],
    });
  } catch {
    // language may already be configured
  }

  try {
    monaco.languages.setLanguageConfiguration("rust", {
      comments: { lineComment: "//", blockComment: ["/*", "*/"] },
      brackets: [
        ["{", "}"],
        ["[", "]"],
        ["(", ")"],
      ],
      autoClosingPairs: [
        { open: "{", close: "}" },
        { open: "[", close: "]" },
        { open: "(", close: ")" },
        { open: '"', close: '"' },
        { open: "'", close: "'" },
      ],
      surroundingPairs: [
        { open: "{", close: "}" },
        { open: "[", close: "]" },
        { open: "(", close: ")" },
        { open: '"', close: '"' },
        { open: "'", close: "'" },
      ],
    });
  } catch {
    // ignore
  }

  // Java / Spring Boot
  try {
    monaco.languages.setLanguageConfiguration("java", {
      comments: { lineComment: "//", blockComment: ["/*", "*/"] },
      brackets: [
        ["{", "}"],
        ["[", "]"],
        ["(", ")"],
      ],
      autoClosingPairs: [
        { open: "{", close: "}" },
        { open: "[", close: "]" },
        { open: "(", close: ")" },
        { open: '"', close: '"' },
        { open: "'", close: "'" },
      ],
      surroundingPairs: [
        { open: "{", close: "}" },
        { open: "[", close: "]" },
        { open: "(", close: ")" },
        { open: '"', close: '"' },
        { open: "'", close: "'" },
      ],
      indentationRules: {
        increaseIndentPattern:
          /^((?!\/\/).)*(\{[^}"'`]*|\([^)"'`]*|\[[^\]"'`]*)$/,
        decreaseIndentPattern: /^((?!.*?\/\*).*\*\/)?\s*[\}\]].*$/,
      },
    });
  } catch {
    // ignore
  }
}

function resolveLanguage(lang: string): string {
  if (BUILTIN_LANGS.has(lang)) return lang;
  return "plaintext";
}

export function MonacoEditor({ tab, onChange, onSave }: Props) {
  const saveRef = useRef(onSave);
  saveRef.current = onSave;
  const language = resolveLanguage(tab.language);
  const tabSize = tabSizeForLanguage(language);
  // Go convention: real tabs; Java/Rust/Python: spaces
  const insertSpaces = language !== "go";

  const handleMount: OnMount = (editor, monaco) => {
    defineTheme(monaco);
    configureLanguages(monaco);
    monaco.editor.setTheme("cursorgo-dark");
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      saveRef.current();
    });
  };

  useEffect(() => {
    // ensure body doesn't scroll oddly
  }, []);

  return (
    <Editor
      key={`${tab.id}:${language}`}
      height="100%"
      theme="cursorgo-dark"
      language={language}
      value={tab.content}
      onChange={(v) => onChange(v ?? "")}
      onMount={handleMount}
      path={tab.path}
      options={{
        fontFamily: "JetBrains Mono, Fira Code, monospace",
        fontSize: 13.5,
        fontLigatures: true,
        lineHeight: 21,
        minimap: { enabled: true, scale: 0.8 },
        smoothScrolling: true,
        cursorBlinking: "smooth",
        cursorSmoothCaretAnimation: "on",
        padding: { top: 14 },
        scrollBeyondLastLine: false,
        renderLineHighlight: "all",
        roundedSelection: true,
        automaticLayout: true,
        tabSize,
        insertSpaces,
        detectIndentation: false,
        bracketPairColorization: { enabled: true },
        guides: { bracketPairs: true, indentation: true },
        scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
        // Helpful for Go / Rust / Java long lines & annotations
        wordWrap:
          language === "go" ||
          language === "rust" ||
          language === "java" ||
          language === "xml"
            ? "on"
            : "off",
      }}
    />
  );
}
