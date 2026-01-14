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

// heurística: detecta strings tipo "/api/...", "https://...", y también `${process.env.X}`
function extractUrlHints(src: string): string[] {
  const out = new Set<string>();

  const http = src.match(/https?:\/\/[^\s"'`]+/g) ?? [];
  http.forEach((u) => out.add(u));

  const apiLike = src.match(/["'`]\s*\/api\/[^"'`]+["'`]/g) ?? [];
  apiLike.forEach((s) => out.add(s.replace(/["'`]/g, "").trim()));

  const env = src.match(/process\.env\.[A-Z0-9_]+/g) ?? [];
  env.forEach((e) => out.add(e));

  return Array.from(out).slice(0, 10);
}

export function ruleServiceHttpConsistency(repoRoot: string, files: string[]): Issue[] {
  const issues: Issue[] = [];

  const serviceFiles = files.filter((f) => classifyFile(f) === "service" && /\.(ts|tsx|js|jsx)$/.test(f));

  // 1) Services que hacen fetch/axios directo
  const servicesWithDirectHttp: Array<{ file: string; urlHints: string[] }> = [];

  // 2) Señales de que existe un "cliente" común (fetchers.service.ts, api-client, http-client, etc.)
  const clientCandidates: string[] = [];

  for (const f of serviceFiles) {
    const src = read(repoRoot, f);
    if (!src) continue;

    const hasHttp =
      /\bfetch\s*\(/.test(src) ||
      /\baxios\./.test(src) ||
      /\bnew\s+GraphQLClient\b/.test(src) ||
      /\bky\s*\(/.test(src);

    if (hasHttp) {
      servicesWithDirectHttp.push({ file: f, urlHints: extractUrlHints(src) });
    }

    const looksLikeClient =
      /axios\.create\s*\(/.test(src) ||
      /const\s+\w+\s*=\s*async\s*\(.*\)\s*=>\s*fetch\s*\(/s.test(src) && /headers|Authorization|Content-Type/.test(src) ||
      /baseUrl|BASE_URL|process\.env\./.test(src) && /\bfetch\s*\(/.test(src);

    const nameHint = /(fetchers|api-client|http-client|client)\.service\.ts$/i.test(f);

    if (looksLikeClient || nameHint) clientCandidates.push(f);
  }

  // Si hay muchos services con fetch directo => inconsistencia probable
  if (servicesWithDirectHttp.length >= 3) {
    issues.push({
      id: "SERVICE-HTTP-001",
      severity: "high",
      title: "Muchos services hacen HTTP directo (probable inconsistencia de client/headers/errores)",
      explanation:
        "Cuando cada service hace fetch a mano, terminás con variantes de headers, manejo de errores y parsing. Recomendación: crear un único apiClient (ej: fetcher) y que los services lo usen.",
      evidence: {
        count: servicesWithDirectHttp.length,
        examples: servicesWithDirectHttp.slice(0, 8),
      },
    });
  }

  // Múltiples candidatos a apiClient dentro de services
  if (clientCandidates.length >= 2) {
    issues.push({
      id: "SERVICE-HTTP-002",
      severity: "high",
      title: "Múltiples candidatos a 'api client' dentro de services",
      explanation:
        "Más de un helper de HTTP suele duplicar manejo de auth, baseUrl, retries y errores. Consolidá en uno solo.",
      evidence: { candidates: clientCandidates },
    });
  }

  // Base URL / env dispersa: muchas variables env distintas dentro de services
  const envKeys = new Map<string, Set<string>>(); // envKey -> files
  for (const s of servicesWithDirectHttp) {
    for (const hint of s.urlHints) {
      if (hint.startsWith("process.env.")) {
        if (!envKeys.has(hint)) envKeys.set(hint, new Set());
        envKeys.get(hint)!.add(s.file);
      }
    }
  }

  if (envKeys.size >= 2) {
    const top = Array.from(envKeys.entries())
      .map(([k, v]) => ({ env: k, usedIn: Array.from(v).slice(0, 6), count: v.size }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    issues.push({
      id: "SERVICE-HTTP-003",
      severity: "medium",
      title: "Base URL / env vars dispersas en services",
      explanation:
        "Si distintos services usan distintas env vars para URLs, es fácil que queden inconsistentes. Centralizá la configuración (un solo lugar) y consumila desde el apiClient.",
      evidence: { envVars: top },
    });
  }

  return issues;
}
