import { useCallback, useRef, useState } from "react";
import type { AiSettings, ChatMessage } from "@/lib/types";
import { streamChat } from "@/lib/ai";
import { uid } from "@/lib/utils";

interface SendArgs {
  content: string;
  settings: AiSettings;
  contextFiles?: { path: string; content: string }[];
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const messagesRef = useRef<ChatMessage[]>(messages);
  messagesRef.current = messages;

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
    setMessages((m) =>
      m.map((msg) => (msg.streaming ? { ...msg, streaming: false } : msg))
    );
  }, []);

  const clear = useCallback(() => {
    stop();
    setMessages([]);
  }, [stop]);

  const send = useCallback(async ({ content, settings, contextFiles }: SendArgs) => {
    if (!content.trim() || isStreaming) return;

    const userMsg: ChatMessage = {
      id: uid(),
      role: "user",
      content: content.trim(),
      createdAt: Date.now(),
      context: contextFiles?.map((f) => f.path),
    };
    const assistantMsg: ChatMessage = {
      id: uid(),
      role: "assistant",
      content: "",
      createdAt: Date.now(),
      model: settings.model,
      streaming: true,
    };

    const history = [...messagesRef.current, userMsg];
    setMessages([...history, assistantMsg]);
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamChat({
        settings,
        messages: history,
        contextFiles,
        signal: controller.signal,
        onToken: (delta) => {
          setMessages((m) =>
            m.map((msg) =>
              msg.id === assistantMsg.id
                ? { ...msg, content: msg.content + delta }
                : msg
            )
          );
        },
      });
      setMessages((m) =>
        m.map((msg) =>
          msg.id === assistantMsg.id ? { ...msg, streaming: false } : msg
        )
      );
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        // handled in stop()
      } else {
        setMessages((m) =>
          m.map((msg) =>
            msg.id === assistantMsg.id
              ? {
                  ...msg,
                  streaming: false,
                  error: true,
                  content:
                    msg.content ||
                    `⚠️ Gagal menghubungi model: ${(err as Error).message}\n\nCek API key & base URL di Settings, atau gunakan Demo Mode.`,
                }
              : msg
          )
        );
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [isStreaming]);

  return { messages, isStreaming, send, stop, clear };
}
