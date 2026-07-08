import { memo } from "react";
import { ChevronRight, File as FileIcon, Folder, FolderOpen } from "lucide-react";
import type { FileNode } from "@/lib/types";
import { cn, iconColorFromFilename } from "@/lib/utils";

interface Props {
  node: FileNode;
  depth: number;
  activePath: string | null;
  onToggle: (node: FileNode) => void;
  onOpenFile: (node: FileNode) => void;
}

function FileTreeNodeBase({ node, depth, activePath, onToggle, onOpenFile }: Props) {
  const isDir = node.kind === "directory";
  const isActive = activePath === node.path && !isDir;

  return (
    <div>
      <button
        onClick={() => (isDir ? onToggle(node) : onOpenFile(node))}
        className={cn(
          "group flex w-full items-center gap-1.5 rounded-md py-[3px] pr-2 text-[13px] transition-colors",
          "hover:bg-accent/70",
          isActive && "bg-primary/15 text-foreground"
        )}
        style={{ paddingLeft: depth * 12 + 8 }}
        title={node.path || node.name}
      >
        {isDir ? (
          <>
            <ChevronRight
              className={cn(
                "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
                node.expanded && "rotate-90"
              )}
            />
            {node.expanded ? (
              <FolderOpen className="h-4 w-4 shrink-0 text-primary/80" />
            ) : (
              <Folder className="h-4 w-4 shrink-0 text-primary/80" />
            )}
          </>
        ) : (
          <>
            <span className="w-3.5 shrink-0" />
            <FileIcon
              className="h-4 w-4 shrink-0"
              style={{ color: iconColorFromFilename(node.name) }}
            />
          </>
        )}
        <span className="truncate">{node.name}</span>
      </button>

      {isDir && node.expanded && node.children && (
        <div>
          {node.children.length === 0 ? (
            <div
              className="py-1 text-[12px] italic text-muted-foreground/60"
              style={{ paddingLeft: (depth + 1) * 12 + 24 }}
            >
              kosong
            </div>
          ) : (
            node.children.map((child) => (
              <FileTreeNode
                key={child.id}
                node={child}
                depth={depth + 1}
                activePath={activePath}
                onToggle={onToggle}
                onOpenFile={onOpenFile}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

export const FileTreeNode = memo(FileTreeNodeBase);
