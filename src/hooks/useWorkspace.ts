import { useCallback, useEffect, useRef, useState } from "react";
import type { FileNode } from "@/lib/types";
import {
  pickDirectory,
  readDirectory,
  supportsFsAccess,
  walkDirectoryRecursive,
  type FileIndexEntry,
} from "@/lib/fileSystem";
import {
  clearRootHandle,
  ensureHandlePermission,
  loadRootHandle,
  saveRootHandle,
} from "@/lib/sessionStore";
import { uid } from "@/lib/utils";

interface WorkspaceState {
  rootName: string | null;
  rootHandle: FileSystemDirectoryHandle | null;
  tree: FileNode[];
  /** Flat recursive index of all files (+ dirs) for @ mention. */
  fileIndex: FileIndexEntry[];
  indexing: boolean;
  loading: boolean;
  supported: boolean;
  /** True while trying to restore last session from IndexedDB. */
  restoring: boolean;
  /**
   * Handle was found but browser needs a user gesture to re-grant permission.
   * UI should show a "Lanjutkan folder" button.
   */
  needsPermission: boolean;
  pendingHandle: FileSystemDirectoryHandle | null;
}

function updateNode(
  nodes: FileNode[],
  id: string,
  updater: (n: FileNode) => FileNode
): FileNode[] {
  return nodes.map((n) => {
    if (n.id === id) return updater(n);
    if (n.children) return { ...n, children: updateNode(n.children, id, updater) };
    return n;
  });
}

export function useWorkspace() {
  const [state, setState] = useState<WorkspaceState>({
    rootName: null,
    rootHandle: null,
    tree: [],
    fileIndex: [],
    indexing: false,
    loading: false,
    supported: supportsFsAccess(),
    restoring: true,
    needsPermission: false,
    pendingHandle: null,
  });

  const rootHandleRef = useRef<FileSystemDirectoryHandle | null>(null);
  rootHandleRef.current = state.rootHandle;

  const rebuildIndex = useCallback(async (handle: FileSystemDirectoryHandle) => {
    setState((s) => ({ ...s, indexing: true }));
    try {
      const index = await walkDirectoryRecursive(handle, "", {
        maxDepth: 10,
        maxFiles: 5000,
        includeDirs: true,
      });
      if (rootHandleRef.current === handle) {
        setState((s) => ({ ...s, fileIndex: index, indexing: false }));
      }
    } catch (e) {
      console.error("index rebuild failed", e);
      setState((s) => ({ ...s, indexing: false }));
    }
  }, []);

  const mountHandle = useCallback(
    async (handle: FileSystemDirectoryHandle) => {
      setState((s) => ({
        ...s,
        loading: true,
        indexing: true,
        fileIndex: [],
        needsPermission: false,
        pendingHandle: null,
        restoring: false,
      }));
      const children = await readDirectory(handle, "");
      setState((s) => ({
        ...s,
        rootName: handle.name,
        rootHandle: handle,
        tree: children,
        loading: false,
      }));
      await saveRootHandle(handle);
      void rebuildIndex(handle);
    },
    [rebuildIndex]
  );

  // Restore last workspace folder on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!supportsFsAccess()) {
        setState((s) => ({ ...s, restoring: false }));
        return;
      }
      const handle = await loadRootHandle();
      if (cancelled) return;
      if (!handle) {
        setState((s) => ({ ...s, restoring: false }));
        return;
      }

      const ok = await ensureHandlePermission(handle, "readwrite");
      if (cancelled) return;
      if (ok) {
        await mountHandle(handle);
      } else {
        // Need a click to re-request permission (Chrome security).
        setState((s) => ({
          ...s,
          restoring: false,
          needsPermission: true,
          pendingHandle: handle,
          rootName: handle.name,
        }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mountHandle]);

  const resumePendingFolder = useCallback(async () => {
    const handle = state.pendingHandle;
    if (!handle) return false;
    const ok = await ensureHandlePermission(handle, "readwrite");
    if (!ok) return false;
    await mountHandle(handle);
    return true;
  }, [state.pendingHandle, mountHandle]);

  const openFolder = useCallback(async () => {
    const handle = await pickDirectory();
    if (!handle) return;
    await mountHandle(handle);
  }, [mountHandle]);

  const toggleDirectory = useCallback(async (node: FileNode) => {
    if (node.kind !== "directory") return;

    if (node.expanded) {
      setState((s) => ({
        ...s,
        tree: updateNode(s.tree, node.id, (n) => ({ ...n, expanded: false })),
      }));
      return;
    }

    if (node.loaded) {
      setState((s) => ({
        ...s,
        tree: updateNode(s.tree, node.id, (n) => ({ ...n, expanded: true })),
      }));
      return;
    }

    if (node.id === "loose-files" || !node.handle) {
      setState((s) => ({
        ...s,
        tree: updateNode(s.tree, node.id, (n) => ({
          ...n,
          expanded: true,
          loaded: true,
        })),
      }));
      return;
    }

    const children = await readDirectory(
      node.handle as FileSystemDirectoryHandle,
      node.path
    );
    setState((s) => ({
      ...s,
      tree: updateNode(s.tree, node.id, (n) => ({
        ...n,
        children,
        expanded: true,
        loaded: true,
      })),
    }));
  }, []);

  const closeFolder = useCallback(async () => {
    await clearRootHandle();
    setState((s) => ({
      ...s,
      rootName: null,
      rootHandle: null,
      tree: [],
      fileIndex: [],
      indexing: false,
      needsPermission: false,
      pendingHandle: null,
    }));
  }, []);

  const refresh = useCallback(async () => {
    if (!state.rootHandle) return;
    const handle = state.rootHandle;
    setState((s) => ({ ...s, loading: true, indexing: true }));
    const children = await readDirectory(handle, "");
    setState((s) => ({ ...s, tree: children, loading: false }));
    void rebuildIndex(handle);
  }, [state.rootHandle, rebuildIndex]);

  const addLooseFiles = useCallback((handles: FileSystemFileHandle[]) => {
    setState((s) => {
      const existing = s.tree.find((n) => n.id === "loose-files");
      const looseNodes: FileNode[] = handles.map((h) => ({
        id: uid(),
        name: h.name,
        path: h.name,
        kind: "file" as const,
        handle: h,
      }));

      const looseIndex: FileIndexEntry[] = handles.map((h) => ({
        name: h.name,
        path: h.name,
        kind: "file" as const,
        handle: h,
      }));

      const indexMap = new Map(s.fileIndex.map((e) => [e.path, e]));
      for (const e of looseIndex) indexMap.set(e.path, e);
      const nextIndex = Array.from(indexMap.values());

      if (existing) {
        const names = new Set(existing.children?.map((c) => c.name));
        const merged = [
          ...(existing.children ?? []),
          ...looseNodes.filter((n) => !names.has(n.name)),
        ];
        return {
          ...s,
          fileIndex: nextIndex,
          tree: s.tree.map((n) =>
            n.id === "loose-files"
              ? { ...n, children: merged, expanded: true }
              : n
          ),
        };
      }
      const group: FileNode = {
        id: "loose-files",
        name: "Open Files",
        path: "",
        kind: "directory",
        handle: undefined as unknown as FileSystemDirectoryHandle,
        children: looseNodes,
        expanded: true,
        loaded: true,
      };
      return { ...s, tree: [group, ...s.tree], fileIndex: nextIndex };
    });
  }, []);

  const findInIndex = useCallback(
    (path: string): FileIndexEntry | null => {
      const normalized = path.replace(/\\/g, "/");
      return (
        state.fileIndex.find((e) => e.path === normalized) ||
        state.fileIndex.find(
          (e) => e.path.endsWith("/" + normalized) || e.name === normalized
        ) ||
        null
      );
    },
    [state.fileIndex]
  );

  const filesUnder = useCallback(
    (dirPath: string): FileIndexEntry[] => {
      const prefix = dirPath.replace(/\\/g, "/").replace(/\/$/, "") + "/";
      return state.fileIndex.filter(
        (e) => e.kind === "file" && e.path.startsWith(prefix)
      );
    },
    [state.fileIndex]
  );

  return {
    ...state,
    openFolder,
    closeFolder,
    toggleDirectory,
    refresh,
    addLooseFiles,
    findInIndex,
    filesUnder,
    rebuildIndex,
    resumePendingFolder,
    mountHandle,
  };
}
