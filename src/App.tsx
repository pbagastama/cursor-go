import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { UploadCloud } from "lucide-react";

import { ActivityBar, type ActivityView } from "@/components/layout/ActivityBar";
import { TitleBar } from "@/components/layout/TitleBar";
import { StatusBar } from "@/components/layout/StatusBar";
import { FileExplorer } from "@/components/layout/FileExplorer";
import { EditorArea } from "@/components/editor/EditorArea";
import { AiPanel } from "@/components/ai/AiPanel";
import { SettingsDialog } from "@/components/ai/SettingsDialog";
import type { ContextChip } from "@/components/ai/ChatInput";

import { useWorkspace } from "@/hooks/useWorkspace";
import { useEditorTabs } from "@/hooks/useEditorTabs";
import { useChat } from "@/hooks/useChat";
import { useLocalStorage } from "@/hooks/useLocalStorage";

import { pickFiles } from "@/lib/fileSystem";
import { AI_MODELS, DEFAULT_SETTINGS } from "@/lib/ai";
import type { AiSettings, OpenTab } from "@/lib/types";
import { languageFromFilename } from "@/lib/utils";

export default function App() {
  const workspace = useWorkspace();
  const editor = useEditorTabs();
  const chat = useChat();
  const [settings, setSettings] = useLocalStorage<AiSettings>(
    "cursorgo.settings",
    DEFAULT_SETTINGS
  );

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [aiOpen, setAiOpen] = useState(true);
  const [activityView, setActivityView] = useState<ActivityView>("explorer");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(256);
  const [aiWidth, setAiWidth] = useState(380);
  const [dragOver, setDragOver] = useState(false);

  const [contextPaths, setContextPaths] = useState<string[]>([]);

  const connected =
    settings.provider !== "demo" &&
    (settings.provider === "cursor" || !!settings.apiKey);
  const modelLabel =
    AI_MODELS.find((m) => m.id === settings.model)?.label ?? "Auto";

  // --- Open loose files via picker ---
  const openFiles = useCallback(async () => {
    const handles = await pickFiles();
    if (handles.length === 0) return;
    workspace.addLooseFiles(handles);
    for (const h of handles) {
      await editor.openFileHandle(h);
    }
  }, [workspace, editor]);

  // --- Keyboard shortcuts ---
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "i") {
        e.preventDefault();
        setAiOpen((o) => !o);
      } else if (mod && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setSidebarOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // --- Drag & drop files ---
  const onDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const items = Array.from(e.dataTransfer.items);
      const handles: FileSystemFileHandle[] = [];
      for (const item of items) {
        const anyItem = item as any;
        if (typeof anyItem.getAsFileSystemHandle === "function") {
          const handle = await anyItem.getAsFileSystemHandle();
          if (handle && handle.kind === "file") {
            handles.push(handle as FileSystemFileHandle);
          }
        }
      }
      if (handles.length > 0) {
        workspace.addLooseFiles(handles);
        for (const h of handles) await editor.openFileHandle(h);
        return;
      }
      // Fallback: read plain files into virtual tabs.
      const files = Array.from(e.dataTransfer.files);
      for (const f of files) {
        const text = await f.text();
        editor.openVirtual(f.name, text, languageFromFilename(f.name));
      }
    },
    [workspace, editor]
  );

  // --- Context chips ---
  const contextChips: ContextChip[] = useMemo(
    () =>
      contextPaths.map((p) => ({
        id: p,
        name: p.split("/").pop() ?? p,
      })),
    [contextPaths]
  );

  const attachActive = useCallback(() => {
    if (!editor.activeTab) return;
    setContextPaths((prev) =>
      prev.includes(editor.activeTab!.path)
        ? prev
        : [...prev, editor.activeTab!.path]
    );
    setAiOpen(true);
  }, [editor.activeTab]);

  const addTabToChat = useCallback((tab: OpenTab) => {
    setContextPaths((prev) =>
      prev.includes(tab.path) ? prev : [...prev, tab.path]
    );
    setAiOpen(true);
  }, []);

  const removeChip = useCallback((id: string) => {
    setContextPaths((prev) => prev.filter((p) => p !== id));
  }, []);

  const handleSend = useCallback(
    (content: string) => {
      const contextFiles = contextPaths
        .map((path) => {
          const tab = editor.tabs.find((t) => t.path === path);
          return tab ? { path, content: tab.content } : null;
        })
        .filter((x): x is { path: string; content: string } => x !== null);
      chat.send({ content, settings, contextFiles });
    },
    [contextPaths, editor.tabs, chat, settings]
  );

  const setModel = useCallback(
    (model: string) => setSettings((s) => ({ ...s, model })),
    [setSettings]
  );

  // --- Resizers ---
  const startResize = (which: "sidebar" | "ai") => (e: React.PointerEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = which === "sidebar" ? sidebarWidth : aiWidth;
    const move = (ev: PointerEvent) => {
      const delta = ev.clientX - startX;
      if (which === "sidebar") {
        setSidebarWidth(Math.min(480, Math.max(180, startW + delta)));
      } else {
        setAiWidth(Math.min(640, Math.max(300, startW - delta)));
      }
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      document.body.style.cursor = "";
    };
    document.body.style.cursor = "col-resize";
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground"
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={(e) => {
          if (e.currentTarget === e.target) setDragOver(false);
        }}
        onDrop={onDrop}
      >
        <TitleBar
          projectName={workspace.rootName}
          aiOpen={aiOpen}
          onToggleSidebar={() => setSidebarOpen((o) => !o)}
          onToggleAi={() => setAiOpen((o) => !o)}
        />

        <div className="flex min-h-0 flex-1">
          <ActivityBar
            active={activityView}
            sidebarOpen={sidebarOpen}
            aiOpen={aiOpen}
            onSelect={(v) => {
              if (v === activityView && sidebarOpen) setSidebarOpen(false);
              else {
                setActivityView(v);
                setSidebarOpen(true);
              }
            }}
            onToggleAi={() => setAiOpen((o) => !o)}
            onOpenSettings={() => setSettingsOpen(true)}
          />

          <AnimatePresence initial={false}>
            {sidebarOpen && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: sidebarWidth, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="relative shrink-0 overflow-hidden border-r border-border"
                style={{ width: sidebarWidth }}
              >
                <div style={{ width: sidebarWidth }} className="h-full">
                  {activityView === "explorer" ? (
                    <FileExplorer
                      rootName={workspace.rootName}
                      tree={workspace.tree}
                      loading={workspace.loading}
                      supported={workspace.supported}
                      activePath={editor.activeTab?.path ?? null}
                      onOpenFolder={workspace.openFolder}
                      onOpenFiles={openFiles}
                      onCloseFolder={workspace.closeFolder}
                      onRefresh={workspace.refresh}
                      onToggle={workspace.toggleDirectory}
                      onOpenFile={editor.openFile}
                    />
                  ) : (
                    <PlaceholderPanel view={activityView} />
                  )}
                </div>
                <div
                  onPointerDown={startResize("sidebar")}
                  className="absolute right-0 top-0 z-10 h-full w-1 cursor-col-resize hover:bg-primary/40"
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex min-w-0 flex-1 flex-col">
            <EditorArea
              tabs={editor.tabs}
              activeId={editor.activeId}
              activeTab={editor.activeTab}
              supported={workspace.supported}
              onSelect={editor.setActiveId}
              onClose={editor.closeTab}
              onChange={editor.updateContent}
              onSave={editor.saveTab}
              onOpenFolder={workspace.openFolder}
              onOpenFiles={openFiles}
              onOpenAi={() => setAiOpen(true)}
              onAddToChat={addTabToChat}
            />
          </div>

          <AnimatePresence initial={false}>
            {aiOpen && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: aiWidth, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="relative shrink-0 overflow-hidden border-l border-border"
                style={{ width: aiWidth }}
              >
                <div
                  onPointerDown={startResize("ai")}
                  className="absolute left-0 top-0 z-10 h-full w-1 cursor-col-resize hover:bg-primary/40"
                />
                <div style={{ width: aiWidth }} className="h-full">
                  <AiPanel
                    messages={chat.messages}
                    isStreaming={chat.isStreaming}
                    model={settings.model}
                    connected={connected}
                    contextChips={contextChips}
                    canAttach={!!editor.activeTab}
                    onSend={handleSend}
                    onStop={chat.stop}
                    onClear={chat.clear}
                    onModelChange={setModel}
                    onRemoveChip={removeChip}
                    onAttachActive={attachActive}
                    onOpenSettings={() => setSettingsOpen(true)}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <StatusBar
          activeTab={editor.activeTab}
          modelLabel={modelLabel}
          connected={connected}
        />

        {editor.notice && (
          <div className="pointer-events-none fixed bottom-9 left-1/2 z-50 -translate-x-1/2">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg border border-border bg-popover px-4 py-2 text-sm shadow-xl"
            >
              {editor.notice}
            </motion.div>
          </div>
        )}

        <AnimatePresence>
          {dragOver && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center bg-primary/10 backdrop-blur-sm"
            >
              <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-primary bg-card/90 px-10 py-8 shadow-2xl">
                <UploadCloud className="h-10 w-10 text-primary" />
                <p className="text-sm font-medium">Lepaskan file untuk membukanya</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={settings}
        onSave={setSettings}
      />
    </TooltipProvider>
  );
}

function PlaceholderPanel({ view }: { view: ActivityView }) {
  const label = view === "search" ? "Search" : "Source Control";
  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="flex h-9 items-center px-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      </div>
      <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground">
        Panel {label} akan segera hadir.
      </div>
    </div>
  );
}
