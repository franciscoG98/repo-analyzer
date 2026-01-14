import { Issue, Report } from "@/types/report";

export function buildBaseIssues(project: Report["project"]): Issue[] {
  const issues: Issue[] = [];

  if (!project.hasESLint) {
    issues.push({
      id: "CFG-ESLINT-001",
      severity: "high",
      title: "No se detectó ESLint",
      explanation: "El repo no parece tener ESLint configurado.",
    });
  }
  if (!project.hasPrettier) {
    issues.push({
      id: "CFG-PRETTIER-001",
      severity: "medium",
      title: "No se detectó Prettier",
      explanation: "Sin Prettier, el formato puede volverse inconsistente.",
    });
  }
  if (project.isNext && !("lint" in project.scripts)) {
    issues.push({
      id: "SCRIPTS-001",
      severity: "low",
      title: "No hay script `lint` en package.json",
      explanation: "Agregar `lint` ayuda a estandarizar checks local/CI.",
      evidence: { scripts: project.scripts },
    });
  }

  return issues;
}
