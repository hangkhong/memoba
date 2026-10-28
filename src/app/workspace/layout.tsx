import type { ReactNode } from "react";
// Workspace pages depend on verified cookies and membership on every request.
export const dynamic = "force-dynamic";
export default function WorkspaceLayout({children}:{children:ReactNode}) { return children; }
