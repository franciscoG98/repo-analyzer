import fs from "node:fs";
import path from "node:path";
import { Issue } from "@/types/report";

function read(repoRoot: string, rel: string) {
  try {
    return fs.readFileSync(path.join(repoRoot, rel), "utf8");
  } catch {
    return "";
  }
}

export function ruleApiSurface(repoRoot: string, files: string[]): Issue[] {
  const issues: Issue[] = [];

  // 1) Encontrar archivos que probablemente sean "cliente API"
  const apiClientCandidates: string[] = [];

  for (const f of files) {
    if (!/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(f)) continue;
    const src = read(repoRoot, f);
    if (!src) continue;

    const looksLikeClient =
      /create\s*Axios\s*|axios\.create\s*\(/.test(src) ||
      /new\s+GraphQLClient\s*\(/.test(src) ||
      /\bfetch\s*\(/.test(src) && /baseUrl|BASE_URL|process\.env/.test(src);

    const nameHint = /api-client|client\.api|http-client|http\.ts|api\.ts/i.test(f);

    if (looksLikeClient || nameHint) apiClientCandidates.push(f);
  }

  if (apiClientCandidates.length >= 2) {
    issues.push({
      id: "API-DUP-CLIENT-001",
      severity: "high",
      title: "Múltiples candidatos a 'API client' detectados",
      explanation:
        "Cuando hay más de un 'cliente HTTP', aparecen implementaciones distintas (headers, errores, parsing) y se multiplica la divergencia. Elegí un solo API client y hacé que services/hooks dependan de él.",
      evidence: { candidates: apiClientCandidates },
    });
  }

  // 2) Encontrar carpetas 'services' dispersas (señal de fragmentación)
  const servicesPaths = files.filter((f) => f.includes("/services/") || /\.service\.(ts|tsx)$/.test(f));
  const roots = new Set(servicesPaths.map((p) => p.split("/").slice(0, 2).join("/")));

  if (roots.size >= 2) {
    issues.push({
      id: "API-DUP-SERVICES-001",
      severity: "medium",
      title: "Services dispersos en múltiples raíces",
      explanation:
        "Services en varios lugares suelen indicar que no hay una capa de dominio clara. Consolidar (por feature o por dominio) reduce duplicación y simplifica tests.",
      evidence: { roots: Array.from(roots), count: servicesPaths.length },
    });
  }

  return issues;
}
