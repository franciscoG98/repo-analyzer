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

export function ruleLayering(repoRoot: string, files: string[]): Issue[] {
  const issues: Issue[] = [];

  for (const f of files) {
    if (!/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(f)) continue;
    const kind = classifyFile(f);
    const src = read(repoRoot, f);
    if (!src) continue;

    const hasFetchLike = /\bfetch\s*\(|\baxios\./.test(src);
    const importsServices = /from\s+["'][^"']*(\/services\/|\.service)["']/.test(src);
    const importsApi = /from\s+["'][^"']*(\/api\/|\.api)["']/.test(src);

    // 1) Component/page no debería pegarle directo a API (ideal: usar service o hook)
    if ((kind === "component" || kind === "page") && hasFetchLike) {
      issues.push({
        id: "ARCH-LAYER-001",
        severity: "high",
        title: "UI llamando directo a API (fetch/axios)",
        explanation:
          "Cuando componentes/páginas hacen fetch/axios directo, terminás con múltiples variantes de la misma llamada. Recomendación: centralizar en services (o hooks) y que UI solo consuma funciones tipadas.",
        evidence: { file: f },
      });
    }

    // 2) UI importando services está ok si es vía hooks; pero si hay fetch + imports de services, suele ser mezcla
    if ((kind === "component" || kind === "page") && importsServices && hasFetchLike) {
      issues.push({
        id: "ARCH-LAYER-002",
        severity: "medium",
        title: "UI mezcla service imports + fetch/axios",
        explanation:
          "Esto suele indicar duplicación: parte del flujo usa service y parte hace request directo. Consolidá para evitar divergencias.",
        evidence: { file: f },
      });
    }

    // 3) Services que importan componentes (acoplamiento invertido)
    if ((kind === "service" || kind === "api") && /from\s+["'][^"']*\/components\//.test(src)) {
      issues.push({
        id: "ARCH-LAYER-003",
        severity: "high",
        title: "Service/API importando UI (acoplamiento incorrecto)",
        explanation:
          "Las capas de lógica/persistencia no deberían depender de UI. Esto rompe reutilización y testabilidad.",
        evidence: { file: f },
      });
    }

    // 4) Services importando páginas/app (otro acoplamiento fuerte)
    if ((kind === "service" || kind === "api") && /from\s+["'][^"']*\/app\//.test(src)) {
      issues.push({
        id: "ARCH-LAYER-004",
        severity: "high",
        title: "Service/API importando app/pages",
        explanation:
          "La capa service debería ser consumida por UI, no al revés. Es señal de arquitectura invertida.",
        evidence: { file: f },
      });
    }

    // 5) Componentes importando API directo (aunque no haya fetch): suele esconder duplicación
    if ((kind === "component" || kind === "page") && importsApi) {
      issues.push({
        id: "ARCH-LAYER-005",
        severity: "medium",
        title: "UI importando módulo API directo",
        explanation:
          "Recomendación: UI -> hooks -> services -> api/client. Esto estabiliza contratos y facilita tests.",
        evidence: { file: f },
      });
    }
  }

  return issues;
}
