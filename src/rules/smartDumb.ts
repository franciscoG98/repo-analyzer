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

export function ruleSmartDumb(repoRoot: string, files: string[]): Issue[] {
  const issues: Issue[] = [];

  for (const f of files) {
    if (!f.endsWith(".tsx")) continue;
    const kind = classifyFile(f);
    if (kind !== "component" && kind !== "page") continue;

    const src = read(repoRoot, f);
    if (!src) continue;

    const hasFetch = /\bfetch\s*\(|\baxios\./.test(src);
    const hasState = /\buseState\s*\(|\buseReducer\s*\(|\buseEffect\s*\(/.test(src);
    const hasFormattingLogic = /\bdate-fns\b|format\(|parseISO\(|toLocaleString\(/.test(src);
    const hasMappingHeavy = /map\(|reduce\(|filter\(/.test(src);
    const importsServices = /from\s+["'][^"']*(\/services\/|\.service)["']/.test(src);

    const smartScore = [hasFetch, importsServices, hasState, hasMappingHeavy, hasFormattingLogic].filter(Boolean).length;

    if (smartScore >= 3) {
      issues.push({
        id: "UI-SMART-001",
        severity: "low",
        title: "Componente probablemente ‘smart’ (mucha lógica/efectos)",
        explanation:
          "Si este componente crece, conviene extraer lógica a hook/service y dejar un componente ‘dumb’ presentacional. Esto reduce duplicación y mejora testabilidad.",
        evidence: { file: f, smartScore, signals: { hasFetch, importsServices, hasState, hasMappingHeavy, hasFormattingLogic } },
      });
    }
  }

  return issues;
}
