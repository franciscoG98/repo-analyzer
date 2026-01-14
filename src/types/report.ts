export type FileInfo = {
  path: string;
  ext: string;
  bytes: number;
};

export type TestHint = {
  target: string; // file o módulo
  type: "unit" | "integration" | "contract";
  why: string;
  suggestion: string;
};

export type RefactorStep = {
  title: string;
  impact: "low" | "medium" | "high";
  files?: string[];
  rationale: string;
  steps: string[];
  relatedIssueIds: string[];
};

export type Issue = {
  id: string;
  severity: "low" | "medium" | "high";
  title: string;
  explanation: string;
  evidence?: any;
};

export type AppContext = {
  summary: {
    whatItDoes: string[];
    whatItDoesNotDo: string[];
    keyDomains: string[];
  };
  stack: {
    framework: string;
    language: string[];
    styling?: string[];
    tooling?: string[];
  };
  structure: {
    appRouter: boolean;
    pagesRouter: boolean;
    keyFolders: Array<{ path: string; purpose: string }>;
  };
  ui: {
    pages: Array<{ routeHint: string; file: string }>;
    keyComponents: string[];
    contexts: string[];
    hooks: string[];
  };
  dataAccess: {
    services: string[];
    endpoints: Array<{ endpoint: string; usedIn: string[] }>;
    risks: string[];
  };
};

export type Report = {
  meta: {
    generatedAt: string;
    repoRoot: string;
  };
  project: {
    name?: string;
    isNext: boolean;
    isTS: boolean;
    hasESLint: boolean;
    hasPrettier: boolean;
    scripts: Record<string, string>;
    deps: string[];
    devDeps: string[];
  };
  inventory: {
    totalFiles: number;
    byExt: Record<string, number>;
    largestFiles: FileInfo[];
  };
  appContext?: AppContext;
  refactorPlan?: RefactorStep[];
  testHints?: TestHint[];
  issues: Issue[];
};
