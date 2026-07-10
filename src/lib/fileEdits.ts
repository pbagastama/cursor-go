/**
 * Parse AI responses for file-edit code fences (Cursor-style) and apply them.
 *
 * Supported fence headers:
 *   ```path/to/file.ts
 *   ```typescript path/to/file.ts
 *   ```ts:path/to/file.ts
 *   ```12:40:src/App.tsx          (line range — treated as full-file replace of that path)
 *   ```filepath:src/App.tsx
 */

export interface FileEdit {
  path: string;
  content: string;
  language?: string;
  startLine?: number;
  endLine?: number;
}

const FENCE_RE =
  /```([^\n`]*)\n([\s\S]*?)```/g;

/** Guess whether a fence info-string looks like a file path. */
function looksLikePath(s: string): boolean {
  if (!s) return false;
  if (s.includes("/") || s.includes("\\")) return true;
  if (/\.[a-z0-9]{1,8}$/i.test(s)) return true;
  return false;
}

function parseFenceInfo(info: string): {
  path?: string;
  language?: string;
  startLine?: number;
  endLine?: number;
} {
  const raw = info.trim();
  if (!raw) return {};

  // Cursor citation style: startLine:endLine:filepath
  const cite = raw.match(/^(\d+):(\d+):(.+)$/);
  if (cite) {
    return {
      startLine: Number(cite[1]),
      endLine: Number(cite[2]),
      path: cite[3].trim(),
    };
  }

  // filepath:path/to/file.ts
  const fp = raw.match(/^filepath:\s*(.+)$/i);
  if (fp) return { path: fp[1].trim() };

  // file:path/to/file.ts
  const file = raw.match(/^file:\s*(.+)$/i);
  if (file) return { path: file[1].trim() };

  // lang:path  or  lang path
  const colon = raw.match(/^([a-z0-9+#]+)\s*:\s*(.+)$/i);
  if (colon && looksLikePath(colon[2])) {
    return { language: colon[1], path: colon[2].trim() };
  }

  const space = raw.match(/^([a-z0-9+#]+)\s+(.+)$/i);
  if (space && looksLikePath(space[2])) {
    return { language: space[1], path: space[2].trim() };
  }

  // Bare path as the whole info string
  if (looksLikePath(raw)) return { path: raw };

  return { language: raw };
}

export function parseFileEdits(markdown: string): FileEdit[] {
  const edits: FileEdit[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(FENCE_RE.source, "g");
  while ((m = re.exec(markdown)) !== null) {
    const info = parseFenceInfo(m[1] || "");
    if (!info.path) continue;
    edits.push({
      path: info.path.replace(/\\/g, "/"),
      content: m[2].replace(/\n$/, ""),
      language: info.language,
      startLine: info.startLine,
      endLine: info.endLine,
    });
  }
  return edits;
}

/** Apply a ranged edit into existing file content (1-indexed, inclusive). */
export function applyRangedEdit(
  original: string,
  startLine: number,
  endLine: number,
  replacement: string
): string {
  const lines = original.split("\n");
  const start = Math.max(1, startLine) - 1;
  const end = Math.min(lines.length, endLine);
  return [
    ...lines.slice(0, start),
    ...replacement.split("\n"),
    ...lines.slice(end),
  ].join("\n");
}

/** Match an edit path against open tabs (exact, suffix, or basename). */
export function resolveEditTarget<T extends { path: string; name: string }>(
  editPath: string,
  tabs: T[]
): T | null {
  const normalized = editPath.replace(/\\/g, "/");
  const exact = tabs.find((t) => t.path === normalized);
  if (exact) return exact;
  const suffix = tabs.find(
    (t) => t.path.endsWith("/" + normalized) || t.path.endsWith(normalized)
  );
  if (suffix) return suffix;
  const base = normalized.split("/").pop()!;
  return tabs.find((t) => t.name === base || t.path.endsWith("/" + base)) ?? null;
}
