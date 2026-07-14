import { Link } from "react-router-dom";
import { FileArchive, PanelLeft, PanelRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { GradientText } from "@/components/magicui/gradient-text";

interface Props {
  projectName: string | null;
  aiOpen: boolean;
  onToggleSidebar: () => void;
  onToggleAi: () => void;
}

export function TitleBar({
  projectName,
  aiOpen,
  onToggleSidebar,
  onToggleAi,
}: Props) {
  return (
    <div className="flex h-10 items-center justify-between border-b border-border bg-sidebar px-2.5 no-drag">
      <div className="flex items-center gap-2">
        <Tooltip content="Toggle Sidebar" side="bottom">
          <Button variant="ghost" size="icon-sm" onClick={onToggleSidebar}>
            <PanelLeft className="h-4 w-4" />
          </Button>
        </Tooltip>
        <div className="flex items-center gap-1.5 pl-1">
          <img src="/logo.svg" alt="logo" className="h-4 w-4" />
          <span className="text-[13px] font-semibold">
            Cursor<GradientText>Go</GradientText>
          </span>
        </div>
      </div>

      <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-xs text-muted-foreground">
        {projectName ?? "Web Code Editor"}
      </div>

      <div className="flex items-center gap-1">
        <Tooltip content="Upload & share ZIP" side="bottom">
          <Button variant="ghost" size="sm" className="gap-1.5" asChild>
            <Link to="/upload-zip">
              <FileArchive className="h-4 w-4" />
              <span className="hidden sm:inline">Share ZIP</span>
            </Link>
          </Button>
        </Tooltip>
        <Tooltip content="Toggle AI Agent" side="bottom">
          <Button
            variant={aiOpen ? "secondary" : "ghost"}
            size="sm"
            onClick={onToggleAi}
            className="gap-1.5"
          >
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="hidden sm:inline">AI Agent</span>
          </Button>
        </Tooltip>
        <Tooltip content="Toggle Panel" side="bottom">
          <Button variant="ghost" size="icon-sm" onClick={onToggleAi}>
            <PanelRight className="h-4 w-4" />
          </Button>
        </Tooltip>
      </div>
    </div>
  );
}
