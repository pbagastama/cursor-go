import { useCallback, useRef, useState } from "react";
import type { FileNode, OpenTab } from "@/lib/types";
import { readFileContent, writeFileContent } from "@/lib/fileSystem";
import { languageFromFilename, uid } from "@/lib/utils";

export function useEditorTabs() {
  const [tabs, setTabs] = useState<OpenTab[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Ref kept in sync with tabs so callbacks always read the latest value.
  const tabsRef = useRef<OpenTab[]>(tabs);
  tabsRef.current = tabs;

  const openFile = useCallback(async (node: FileNode) => {
    if (node.kind !== "file") return;

    // Focus if already open.
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

  const activeTab = tabs.find((t) => t.id === activeId) ?? null;

  return {
    tabs,
    activeId,
    activeTab,
    notice,
    setActiveId,
    openFile,
    openFileHandle,
    openVirtual,
    updateContent,
    closeTab,
    saveTab,
  };
}
