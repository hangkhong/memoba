import type { DocumentInput } from "../../src/modules/documents/schema";
import { deletionVersions } from "./process/deletion.ts";
import { incidentVersions } from "./process/incident.ts";
import { priceVersions } from "./process/price.ts";
import { refundsVersions } from "./process/refunds.ts";
import { releaseVersions } from "./process/release.ts";

export type FixtureDocumentVersion = { changeNote: string; input: DocumentInput };
// Versions run oldest first and the last one is current. Each has its own past effective date and the document keeps one title throughout.
export type FixtureDocument = { slug: string; versions: FixtureDocumentVersion[] };

// Process documents for Northwind Ledger. Four overlap the seed cases; data deletion has no matching case on purpose.
export const demoDocuments: FixtureDocument[] = [
  { slug: "release-procedure", versions: releaseVersions },
  { slug: "price-change-policy", versions: priceVersions },
  { slug: "incident-communication", versions: incidentVersions },
  { slug: "refunds-guideline", versions: refundsVersions },
  { slug: "data-deletion", versions: deletionVersions },
];
export const currentVersion = (document: FixtureDocument) => document.versions[document.versions.length - 1] as FixtureDocumentVersion;
