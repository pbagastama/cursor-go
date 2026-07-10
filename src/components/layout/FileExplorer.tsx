import { FilePlus2, FolderOpen, RefreshCw, RotateCcw, X } from "lucide-react";
import type { FileNode } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip } from "@/components/ui/tooltip";
import { FileTreeNode } from "./FileTreeNode";
import { DotPattern } from "@/components/magicui/dot-pattern";
import { cn } from "@/lib/utils";

interface Props {
  rootName: string | null;
  tree: FileNode[];
  loading: boolean;
  indexing?: boolean;
  indexCount?: number;
  restoring?: boolean;
  needsPermission?: boolean;
  supported: boolean;
  activePath: string | null;
  onOpenFolder: () => void;
  onOpenFiles: () => void;
  onCloseFolder: () => void;
  onRefresh: () => void;
  onResumeFolder?: () => void;
  onToggle: (node: FileNode) => void;
  onOpenFile: (node: FileNode) => void;
}

export function FileExplorer({
  rootName,
  tree,
  loading,
  indexing,
  indexCount,
  restoring,
  needsPermission,
  supported,
  activePath,
  onOpenFolder,
  onOpenFiles,
  onCloseFolder,
  onRefresh,
  onResumeFolder,
  onToggle,
  onOpenFile,
}: Props) {
  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="flex h-9 items-center justify-between px-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Explorer
          {restoring ? (
            <span className="ml-1.5 normal-case tracking-normal text-amber-400">
              · restore…
            </span>
          ) : indexing ? (
            <span className="ml-1.5 normal-case tracking-normal text-amber-400">
              · indexing…
            </span>
          ) : indexCount != null && indexCount > 0 ? (
            <span className="ml-1.5 normal-case tracking-normal text-muted-foreground/70">
              · {indexCount} files
            </span>
          ) : null}
        </span>
        <div className="flex items-center gap-0.5">
          <Tooltip content="Buka file">
            <Button variant="ghost" size="icon-sm" onClick={onOpenFiles}>
              <FilePlus2 className="h-3.5 w-3.5" />
            </Button>
          </Tooltip>
          <Tooltip content="Buka folder">
            <Button variant="ghost" size="icon-sm" onClick={onOpenFolder}>
              <FolderOpen className="h-3.5 w-3.5" />
            </Button>
          </Tooltip>
          {rootName && !needsPermission && (
            <>
              <Tooltip content="Refresh">
                <Button variant="ghost" size="icon-sm" onClick={onRefresh}>
                  <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
                </Button>
              </Tooltip>
              <Tooltip content="Tutup folder">
                <Button variant="ghost" size="icon-sm" onClick={onCloseFolder}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </Tooltip>
            </>
          )}
        </div>
      </div>

      {rootName && (
        <div className="flex items-center gap-1.5 px-3 pb-1.5">
          <span className="truncate text-xs font-semibold text-foreground/90">
            {rootName}
          </span>
        </div>
      )}

      <div className="relative flex-1 overflow-hidden">
        {needsPermission && rootName ? (
          <ResumeState
            folderName={rootName}
            onResume={onResumeFolder}
            onOpenFolder={onOpenFolder}
            onDismiss={onCloseFolder}
          />
        ) : tree.length === 0 ? (
          <EmptyState
            supported={supported}
            restoring={restoring}
            onOpenFolder={onOpenFolder}
            onOpenFiles={onOpenFiles}
          />
        ) : (
          <ScrollArea className="h-full">
            <div className="px-2 pb-6 pt-1">
              {tree.map((node) => (
                <FileTreeNode
                  key={node.id}
                  node={node}
                  depth={0}
                  activePath={activePath}
                  onToggle={onToggle}
                  onOpenFile={onOpenFile}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}

function ResumeState({
  folderName,
  onResume,
  onOpenFolder,
  onDismiss,
}: {
  folderName: string;
  onResume?: () => void;
  onOpenFolder: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="relative flex h-full flex-col items-center justify-center gap-4 px-5 text-center">
      <DotPattern className="opacity-40 [mask-image:radial-gradient(180px_circle_at_center,white,transparent)]" />
      <div className="relative z-10 flex flex-col items-center gap-3">
        <div className="rounded-2xl border border-primary/40 bg-primary/10 p-3 shadow-sm">
          <RotateCcw className="h-6 w-6 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">
            Lanjutkan folder terakhir?
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Browser meminta izin ulang untuk mengakses{" "}
            <span className="font-semibold text-foreground/80">{folderName}</span>.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2">
          <Button size="sm" onClick={onResume} className="w-full">
            <FolderOpen className="h-4 w-4" />
            Lanjutkan {folderName}
          </Button>
          <Button size="sm" variant="outline" onClick={onOpenFolder} className="w-full">
            Pilih folder lain
          </Button>
          <button
            type="button"
            onClick={onDismiss}
            className="text-[11px] text-muted-foreground hover:text-foreground"
          >
            Hapus sesi tersimpan
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  supported,
  restoring,
  onOpenFolder,
  onOpenFiles,
}: {
  supported: boolean;
  restoring?: boolean;
  onOpenFolder: () => void;
  onOpenFiles: () => void;
}) {
  return (
    <div className="relative flex h-full flex-col items-center justify-center gap-4 px-5 text-center">
      <DotPattern className="opacity-40 [mask-image:radial-gradient(180px_circle_at_center,white,transparent)]" />
      <div className="relative z-10 flex flex-col items-center gap-3">
        <div className="rounded-2xl border border-border bg-card/60 p-3 shadow-sm">
          <FolderOpen className="h-6 w-6 text-primary" />
        </div>
        <p className="text-sm text-muted-foreground">
          {restoring
            ? "Memulihkan sesi terakhir…"
            : "Belum ada folder yang dibuka."}
        </p>
        {supported ? (
          <div className="flex w-full flex-col gap-2">
            <Button size="sm" onClick={onOpenFolder} className="w-full" disabled={restoring}>
              <FolderOpen className="h-4 w-4" />
              Buka Folder
            </Button>
            <Button size="sm" variant="outline" onClick={onOpenFiles} className="w-full">
              <FilePlus2 className="h-4 w-4" />
              Buka File
            </Button>
          </div>
        ) : (
          <p className="text-xs text-destructive">
            Browser ini tidak mendukung File System Access API. Gunakan Chrome/Edge terbaru.
          </p>
        )}
      </div>
    </div>
  );
}
