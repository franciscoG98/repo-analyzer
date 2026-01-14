import { Issue, TestHint } from "@/types/report";

export function buildTestHints(issues: Issue[]): TestHint[] {
  const hints: TestHint[] = [];

  for (const i of issues) {
    const file = i.evidence?.file;
    if (!file) continue;

    if (i.id === "SERVICE-HTTP-001") {
      hints.push({
        target: "app/services (api-client)",
        type: "contract",
        why: "Muchos services hacen HTTP directo: riesgo alto de divergencias.",
        suggestion:
          "Crear apiClient único y testearlo con MSW: 200/400/401/500, parsing de JSON, y headers (Authorization, Content-Type). Luego unit tests de services contra el apiClient mockeado.",
      });
    }

    if (i.id === "SERVICE-HTTP-001" || i.id === "SERVICE-HTTP-002") {
      const fileOrExamples =
        i.evidence?.examples?.[0]?.file ?? i.evidence?.candidates?.[0] ?? file;

      hints.push({
        target: fileOrExamples,
        type: "contract",
        why: "Hay inconsistencias en cómo se hacen requests en services.",
        suggestion:
          "Crear un apiClient único y testear: (1) headers/auth, (2) manejo de errores, (3) parsing y tipos. Usar MSW para simular respuestas.",
      });
    }

    if (
      i.id.startsWith("ARCH-LAYER-001") ||
      i.id.startsWith("ARCH-LAYER-005")
    ) {
      hints.push({
        target: file,
        type: "integration",
        why: "La UI está acoplada a llamadas HTTP; es propensa a divergencias.",
        suggestion:
          "Extraer a service/hook y testear con MSW (mock service worker) o mocks del cliente HTTP. Dejar UI con tests de render.",
      });
    }

    if (i.id.startsWith("UI-SMART-001")) {
      hints.push({
        target: file,
        type: "unit",
        why: "Componente con lógica alta suele romperse con refactors.",
        suggestion:
          "Extraer lógica a hook puro o funciones utilitarias y testear esas funciones/hooks con Vitest/Jest. UI: tests de snapshot/RTL mínimos.",
      });
    }
  }

  return hints.slice(0, 30);
}
