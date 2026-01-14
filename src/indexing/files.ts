import path from "node:path";
import fs from "node:fs";
import fg from "fast-glob";
import ignore from "ignore";
import { fileSize } from "@/utils/fs";
import { FileInfo } from "@/types/report";

export function loadIgnore(repoRoot: string) {
  const ig = ignore();
  const gi = path.join(repoRoot, ".gitignore");
  if (fs.existsSync(gi)) ig.add(fs.readFileSync(gi, "utf8"));
  ig.add(["node_modules", ".next", "dist", "build", ".turbo", ".git"]);
  return ig;
}

export function extOf(filePath: string) {
  const e = path.extname(filePath).toLowerCase();
  return e || "(no-ext)";
}

export async function listRepoFiles(repoRoot: string) {
  const ig = loadIgnore(repoRoot);
  const all = await fg(["**/*"], {
    cwd: repoRoot,
    dot: true,
    onlyFiles: true,
    followSymbolicLinks: false,
  });
  return all.filter((p) => !ig.ignores(p));
}

export function buildExtStats(files: string[]) {
  const byExt: Record<string, number> = {};
  for (const f of files) {
    const e = extOf(f);
    byExt[e] = (byExt[e] ?? 0) + 1;
  }
  return byExt;
}

export function pickLargest(files: string[], repoRoot: string, n: number): FileInfo[] {
  const infos = files.map((rel) => {
    const abs = path.join(repoRoot, rel);
    return { path: rel, ext: extOf(rel), bytes: fileSize(abs) };
  });
  infos.sort((a, b) => b.bytes - a.bytes);
  return infos.slice(0, n);
}
