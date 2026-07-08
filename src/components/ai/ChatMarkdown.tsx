import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

interface Segment {
  type: "code" | "text";
  content: string;
  lang?: string;
}

function parse(md: string): Segment[] {
  const segments: Segment[] = [];
  const regex = /```(\w+)?\n?([\s\S]*?)```/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(md)) !== null) {
    if (m.index > last) {
      segments.push({ type: "text", content: md.slice(last, m.index) });
    }
    segments.push({ type: "code", lang: m[1] || "text", content: m[2].replace(/\n$/, "") });
    last = regex.lastIndex;
  }
  if (last < md.length) {
    segments.push({ type: "text", content: md.slice(last) });
  }
  return segments;
}

function renderInline(text: string) {
  // Escape then apply bold, inline code, italics.
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

function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="group relative my-2">
      <div className="flex items-center justify-between rounded-t-lg border border-b-0 border-border bg-[#0a0a0f] px-3 py-1.5">
        <span className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
          {lang}
        </span>
        <button
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
      <pre className="!my-0 !rounded-t-none">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export function ChatMarkdown({ content, className }: { content: string; className?: string }) {
  const segments = parse(content);
  return (
    <div className={cn("chat-prose text-[13.5px]", className)}>
      {segments.map((seg, i) =>
        seg.type === "code" ? (
          <CodeBlock key={i} code={seg.content} lang={seg.lang} />
        ) : (
          <div key={i} dangerouslySetInnerHTML={renderInline(seg.content)} />
        )
      )}
    </div>
  );
}
