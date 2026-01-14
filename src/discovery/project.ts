import path from "node:path";
import fs from "node:fs";
import { readJson } from "@/utils/fs";
import { Report } from "@/types/report";

export function detectProject(repoRoot: string): Report["project"] {
  const pkg = readJson<any>(path.join(repoRoot, "package.json"));
  const deps = pkg?.dependencies ? Object.keys(pkg.dependencies) : [];
  const devDeps = pkg?.devDependencies ? Object.keys(pkg.devDependencies) : [];
  const scripts = pkg?.scripts ?? {};

  const isNext =
    deps.includes("next") ||
    devDeps.includes("next") ||
    ["next.config.js", "next.config.mjs", "next.config.ts"].some((f) =>
      fs.existsSync(path.join(repoRoot, f))
    );

  const isTS = fs.existsSync(path.join(repoRoot, "tsconfig.json"));

  const hasESLint =
    deps.includes("eslint") ||
    devDeps.includes("eslint") ||
    [
      ".eslintrc",
      ".eslintrc.json",
      ".eslintrc.js",
      ".eslintrc.cjs",
      ".eslintrc.yml",
      ".eslintrc.yaml",
      "eslint.config.js",
      "eslint.config.mjs",
      "eslint.config.cjs",
    ].some((f) => fs.existsSync(path.join(repoRoot, f)));

  const hasPrettier =
    deps.includes("prettier") ||
    devDeps.includes("prettier") ||
    [
      ".prettierrc",
      ".prettierrc.json",
      ".prettierrc.yml",
      ".prettierrc.yaml",
      ".prettierrc.js",
      ".prettierrc.cjs",
      "prettier.config.js",
      "prettier.config.cjs",
      ".prettier.config.js",
      ".prettier.config.cjs",
    ].some((f) => fs.existsSync(path.join(repoRoot, f)));

  return {
    name: pkg?.name,
    isNext,
    isTS,
    hasESLint,
    hasPrettier,
    scripts,
    deps,
    devDeps,
  };
}
