import type { ComponentType } from "react";

// Extension point for article diagrams. Put `<!-- diagram: some-name -->` on its own line in a Markdown page,
// then register `"some-name": SomeDiagram` here. GitHub hides the comment, so keep a text fallback (the Mermaid block) beside it.
// A marker with no entry here renders nothing.
export const docDiagrams: Readonly<Record<string, ComponentType>> = {};
