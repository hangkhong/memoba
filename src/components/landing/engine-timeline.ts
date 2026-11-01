/** The five steps of the engine diagram and every string it shows. Coordinates live in engine-layout.ts.
 *  Each step adds one layer to the same canvas. Nothing here carries a number: the marks and the gauge are illustrations. */

export type StepId = 1 | 2 | 3 | 4 | 5;

export type Step = { id: StepId; title: string; short: string; caption: string };

export const steps: readonly Step[] = [
  { id: 1, title: "A chatbot", short: "Chatbot", caption: "A chatbot answers from whatever text is pushed into it, so the model is full and the answer can't be opened to check." },
  { id: 2, title: "Give it a tool", short: "Tool", caption: "Give the same model a search tool and it goes to the team's cases and documents itself, by keyword and by meaning." },
  { id: 3, title: "Filter before reading", short: "Filter", caption: "Many sources shrink to a short list and only a few are opened, so the model holds just what it read." },
  { id: 4, title: "The application keeps the rules", short: "Rules", caption: "The model decides what to look at. The application decides how far it may look, when it stops, and checks every citation." },
  { id: 5, title: "Room to grow", short: "Extend", caption: "The same frame has room to grow: three planned sockets for tools, working methods and permissions." },
];

export const lastStep: StepId = 5;

/** One clock. Step 3 has two sub-moments: the short list, then the opened sources. */
export const timing = {
  stepMs: { 1: 5500, 2: 5500, 3: 8400, 4: 7000, 5: 6000 } as Record<StepId, number>,
  /** Elapsed time in step 3 at which the short list forms and the sources open. */
  filterAt: [0, 2800, 5600] as readonly number[],
};

export const text = {
  question: ["Question", "asked in plain words"],
  model: ["Model", "decides what to read"],
  answer: ["Answer", { closed: "Can't be opened to check", open: "Citations you can open" }],
  search: "Search",
  searchSub: { wide: "by keyword and by meaning", tall: "keyword + meaning" },
  hold: "What the model is holding",
  holdSub: { full: "Everything it was given", question: "Only the question, so far", read: "Only what it opened and read" },
  panel: "Cases and documents",
  short: "Short list",
  opened: "Opened and read",
  frameHeader: "THE APPLICATION",
  stop: "When it must stop",
  reject: "Cites something unread",
  readGate: "How far it may look",
  citeGate: ["Every citation", "checked"],
  chips: "Open to check",
  planned: "PLANNED",
  sockets: [
    { name: "MCP", sub: ["Connects the", "team's tools"] },
    { name: "Skills", sub: ["Teaches how", "work is done"] },
    { name: "Permission", sub: ["Who may", "do what"] },
  ],
  legend: { case: "Case: what happened", doc: "Document: what is required" },
  board: "Diagram in five steps. A question goes to a model. Step one shows a chatbot whose model is full of pushed-in text and whose answer cannot be opened. Step two gives the model a search tool over cases and documents. Step three narrows many sources to a short list and opens a few. Step four frames the model in the application, which limits how far it looks, when it stops and checks each citation. Step five adds three planned sockets: MCP, Skills and Permission.",
} as const;

export type Kind = "case" | "doc";

/** The illustrative marks: 24 in the knowledge, 6 on the short list, 3 opened. Circle is a case, square is a document. */
const documents = new Set([2, 7, 11, 14, 19, 22]);
export const marks: readonly Kind[] = Array.from({ length: 24 }, (_, i) => (documents.has(i) ? "doc" : "case"));
export const shortIndexes: readonly number[] = [1, 4, 7, 9, 14, 18];
export const openedIndexes: readonly number[] = [4, 9, 7];
