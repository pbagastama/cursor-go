import { Files, GitBranch, Search, Settings, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type ActivityView = "explorer" | "search" | "git";

interface Props {
  active: ActivityView;
  sidebarOpen: boolean;
  aiOpen: boolean;
  onSelect: (view: ActivityView) => void;
  onToggleAi: () => void;
  onOpenSettings: () => void;
}

const items: { id: ActivityView; icon: typeof Files; label: string }[] = [
  { id: "explorer", icon: Files, label: "Explorer" },
  { id: "search", icon: Search, label: "Search" },
  { id: "git", icon: GitBranch, label: "Source Control" },
];

export function ActivityBar({
  active,
  sidebarOpen,
  aiOpen,
  onSelect,
  onToggleAi,
  onOpenSettings,
}: Props) {
  return (
    <div className="flex w-12 flex-col items-center justify-between border-r border-border bg-sidebar py-2">
      <div className="flex flex-col items-center gap-1">
        {items.map(({ id, icon: Icon, label }) => {
          const isActive = active === id && sidebarOpen;
          return (
            <Tooltip key={id} content={label}>
              <button
                onClick={() => onSelect(id)}
                className={cn(
                  "relative flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground",
                  isActive && "text-foreground"
                )}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary" />
                )}
                <Icon className="h-[19px] w-[19px]" />
              </button>
            </Tooltip>
          );
        })}

        <Tooltip content="AI Agent (Cmd/Ctrl+I)">
          <button
            onClick={onToggleAi}
            className={cn(
              "relative flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
              aiOpen
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Sparkles className="h-[19px] w-[19px]" />
          </button>
        </Tooltip>
      </div>

      <Tooltip content="Settings">
        <Button variant="ghost" size="icon" onClick={onOpenSettings}>
          <Settings className="h-[19px] w-[19px]" />
        </Button>
      </Tooltip>
    </div>
  );
}
