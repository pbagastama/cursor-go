import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Settings2, Sparkles, Trash2 } from "lucide-react";
import type { ChatMessage as ChatMessageType } from "@/lib/types";
import { ChatMessage } from "./ChatMessage";
import { ChatInput, type ContextChip } from "./ChatInput";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { BorderBeam } from "@/components/magicui/border-beam";
import { GradientText } from "@/components/magicui/gradient-text";

interface Props {
  messages: ChatMessageType[];
  isStreaming: boolean;
  model: string;
  connected: boolean;
  contextChips: ContextChip[];
  canAttach: boolean;
  onSend: (content: string) => void;
  onStop: () => void;
  onClear: () => void;
  onModelChange: (m: string) => void;
  onRemoveChip: (id: string) => void;
  onAttachActive: () => void;
  onOpenSettings: () => void;
}

const SUGGESTIONS = [
  "Jelaskan file yang sedang aktif",
  "Refactor fungsi ini agar lebih bersih",
  "Buatkan unit test",
  "Cari potensi bug di kode ini",
];

export function AiPanel({
  messages,
  isStreaming,
  model,
  connected,
  contextChips,
  canAttach,
  onSend,
  onStop,
  onClear,
  onModelChange,
  onRemoveChip,
  onAttachActive,
  onOpenSettings,
}: Props) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]"
    );
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSend(input);
    setInput("");
  };

  const handleSuggestion = (s: string) => {
    onSend(s);
  };

  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="flex h-10 items-center justify-between border-b border-border px-3">
        <div className="flex items-center gap-2">
          <div className="relative flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-purple-600">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold">
            AI <GradientText>Agent</GradientText>
          </span>
          <span
            className="ml-1 flex items-center gap-1 text-[10px] text-muted-foreground"
            title={connected ? "Terhubung ke API" : "Demo Mode"}
          >
            <span
              className={
                "h-1.5 w-1.5 rounded-full " +
                (connected ? "bg-emerald-400" : "bg-amber-400")
              }
            />
            {connected ? "Live" : "Demo"}
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          <Tooltip content="Chat baru">
            <Button variant="ghost" size="icon-sm" onClick={onClear}>
              <Plus className="h-4 w-4" />
            </Button>
          </Tooltip>
          <Tooltip content="Bersihkan">
            <Button variant="ghost" size="icon-sm" onClick={onClear}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </Tooltip>
          <Tooltip content="Pengaturan AI">
            <Button variant="ghost" size="icon-sm" onClick={onOpenSettings}>
              <Settings2 className="h-4 w-4" />
            </Button>
          </Tooltip>
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden" ref={scrollRef}>
        {messages.length === 0 ? (
          <EmptyChat onSuggestion={handleSuggestion} />
        ) : (
          <ScrollArea className="h-full">
            <div className="divide-y divide-border/50 pb-4">
              {messages.map((m) => (
                <ChatMessage key={m.id} message={m} />
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      <ChatInput
        value={input}
        onChange={setInput}
        onSend={handleSend}
        onStop={onStop}
        isStreaming={isStreaming}
        model={model}
        onModelChange={onModelChange}
        contextChips={contextChips}
        onRemoveChip={onRemoveChip}
        onAttachActive={onAttachActive}
        canAttach={canAttach}
      />
    </div>
  );
}

function EmptyChat({ onSuggestion }: { onSuggestion: (s: string) => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-5 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="relative mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-primary/30"
      >
        <Sparkles className="h-7 w-7 text-white" />
        <BorderBeam size={60} duration={6} />
      </motion.div>
      <h3 className="text-base font-semibold">Tanya apa saja</h3>
      <p className="mb-5 mt-1 max-w-[240px] text-xs text-muted-foreground">
        Agent bisa membaca file aktif, menulis, dan menjelaskan kode kamu.
      </p>

      <div className="flex w-full max-w-xs flex-col gap-2">
        {SUGGESTIONS.map((s, i) => (
          <motion.button
            key={s}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.06 }}
            onClick={() => onSuggestion(s)}
            className="rounded-lg border border-border bg-card/50 px-3 py-2 text-left text-[13px] text-foreground/80 transition-colors hover:border-primary/40 hover:bg-accent"
          >
            {s}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
