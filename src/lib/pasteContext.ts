import type { OpenTab } from "./types";

/** Normalize code for fuzzy matching (whitespace / line endings). */
export function normalizeCode(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, "  ")
    .replace(/[ \t]+$/gm, "")
    .trim();
}

export function looksLikeCode(text: string): boolean {
  if (text.length < 20) return false;
  const lines = text.split("\n");
  if (lines.length < 2 && text.length < 80) return false;

  // HTML / markup
  if (/<!DOCTYPE\s+html/i.test(text) || /<html[\s>]/i.test(text)) return true;
  if (/<(div|section|form|head|body|script|style|template)\b/i.test(text))
    return true;

  // Java / Spring Boot (before Go — both use "package")
  if (
    /\bpackage\s+[\w.]+;/.test(text) ||
    /\bimport\s+[\w.]+(\.\*)?;/.test(text) ||
    /\b(public|private|protected)\s+(class|interface|enum|record)\b/.test(text) ||
    /@SpringBootApplication|@RestController|@Controller|@Service|@Repository|@Entity|@Autowired|@GetMapping|@PostMapping|@RequestMapping/.test(
      text
    ) ||
    (/<project[\s>]/.test(text) && /maven|springframework/i.test(text)) ||
    /spring\.application\.name\s*=/.test(text) ||
    /spring:\s*\n\s*application:/.test(text)
  ) {
    return true;
  }

  // Go (package name is a single identifier, no dots/semicolon)
  if (
    /^package\s+\w+\s*$/m.test(text) ||
    /^module\s+\S+/m.test(text) ||
    /\bfunc\s+(\(\w+\s+\*?[\w.]+\)\s+)?\w+\s*\(/.test(text)
  ) {
    return true;
  }

  // Rust
  if (
    /\b(fn|struct|enum|impl|trait|mod|use|pub)\s+/.test(text) ||
    /\blet\s+mut\b/.test(text) ||
    /\[package\]/.test(text) ||
    /edition\s*=\s*"\d{4}"/.test(text)
  ) {
    return true;
  }

  const signals =
    /^(import |export |const |let |var |function |class |def |package |#include)/m.test(
      text
    ) ||
    /```/.test(text) ||
    (text.includes("{") && text.includes("}") && /[;=()]/.test(text));
  return signals || lines.length >= 3;
}

export interface MatchedTab {
  tab: OpenTab;
  score: number;
  /** true if pasted text is (almost) the whole file */
  isFullFile: boolean;
}

/**
 * Match pasted text against open editor tabs.
 * Prefers exact / substring match on the active tab, then other tabs.
 */
export function matchPasteToTabs(
  pasted: string,
  tabs: OpenTab[],
  activePath?: string | null
): MatchedTab | null {
  const needle = normalizeCode(pasted);
  if (!needle || tabs.length === 0) return null;

  let best: MatchedTab | null = null;

  for (const tab of tabs) {
    const hay = normalizeCode(tab.content);
    if (!hay) continue;

    let score = 0;
    let isFullFile = false;

    if (hay === needle) {
      score = 1000;
      isFullFile = true;
    } else if (hay.includes(needle)) {
      // Selection from this file
      score = 500 + Math.min(200, needle.length / 10);
      isFullFile = needle.length / hay.length > 0.85;
    } else if (needle.includes(hay) && hay.length > 40) {
      // Pasted more than file (unlikely) — still a hit
      score = 400;
      isFullFile = true;
    } else {
      // Prefix / first-N-lines overlap
      const nLines = needle.split("\n").slice(0, 12).join("\n");
      const hLines = hay.split("\n").slice(0, 12).join("\n");
      if (nLines.length > 30 && (hay.includes(nLines) || needle.includes(hLines))) {
        score = 300;
      } else {
        // Token overlap on distinctive lines
        const sample = needle
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => l.length > 20)
          .slice(0, 8);
        const hits = sample.filter((l) => hay.includes(l)).length;
        if (hits >= 2) score = 150 + hits * 20;
      }
    }

    if (score === 0) continue;

    // Boost active tab so paste-from-current-file wins ties
    if (activePath && tab.path === activePath) score += 80;

    if (!best || score > best.score) {
      best = { tab, score, isFullFile };
    }
  }

  // Require a minimum confidence
  if (!best || best.score < 150) return null;
  return best;
}

/**
 * Heuristic filename when no open tab matches.
 * Order matters: HTML before Vue (DOCTYPE/html beats <script>).
 */
export function guessFilenameFromCode(text: string): string {
  const first = text.split("\n")[0] ?? "";
  const named =
    first.match(/(?:file|filepath|path)\s*[:=]\s*([^\s*]+)/i) ||
    first.match(/\/\/\s*([A-Za-z0-9_./-]+\.[a-z0-9]+)/i) ||
    first.match(/<!--\s*([A-Za-z0-9_./-]+\.[a-z0-9]+)\s*-->/i);
  if (named) return named[1].split("/").pop()!;

  // HTML first (your bug: index.html was mislabeled Component.vue)
  if (
    /<!DOCTYPE\s+html/i.test(text) ||
    /<html[\s>]/i.test(text) ||
    (/<\/?(head|body|meta|link|title)\b/i.test(text) &&
      !/<template[\s>]/i.test(text))
  ) {
    return "index.html";
  }

  // Vue SFC needs <template> (not just any <script>)
  if (/<template[\s>]/i.test(text) && /<script[\s>]/i.test(text)) {
    return "Component.vue";
  }

  if (
    /from ['"]react['"]|useState|useEffect|React\./.test(text) ||
    /:\s*JSX\.|React\.FC/.test(text)
  ) {
    return /:\s*\w+|interface |type /.test(text)
      ? "Component.tsx"
      : "Component.jsx";
  }

  if (/def |^\s*import .+ from |print\(/m.test(text) && !/function\s*\(/.test(text)) {
    return "script.py";
  }

  // Java / Spring Boot first (before Go — both use "package")
  if (
    /<project[\s>]/.test(text) &&
    (/maven/i.test(text) || /spring-boot/i.test(text))
  ) {
    return "pom.xml";
  }
  if (
    /plugins\s*\{/.test(text) &&
    (/id\s*['"]org\.springframework\.boot['"]/.test(text) ||
      /java\s*\{/.test(text) ||
      /dependencies\s*\{/.test(text))
  ) {
    return "build.gradle";
  }
  if (
    /spring\.application\.name\s*=/.test(text) ||
    /server\.port\s*=/.test(text)
  ) {
    return "application.properties";
  }
  if (
    /^\s*spring:\s*$/m.test(text) ||
    /spring:\s*\n\s+application:/.test(text)
  ) {
    return "application.yml";
  }
  if (
    /\bpackage\s+[\w.]+;/.test(text) ||
    /\b(public|private|protected)\s+(class|interface|enum|record)\b/.test(text) ||
    /@SpringBootApplication|@RestController|@Service|@Repository|@Entity|@GetMapping|@PostMapping/.test(
      text
    )
  ) {
    if (/@SpringBootApplication/.test(text)) return "Application.java";
    if (/@RestController|@Controller/.test(text)) return "Controller.java";
    if (/@Service/.test(text)) return "Service.java";
    if (/@Repository|@Entity/.test(text)) return "Entity.java";
    return "Main.java";
  }

  // Go — go.mod / package (single word, no dots) / func
  if (/^module\s+\S+/m.test(text) || /^go\s+\d+\.\d+/m.test(text)) {
    return "go.mod";
  }
  if (
    /^package\s+\w+\s*$/m.test(text) ||
    /\bfunc\s+(\(\w+\s+\*?[\w.]+\)\s+)?\w+\s*\(/.test(text) ||
    /\bfmt\.|goroutine|chan\s+|:=/.test(text)
  ) {
    return "main.go";
  }

  // Rust — Cargo.toml / source
  if (
    /\[package\]/.test(text) ||
    (/name\s*=/.test(text) && /edition\s*=/.test(text)) ||
    /\[dependencies\]/.test(text)
  ) {
    return "Cargo.toml";
  }
  if (
    /\b(fn|struct|enum|impl|trait|mod)\s+\w+/.test(text) ||
    /\blet\s+mut\b|\bpub\s+(fn|struct|use)\b|\buse\s+[\w:]+::/.test(text) ||
    /#\[derive\(/.test(text)
  ) {
    return "main.rs";
  }

  if (/^\s*\{[\s\S]*\}\s*$/.test(text.trim()) && /"[^"]+"\s*:/.test(text)) {
    return "data.json";
  }
  if (/@tailwind|@apply/.test(text)) return "styles.css";
  if (/\.[a-z-]+\s*\{/.test(text) && !/<[a-z]/i.test(text)) return "styles.css";
  if (/^#{1,6}\s|^\*\*|\[.+\]\(.+\)/m.test(text)) return "README.md";

  return "snippet.txt";
}
