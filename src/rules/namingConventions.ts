import { Issue } from "@/types/report";
import { classifyFile } from "@/core/classify";

function hasPascalCase(name: string) {
  return /^[A-Z][A-Za-z0-9]*$/.test(name);
}
function hasKebabCase(name: string) {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(name);
}
function hasCamelOrLower(name: string) {
  return /^[a-z][A-Za-z0-9]*$/.test(name);
}

export function ruleNamingConventions(files: string[]): Issue[] {
  const issues: Issue[] = [];

  for (const f of files) {
    const norm = f.replace(/\\/g, "/");
    const parts = norm.split("/");
    const fileName = parts.at(-1) ?? norm;
    const base = fileName.replace(/\.(ts|tsx|js|jsx|mjs|cjs)$/, "");
    const ext = fileName.split(".").pop() ?? "";

    const kind = classifyFile(norm);

    if (ext === "tsx" && kind === "component") {
      if (!hasPascalCase(base)) {
        issues.push({
          id: "NAMING-COMP-001",
          severity: "medium",
          title: "Componente con nombre no PascalCase",
          explanation:
            "Convención recomendada: componentes React en PascalCase (ej: UserCard.tsx). Esto hace más fácil distinguir UI de lógica.",
          evidence: { file: norm, expected: "PascalCase.tsx" },
        });
      }
    }

    if (kind === "hook") {
      if (!/^use[A-Z]/.test(base)) {
        issues.push({
          id: "NAMING-HOOK-001",
          severity: "medium",
          title: "Hook con nombre no estándar",
          explanation:
            "Convención recomendada: hooks comienzan con useXxx (ej: useCreateVoucher.ts). Evita confusiones y mejora autocompletado.",
          evidence: { file: norm, expected: "useXxx.ts" },
        });
      }
    }

    function isDotSuffixValid(base: string, kind: "service" | "api" | "util") {
      // permite: user.service, user.utils, auth.api, etc.
      const parts = base.split(".");
      if (parts.length !== 2) return false;

      const [name, suffix] = parts;
      if (!name || !suffix) return false;

      // nombre: kebab-case
      if (!hasKebabCase(name)) return false;

      if (kind === "service") return suffix === "service";
      if (kind === "api") return suffix === "api";
      if (kind === "util") return suffix === "util" || suffix === "utils";

      return false;
    }

    if (kind === "service" || kind === "api" || kind === "util") {
      const k = kind; // para TS narrow
      const ok = isDotSuffixValid(base, k) || hasKebabCase(base); // opcional: permitir utilidades sin sufijo (ej: format-date.ts)

      if (!ok) {
        issues.push({
          id: "NAMING-MOD-001",
          severity: "low",
          title: "Módulo (service/api/util) con nombre fuera de convención",
          explanation:
            "Convención: <kebab-name>.(service|api|util|utils).ts (ej: voucher.service.ts, user.utils.ts). Alternativamente kebab-case sin sufijo para helpers generales.",
          evidence: {
            file: norm,
            expected: "<name>.(service|api|util|utils).ts",
          },
        });
      }
    }

    // Carpetas: kebab-case (o lowerCamel). Esto reduce mezcla de estilos.
    for (const dir of parts.slice(0, -1)) {
      if (dir === "" || dir.startsWith(".") || dir === "src") continue;
      if (!hasKebabCase(dir) && !hasCamelOrLower(dir)) {
        issues.push({
          id: "NAMING-DIR-001",
          severity: "low",
          title: "Carpeta con nombre inconsistente",
          explanation:
            "Carpetas con estilos mezclados generan fricción. Elegí kebab-case o lowerCamel y mantenelo.",
          evidence: { file: norm, dir },
        });
        break;
      }
    }
  }

  return issues;
}
