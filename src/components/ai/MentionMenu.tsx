import { File as FileIcon, FileCode2, Folder } from "lucide-react";
import type { MentionCandidate } from "@/lib/mention";
import { cn, iconColorFromFilename } from "@/lib/utils";

interface Props {
  items: MentionCandidate[];
  activeIndex: number;
  indexing?: boolean;
  onSelect: (item: MentionCandidate) => void;
  onHover: (index: number) => void;
}

export function MentionMenu({
  items,
  activeIndex,
  indexing,
  onSelect,
  onHover,
}: Props) {
  if (items.length === 0) {
    return (
      <div className="absolute bottom-full left-0 z-50 mb-1 w-80 rounded-lg border border-border bg-popover p-3 text-xs text-muted-foreground shadow-xl">
        {indexing
          ? "Sedang mengindeks folder workspace…"
          : "Tidak ada file/folder yang cocok. Buka folder dulu di Explorer."}
      </div>
    );
  }

  return (
    <div className="absolute bottom-full left-0 z-50 mb-1 max-h-72 w-[22rem] overflow-y-auto rounded-lg border border-border bg-popover py-1 shadow-xl scrollbar-thin">
      <div className="flex items-center justify-between px-2.5 py-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Files & folders
        </span>
        {indexing && (
          <span className="text-[10px] text-amber-400">indexing…</span>
        )}
      </div>
      {items.map((item, i) => (
        <button
          key={item.id}
          type="button"
          onMouseEnter={() => onHover(i)}
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(item);
          }}
          className={cn(
            "flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-[13px] transition-colors",
            i === activeIndex
              ? "bg-primary/15 text-foreground"
              : "hover:bg-accent"
          )}
        >
          {item.kind === "directory" ? (
            <Folder className="h-3.5 w-3.5 shrink-0 text-primary/80" />
          ) : item.kind === "tab" ? (
            <FileCode2
              className="h-3.5 w-3.5 shrink-0"
              style={{ color: iconColorFromFilename(item.name) }}
            />
          ) : (
            <FileIcon
              className="h-3.5 w-3.5 shrink-0"
              style={{ color: iconColorFromFilename(item.name) }}
            />
          )}
          <span className="min-w-0 flex-1 truncate font-medium">
            {item.name}
            {item.kind === "directory" && (
              <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                folder
              </span>
            )}
          </span>
          <span className="max-w-[45%] truncate text-[11px] text-muted-foreground">
            {item.path}
          </span>
        </button>
      ))}
    </div>
  );
}
