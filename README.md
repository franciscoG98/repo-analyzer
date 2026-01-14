# Repo Analyzer (Node.js) — Documentación

Herramienta CLI en Node.js para analizar repositorios (en especial proyectos Next.js/React/TypeScript) y generar un reporte estructurado con señales de calidad, inconsistencias, malas prácticas y oportunidades de refactor. El objetivo es producir un **contexto técnico accionable** que sirva tanto para humanos como para alimentar otra IA (por ejemplo, para sugerir refactors, estandarizar convenciones y planificar tests).

---

## Objetivo

- Detectar temprano problemas típicos de mantenibilidad: duplicación, convenciones inconsistentes, acoplamientos entre capas y “surfaces” de API fragmentadas.
- Generar un reporte que ayude a:
  - Comprender el proyecto rápidamente.
  - Priorizar refactors con impacto.
  - Estabilizar contratos (API client/services) para evitar divergencias.
  - Identificar dónde conviene agregar tests (unit/integration/contract).

---

## En qué se basa

El analyzer aplica un enfoque incremental:

1. **Discovery**
   - Detecta señales del stack (Next.js, TypeScript, ESLint, Prettier, scripts y dependencias).
2. **Indexación**
   - Recorre el repositorio respetando `.gitignore` y excludes comunes (`node_modules`, `.next`, etc.).
   - Genera inventario de archivos (extensiones, tamaño, top archivos más grandes).
3. **Reglas (rules engine)**
   - Ejecuta reglas heurísticas que generan `issues` con evidencia concreta.
   - Cada regla está aislada en un archivo: una responsabilidad, fácil de extender.
4. **Síntesis**
   - Produce un `out/report.json` con estructura estable para automatización/IA.

---

## Qué cubre hoy (MVP actual)

### 1) Inventario del repo
- Total de archivos analizados.
- Conteo por extensión (`.ts`, `.tsx`, etc.).
- Top archivos más grandes (para detectar hotspots).

### 2) Detección de configuración (config signals)
- Next.js / TS / ESLint / Prettier detectados.
- Scripts relevantes (`lint`, `format`, etc.).
- Issues si faltan componentes base (por ejemplo ESLint/Prettier ausentes).

### 3) Conflictos de configuración en raíz
- ESLint: `eslint.config.*` vs `.eslintrc*`
- Prettier: múltiples configs simultáneos
- Next: múltiples `next.config.*`
- Lockfiles múltiples (`package-lock`, `yarn.lock`, `pnpm-lock.yaml`)

### 4) Convenciones de nombres (naming conventions)
Con convención elegida:
- **Services**: `<kebab>.service.ts` (ej: `voucher.service.ts`)
- **API**: `<kebab>.api.ts`
- **Utils**: `kebab-case.ts` o `<kebab>.utils.ts`
- **Hooks**: `useXxx.ts`
- **Components**: `PascalCase.tsx` (cuando se clasifica como component)

El reporte incluye `renameSuggestion` para renombres mecánicos (camelCase → kebab-case).

### 5) Consistencia HTTP en services (dolor principal)
Detecta:
- Muchos services haciendo HTTP directo (fetch/axios/ky/graphql-request), señal de divergencia futura.
- Dispersión de env vars/URLs (si aplica).

---

## Qué NO cubre todavía (roadmap inmediato)

- Duplicación de endpoints (`/api/...`) entre services (para señalar funciones duplicadas).
- Refactor plan automático (sección `refactorPlan` en el reporte).
- Sugerencias de tests (`testHints`) más completas.
- Análisis semántico profundo vía AST (para detectar duplicación semántica, complejidad real, graph imports, etc.).
- Auto-fix (renombrar archivos y actualizar imports).

---

## Cómo se usa

### Requisitos
- Node.js (recomendado 18+).
- Linux/macOS/Windows (en Linux funciona directo).

### Instalar dependencias
```bash
npm install

# Ejecutar análisis sobre un repo objetivo
npm run analyze -- /ruta-local/al/repo

# El reporte se genera en:
out/report.json
```

#### Ejemplos útiles para inspección rápida:
```bash
jq '.issues | length' out/report.json
jq '.issues | map({id, severity, evidence}) | .[0:25]' out/report.json
jq '.inventory.largestFiles' out/report.json
```


## Estructura del proyecto (analyzer)

Carpetas principales:

- src/discovery/
  - Detección del stack y configuración base del repo objetivo.
- src/indexing/
  - Recorrido del repo, ignore rules, inventario.
- src/rules/
  - Reglas aisladas que generan issues (cada regla = un archivo).
- src/core/
  - Clasificación de archivos (service/api/util/component/hook/context/etc.).
- src/report/
  - Construcción de secciones derivadas del reporte (ej: testHints, refactorPlan).
- src/types/
  - Tipos del reporte (Report, Issue, etc.).
- src/utils/
  - Helpers compartidos (fs/json, etc.).


## Principios de diseño internos

- Un archivo = una responsabilidad clara (SRP).
- Reglas desacopladas: agregar una regla no requiere tocar otras.
- Reporte con estructura estable: se pueden sumar campos sin romper consumers.
- Código pensado para crecimiento incremental (primero heurísticas, luego AST).


## Ejemplos de uso práctico

- Si aparece SERVICE-HTTP-001:
  - Señal de que hay múltiples formas de hacer requests.
  - Refactor recomendado: un apiClient único + services tipados.
  - Beneficio: base ideal para contract tests (MSW), y luego unit tests de services.
- Si aparecen muchos NAMING-MOD-001:
  - Señal de naming inconsistente (probable deuda mecánica fácil de arreglar).
  - Renames sugeridos: lista lista para ejecutar (manual o futuro auto-fix).

## Licencia / contribución

Propuesta de contribución:

- cada nueva regla va en src/rules/<nombre>.ts
- la regla retorna Issue[]
- se conecta en src/analyze.ts en el array issues

## Resumen

Este proyecto es una base para “auditar” repositorios de forma automatizada y repetible. Su foco es generar un reporte accionable para estandarizar convenciones, prevenir divergencia en capas (especialmente HTTP/services), y habilitar un camino ordenado hacia refactors y tests.