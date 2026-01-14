export type FileKind =
  | "api"
  | "service"
  | "component"
  | "hook"
  | "context"
  | "util"
  | "page"
  | "type"
  | "unknown";

export function classifyFile(relPath: string): FileKind {
  const p = relPath.replace(/\\/g, "/").toLowerCase();

  if (p.includes("/types/") || p.endsWith(".d.ts")) return "type";
  if (p.includes("/app/") && p.endsWith("/page.tsx")) return "page";
  if (p.includes("/services/") || p.endsWith(".service.ts") || p.endsWith(".service.tsx")) return "service";
  if (p.includes("/api/") || p.endsWith(".api.ts") || p.endsWith(".api.tsx")) return "api";
  if (p.includes("/contexts/") || p.endsWith("context.ts") || p.endsWith("context.tsx")) return "context";
  if (p.includes("/hooks/") || p.startsWith("hooks/") || p.includes("/use") && p.endsWith(".ts")) return "hook";
  if (p.includes("/hooks/") || /\/use[A-Z]/.test(p)) return "hook";
  if (p.includes("/components/") && (p.endsWith(".tsx") || p.endsWith(".ts"))) return "component";
  if (p.includes("/utils/") || p.includes("/lib/") || p.endsWith(".util.ts") || p.endsWith(".utils.ts")) return "util";

  return "unknown";
}