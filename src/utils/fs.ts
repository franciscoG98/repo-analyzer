import fs from "node:fs";
import path from "node:path";

export function readJson<T>(p: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8")) as T;
  } catch {
    return null;
  }
}

export function exists(repoRoot: string, rel: string) {
  return fs.existsSync(path.join(repoRoot, rel));
}

export function listExisting(repoRoot: string, rels: string[]) {
  return rels.filter((r) => exists(repoRoot, r));
}

export function fileSize(absPath: string) {
  try {
    return fs.statSync(absPath).size;
  } catch {
    return 0;
  }
}
