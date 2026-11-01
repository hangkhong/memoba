// Page order, slugs, groups, and titles for the in-app documentation. The text itself stays in `docs/`, which is also what GitHub renders.
// Order follows docs/README.md; registry.test.ts checks every title against the file's own H1.
export const docGroups = [
  { id: "why", label: "Why", summary: "Why Memoba is built this way" },
  { id: "how", label: "How", summary: "How the engine works" },
] as const;

export type DocGroupId = (typeof docGroups)[number]["id"];
export type DocPage = { slug: string; group: DocGroupId; title: string; file: string };

export const firstDocSlug = "why-teams-start-from-scratch";

export const docPages: readonly DocPage[] = [
  { slug: firstDocSlug, group: "why", title: "Why teams start from scratch", file: "product/why-teams-start-from-scratch.md" },
  { slug: "what-memoba-believes", group: "why", title: "What Memoba believes", file: "product/what-memoba-believes.md" },
  { slug: "what-memoba-leaves-out", group: "why", title: "What Memoba leaves out", file: "product/what-memoba-leaves-out.md" },
  { slug: "why-search-alone-is-not-enough", group: "how", title: "Why search alone is not enough", file: "engine/why-search-alone-is-not-enough.md" },
  { slug: "how-memoba-finds-past-work", group: "how", title: "How Memoba finds past work", file: "engine/how-memoba-finds-past-work.md" },
  { slug: "how-the-agent-answers", group: "how", title: "How the agent answers a question", file: "engine/how-the-agent-answers.md" },
  { slug: "how-an-answer-stays-checkable", group: "how", title: "How an answer stays checkable", file: "engine/how-an-answer-stays-checkable.md" },
  { slug: "how-knowledge-gets-in", group: "how", title: "How knowledge gets in", file: "engine/how-knowledge-gets-in.md" },
];

export const docsBasePaths = { public: "/docs", workspace: "/workspace/docs" } as const;
export type DocsBasePath = (typeof docsBasePaths)[keyof typeof docsBasePaths];

export function findDoc(slug: string): DocPage | undefined {
  return docPages.find((page) => page.slug === slug);
}

export function findDocByFile(repoPath: string): DocPage | undefined {
  return docPages.find((page) => `docs/${page.file}` === repoPath);
}

export function neighbours(slug: string): { previous: DocPage | null; next: DocPage | null } {
  const index = docPages.findIndex((page) => page.slug === slug);
  return { previous: docPages[index - 1] ?? null, next: docPages[index + 1] ?? null };
}
