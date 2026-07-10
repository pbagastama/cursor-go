import type { FileNode } from "./types";

/** Find a file node by path in a (possibly lazy) tree. */
export function findFileNode(
  nodes: FileNode[],
  path: string
): FileNode | null {
  const normalized = path.replace(/\\/g, "/");
  const base = normalized.split("/").pop()!;

  const walk = (list: FileNode[]): FileNode | null => {
    for (const n of list) {
      if (n.kind === "file") {
        if (
          n.path === normalized ||
          n.path.endsWith("/" + normalized) ||
          n.name === base
        ) {
          return n;
        }
      } else if (n.children?.length) {
        const hit = walk(n.children);
        if (hit) return hit;
      }
    }
    return null;
  };

  return walk(nodes);
}
