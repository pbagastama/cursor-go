import express from "express";
import cors from "cors";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Agent, Cursor, CursorAgentError } from "@cursor/sdk";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 8787;

// Empty scratch workspace so the Cursor agent has a safe cwd for local runs.
const SCRATCH_DIR = path.join(__dirname, ".scratch");
fs.mkdirSync(SCRATCH_DIR, { recursive: true });

// Restrict CORS to specific origins in production via ALLOWED_ORIGINS
// (comma-separated). Empty = allow all (fine for local dev).
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const app = express();
app.use(
  cors(
    ALLOWED_ORIGINS.length
      ? {
          origin: (origin, cb) => {
            // Allow same-origin/no-origin (curl, health checks) and listed origins.
            if (!origin || ALLOWED_ORIGINS.includes(origin)) cb(null, true);
            else cb(new Error(`Origin not allowed: ${origin}`));
          },
        }
      : {}
  )
);
app.use(express.json({ limit: "10mb" }));

function getApiKey(req) {
  const auth = req.headers.authorization || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  return bearer || process.env.CURSOR_API_KEY || "";
}

/** Flatten OpenAI-style messages into a single prompt for the Cursor agent. */
function buildPrompt(messages = []) {
  const parts = [];
  for (const m of messages) {
    if (m.role === "system") parts.push(`[System]\n${m.content}`);
    else if (m.role === "assistant") parts.push(`[Assistant]\n${m.content}`);
    else parts.push(`[User]\n${m.content}`);
  }
  parts.push("[Assistant]");
  return parts.join("\n\n");
}

function sseChunk(res, delta) {
  const payload = {
    object: "chat.completion.chunk",
    choices: [{ index: 0, delta: { content: delta }, finish_reason: null }],
  };
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

/** Concatenate the text blocks of an assistant SDK message. */
function textOf(message) {
  const content = message?.message?.content ?? message?.content ?? [];
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .filter((b) => b?.type === "text" && typeof b.text === "string")
    .map((b) => b.text)
    .join("");
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, provider: "cursor", scratch: SCRATCH_DIR });
});

// List models available to the caller's Cursor account.
app.get("/v1/models", async (req, res) => {
  const apiKey = getApiKey(req);
  if (!apiKey) return res.status(401).json({ error: "Missing Cursor API key" });
  try {
    const models = await Cursor.models.list({ apiKey });
    res.json({ object: "list", data: models });
  } catch (err) {
    res.status(500).json({ error: String(err?.message || err) });
  }
});

app.post("/v1/chat/completions", async (req, res) => {
  const apiKey = getApiKey(req);
  if (!apiKey) {
    return res
      .status(401)
      .json({ error: { message: "Missing Cursor API key (Bearer token)." } });
  }

  const { model = "composer-2.5", messages = [], stream = true } = req.body || {};
  const prompt = buildPrompt(messages);

  let agent;
  try {
    agent = await Agent.create({
      apiKey,
      model: { id: model },
      local: { cwd: SCRATCH_DIR, settingSources: [] },
    });

    const run = await agent.send(prompt);

    if (stream) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders?.();

      let sent = "";
      for await (const event of run.stream()) {
        if (event.type !== "assistant") continue;
        const full = textOf(event);
        if (!full) continue;
        if (full.startsWith(sent)) {
          const delta = full.slice(sent.length);
          if (delta) sseChunk(res, delta);
          sent = full;
        } else {
          // Snapshot changed unexpectedly; emit whole and reset.
          sseChunk(res, full);
          sent = full;
        }
      }

      const result = await run.wait();
      if (result.status === "error") {
        sseChunk(res, `\n\n⚠️ Run gagal (status: error).`);
      }
      res.write("data: [DONE]\n\n");
      res.end();
    } else {
      let sent = "";
      for await (const event of run.stream()) {
        if (event.type !== "assistant") continue;
        const full = textOf(event);
        if (full.startsWith(sent)) sent = full;
        else sent = full;
      }
      await run.wait();
      res.json({
        object: "chat.completion",
        model,
        choices: [
          { index: 0, message: { role: "assistant", content: sent }, finish_reason: "stop" },
        ],
      });
    }
  } catch (err) {
    const message =
      err instanceof CursorAgentError
        ? `Cursor gagal memulai: ${err.message}${
            err.isRetryable ? " (bisa dicoba lagi)" : ""
          }`
        : String(err?.message || err);
    console.error("[chat] error:", message);
    if (res.headersSent) {
      sseChunk(res, `\n\n⚠️ ${message}`);
      res.write("data: [DONE]\n\n");
      res.end();
    } else {
      res.status(500).json({ error: { message } });
    }
  } finally {
    try {
      await agent?.[Symbol.asyncDispose]?.();
    } catch {
      // ignore disposal errors
    }
  }
});

app.listen(PORT, () => {
  console.log(`\n  🚀 CursorGo backend (Cursor SDK) listening on http://localhost:${PORT}`);
  console.log(`     Health:  http://localhost:${PORT}/health`);
  console.log(`     Chat:    POST http://localhost:${PORT}/v1/chat/completions\n`);
});
