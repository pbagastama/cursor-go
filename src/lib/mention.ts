import type { FileIndexEntry } from "./fileSystem";
import type { OpenTab } from "./types";

export interface MentionCandidate {
  id: string;
  name: string;
  path: string;
  kind: "file" | "tab" | "directory";
}

export function tabsToCandidates(tabs: OpenTab[]): MentionCandidate[] {
  return tabs.map((t) => ({
    id: `tab:${t.id}`,
    name: t.name,
    path: t.path,
    kind: "tab" as const,
  }));
}

export function indexToCandidates(
  index: FileIndexEntry[]
): MentionCandidate[] {
  return index.map((e) => ({
    id: `${e.kind}:${e.path}`,
    name: e.name,
    path: e.path,
    kind: e.kind === "directory" ? ("directory" as const) : ("file" as const),
  }));
}

/**
 * Merge open tabs + recursive workspace index.
 * Tabs win on path collision. Directories are included so users can @folder.
 */
export function buildMentionList(
  tabs: OpenTab[],
  fileIndex: FileIndexEntry[]
): MentionCandidate[] {
  const map = new Map<string, MentionCandidate>();
  for (const c of indexToCandidates(fileIndex)) map.set(c.path, c);
  for (const c of tabsToCandidates(tabs)) map.set(c.path, c);
  return Array.from(map.values());
}

/**
 * Ranked filter for @query.
 * Matches name, path segments, and folder prefixes (e.g. @src/comp → src/components/…).
 */
export function filterMentions(
  list: MentionCandidate[],
  query: string,
  limit = 20
): MentionCandidate[] {
  const q = query.trim().toLowerCase().replace(/\\/g, "/");

  if (!q) {
    // Prefer recently-useful: tabs first, then shallow files, then dirs
    const tabs = list.filter((c) => c.kind === "tab");
    const files = list.filter((c) => c.kind === "file");
    const dirs = list.filter((c) => c.kind === "directory");
    const shallow = (c: MentionCandidate) =>
      (c.path.match(/\//g) || []).length;
    files.sort((a, b) => shallow(a) - shallow(b) || a.name.localeCompare(b.name));
    dirs.sort((a, b) => shallow(a) - shallow(b) || a.name.localeCompare(b.name));
    return [...tabs, ...files, ...dirs].slice(0, limit);
  }

  const scored = list
    .map((c) => {
      const name = c.name.toLowerCase();
      const path = c.path.toLowerCase();
      let score = 0;

      if (name === q) score = 1000;
      else if (name.startsWith(q)) score = 800;
      else if (path === q) score = 750;
      else if (path.startsWith(q)) score = 700;
      else if (path.includes("/" + q)) score = 600;
      else if (name.includes(q)) score = 500;
      else if (path.includes(q)) score = 400;
      else return null;

      // Prefer files slightly over directories when scores tie
      if (c.kind === "tab") score += 30;
      else if (c.kind === "file") score += 10;

      // Prefer shallower paths
      score -= (c.path.match(/\//g) || []).length * 2;

      return { c, score };
    })
    .filter((x): x is { c: MentionCandidate; score: number } => x !== null)
    .sort((a, b) => b.score - a.score || a.c.path.localeCompare(b.c.path));

  return scored.slice(0, limit).map((x) => x.c);
}

/** Detect @query just before the caret. Allows path chars: / . - _ */
export function detectMentionAt(
  text: string,
  caret: number
): { start: number; query: string } | null {
  const before = text.slice(0, caret);
  // Allow nested paths in the query: @src/components/Button
  const m = before.match(/(^|[\s([{])@([A-Za-z0-9_./\\-]*)$/);
  if (!m) return null;
  const start = before.length - m[2].length - 1;
  return { start, query: m[2].replace(/\\/g, "/") };
}
