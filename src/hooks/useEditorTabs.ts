import { useCallback, useEffect, useRef, useState } from "react";
import type { FileNode, OpenTab } from "@/lib/types";
import { readFileContent, writeFileContent } from "@/lib/fileSystem";
import {
  applyRangedEdit,
  resolveEditTarget,
  type FileEdit,
} from "@/lib/fileEdits";
import {
  clearTabsState,
  getFileHandleByPath,
  loadTabsState,
  saveTabsState,
  type PersistedTab,
} from "@/lib/sessionStore";
import { languageFromFilename, uid } from "@/lib/utils";

export function useEditorTabs() {
  const [tabs, setTabs] = useState<OpenTab[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);

  const tabsRef = useRef<OpenTab[]>(tabs);
  tabsRef.current = tabs;
  const activeIdRef = useRef(activeId);
  activeIdRef.current = activeId;

  // Persist open tabs whenever they change (after initial restore).
  useEffect(() => {
    if (!sessionReady) return;
    const payload = {
      tabs: tabsRef.current.map(
        (t): PersistedTab => ({
          path: t.path,
          name: t.name,
          // Persist buffer when dirty or ephemeral so edits survive refresh.
          content: t.dirty || t.ephemeral ? t.content : undefined,
          dirty: t.dirty,
          ephemeral: t.ephemeral,
          language: t.language,
        })
      ),
      activePath:
        tabsRef.current.find((t) => t.id === activeIdRef.current)?.path ?? null,
    };
    saveTabsState(payload);
  }, [tabs, activeId, sessionReady]);

  const openFile = useCallback(async (node: FileNode) => {
    if (node.kind !== "file") return;

    const existing = tabsRef.current.find((t) => t.path === node.path);
    if (existing) {
      setActiveId(existing.id);
      return;
    }

    const { content, tooLarge, size } = await readFileContent(
      node.handle as FileSystemFileHandle
    );
    if (tooLarge) {
      setNotice(`File "${node.name}" terlalu besar untuk dibuka (>2MB).`);
      setTimeout(() => setNotice(null), 4000);
      return;
    }

    const tab: OpenTab = {
      id: uid(),
      name: node.name,
      path: node.path,
      language: languageFromFilename(node.name),
      content,
      original: content,
      handle: node.handle as FileSystemFileHandle,
      dirty: false,
      size,
    };
    setTabs((t) => [...t, tab]);
    setActiveId(tab.id);
  }, []);

  const openFileHandle = useCallback(async (handle: FileSystemFileHandle) => {
    const existing = tabsRef.current.find((t) => t.name === handle.name);
    if (existing) {
      setActiveId(existing.id);
      return;
    }
    const { content, tooLarge } = await readFileContent(handle);
    if (tooLarge) return;
    const tab: OpenTab = {
      id: uid(),
      name: handle.name,
      path: handle.name,
      language: languageFromFilename(handle.name),
      content,
      original: content,
      handle,
      dirty: false,
      ephemeral: true,
    };
    setTabs((t) => [...t, tab]);
    setActiveId(tab.id);
  }, []);

  const openVirtual = useCallback(
    (name: string, content: string, language?: string) => {
      const tab: OpenTab = {
        id: uid(),
        name,
        path: name,
        language: language ?? languageFromFilename(name),
        content,
        original: content,
        dirty: false,
        ephemeral: true,
      };
      setTabs((t) => [...t, tab]);
      setActiveId(tab.id);
    },
    []
  );

  const updateContent = useCallback((id: string, content: string) => {
    setTabs((t) =>
      t.map((tab) =>
        tab.id === id
          ? { ...tab, content, dirty: content !== tab.original }
          : tab
      )
    );
  }, []);

  const closeTab = useCallback(
    (id: string) => {
      setTabs((t) => {
        const idx = t.findIndex((tab) => tab.id === id);
        const next = t.filter((tab) => tab.id !== id);
        if (activeId === id) {
          const fallback = next[idx] ?? next[idx - 1] ?? next[0] ?? null;
          setActiveId(fallback?.id ?? null);
        }
        return next;
      });
    },
    [activeId]
  );

  const saveTab = useCallback(async (id: string) => {
    const tab = tabsRef.current.find((t) => t.id === id);
    if (!tab || !tab.handle) {
      setNotice("File ini tidak terhubung ke disk (read-only).");
      setTimeout(() => setNotice(null), 3000);
      return false;
    }
    const ok = await writeFileContent(tab.handle, tab.content);
    if (ok) {
      setTabs((t) =>
        t.map((x) =>
          x.id === id ? { ...x, original: x.content, dirty: false } : x
        )
      );
      setNotice(`Tersimpan: ${tab.name}`);
      setTimeout(() => setNotice(null), 2000);
    } else {
      setNotice(`Gagal menyimpan ${tab.name}.`);
      setTimeout(() => setNotice(null), 3000);
    }
    return ok;
  }, []);

  const applyEdit = useCallback(
    async (edit: FileEdit, opts?: { autoSave?: boolean }) => {
      let target = resolveEditTarget(edit.path, tabsRef.current);
      let nextContent = edit.content;

      if (target && edit.startLine != null && edit.endLine != null) {
        nextContent = applyRangedEdit(
          target.content,
          edit.startLine,
          edit.endLine,
          edit.content
        );
      }

      if (!target) {
        const name = edit.path.split("/").pop() || edit.path;
        const tab: OpenTab = {
          id: uid(),
          name,
          path: edit.path,
          language: edit.language || languageFromFilename(name),
          content: nextContent,
          original: "",
          dirty: true,
          ephemeral: true,
        };
        setTabs((t) => [...t, tab]);
        setActiveId(tab.id);
        setNotice(`Dibuat dari AI: ${name}`);
        setTimeout(() => setNotice(null), 2500);
        return tab.id;
      }

      setTabs((t) =>
        t.map((x) =>
          x.id === target!.id
            ? {
                ...x,
                content: nextContent,
                dirty: nextContent !== x.original,
              }
            : x
        )
      );
      setActiveId(target.id);

      if (opts?.autoSave && target.handle) {
        const ok = await writeFileContent(target.handle, nextContent);
        if (ok) {
          setTabs((t) =>
            t.map((x) =>
              x.id === target!.id
                ? {
                    ...x,
                    content: nextContent,
                    original: nextContent,
                    dirty: false,
                  }
                : x
            )
          );
          setNotice(`Applied & saved: ${target.name}`);
        } else {
          setNotice(`Applied (unsaved): ${target.name}`);
        }
      } else {
        setNotice(`Applied: ${target.name}`);
      }
      setTimeout(() => setNotice(null), 2500);
      return target.id;
    },
    []
  );

  /**
   * Restore tabs from localStorage using the workspace root handle.
   * Call once after the folder is mounted / permission granted.
   */
  const restoreSession = useCallback(
    async (root: FileSystemDirectoryHandle | null) => {
      const saved = loadTabsState();
      if (!saved || saved.tabs.length === 0) {
        setSessionReady(true);
        return;
      }

      const restored: OpenTab[] = [];
      for (const p of saved.tabs) {
        // Prefer disk content; fall back to saved buffer for dirty/ephemeral.
        let handle: FileSystemFileHandle | undefined;
        let content = p.content ?? "";
        let original = content;
        let dirty = !!p.dirty;
        let size: number | undefined;

        if (root && !p.ephemeral) {
          const fh = await getFileHandleByPath(root, p.path);
          if (fh) {
            handle = fh;
            try {
              const read = await readFileContent(fh);
              if (!read.tooLarge) {
                if (p.dirty && p.content != null) {
                  content = p.content;
                  original = read.content;
                  dirty = content !== original;
                } else {
                  content = read.content;
                  original = read.content;
                  dirty = false;
                }
                size = read.size;
              }
            } catch {
              // keep saved content
            }
          }
        }

        // Skip tabs we can't restore at all
        if (!handle && p.content == null && !p.ephemeral) continue;

        restored.push({
          id: uid(),
          name: p.name,
          path: p.path,
          language: p.language || languageFromFilename(p.name),
          content,
          original,
          handle,
          dirty,
          size,
          ephemeral: p.ephemeral || !handle,
        });
      }

      if (restored.length > 0) {
        setTabs(restored);
        const active =
          restored.find((t) => t.path === saved.activePath) ?? restored[0];
        setActiveId(active.id);
      }
      setSessionReady(true);
    },
    []
  );

  const clearSession = useCallback(() => {
    clearTabsState();
    setTabs([]);
    setActiveId(null);
  }, []);

  /** Mark session ready without restoring (e.g. no folder). */
  const markSessionReady = useCallback(() => {
    setSessionReady(true);
  }, []);

  const activeTab = tabs.find((t) => t.id === activeId) ?? null;

  return {
    tabs,
    activeId,
    activeTab,
    notice,
    sessionReady,
    setActiveId,
    openFile,
    openFileHandle,
    openVirtual,
    updateContent,
    closeTab,
    saveTab,
    applyEdit,
    restoreSession,
    clearSession,
    markSessionReady,
  };
}
