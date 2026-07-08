import { useEffect, useRef } from "react";
import { ArrowUp, AtSign, Square, X } from "lucide-react";
import { ModelSelector } from "./ModelSelector";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface ContextChip {
  id: string;
  name: string;
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onStop: () => void;
  isStreaming: boolean;
  model: string;
  onModelChange: (m: string) => void;
  contextChips: ContextChip[];
  onRemoveChip: (id: string) => void;
  onAttachActive: () => void;
  canAttach: boolean;
}

export function ChatInput({
  value,
  onChange,
  onSend,
  onStop,
  isStreaming,
  model,
  onModelChange,
  contextChips,
  onRemoveChip,
  onAttachActive,
  canAttach,
}: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 180) + "px";
  }, [value]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="border-t border-border bg-sidebar p-2.5">
      <div className="rounded-xl border border-border bg-background shadow-sm transition-colors focus-within:border-primary/50">
        {contextChips.length > 0 && (
          <div className="flex flex-wrap gap-1.5 p-2 pb-0">
            {contextChips.map((chip) => (
              <span
                key={chip.id}
                className="flex items-center gap-1 rounded-md border border-border bg-muted/60 px-1.5 py-0.5 text-[11px]"
              >
                <AtSign className="h-3 w-3 text-primary" />
                {chip.name}
                <button
                  onClick={() => onRemoveChip(chip.id)}
                  className="rounded hover:bg-accent"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKey}
          rows={1}
          placeholder="Tanya AI Agent, atau ketik perintah untuk kode..."
          className="max-h-[180px] w-full resize-none bg-transparent px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />

        <div className="flex items-center justify-between px-2 pb-2">
          <div className="flex items-center gap-1">
            <ModelSelector value={model} onChange={onModelChange} />
            <Tooltip content="Lampirkan file aktif sebagai konteks">
              <button
                onClick={onAttachActive}
                disabled={!canAttach}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
              >
                <AtSign className="h-3.5 w-3.5" />
                Context
              </button>
            </Tooltip>
          </div>

          {isStreaming ? (
            <button
              onClick={onStop}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary text-secondary-foreground transition-colors hover:bg-secondary/70"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
            </button>
          ) : (
            <button
              onClick={onSend}
              disabled={!value.trim()}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-lg transition-all",
                value.trim()
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95"
                  : "bg-muted text-muted-foreground"
              )}
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      <p className="mt-1.5 px-1 text-[10.5px] text-muted-foreground/70">
        Enter untuk kirim · Shift+Enter baris baru
      </p>
    </div>
  );
}
