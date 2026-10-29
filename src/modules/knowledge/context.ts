import type { EvidenceItem } from "./contracts";

export const estimateEvidenceTokens = (items: EvidenceItem[]) => Math.ceil(new TextEncoder().encode(JSON.stringify(items)).byteLength / 3);
