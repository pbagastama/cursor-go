import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUp,
  AtSign,
  FileCode2,
  Folder,
  Image as ImageIcon,
  Paperclip,
  Square,
  X,
} from "lucide-react";
import { ModelSelector } from "./ModelSelector";
import { MentionMenu } from "./MentionMenu";
import { Tooltip } from "@/components/ui/tooltip";
import {
  buildMentionList,
  detectMentionAt,
  filterMentions,
  type MentionCandidate,
} from "@/lib/mention";
import type { FileIndexEntry } from "@/lib/fileSystem";
import {
  guessFilenameFromCode,
  looksLikeCode,
  matchPasteToTabs,
} from "@/lib/pasteContext";
import type { ChatImage, OpenTab } from "@/lib/types";
import { cn, languageFromFilename, uid } from "@/lib/utils";

export interface ContextChip {
  id: string;
  name: string;
  path: string;
  kind: "file" | "snippet" | "image" | "folder";
  /** For snippet chips pasted as code. */
  content?: string;
  /** For image chips. */
  dataUrl?: string;
  mime?: string;
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
  onAddChip: (chip: ContextChip) => void;
  onRemoveChip: (id: string) => void;
  onAttachActive: () => void;
  canAttach: boolean;
  /** Open tabs for @ mention. */
  tabs: OpenTab[];
  /** Recursive workspace file index (all nested folders). */
  fileIndex: FileIndexEntry[];
  indexing?: boolean;
  /** Active editor tab path — used to resolve paste → correct filename. */
  activePath?: string | null;
  /**
   * Resolve a mention (file or folder) into context chip(s).
   * Folder → multiple file chips under that path.
   */
  onResolveMention: (
    item: MentionCandidate
  ) => Promise<ContextChip[]>;
}

const CODE_EXT =
  /\.(tsx?|jsx?|mjs|cjs|vue|svelte|py|go|mod|sum|rs|java|kt|kts|jsp|php|rb|css|scss|html?|json|ya?ml|md|sql|sh|toml|xml|svg|properties|gradle)$/i;

const SPECIAL_CODE_FILES =
  /^(go\.mod|go\.sum|cargo\.toml|cargo\.lock|main\.go|main\.rs|lib\.rs|mod\.rs|build\.rs|pom\.xml|build\.gradle|build\.gradle\.kts|settings\.gradle|settings\.gradle\.kts|application\.properties|application\.yml|application\.yaml|bootstrap\.properties|bootstrap\.yml)$/i;

async function fileToImageChip(file: File): Promise<ContextChip | null> {
  if (!file.type.startsWith("image/")) return null;
  if (file.size > 4 * 1024 * 1024) return null; // 4MB cap
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  return {
    id: uid(),
    name: file.name || "image.png",
    path: file.name || "image.png",
    kind: "image",
    dataUrl,
    mime: file.type,
  };
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
  onAddChip,
  onRemoveChip,
  onAttachActive,
  canAttach,
  tabs,
  fileIndex,
  indexing,
  activePath,
  onResolveMention,
}: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStart, setMentionStart] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  const candidates = useMemo(
    () => buildMentionList(tabs, fileIndex),
    [tabs, fileIndex]
  );
  const filtered = useMemo(
    () => filterMentions(candidates, mentionQuery),
    [candidates, mentionQuery]
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 180) + "px";
  }, [value]);

  useEffect(() => {
    setActiveIndex(0);
  }, [mentionQuery, mentionOpen]);

  const refreshMention = (text: string, caret: number) => {
    const hit = detectMentionAt(text, caret);
    if (hit) {
      setMentionOpen(true);
      setMentionQuery(hit.query);
      setMentionStart(hit.start);
    } else {
      setMentionOpen(false);
      setMentionQuery("");
    }
  };

  const selectMention = async (item: MentionCandidate) => {
    const el = ref.current;
    const caret = el?.selectionStart ?? value.length;
    const before = value.slice(0, mentionStart);
    const after = value.slice(caret);
    // Remove the @query from the input; chip carries the context.
    onChange(before + after);

    const chips = await onResolveMention(item);
    for (const chip of chips) onAddChip(chip);

    setMentionOpen(false);
    setMentionQuery("");
    requestAnimationFrame(() => {
      el?.focus();
      const pos = before.length;
      el?.setSelectionRange(pos, pos);
    });
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionOpen && filtered.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % filtered.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + filtered.length) % filtered.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        void selectMention(filtered[activeIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMentionOpen(false);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const next = e.target.value;
    onChange(next);
    refreshMention(next, e.target.selectionStart);
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = Array.from(e.clipboardData.items);

    // Images first
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) continue;
        const chip = await fileToImageChip(file);
        if (chip) onAddChip(chip);
        return;
      }
    }

    const text = e.clipboardData.getData("text/plain");
    if (!text) return;

    // If pasted text looks like a filename alone, attach that file
    const trimmed = text.trim();
    const looksLikeFilename =
      !trimmed.includes("\n") &&
      trimmed.length < 200 &&
      (CODE_EXT.test(trimmed) ||
        SPECIAL_CODE_FILES.test(trimmed.split("/").pop() ?? ""));
    if (looksLikeFilename) {
      const match = candidates.find(
        (c) =>
          c.name === trimmed ||
          c.path === trimmed ||
          c.path.endsWith("/" + trimmed) ||
          c.name.toLowerCase() === trimmed.toLowerCase()
      );
      if (match) {
        e.preventDefault();
        await selectMention(match);
        return;
      }
    }

    // Paste of code → match open tabs first (correct name + full file context)
    if (looksLikeCode(text)) {
      e.preventDefault();
      const matched = matchPasteToTabs(text, tabs, activePath);

      if (matched) {
        // Prefer the real open file: name/path from tab, content = full file
        // so the AI understands the whole context (not just the selection).
        onAddChip({
          id: matched.tab.path,
          name: matched.tab.name,
          path: matched.tab.path,
          kind: "file",
          content: matched.tab.content,
        });
        const note = value.trim()
          ? value
          : matched.isFullFile
            ? `Tolong analisis \`${matched.tab.name}\``
            : `Tolong analisis potongan kode dari \`${matched.tab.name}\``;
        onChange(note);
        return;
      }

      // Fallback: heuristic name when paste is not from an open tab
      const name = guessFilenameFromCode(text);
      onAddChip({
        id: `snippet:${uid()}`,
        name,
        path: name,
        kind: "snippet",
        content: text,
      });
      const note = value.trim()
        ? value
        : `Tolong analisis kode dari \`${name}\``;
      onChange(note);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    for (const f of files) {
      if (f.type.startsWith("image/")) {
        const chip = await fileToImageChip(f);
        if (chip) onAddChip(chip);
        continue;
      }
      // Text / code files dropped into chat → attach as context
      if (f.size < 2 * 1024 * 1024) {
        try {
          const content = await f.text();
          onAddChip({
            id: `drop:${f.name}:${uid()}`,
            name: f.name,
            path: f.name,
            kind: "snippet",
            content,
          });
        } catch {
          // ignore binary
        }
      }
    }
  };

  const onPickImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    for (const f of files) {
      const chip = await fileToImageChip(f);
      if (chip) onAddChip(chip);
    }
    e.target.value = "";
  };

  const canSend =
    !!value.trim() ||
    contextChips.some((c) => c.kind === "image" || c.kind === "snippet");

  return (
    <div className="border-t border-border bg-sidebar p-2.5">
      <div
        className={cn(
          "relative rounded-xl border border-border bg-background shadow-sm transition-colors focus-within:border-primary/50",
          dragOver && "border-primary bg-primary/5"
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {mentionOpen && (
          <MentionMenu
            items={filtered}
            activeIndex={activeIndex}
            indexing={indexing}
            onSelect={(item) => void selectMention(item)}
            onHover={setActiveIndex}
          />
        )}

        {contextChips.length > 0 && (
          <div className="flex flex-wrap gap-1.5 p-2 pb-0">
            {contextChips.map((chip) => (
              <Chip key={chip.id} chip={chip} onRemove={() => onRemoveChip(chip.id)} />
            ))}
          </div>
        )}

        <textarea
          ref={ref}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKey}
          onPaste={handlePaste}
          onClick={(e) =>
            refreshMention(value, (e.target as HTMLTextAreaElement).selectionStart)
          }
          rows={1}
          placeholder="Tanya AI Agent… ketik @ untuk mention file"
          className="max-h-[180px] w-full resize-none bg-transparent px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />

        <div className="flex items-center justify-between px-2 pb-2">
          <div className="flex items-center gap-0.5">
            <ModelSelector value={model} onChange={onModelChange} />
            <Tooltip content="Mention file (@)">
              <button
                type="button"
                onClick={() => {
                  const el = ref.current;
                  const caret = el?.selectionStart ?? value.length;
                  const next =
                    value.slice(0, caret) + "@" + value.slice(caret);
                  onChange(next);
                  requestAnimationFrame(() => {
                    el?.focus();
                    const pos = caret + 1;
                    el?.setSelectionRange(pos, pos);
                    refreshMention(next, pos);
                  });
                }}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <AtSign className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
            <Tooltip content="Lampirkan file aktif">
              <button
                type="button"
                onClick={onAttachActive}
                disabled={!canAttach}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
              >
                <Paperclip className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
            <Tooltip content="Upload gambar">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <ImageIcon className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={onPickImages}
            />
          </div>

          {isStreaming ? (
            <button
              type="button"
              onClick={onStop}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary text-secondary-foreground transition-colors hover:bg-secondary/70"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onSend}
              disabled={!canSend}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-lg transition-all",
                canSend
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
        @ mention · paste kode/gambar · Enter kirim · Shift+Enter baris baru
      </p>
    </div>
  );
}

function Chip({ chip, onRemove }: { chip: ContextChip; onRemove: () => void }) {
  if (chip.kind === "image" && chip.dataUrl) {
    return (
      <span className="group relative inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/60 p-1 pr-1.5 text-[11px]">
        <img
          src={chip.dataUrl}
          alt={chip.name}
          className="h-8 w-8 rounded object-cover"
        />
        <span className="max-w-[80px] truncate">{chip.name}</span>
        <button
          type="button"
          onClick={onRemove}
          className="rounded p-0.5 hover:bg-accent"
        >
          <X className="h-3 w-3" />
        </button>
      </span>
    );
  }

  return (
    <span
      className="flex items-center gap-1 rounded-md border border-border bg-muted/60 px-1.5 py-0.5 text-[11px]"
      title={chip.path}
    >
      {chip.kind === "snippet" ? (
        <FileCode2 className="h-3 w-3 text-amber-400" />
      ) : chip.kind === "folder" ? (
        <Folder className="h-3 w-3 text-primary/80" />
      ) : (
        <AtSign className="h-3 w-3 text-primary" />
      )}
      <span className="max-w-[160px] truncate">
        {chip.kind === "folder" ? `${chip.name}/` : chip.name}
      </span>
      {chip.kind === "file" && chip.path.includes("/") && (
        <span className="max-w-[90px] truncate text-[10px] text-muted-foreground">
          {chip.path.split("/").slice(0, -1).join("/")}
        </span>
      )}
      {chip.kind === "snippet" && (
        <span className="text-[10px] text-muted-foreground">
          {languageFromFilename(chip.name)}
        </span>
      )}
      <button
        type="button"
        onClick={onRemove}
        className="rounded hover:bg-accent"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

/** Convert image chips into ChatImage payloads for the API. */
export function chipsToImages(chips: ContextChip[]): ChatImage[] {
  return chips
    .filter((c) => c.kind === "image" && c.dataUrl)
    .map((c) => ({
      id: c.id,
      name: c.name,
      dataUrl: c.dataUrl!,
      mime: c.mime || "image/png",
    }));
}
