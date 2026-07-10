import { useState } from "react";
import { Check, Copy, FilePenLine } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FileEdit } from "@/lib/fileEdits";

interface Segment {
  type: "code" | "text";
  content: string;
  lang?: string;
  /** Parsed file path from fence header, if any. */
  path?: string;
  startLine?: number;
  endLine?: number;
}

function looksLikePath(s: string): boolean {
  if (!s) return false;
  if (s.includes("/") || s.includes("\\")) return true;
  return /\.[a-z0-9]{1,8}$/i.test(s);
}

function parseFenceInfo(info: string): {
  path?: string;
  language?: string;
  startLine?: number;
  endLine?: number;
} {
  const raw = info.trim();
  if (!raw) return {};

  const cite = raw.match(/^(\d+):(\d+):(.+)$/);
  if (cite) {
    return {
      startLine: Number(cite[1]),
      endLine: Number(cite[2]),
      path: cite[3].trim(),
    };
  }
  const fp = raw.match(/^(?:filepath|file):\s*(.+)$/i);
  if (fp) return { path: fp[1].trim() };

  const colon = raw.match(/^([a-z0-9+#]+)\s*:\s*(.+)$/i);
  if (colon && looksLikePath(colon[2])) {
    return { language: colon[1], path: colon[2].trim() };
  }
  const space = raw.match(/^([a-z0-9+#]+)\s+(.+)$/i);
  if (space && looksLikePath(space[2])) {
    return { language: space[1], path: space[2].trim() };
  }
  if (looksLikePath(raw)) return { path: raw };
  return { language: raw };
}

function parse(md: string): Segment[] {
  const segments: Segment[] = [];
  const regex = /```([^\n`]*)\n?([\s\S]*?)```/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(md)) !== null) {
    if (m.index > last) {
      segments.push({ type: "text", content: md.slice(last, m.index) });
    }
    const info = parseFenceInfo(m[1] || "");
    segments.push({
      type: "code",
      lang: info.language || (info.path ? undefined : m[1] || "text"),
      path: info.path,
      startLine: info.startLine,
      endLine: info.endLine,
      content: m[2].replace(/\n$/, ""),
    });
    last = regex.lastIndex;
  }
  if (last < md.length) {
    segments.push({ type: "text", content: md.slice(last) });
  }
  return segments;
}

function renderInline(text: string) {
  const html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[\s(])_([^_]+)_/g, "$1<em>$2</em>")
    .replace(/\n/g, "<br/>");
  return { __html: html };
}

function CodeBlock({
  code,
  lang,
  path,
  startLine,
  endLine,
  onApply,
  streaming,
}: {
  code: string;
  lang?: string;
  path?: string;
  startLine?: number;
  endLine?: number;
  onApply?: (edit: FileEdit) => void;
  streaming?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [applied, setApplied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const label = path
    ? startLine && endLine
      ? `${path}:${startLine}-${endLine}`
      : path
    : lang || "text";

  const handleApply = () => {
    if (!path || !onApply || streaming) return;
    onApply({ path, content: code, language: lang, startLine, endLine });
    setApplied(true);
    setTimeout(() => setApplied(false), 2000);
  };

  return (
    <div className="group relative my-2">
      <div className="flex items-center justify-between gap-2 rounded-t-lg border border-b-0 border-border bg-[#0a0a0f] px-3 py-1.5">
        <span
          className="min-w-0 truncate font-mono text-[11px] tracking-wide text-muted-foreground"
          title={label}
        >
          {label}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          {path && onApply && !streaming && (
            <button
              type="button"
              onClick={handleApply}
              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-primary transition-colors hover:bg-primary/15"
            >
              {applied ? (
                <>
                  <Check className="h-3 w-3 text-emerald-400" /> Applied
                </>
              ) : (
                <>
                  <FilePenLine className="h-3 w-3" /> Apply
                </>
              )}
            </button>
          )}
          <button
            type="button"
            onClick={copy}
            className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-emerald-400" /> Disalin
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" /> Salin
              </>
            )}
          </button>
        </div>
      </div>
      <pre className="!my-0 !rounded-t-none">
        <code>{code}</code>
      </pre>
    </div>
  );
}

interface ChatMarkdownProps {
  content: string;
  className?: string;
  streaming?: boolean;
  onApplyEdit?: (edit: FileEdit) => void;
}

export function ChatMarkdown({
  content,
  className,
  streaming,
  onApplyEdit,
}: ChatMarkdownProps) {
  const segments = parse(content);
  return (
    <div className={cn("chat-prose text-[13.5px]", className)}>
      {segments.map((seg, i) =>
        seg.type === "code" ? (
          <CodeBlock
            key={i}
            code={seg.content}
            lang={seg.lang}
            path={seg.path}
            startLine={seg.startLine}
            endLine={seg.endLine}
            onApply={onApplyEdit}
            streaming={streaming}
          />
        ) : (
          <div key={i} dangerouslySetInnerHTML={renderInline(seg.content)} />
        )
      )}
    </div>
  );
}
