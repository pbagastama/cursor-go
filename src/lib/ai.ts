import type { AiModel, AiSettings, ChatImage, ChatMessage } from "./types";

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
  {
    id: "grok-4.5",
    label: "Grok 4.5",
    description: "Model xAI — cepat, kuat untuk coding & reasoning",
    badge: "New",
  },
  {
    id: "opus-4.8",
    label: "Opus 4.8",
    description: "Claude Opus — reasoning mendalam & refactor kompleks",
    badge: "Powerful",
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

const SYSTEM_PROMPT = `You are CursorGo, an expert AI pair-programmer embedded in a web based code editor (like Cursor).
- Answer in the same language the user writes in (default Bahasa Indonesia).
- Be concise and practical. Prefer runnable code.
- When file context is provided (via @ mentions, pasted snippets, or images), ground your answer in that context.

## Editing files (IMPORTANT — Cursor-style Apply)
When the user asks you to edit, refactor, fix, or change a file, ALWAYS output the FULL updated file content in a fenced code block whose info-string is the file path, for example:

\`\`\`src/components/Button.tsx
// full file content here
\`\`\`

or with a language tag:

\`\`\`tsx src/components/Button.tsx
// full file content here
\`\`\`

For a partial/ranged edit you may use the citation form:

\`\`\`12:40:src/components/Button.tsx
// replacement for lines 12-40
\`\`\`

The editor shows an **Apply** button on these blocks so the user can write the change into the open file. Prefer full-file fences when the change is non-trivial.
Do NOT invent paths that were not in the context unless the user asked to create a new file.
Never rename a file in the fence (e.g. do not turn index.html into Component.vue). Always reuse the Filename / File path from the context block.`;

interface StreamOptions {
  settings: AiSettings;
  messages: ChatMessage[];
  contextFiles?: { path: string; content: string }[];
  images?: ChatImage[];
  signal?: AbortSignal;
  onToken: (delta: string) => void;
}

/**
 * Resolve the model id sent to the provider.
 * - Cursor / custom proxies understand Cursor model ids natively
 *   (auto, composer-2.5, grok-4.5, opus-4.8, …).
 * - Plain OpenAI does not, so map those to a real OpenAI model.
 */
function resolveModel(model: string, provider: AiSettings["provider"]): string {
  if (provider === "openai") {
    if (model === "auto" || model === "composer-2.5" || model === "grok-4.5") {
      return "gpt-4o-mini";
    }
    if (model === "opus-4.8" || model === "claude-sonnet") return "gpt-4o";
  }
  return model;
}

function buildContextBlock(files?: { path: string; content: string }[]): string {
  if (!files || files.length === 0) return "";
  const blocks = files
    .map((f) => {
      const name = f.path.split("/").pop() || f.path;
      return [
        `### File: ${f.path}`,
        `Filename: ${name}`,
        `When editing this file you MUST use the fence path exactly: ${f.path}`,
        "```" + f.path,
        f.content.slice(0, 12000),
        "```",
      ].join("\n");
    })
    .join("\n\n");
  return `\n\nHere is the relevant file context. Use these EXACT paths in Apply fences (do not invent names like Component.vue):\n${blocks}`;
}

function buildImageNote(images?: ChatImage[]): string {
  if (!images || images.length === 0) return "";
  return `\n\n[User attached ${images.length} image(s): ${images
    .map((i) => i.name)
    .join(", ")}. Describe / use them if relevant.]`;
}

/** OpenAI-compatible multimodal content parts. */
function toApiContent(
  text: string,
  images?: ChatImage[]
): string | Array<Record<string, unknown>> {
  if (!images || images.length === 0) return text;
  return [
    { type: "text", text },
    ...images.map((img) => ({
      type: "image_url",
      image_url: { url: img.dataUrl },
    })),
  ];
}

export async function streamChat(opts: StreamOptions): Promise<void> {
  const { settings, messages, contextFiles, images, signal, onToken } = opts;

  // Demo when explicitly selected, or when a key-based provider has no key.
  // The "cursor" provider may run against a backend that holds the key itself
  // (CURSOR_API_KEY env), so it can proceed without a client-side key.
  const needsClientKey =
    settings.provider === "openai" || settings.provider === "custom";
  if (settings.provider === "demo" || (needsClientKey && !settings.apiKey)) {
    return demoStream(messages, contextFiles, images, onToken, signal);
  }

  const apiMessages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...messages.map((m, i) => {
      const isLastUser =
        i === messages.length - 1 && m.role === "user";
      let text = m.content;
      if (isLastUser) {
        text = m.content + buildContextBlock(contextFiles) + buildImageNote(images);
      }
      const msgImages = isLastUser ? images : m.images;
      return {
        role: m.role,
        content: toApiContent(text, msgImages),
      };
    }),
  ];

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (settings.apiKey) headers.Authorization = `Bearer ${settings.apiKey}`;

  const res = await fetch(
    `${settings.baseUrl.replace(/\/$/, "")}/chat/completions`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: resolveModel(settings.model, settings.provider),
        messages: apiMessages,
        stream: true,
        temperature: 0.4,
      }),
      signal,
    }
  );

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
  images: ChatImage[] | undefined,
  onToken: (delta: string) => void,
  signal?: AbortSignal
): Promise<void> {
  const last = [...messages].reverse().find((m) => m.role === "user");
  const q = last?.content ?? "";
  const reply = craftDemoReply(q, contextFiles, images);
  const tokens = reply.match(/\S+\s*|\s+/g) ?? [reply];
  for (const t of tokens) {
    if (signal?.aborted) return;
    onToken(t);
    await new Promise((r) => setTimeout(r, 12 + Math.random() * 22));
  }
}

function craftDemoReply(
  q: string,
  contextFiles?: { path: string; content: string }[],
  images?: ChatImage[]
): string {
  const ctx =
    contextFiles && contextFiles.length
      ? `\n\nSaya melihat kamu melampirkan **${contextFiles.length} file** sebagai konteks (${contextFiles
          .map((f) => `\`${f.path}\``)
          .join(", ")}).`
      : "";
  const imgNote =
    images && images.length
      ? `\n\n📷 ${images.length} gambar terlampir (${images
          .map((i) => i.name)
          .join(", ")}).`
      : "";

  const lower = q.toLowerCase();
  const wantsEdit =
    /(edit|ubah|ganti|refactor|perbaiki|fix|update|tambah|hapus|rename)/.test(
      lower
    );

  if (wantsEdit && contextFiles && contextFiles[0]) {
    const f = contextFiles[0];
    const preview = f.content.slice(0, 400);
    return `Baik — ini contoh **Apply edit** (Demo Mode). Klik tombol **Apply** pada blok di bawah untuk menulis ke \`${f.path}\`:${ctx}${imgNote}\n\n\`\`\`${f.path}\n${preview}\n// ... (demo: isi penuh diganti saat Live)\n\`\`\`\n\nAktifkan provider **Cursor** di Settings untuk edit sungguhan.`;
  }

  if (/hal+o|hai|hello|hi\b/.test(lower)) {
    return `Halo! 👋 Saya **CursorGo Agent**. Fitur mirip Cursor:\n\n- Ketik **@** untuk mention file\n- **Paste kode** → otomatis jadi konteks bernama file\n- **Upload / paste / drag** gambar\n- Blok kode dengan path punya tombol **Apply** untuk edit file${ctx}${imgNote}`;
  }

  return `Kamu bertanya: _"${q.slice(0, 200)}"_.${ctx}${imgNote}\n\nSaat ini **Demo Mode**. Untuk agent Cursor sungguhan:\n\n1. Jalankan backend / deploy Render.\n2. Settings → provider **Cursor**.\n3. Pilih **Auto** / **Composer 2.5**.\n\nTips: ketik \`@\` untuk mention file, atau paste kode agar otomatis jadi konteks.`;
}
