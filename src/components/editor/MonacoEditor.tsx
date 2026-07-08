import { useEffect, useRef } from "react";
import Editor, { type Monaco, type OnMount } from "@monaco-editor/react";
import type { OpenTab } from "@/lib/types";

interface Props {
  tab: OpenTab;
  onChange: (value: string) => void;
  onSave: () => void;
}

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

export function MonacoEditor({ tab, onChange, onSave }: Props) {
  const saveRef = useRef(onSave);
  saveRef.current = onSave;

  const handleMount: OnMount = (editor, monaco) => {
    defineTheme(monaco);
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
      key={tab.id}
      height="100%"
      theme="cursorgo-dark"
      language={tab.language}
      value={tab.content}
      onChange={(v) => onChange(v ?? "")}
      onMount={handleMount}
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
        tabSize: 2,
        bracketPairColorization: { enabled: true },
        guides: { bracketPairs: true, indentation: true },
        scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
      }}
    />
  );
}
