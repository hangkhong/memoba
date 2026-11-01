/** Geometry for the engine diagram: one hand-placed layout for wide screens and one vertical rebuild for phones. Strings live in engine-timeline.ts. */
import type { EdgeId } from "./engine-edges";

export type Pt = readonly [number, number];
export type Box = { x: number; y: number; w: number; h: number };
export type Anchor = "start" | "middle" | "end";

export type Layout = {
  id: "wide" | "tall";
  view: Pt;
  /** Half the side of a mark. */
  half: number;
  q: Box; model: Box; answer: Box; search: Box;
  hold: Box; holdLabel: Pt; holdSub: Pt; holdAnchor: Anchor;
  pushed: readonly [Pt, Pt];
  edges: Record<EdgeId, readonly Pt[]>;
  frame: Box; frameHeader: Pt; frameHeaderAnchor: Anchor;
  stop: Box; reject: Box;
  readGate: readonly [Pt, Pt]; readLabel: Pt; readLabelAnchor: Anchor;
  citeGate: readonly [Pt, Pt]; citeLabel: Pt; citeLabelAnchor: Anchor;
  panel: Box; panelLabel: Pt;
  short: Box; shortLabel: Pt;
  opened: Box; openedLabel: Pt;
  home: readonly Pt[]; shortSlots: readonly Pt[]; openedSlots: readonly Pt[];
  chips: readonly Pt[]; chipText: Pt;
  sockets: readonly Box[]; stems: readonly (readonly [Pt, Pt])[];
};

const grid = (cols: number, rows: number, x: number, y: number, dx: number, dy: number): Pt[] =>
  Array.from({ length: cols * rows }, (_, i) => [x + (i % cols) * dx, y + Math.floor(i / cols) * dy] as const);

export const wide: Layout = {
  id: "wide",
  view: [1200, 670],
  half: 12,
  q: { x: 40, y: 250, w: 200, h: 80 },
  model: { x: 480, y: 250, w: 240, h: 80 },
  answer: { x: 960, y: 250, w: 200, h: 80 },
  search: { x: 505, y: 366, w: 190, h: 56 },
  hold: { x: 520, y: 150, w: 160, h: 80 },
  holdLabel: [505, 183], holdSub: [505, 201], holdAnchor: "end",
  pushed: [[600, 100], [600, 146]],
  edges: {
    qm: [[240, 290], [480, 290]],
    ma: [[720, 290], [960, 290]],
    ms: [[600, 330], [600, 366]],
    sk: [[600, 422], [600, 490]],
    kp: [[640, 570], [690, 570]],
    po: [[890, 570], [940, 570]],
    ro: [[1050, 490], [1050, 394], [695, 394]],
  },
  frame: { x: 280, y: 120, w: 640, h: 330 },
  frameHeader: [296, 142], frameHeaderAnchor: "start",
  stop: { x: 735, y: 148, w: 170, h: 32 },
  reject: { x: 735, y: 192, w: 170, h: 32 },
  readGate: [[920, 380], [920, 408]], readLabel: [908, 384], readLabelAnchor: "end",
  citeGate: [[820, 270], [820, 310]], citeLabel: [820, 332], citeLabelAnchor: "middle",
  panel: { x: 40, y: 490, w: 600, h: 160 }, panelLabel: [56, 514],
  short: { x: 690, y: 490, w: 200, h: 160 }, shortLabel: [706, 514],
  opened: { x: 940, y: 490, w: 220, h: 160 }, openedLabel: [956, 514],
  home: grid(8, 3, 90, 552, 70, 40),
  shortSlots: [[730, 565], [790, 565], [850, 565], [730, 615], [790, 615], [850, 615]],
  openedSlots: [[995, 585], [1055, 585], [1115, 585]],
  chips: [[978, 362], [1010, 362], [1042, 362]], chipText: [1066, 367],
  sockets: [{ x: 280, y: 14, w: 190, h: 64 }, { x: 505, y: 14, w: 190, h: 64 }, { x: 730, y: 14, w: 190, h: 64 }],
  stems: [[[375, 78], [375, 120]], [[600, 78], [600, 120]], [[825, 78], [825, 120]]],
};

const o = 66;
const T = (y: number) => y + o;

export const tall: Layout = {
  id: "tall",
  view: [360, T(700)],
  half: 8,
  q: { x: 14, y: 8, w: 150, h: 44 },
  model: { x: 46, y: T(252), w: 132, h: 56 },
  answer: { x: 24, y: T(380), w: 160, h: 52 },
  search: { x: 218, y: T(252), w: 130, h: 56 },
  hold: { x: 68, y: T(150), w: 110, h: 64 },
  holdLabel: [123, T(140)], holdSub: [123, T(232)], holdAnchor: "middle",
  pushed: [[123, T(98)], [123, T(124)]],
  edges: {
    qm: [[30, 52], [30, T(280)], [46, T(280)]],
    ma: [[104, T(308)], [104, T(380)]],
    ms: [[178, T(280)], [218, T(280)]],
    sk: [[330, T(308)], [330, T(352)]],
    kp: [[282, T(486)], [282, T(520)]],
    po: [[282, T(598)], [282, T(636)]],
    ro: [[212, T(664)], [198, T(664)], [198, T(296)], [218, T(296)]],
  },
  frame: { x: 4, y: T(84), w: 352, h: 252 },
  frameHeader: [348, T(102)], frameHeaderAnchor: "end",
  stop: { x: 196, y: T(108), w: 158, h: 26 },
  reject: { x: 196, y: T(144), w: 158, h: 28 },
  readGate: [[188, T(336)], [208, T(336)]], readLabel: [208, T(326)], readLabelAnchor: "start",
  citeGate: [[94, T(336)], [114, T(336)]], citeLabel: [96, T(352)], citeLabelAnchor: "end",
  panel: { x: 212, y: T(352), w: 140, h: 134 }, panelLabel: [222, T(372)],
  short: { x: 212, y: T(520), w: 140, h: 78 }, shortLabel: [222, T(538)],
  opened: { x: 212, y: T(636), w: 140, h: 56 }, openedLabel: [222, T(654)],
  home: grid(6, 4, 232, T(396), 21, 24),
  shortSlots: [[246, T(560)], [282, T(560)], [318, T(560)], [246, T(582)], [282, T(582)], [318, T(582)]],
  openedSlots: [[246, T(676)], [282, T(676)], [318, T(676)]],
  chips: [[40, T(454)], [64, T(454)], [88, T(454)]], chipText: [108, T(458)],
  sockets: [{ x: 48, y: 56, w: 98, h: 70 }, { x: 151, y: 56, w: 98, h: 70 }, { x: 254, y: 56, w: 98, h: 70 }],
  stems: [[[97, 126], [97, T(84)]], [[200, 126], [200, T(84)]], [[303, 126], [303, T(84)]]],
};
