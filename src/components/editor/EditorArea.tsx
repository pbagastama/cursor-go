import { Sparkles } from "lucide-react";
import type { OpenTab } from "@/lib/types";
import { EditorTabs } from "./EditorTabs";
import { MonacoEditor } from "./MonacoEditor";
import { Welcome } from "./Welcome";
import { Button } from "@/components/ui/button";
import { formatBytes } from "@/lib/utils";

interface Props {
  tabs: OpenTab[];
  activeId: string | null;
  activeTab: OpenTab | null;
  supported: boolean;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onChange: (id: string, value: string) => void;
  onSave: (id: string) => void;
  onOpenFolder: () => void;
  onOpenFiles: () => void;
  onOpenAi: () => void;
  onAddToChat: (tab: OpenTab) => void;
}

export function EditorArea({
  tabs,
  activeId,
  activeTab,
  supported,
  onSelect,
  onClose,
  onChange,
  onSave,
  onOpenFolder,
  onOpenFiles,
  onOpenAi,
  onAddToChat,
}: Props) {
  if (tabs.length === 0) {
    return (
      <Welcome
        onOpenFolder={onOpenFolder}
        onOpenFiles={onOpenFiles}
        onOpenAi={onOpenAi}
        supported={supported}
      />
    );
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <EditorTabs
        tabs={tabs}
        activeId={activeId}
        onSelect={onSelect}
        onClose={onClose}
      />

      {activeTab && (
        <div className="flex h-8 items-center justify-between border-b border-border bg-background/50 px-3">
          <span className="truncate font-mono text-[11px] text-muted-foreground">
            {activeTab.path}
            {activeTab.size != null && (
              <span className="ml-2 opacity-60">{formatBytes(activeTab.size)}</span>
            )}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 gap-1.5 text-xs"
            onClick={() => onAddToChat(activeTab)}
          >
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Tambahkan ke Chat
          </Button>
        </div>
      )}

      <div className="relative flex-1 overflow-hidden">
        {activeTab && (
          <MonacoEditor
            tab={activeTab}
            onChange={(v) => onChange(activeTab.id, v)}
            onSave={() => onSave(activeTab.id)}
          />
        )}
      </div>
    </div>
  );
}
