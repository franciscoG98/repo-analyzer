import fs from "node:fs";
import path from "node:path";
import { Report } from "@/types/report";
import { detectProject } from "@/discovery/project";
import { listRepoFiles, buildExtStats, pickLargest } from "@/indexing/files";
import { buildBaseIssues } from "@/rules/baseIssues";
import { findConfigConflicts } from "@/rules/configConflicts";
import { ruleNamingConventions } from "@/rules/namingConventions";
import { ruleLayering } from "@/rules/layering";
import { ruleSmartDumb } from "@/rules/smartDumb";
import { buildTestHints } from "@/report/testHints";
import { ruleApiSurface } from "@/rules/apiSurface";
import { ruleServiceHttpConsistency } from "@/rules/serviceHttpConsistency";
import { ruleDuplicateEndpoints } from "@/rules/duplicateEndpoints";
import { buildRefactorPlan } from "@/report/refactorPlan";

async function main() {
  const repoRoot = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();

  if (!fs.existsSync(path.join(repoRoot, "package.json"))) {
    console.error("ERROR: No encuentro package.json en", repoRoot);
    process.exit(1);
  }

  const files = await listRepoFiles(repoRoot);
  const byExt = buildExtStats(files);

  const project = detectProject(repoRoot);
  const largestFiles = pickLargest(files, repoRoot, 20);

  const issues = [
    ...buildBaseIssues(project),
    ...findConfigConflicts(repoRoot),
    ...ruleNamingConventions(files),
    ...ruleLayering(repoRoot, files),
    ...ruleSmartDumb(repoRoot, files),
    ...ruleApiSurface(repoRoot, files),
    ...ruleServiceHttpConsistency(repoRoot, files),
    ...ruleDuplicateEndpoints(repoRoot, files),
  ];

  const testHints = buildTestHints(issues);
  const refactorPlan = buildRefactorPlan(issues);

  const report: Report = {
    meta: { generatedAt: new Date().toISOString(), repoRoot },
    project,
    inventory: { totalFiles: files.length, byExt, largestFiles },
    testHints,
    refactorPlan,
    issues,
  };

  const outDir = path.join(process.cwd(), "out");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "report.json");
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");

  console.log("OK ->", outPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
