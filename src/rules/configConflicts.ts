import { Issue } from "@/types/report";
import { listExisting, exists } from "@/utils/fs";

export function findConfigConflicts(repoRoot: string): Issue[] {
  const issues: Issue[] = [];

  const eslintFlat = listExisting(repoRoot, ["eslint.config.js", "eslint.config.mjs", "eslint.config.cjs"]);
  const eslintRc = listExisting(repoRoot, [".eslintrc", ".eslintrc.js", ".eslintrc.cjs", ".eslintrc.json", ".eslintrc.yaml", ".eslintrc.yml"]);

  if (eslintFlat.length > 0 && eslintRc.length > 0) {
    issues.push({
      id: "CFG-CONFLICT-ESLINT-001",
      severity: "high",
      title: "ESLint: configs duplicadas (flat config y .eslintrc*)",
      explanation: "Elegí un solo formato de configuración para evitar comportamiento inesperado.",
      evidence: { eslintFlat, eslintRc },
    });
  } else if (eslintRc.length > 1) {
    issues.push({
      id: "CFG-CONFLICT-ESLINT-002",
      severity: "medium",
      title: "ESLint: múltiples archivos .eslintrc* en raíz",
      explanation: "Consolidar en un solo archivo reduce inconsistencias.",
      evidence: { eslintRc },
    });
  }

  const prettierConfigs = listExisting(repoRoot, [
    ".prettierrc",
    ".prettierrc.json",
    ".prettierrc.yaml",
    ".prettierrc.yml",
    ".prettierrc.js",
    ".prettierrc.cjs",
    "prettier.config.js",
    "prettier.config.cjs",
    ".prettier.config.js",
    ".prettier.config.cjs",
  ]);

  if (prettierConfigs.length > 1) {
    issues.push({
      id: "CFG-CONFLICT-PRETTIER-001",
      severity: "high",
      title: "Prettier: múltiples configs detectadas",
      explanation: "Consolidá a un solo archivo para evitar diferencias entre entornos.",
      evidence: { prettierConfigs },
    });
  }

  const nextConfigs = listExisting(repoRoot, ["next.config.js", "next.config.mjs", "next.config.ts"]);
  if (nextConfigs.length > 1) {
    issues.push({
      id: "CFG-CONFLICT-NEXT-001",
      severity: "high",
      title: "Next: múltiples next.config.* detectados",
      explanation: "Debería existir un solo next.config activo.",
      evidence: { nextConfigs },
    });
  }

  const lockfiles = listExisting(repoRoot, ["package-lock.json", "yarn.lock", "pnpm-lock.yaml"]);
  if (lockfiles.length > 1) {
    issues.push({
      id: "CFG-CONFLICT-LOCK-001",
      severity: "high",
      title: "Lockfiles: múltiples lockfiles detectados",
      explanation: "Elegí un solo package manager para reproducibilidad.",
      evidence: { lockfiles },
    });
  }

  const hasTsconfig = exists(repoRoot, "tsconfig.json");
  if (!hasTsconfig) {
    issues.push({
      id: "CFG-TS-001",
      severity: "high",
      title: "TypeScript: falta tsconfig.json en raíz",
      explanation: "En Next + TS es esperado para tooling consistente.",
    });
  }

  return issues;
}
