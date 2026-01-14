import { Issue, RefactorStep } from "@/types/report";

export function buildRefactorPlan(issues: Issue[]): RefactorStep[] {
  const plan: RefactorStep[] = [];

  const httpIssue = issues.find((i) => i.id === "SERVICE-HTTP-001");
  if (httpIssue) {
    const examples = httpIssue.evidence?.examples?.map((e: any) => e.file) ?? [];

    plan.push({
      title: "Crear un único apiClient y migrar services a usarlo",
      impact: "high",
      files: examples.slice(0, 10),
      rationale:
        "Centralizar HTTP elimina divergencias (headers/auth/errores/parsing) y habilita contract tests. Reduce el costo de refactor futuro.",
      steps: [
        "Crear `app/services/api-client.ts` (o `app/services/http-client.ts`) con: baseUrl, headers, auth, error handling y parseo común.",
        "Definir helpers: `get/post/put/delete` y wrapper `request<T>()` tipado.",
        "Migrar 1 service primero (ej: vouchers.service.ts) y validar que UI no cambie.",
        "Migrar el resto, eliminando duplicación de fetch/headers por archivo.",
      ],
      relatedIssueIds: ["SERVICE-HTTP-001"],
    });
  }

  const dupEndpoints = issues.find((i) => i.id === "API-DUP-ENDPOINT-001");
  if (dupEndpoints) {
    plan.push({
      title: "Consolidar endpoints duplicados por recurso",
      impact: "high",
      rationale:
        "Evita que el mismo recurso tenga funciones duplicadas que divergen con el tiempo. Estabiliza contratos y hace más fáciles los tests.",
      steps: [
        "Agrupar duplicados por recurso (vouchers, reservas, excursiones, etc.).",
        "Elegir un módulo por recurso (ej: vouchers.service.ts) como fuente única.",
        "Eliminar o deprecar funciones duplicadas, y unificar tipos de respuesta.",
      ],
      relatedIssueIds: ["API-DUP-ENDPOINT-001"],
    });
  }

  return plan;
}
