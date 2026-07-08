import type { AiModel, AiSettings, ChatMessage } from "./types";

export const AI_MODELS: AiModel[] = [
  {
    id: "auto",
    label: "Auto",
    description: "Cursor memilih model terbaik otomatis tiap permintaan",
    badge: "Recommended",
  },
  {
    id: "composer-2.5",
    label: "Composer 2.5",
    description: "Agent coding cepat & hemat dari Cursor",
    badge: "Default",
  },
];

/**
 * Backend proxy that bridges the browser to the Cursor SDK.
 * Override at build time with VITE_CURSOR_PROXY_URL (e.g. on Netlify) if the
 * backend runs somewhere other than the default localhost:8787.
 */
export const CURSOR_PROXY_URL =
  (import.meta.env.VITE_CURSOR_PROXY_URL as string | undefined) ||
  "http://localhost:8787/v1";

export const DEFAULT_SETTINGS: AiSettings = {
  provider: "demo",
  baseUrl: CURSOR_PROXY_URL,
  apiKey: "",
  model: "composer-2.5",
};

const SYSTEM_PROMPT = `You are CursorGo, an expert AI pair-programmer embedded in a web based code editor.
- Answer in the same language the user writes in (default Bahasa Indonesia).
- Be concise and practical. Prefer runnable code.
- When you show code, use fenced code blocks with a language tag.
- If file context is provided, use it to give precise, grounded answers.`;

interface StreamOptions {
  settings: AiSettings;
  messages: ChatMessage[];
  contextFiles?: { path: string; content: string }[];
  signal?: AbortSignal;
  onToken: (delta: string) => void;
}

/**
 * Resolve the model id sent to the provider.
 * - Cursor / custom proxies understand "auto" & "composer-2.5" natively.
 * - Plain OpenAI does not, so map those to a real OpenAI model.
 */
function resolveModel(model: string, provider: AiSettings["provider"]): string {
  if (provider === "openai") {
    if (model === "auto" || model === "composer-2.5") return "gpt-4o-mini";
    if (model === "claude-sonnet") return "gpt-4o";
  }
  return model;
}

function buildContextBlock(files?: { path: string; content: string }[]): string {
  if (!files || files.length === 0) return "";
  const blocks = files
    .map(
      (f) =>
        `File: ${f.path}\n\`\`\`\n${f.content.slice(0, 6000)}\n\`\`\``
    )
    .join("\n\n");
  return `\n\nHere is the relevant file context:\n${blocks}`;
}

export async function streamChat(opts: StreamOptions): Promise<void> {
  const { settings, messages, contextFiles, signal, onToken } = opts;

  if (settings.provider === "demo" || !settings.apiKey) {
    return demoStream(messages, contextFiles, onToken, signal);
  }

  const apiMessages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...messages.map((m, i) => {
      // Attach context to the last user message.
      if (i === messages.length - 1 && m.role === "user") {
        return { role: m.role, content: m.content + buildContextBlock(contextFiles) };
      }
      return { role: m.role, content: m.content };
    }),
  ];

  const res = await fetch(`${settings.baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      model: resolveModel(settings.model, settings.provider),
      messages: apiMessages,
      stream: true,
      temperature: 0.4,
    }),
    signal,
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(`API error ${res.status}: ${text.slice(0, 200)}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      if (data === "[DONE]") return;
      try {
        const json = JSON.parse(data);
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) onToken(delta);
      } catch {
        // ignore partial json
      }
    }
  }
}

/** A lightweight offline "assistant" so the editor is fully usable without an API key. */
async function demoStream(
  messages: ChatMessage[],
  contextFiles: { path: string; content: string }[] | undefined,
  onToken: (delta: string) => void,
  signal?: AbortSignal
): Promise<void> {
  const last = [...messages].reverse().find((m) => m.role === "user");
  const q = last?.content ?? "";
  const reply = craftDemoReply(q, contextFiles);
  const tokens = reply.match(/\S+\s*|\s+/g) ?? [reply];
  for (const t of tokens) {
    if (signal?.aborted) return;
    onToken(t);
    await new Promise((r) => setTimeout(r, 12 + Math.random() * 22));
  }
}

function craftDemoReply(
  q: string,
  contextFiles?: { path: string; content: string }[]
): string {
  const ctx =
    contextFiles && contextFiles.length
      ? `\n\nSaya melihat kamu melampirkan **${contextFiles.length} file** sebagai konteks (${contextFiles
          .map((f) => `\`${f.path}\``)
          .join(", ")}). Saat API key sudah diisi, saya akan menganalisis isinya secara penuh.`
      : "";

  const lower = q.toLowerCase();

  if (/hal+o|hai|hello|hi\b/.test(lower)) {
    return `Halo! 👋 Saya **CursorGo Agent**. Saya bisa membantu menulis, menjelaskan, dan me-refactor kode langsung di editor ini.${ctx}\n\nSaat ini saya berjalan dalam **Demo Mode**. Untuk jawaban AI sungguhan, buka **Settings** (ikon gear) dan masukkan API key OpenAI-compatible kamu.`;
  }

  if (/(react|component|komponen)/.test(lower)) {
    return `Tentu! Berikut contoh komponen React + TypeScript sederhana:${ctx}\n\n\`\`\`tsx\nimport { useState } from "react";\n\nexport function Counter() {\n  const [count, setCount] = useState(0);\n  return (\n    <button onClick={() => setCount((c) => c + 1)}>\n      Clicked {count} times\n    </button>\n  );\n}\n\`\`\`\n\nIni **Demo Mode** — isi API key di Settings untuk jawaban kontekstual penuh.`;
  }

  return `Kamu bertanya: _"${q.slice(0, 200)}"_.${ctx}\n\nSaat ini saya berjalan dalam **Demo Mode**, jadi jawaban ini bersifat contoh. Untuk menghubungkan **Cursor Agent** sungguhan:\n\n1. Jalankan backend: \`npm run server\` (proxy Cursor SDK di port 8787).\n2. Klik ikon **Settings** (⚙️) di panel AI, pilih provider **Cursor**.\n3. Tempel **Cursor API Key** dari cursor.com/dashboard/integrations.\n4. Pilih model **Auto** atau **Composer 2.5**, lalu Simpan.\n\nSetelah itu semua chat di-stream langsung dari **Cursor** (bukan OpenAI). 🚀`;
}
