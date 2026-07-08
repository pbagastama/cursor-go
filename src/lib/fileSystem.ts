import type { FileNode } from "./types";
import { uid } from "./utils";

/** Whether the browser supports the File System Access API. */
export function supportsFsAccess(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

const IGNORED = new Set([
  ".git",
  "node_modules",
  ".next",
  "dist",
  "build",
  ".cache",
  ".turbo",
  ".DS_Store",
  ".vite",
]);

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB safety cap for reading into the editor

export async function pickDirectory(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const handle = await (window as any).showDirectoryPicker({
      mode: "readwrite",
    });
    return handle as FileSystemDirectoryHandle;
  } catch {
    return null;
  }
}

export async function pickFiles(): Promise<FileSystemFileHandle[]> {
  try {
    const handles = await (window as any).showOpenFilePicker({ multiple: true });
    return handles as FileSystemFileHandle[];
  } catch {
    return [];
  }
}

async function verifyPermission(
  handle: FileSystemFileHandle,
  readWrite: boolean
): Promise<boolean> {
  const opts = readWrite ? { mode: "readwrite" } : { mode: "read" };
  const h = handle as any;
  if ((await h.queryPermission(opts)) === "granted") return true;
  if ((await h.requestPermission(opts)) === "granted") return true;
  return false;
}

/** Read one level of directory entries into FileNodes (lazy loading). */
export async function readDirectory(
  dirHandle: FileSystemDirectoryHandle,
  parentPath: string
): Promise<FileNode[]> {
  const nodes: FileNode[] = [];
  const entries = (dirHandle as any).entries();
  for await (const [name, handle] of entries as AsyncIterable<
    [string, FileSystemFileHandle | FileSystemDirectoryHandle]
  >) {
    if (IGNORED.has(name)) continue;
    const path = parentPath ? `${parentPath}/${name}` : name;
    if (handle.kind === "directory") {
      nodes.push({
        id: uid(),
        name,
        path,
        kind: "directory",
        handle,
        children: [],
        expanded: false,
        loaded: false,
      });
    } else {
      nodes.push({
        id: uid(),
        name,
        path,
        kind: "file",
        handle,
      });
    }
  }
  nodes.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "directory" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  return nodes;
}

export async function readFileContent(
  handle: FileSystemFileHandle
): Promise<{ content: string; size: number; tooLarge: boolean }> {
  const file = await handle.getFile();
  if (file.size > MAX_FILE_SIZE) {
    return { content: "", size: file.size, tooLarge: true };
  }
  const content = await file.text();
  return { content, size: file.size, tooLarge: false };
}

export async function writeFileContent(
  handle: FileSystemFileHandle,
  content: string
): Promise<boolean> {
  try {
    if (!(await verifyPermission(handle, true))) return false;
    const writable = await (handle as any).createWritable();
    await writable.write(content);
    await writable.close();
    return true;
  } catch (e) {
    console.error("write failed", e);
    return false;
  }
}
