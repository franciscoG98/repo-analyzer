import { Issue, TestHint } from "@/types/report";

function hintKey(h: TestHint) {
  return `${h.type}::${h.target}::${h.why}`;
}

export function buildTestHints(issues: Issue[]): TestHint[] {
  const hints: TestHint[] = [];
  const seen = new Set<string>();

  function push(h: TestHint) {
    const k = hintKey(h);
    if (seen.has(k)) return;
    seen.add(k);
    hints.push(h);
  }

  for (const i of issues) {
    const file = i.evidence?.file as string | undefined;

    // 1) HTTP inconsistente (global / capa)
    if (i.id === "SERVICE-HTTP-001" || i.id === "SERVICE-HTTP-002") {
      const firstExampleFile =
        (i.evidence?.examples?.[0]?.file as string | undefined) ??
        (i.evidence?.candidates?.[0] as string | undefined);

      push({
        target: "app/services",
        type: "contract",
        why: "Consistencia HTTP: múltiples implementaciones o requests directos en services.",
        suggestion:
          "Crear un apiClient único (request<T>) y testearlo con MSW: casos 200/400/401/500, parsing JSON, headers comunes (Authorization/Content-Type) y manejo de errores (throw tipado).",
      });

      if (firstExampleFile) {
        push({
          target: firstExampleFile,
          type: "unit",
          why: "Primera migración recomendada: service representativo para validar el apiClient.",
          suggestion:
            "Migrar este service a apiClient y testearlo unitariamente mockeando el apiClient. Validar que construye URL/params correctamente y parsea tipos esperados.",
        });
      }
    }

    // 2) Inversión de dependencias: services/api importan app/pages
    if (i.id === "ARCH-LAYER-004") {
      push({
        target: file ?? "app/services",
        type: "unit",
        why: "Arquitectura invertida: services/api dependen de app/pages.",
        suggestion:
          "Mover constantes/tipos/helpers a módulos neutrales (core/types, core/config, core/utils). Agregar un test estático (o regla) que falle si `app/services/**` o `app/api/**` importan desde `app/**` (UI).",
      });
    }

    // Si no hay archivo, las reglas de abajo no aplican
    if (!file) continue;

    // 3) UI acoplada a HTTP (según tus ids)
    if (i.id === "ARCH-LAYER-001" || i.id === "ARCH-LAYER-005") {
      push({
        target: file,
        type: "integration",
        why: "UI acoplada a llamadas HTTP: propensa a divergencias y difícil de testear.",
        suggestion:
          "Extraer acceso a datos a service/hook y testear esa capa con MSW o mocks del apiClient. UI: tests de render (RTL) con fixtures estables.",
      });
    }

    // 4) Smart components
    if (i.id === "UI-SMART-001") {
      push({
        target: file,
        type: "unit",
        why: "Componente con lógica alta: sensible a refactors.",
        suggestion:
          "Extraer lógica a hook puro o helpers (utils). Testear hook/helpers con Vitest/Jest. UI: tests mínimos (render + interacción clave).",
      });
    }
  }

  return hints.slice(0, 30);
}
