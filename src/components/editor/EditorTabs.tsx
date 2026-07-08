import { File as FileIcon, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { OpenTab } from "@/lib/types";
import { cn, iconColorFromFilename } from "@/lib/utils";

interface Props {
  tabs: OpenTab[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
}

export function EditorTabs({ tabs, activeId, onSelect, onClose }: Props) {
  return (
    <div className="flex h-9 items-stretch overflow-x-auto border-b border-border bg-sidebar scrollbar-thin">
      <AnimatePresence initial={false}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeId;
          return (
            <motion.div
              key={tab.id}
              layout
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.15 }}
              className={cn(
                "group relative flex min-w-0 shrink-0 cursor-pointer items-center gap-2 border-r border-border px-3 text-[13px]",
                isActive
                  ? "bg-background text-foreground"
                  : "bg-transparent text-muted-foreground hover:bg-accent/40"
              )}
              onClick={() => onSelect(tab.id)}
            >
              {isActive && (
                <motion.span
                  layoutId="tab-underline"
                  className="absolute left-0 right-0 top-0 h-0.5 bg-primary"
                />
              )}
              <FileIcon
                className="h-3.5 w-3.5 shrink-0"
                style={{ color: iconColorFromFilename(tab.name) }}
              />
              <span className="max-w-[140px] truncate">{tab.name}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose(tab.id);
                }}
                className={cn(
                  "flex h-4 w-4 items-center justify-center rounded transition-colors hover:bg-accent",
                  tab.dirty
                    ? "opacity-100"
                    : "opacity-0 group-hover:opacity-100"
                )}
              >
                {tab.dirty ? (
                  <span className="h-2 w-2 rounded-full bg-foreground group-hover:hidden" />
                ) : null}
                <X
                  className={cn(
                    "h-3.5 w-3.5",
                    tab.dirty && "hidden group-hover:block"
                  )}
                />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
