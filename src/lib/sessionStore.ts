/**
 * Persist workspace folder handle (IndexedDB) + open tabs (localStorage)
 * so refresh / reopen keeps the last session — similar to VS Code / Cursor.
 */

const DB_NAME = "cursorgo-session";
const DB_VERSION = 1;
const STORE = "handles";
const ROOT_KEY = "workspace-root";

const TABS_KEY = "cursorgo.openTabs";
const UI_KEY = "cursorgo.ui";

export interface PersistedTab {
  path: string;
  name: string;
  /** Saved buffer (used when dirty or ephemeral). */
  content?: string;
  dirty?: boolean;
  ephemeral?: boolean;
  language?: string;
}

export interface PersistedTabsState {
  tabs: PersistedTab[];
  activePath: string | null;
}

export interface PersistedUiState {
  sidebarOpen?: boolean;
  aiOpen?: boolean;
  sidebarWidth?: number;
  aiWidth?: number;
  expandedPaths?: string[];
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveRootHandle(
  handle: FileSystemDirectoryHandle
): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(handle, ROOT_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch (e) {
    console.warn("saveRootHandle failed", e);
  }
}

export async function loadRootHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openDb();
    const handle = await new Promise<FileSystemDirectoryHandle | null>(
      (resolve, reject) => {
        const tx = db.transaction(STORE, "readonly");
        const req = tx.objectStore(STORE).get(ROOT_KEY);
        req.onsuccess = () =>
          resolve((req.result as FileSystemDirectoryHandle) ?? null);
        req.onerror = () => reject(req.error);
      }
    );
    db.close();
    return handle;
  } catch {
    return null;
  }
}

export async function clearRootHandle(): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(ROOT_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // ignore
  }
}

export async function ensureHandlePermission(
  handle: FileSystemHandle,
  mode: "read" | "readwrite" = "readwrite"
): Promise<boolean> {
  const h = handle as any;
  const opts = { mode };
  try {
    if ((await h.queryPermission?.(opts)) === "granted") return true;
    if ((await h.requestPermission?.(opts)) === "granted") return true;
  } catch {
    // Some browsers only allow requestPermission from a user gesture.
  }
  return false;
}

/** Resolve a relative path under a directory handle. */
export async function getFileHandleByPath(
  root: FileSystemDirectoryHandle,
  filePath: string
): Promise<FileSystemFileHandle | null> {
  const parts = filePath.replace(/\\/g, "/").split("/").filter(Boolean);
  if (parts.length === 0) return null;
  try {
    let dir: FileSystemDirectoryHandle = root;
    for (let i = 0; i < parts.length - 1; i++) {
      dir = await dir.getDirectoryHandle(parts[i]);
    }
    return await dir.getFileHandle(parts[parts.length - 1]);
  } catch {
    return null;
  }
}

export function saveTabsState(state: PersistedTabsState): void {
  try {
    localStorage.setItem(TABS_KEY, JSON.stringify(state));
  } catch {
    // quota
  }
}

export function loadTabsState(): PersistedTabsState | null {
  try {
    const raw = localStorage.getItem(TABS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedTabsState;
  } catch {
    return null;
  }
}

export function clearTabsState(): void {
  try {
    localStorage.removeItem(TABS_KEY);
  } catch {
    // ignore
  }
}

export function saveUiState(state: PersistedUiState): void {
  try {
    localStorage.setItem(UI_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function loadUiState(): PersistedUiState | null {
  try {
    const raw = localStorage.getItem(UI_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedUiState;
  } catch {
    return null;
  }
}
