# Repo Analyzer (Node.js) 

Herramienta CLI en Node.js para analizar repositorios de código (con foco inicial en Next.js / React / TypeScript) y generar un reporte estructurado con:

- contexto funcional de la aplicación,
- señales de arquitectura,
- inconsistencias de naming y capas,
- riesgos de mantenimiento,
- planes de refactor priorizados,
- y sugerencias de tests.

El output está diseñado para ser legible por humanos y consumible por otras IAs como contexto confiable.

---

## Objetivo

Reducir la entropía en repositorios reales (legacy o en crecimiento) mediante análisis automático que permita:

- entender qué hace la app y qué no hace,
- detectar problemas estructurales antes de que escalen,
- priorizar refactors de alto impacto,
- estandarizar convenciones (naming, capas, HTTP),
- guiar la incorporación progresiva de tests.

No intenta “arreglar” el código automáticamente: explica el sistema y señala dónde intervenir.


### En qué se basa

El analyzer sigue un enfoque incremental y pragmático:

1. Discovery
    - Detecta stack, tooling y scripts (Next, TS, ESLint, Prettier, etc.).
2. Indexación
    - Recorre el repo respetando .gitignore y excludes estándar.
    - Genera inventario de archivos y hotspots.
3. Clasificación
    - Clasifica archivos por rol: service, api, util, hook, component, context, etc.
    - Permite aplicar reglas específicas por capa.
4. Rules Engine
    - Cada regla es independiente y genera issues con:
      - id
      - severity
      - explicación
      - evidencia concreta (archivos, imports, endpoints, sugerencias).
5.Síntesis
    - Construye un report.json estable que incluye:
      - contexto de la app,
      - issues,
      - plan de refactor,
      - sugerencias de tests.

### Qué cubre hoy (estado actual)

### 1) Contexto funcional de la aplicación (appContext)

El analyzer infiere qué hace la app a partir de:

- endpoints consumidos,
- services existentes,
- rutas UI,
- dominios nombrados.

Ejemplo real generado:

```
"summary": {
  "whatItDoes": [
    "Gestiona vouchers",
    "Gestiona reservas",
    "Consulta excursiones",
    "Consulta alojamientos"
  ],
  "whatItDoesNotDo": [
    "No se detecta integración explícita con pasarelas de pago"
  ]
}
```

Esto permite usar el reporte como contexto de entrada para una IA sin explicarle el proyecto manualmente.

### 2) Inventario del repositorio

- Total de archivos analizados.
- Conteo por extensión.
- Top archivos más grandes (hotspots reales).

### 3) Señales de configuración

- Next.js / TypeScript / ESLint / Prettier detectados.
- Scripts disponibles (lint, format, etc.).
- Issues si faltan piezas básicas.

### 4) Conflictos de configuración

Detecta problemas clásicos en raíz:

ESLint: eslint.config.* vs .eslintrc*

Prettier: múltiples configs activos

Next: múltiples next.config.*

Lockfiles múltiples (npm / yarn / pnpm)

### 5) Convenciones de naming

Convenciones aplicadas (opinadas y explícitas):

- **Services**: <kebab>.service.ts
- **API**: <kebab>.api.ts
- **Utils**: kebab-case.ts o <kebab>.utils.ts
- **Hooks**: useXxx.ts
- **Components**: PascalCase.tsx
- **Carpetas**: kebab-case o lowerCamel

El reporte incluye:
```
"renameSuggestion": "app/utils/generate-pax-string.ts"
```

listas para refactors mecánicos (manuales o futuros auto-fix).

### 6) Arquitectura de capas

Detecta violaciones críticas como:

- services o APIs importando app/pages (arquitectura invertida),
- UI acoplada a HTTP,
- responsabilidades cruzadas entre capas.

Ejemplo:
```
ARCH-LAYER-004: Service/API importando app/pages
```

### 7) Consistencia HTTP

Detecta cuando:

- múltiples services hacen fetch directo,
- hay varios “clientes HTTP implícitos”,
- headers, parsing y errores divergen.

Produce evidencia concreta con endpoints reales usados por cada service.

### 8) Plan de refactor (refactorPlan)

Genera pasos accionables, priorizados por impacto.

Ejemplo real:

```
{
  "title": "Crear un único apiClient y migrar services a usarlo",
  "impact": "high",
  "files": ["app/services/vouchers.service.ts", "..."],
  "steps": [
    "Crear apiClient",
    "Migrar un service primero",
    "Validar sin romper UI",
    "Migrar el resto"
  ]
}
```

### 9) Sugerencias de tests

Derivadas directamente de los issues:

- Contract tests para apiClient (MSW).
- Unit tests para services y hooks.
- Integration tests cuando UI está acoplada.
- Tests estáticos para evitar regresiones arquitectónicas.

No sugiere tests genéricos: cada hint explica por qué y dónde.

## Qué NO cubre todavía

- Detección explícita de endpoints duplicados entre services.
- Análisis profundo por AST (graph imports, complejidad real).
- Auto-fix (renames + actualización de imports).
- Soporte monorepo.
- Modo CI (fail por severity).

## Uso

### Requisitos
- Node.js 18+
- Linux / macOS / Windows

### Ejecutar análisis
```
npm install
npm run analyze -- /ruta/al/repo
```

Salida:
```
out/report.json
```

---

## Usar el reporte como contexto para IA

### Contexto corto (prompt-friendly)
```
jq '{
  meta,
  project,
  appContext,
  topIssues: (.issues | map(select(.severity=="high"))),
  refactorPlan
}' out/report.json > out/ai-context.short.json
```

### Contexto completo
```
jq '{
  meta,
  project,
  inventory,
  appContext,
  issues,
  testHints,
  refactorPlan
}' out/report.json > out/ai-context.full.json
```

## Estos JSON se pueden pasar directamente como system/context prompt a otra IA.

Estructura del analyzer
```
src/
  discovery/     → detección de stack y configs
  indexing/      → recorrido del repo
  core/          → clasificación de archivos
  rules/         → reglas independientes (issues)
  report/        → síntesis (testHints, refactorPlan, appContext)
  types/         → tipos del reporte
  utils/         → helpers compartidos
```

## Principios de diseño

- Un archivo = una responsabilidad (SRP).
- Reglas desacopladas.
- Reporte estable y extensible.
- Heurísticas primero, AST después.
- Pensado para repos reales, no ejemplos ideales.

### Resumen

Repo Analyzer es una herramienta para:

- entender sistemas heredados rápido,
- prevenir que refactors empeoren la arquitectura,
- estandarizar convenciones,
- reducir deuda invisible,
- y generar contexto técnico confiable para humanos y para IAs.

No reemplaza criterio técnico: lo amplifica.