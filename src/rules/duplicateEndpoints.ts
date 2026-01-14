import fs from "node:fs";
import path from "node:path";
import { Issue } from "@/types/report";
import { classifyFile } from "@/core/classify";

function read(repoRoot: string, rel: string) {
  try {
    return fs.readFileSync(path.join(repoRoot, rel), "utf8");
  } catch {
    return "";
  }
}

/**
 * Extrae strings que parezcan endpoints:
 * - "/api/...."
 * - puede incluir ${...} o querystring
 */
function extractApiPaths(src: string): string[] {
  const matches = src.match(/["'`]\s*\/api\/[^"'`]+["'`]/g) ?? [];
  return matches.map((m) => m.replace(/["'`]/g, "").trim());
}

/**
 * Normaliza endpoints para agrupar:
 * - quita querystring
 * - reemplaza ${...} por :param
 * - colapsa números a :id (opcional)
 */
function normalizeEndpoint(ep: string) {
  const noQuery = ep.split("?")[0];
  return noQuery
    .replace(/\$\{[^}]+\}/g, ":param")
    .replace(/\/\d+/g, "/:id");
}

export function ruleDuplicateEndpoints(repoRoot: string, files: string[]): Issue[] {
  const issues: Issue[] = [];

  const serviceFiles = files.filter((f) => classifyFile(f) === "service" && /\.(ts|tsx|js|jsx)$/.test(f));

  const map = new Map<string, Set<string>>(); // normalizedEndpoint -> files

  for (const f of serviceFiles) {
    const src = read(repoRoot, f);
    if (!src) continue;

    const eps = extractApiPaths(src);
    for (const raw of eps) {
      const norm = normalizeEndpoint(raw);
      if (!map.has(norm)) map.set(norm, new Set());
      map.get(norm)!.add(f);
    }
  }

  const duplicates = Array.from(map.entries())
    .map(([endpoint, filesSet]) => ({ endpoint, files: Array.from(filesSet), count: filesSet.size }))
    .filter((x) => x.count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, 30);

  if (duplicates.length > 0) {
    issues.push({
      id: "API-DUP-ENDPOINT-001",
      severity: "high",
      title: "Endpoints duplicados en múltiples services",
      explanation:
        "El mismo endpoint (o el mismo recurso) aparece en varios services. Esto es señal de funciones duplicadas con pequeñas variantes (headers, parsing, params). Consolidar por recurso reduce bugs futuros.",
      evidence: { duplicates },
    });
  }

  return issues;
}
