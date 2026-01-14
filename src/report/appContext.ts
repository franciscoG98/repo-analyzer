import fs from "node:fs";
import path from "node:path";
import { AppContext } from "@/types/report";
import { classifyFile } from "@/core/classify";

function exists(repoRoot: string, rel: string) {
  return fs.existsSync(path.join(repoRoot, rel));
}

function read(repoRoot: string, rel: string) {
  try {
    return fs.readFileSync(path.join(repoRoot, rel), "utf8");
  } catch {
    return "";
  }
}

function extractApiPaths(src: string): string[] {
  const matches = src.match(/["'`]\s*\/api\/[^"'`]+["'`]/g) ?? [];
  return matches.map((m) => m.replace(/["'`]/g, "").trim());
}

function normalizeEndpoint(ep: string) {
  const noQuery = ep.split("?")[0];
  return noQuery.replace(/\$\{[^}]+\}/g, ":param").replace(/\/\d+/g, "/:id");
}

function routeHintFromAppFile(rel: string) {
  // Next App Router: app/**/page.tsx => ruta aproximada
  const p = rel.replace(/\\/g, "/");
  if (!p.startsWith("app/")) return null;
  if (!p.endsWith("/page.tsx")) return null;

  // app/(group)/x/page.tsx -> /x (ignoramos grupos)
  const parts = p.split("/");
  const routeParts = parts
    .slice(1, -1)
    .filter((seg) => !(seg.startsWith("(") && seg.endsWith(")")));
  const route = "/" + routeParts.join("/");
  return route === "/" ? "/" : route.replace(/\/+/g, "/");
}

function summarizeDomainsFromServices(services: string[]) {
  // heurística: nombre del archivo sin sufijo
  const domains = new Set<string>();
  for (const s of services) {
    const file = s.split("/").pop() ?? s;
    const base = file.replace(/\.(ts|tsx|js|jsx)$/, "");
    const domain = base
      .replace(/\.service$/, "")
      .replace(/-service$/, "")
      .replace(/\.api$/, "")
      .replace(/\.utils?$/, "");
    if (domain && domain !== "fetchers") domains.add(domain);
  }
  return Array.from(domains).slice(0, 15);
}

export function buildAppContext(repoRoot: string, files: string[]): AppContext {
  const appRouter = files.some((f) => f.startsWith("app/") && f.endsWith("/page.tsx"));
  const pagesRouter = files.some((f) => f.startsWith("pages/"));

  const services = files.filter((f) => classifyFile(f) === "service");
  const contexts = files.filter((f) => classifyFile(f) === "context");
  const hooks = files.filter((f) => classifyFile(f) === "hook");
  const components = files.filter((f) => classifyFile(f) === "component");

  const pages = files
    .map((f) => {
      const hint = routeHintFromAppFile(f);
      return hint ? { routeHint: hint, file: f } : null;
    })
    .filter(Boolean) as Array<{ routeHint: string; file: string }>;

  // endpoints (agrupados)
  const endpointMap = new Map<string, Set<string>>();
  for (const s of services) {
    const src = read(repoRoot, s);
    for (const ep of extractApiPaths(src)) {
      const norm = normalizeEndpoint(ep);
      if (!endpointMap.has(norm)) endpointMap.set(norm, new Set());
      endpointMap.get(norm)!.add(s);
    }
  }

  const endpoints = Array.from(endpointMap.entries())
    .map(([endpoint, usedIn]) => ({ endpoint, usedIn: Array.from(usedIn).sort() }))
    .sort((a, b) => b.usedIn.length - a.usedIn.length)
    .slice(0, 40);

  const keyDomains = summarizeDomainsFromServices(services);

  // what it does / does not do: inferencia conservadora
  const whatItDoes: string[] = [];
  const whatItDoesNotDo: string[] = [];

  if (keyDomains.includes("vouchers")) whatItDoes.push("Gestiona vouchers (creación/lectura/actualización) consumiendo endpoints /api/v2-vouchers.");
  if (keyDomains.includes("reservas")) whatItDoes.push("Gestiona reservas consumiendo endpoints /api/v2-reservas.");
  if (keyDomains.includes("excursion") || keyDomains.includes("excursiones")) whatItDoes.push("Consulta/gestiona excursiones (y cálculos asociados) vía /api/v2-excursiones.");
  if (keyDomains.includes("alojamiento") || keyDomains.includes("alojamientos")) whatItDoes.push("Consulta/gestiona alojamientos vía /api/v2-alojamientos.");

  // afirmaciones negativas: solo si NO encontramos señales
  if (!files.some((f) => f.includes("payments") || f.includes("stripe") || f.includes("mercadopago"))) {
    whatItDoesNotDo.push("No se detecta integración explícita con pasarelas de pago (Stripe/MercadoPago) en dependencias/estructura.");
  }
  if (!files.some((f) => f.includes("socket") || f.includes("ws"))) {
    whatItDoesNotDo.push("No se detecta comunicación realtime (WebSockets) en estructura/dependencias.");
  }

  // stack
  const styling: string[] = [];
  const tooling: string[] = [];

  if (exists(repoRoot, "tailwind.config.ts") || exists(repoRoot, "tailwind.config.js")) styling.push("TailwindCSS");
  if (exists(repoRoot, "app/globals.css")) styling.push("CSS global (globals.css)");

  if (exists(repoRoot, ".eslintrc") || exists(repoRoot, "eslint.config.js") || exists(repoRoot, "eslint.config.mjs")) tooling.push("ESLint");
  if (exists(repoRoot, ".prettierrc") || exists(repoRoot, "prettier.config.js")) tooling.push("Prettier");
  if (exists(repoRoot, "tsconfig.json")) tooling.push("TypeScript");

  const keyFolders: Array<{ path: string; purpose: string }> = [];
  if (appRouter) keyFolders.push({ path: "app/", purpose: "Next App Router: páginas, layouts, rutas" });
  if (files.some((f) => f.startsWith("components/"))) keyFolders.push({ path: "components/", purpose: "Componentes UI reutilizables" });
  if (files.some((f) => f.startsWith("app/services/"))) keyFolders.push({ path: "app/services/", purpose: "Capa de acceso a datos / API (services)" });
  if (files.some((f) => f.startsWith("core/contexts/")) || files.some((f) => f.includes("/contexts/")))
    keyFolders.push({ path: "contexts/", purpose: "Estado global / providers" });
  if (files.some((f) => f.includes("/hooks/"))) keyFolders.push({ path: "hooks/", purpose: "Hooks reutilizables" });
  if (files.some((f) => f.includes("/utils/"))) keyFolders.push({ path: "utils/", purpose: "Helpers puros / utilidades" });

  const risks: string[] = [];
  if (services.length >= 5) risks.push("Muchos services: recomendable unificar HTTP en un apiClient único y agregar contract tests.");
  if (endpoints.some((e) => e.usedIn.length >= 2)) risks.push("Endpoints usados en múltiples services: riesgo de duplicación de lógica y contratos divergentes.");

  return {
    summary: {
      whatItDoes,
      whatItDoesNotDo,
      keyDomains,
    },
    stack: {
      framework: "Next.js",
      language: ["TypeScript", "React"],
      styling: styling.length ? styling : undefined,
      tooling: tooling.length ? tooling : undefined,
    },
    structure: {
      appRouter,
      pagesRouter,
      keyFolders,
    },
    ui: {
      pages: pages.slice(0, 50),
      keyComponents: components.slice(0, 30),
      contexts: contexts.slice(0, 30),
      hooks: hooks.slice(0, 30),
    },
    dataAccess: {
      services: services.sort(),
      endpoints,
      risks,
    },
  };
}
