import { Issue, TestHint } from "@/types/report";

export function buildTestHints(issues: Issue[]): TestHint[] {
  const hints: TestHint[] = [];

  for (const i of issues) {
    const file = i.evidence?.file;
    if (!file) continue;

    if (i.id.startsWith("ARCH-LAYER-001") || i.id.startsWith("ARCH-LAYER-005")) {
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
