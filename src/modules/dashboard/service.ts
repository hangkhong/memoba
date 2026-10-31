import { sampleSnapshot } from "./sample-snapshot";
import type { DashboardSnapshot } from "./snapshot";

// The page reads only this. A live query replaces the body and nothing else.
export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  return sampleSnapshot(new Date());
}

// Sample rows carry titles, not ids. Titles that match an active case or document in the workspace get its id; the rest stay null.
export function resolveSnapshotIds(snapshot: DashboardSnapshot, known: { cases: readonly { id: string; title: string }[]; documents: readonly { id: string; title: string }[] }): DashboardSnapshot {
  const idByTitle = (items: readonly { id: string; title: string }[]) => new Map(items.map((item) => [item.title, item.id]));
  const cases = idByTitle(known.cases), documents = idByTitle(known.documents);
  return {
    ...snapshot,
    cases: snapshot.cases.map((item) => ({ ...item, id: item.id ?? cases.get(item.title) ?? null })),
    documentsDueForReview: snapshot.documentsDueForReview.map((item) => ({ ...item, id: item.id ?? documents.get(item.title) ?? null })),
  };
}
