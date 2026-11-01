import type { StepId } from "./engine-timeline";

/** The connections of the diagram and the step that adds each one. */
export type EdgeId = "qm" | "ma" | "ms" | "sk" | "kp" | "po" | "ro";

export const edgeStep: Record<EdgeId, StepId> = { qm: 1, ma: 1, ms: 2, sk: 2, kp: 3, po: 3, ro: 3 };
export const edgeIds = Object.keys(edgeStep) as EdgeId[];
