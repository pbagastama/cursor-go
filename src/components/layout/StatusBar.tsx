import { Check, GitBranch, Sparkles, Wifi, WifiOff } from "lucide-react";
import type { OpenTab } from "@/lib/types";

interface Props {
  activeTab: OpenTab | null;
  modelLabel: string;
  connected: boolean;
}

export function StatusBar({ activeTab, modelLabel, connected }: Props) {
  const line = activeTab ? cursorInfo(activeTab.content) : null;

  return (
    <div className="flex h-6 items-center justify-between border-t border-border bg-primary/90 px-3 text-[11px] font-medium text-primary-foreground">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1">
          <GitBranch className="h-3 w-3" /> main
        </span>
        <span className="flex items-center gap-1">
          {connected ? (
            <>
              <Wifi className="h-3 w-3" /> Connected
            </>
          ) : (
            <>
              <WifiOff className="h-3 w-3" /> Demo Mode
            </>
          )}
        </span>
      </div>

      <div className="flex items-center gap-3">
        {activeTab && (
          <>
            <span>{activeTab.dirty ? "● Unsaved" : (
              <span className="flex items-center gap-1">
                <Check className="h-3 w-3" /> Saved
              </span>
            )}</span>
            {line && <span>Ln {line.lines}, {line.chars} chars</span>}
            <span className="uppercase">{activeTab.language}</span>
          </>
        )}
        <span className="flex items-center gap-1">
          <Sparkles className="h-3 w-3" /> {modelLabel}
        </span>
      </div>
    </div>
  );
}

function cursorInfo(content: string) {
  return {
    lines: content.split("\n").length,
    chars: content.length,
  };
}
