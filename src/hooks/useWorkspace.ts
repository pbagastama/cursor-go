import { useCallback, useState } from "react";
import type { FileNode } from "@/lib/types";
import {
  pickDirectory,
  readDirectory,
  supportsFsAccess,
} from "@/lib/fileSystem";
import { uid } from "@/lib/utils";

interface WorkspaceState {
  rootName: string | null;
  rootHandle: FileSystemDirectoryHandle | null;
  tree: FileNode[];
  loading: boolean;
  supported: boolean;
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
    loading: false,
    supported: supportsFsAccess(),
  });

  const openFolder = useCallback(async () => {
    const handle = await pickDirectory();
    if (!handle) return;
    setState((s) => ({ ...s, loading: true }));
    const children = await readDirectory(handle, "");
    setState((s) => ({
      ...s,
      rootName: handle.name,
      rootHandle: handle,
      tree: children,
      loading: false,
    }));
  }, []);

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

  const closeFolder = useCallback(() => {
    setState((s) => ({
      ...s,
      rootName: null,
      rootHandle: null,
      tree: [],
    }));
  }, []);

  const refresh = useCallback(async () => {
    if (!state.rootHandle) return;
    setState((s) => ({ ...s, loading: true }));
    const children = await readDirectory(state.rootHandle, "");
    setState((s) => ({ ...s, tree: children, loading: false }));
  }, [state.rootHandle]);

  /** Add loose files (from the picker or drag&drop) as a virtual "Open Files" group. */
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
      if (existing) {
        const names = new Set(existing.children?.map((c) => c.name));
        const merged = [
          ...(existing.children ?? []),
          ...looseNodes.filter((n) => !names.has(n.name)),
        ];
        return {
          ...s,
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
      return { ...s, tree: [group, ...s.tree] };
    });
  }, []);

  return {
    ...state,
    openFolder,
    closeFolder,
    toggleDirectory,
    refresh,
    addLooseFiles,
  };
}
