import type { ComponentType } from "react";
import { engineDiagrams } from "./diagrams/index";

// Extension point for article diagrams. Put `<!-- diagram: some-name -->` on its own line in a Markdown page,
// then register `"some-name": SomeDiagram` in diagrams/index.ts. GitHub hides the comment, so the prose around it must make sense without the diagram.
// A marker with no entry here renders nothing.
export const docDiagrams: Readonly<Record<string, ComponentType>> = { ...engineDiagrams };
