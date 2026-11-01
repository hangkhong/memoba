/** The engine scene: a small isometric world in which the model is a tower whose height is what it holds.
 *  Each step adds one layer to the same world. `drawScene` paints one frame from the clock and never keeps state. */
import type { Clock } from "./engine-clock";
import { chip, cube, cylinder, flow, line, lock, mark, poly, projection, stopSign, text, textAlongX, type Pt, type Projection, type Surface } from "./engine-draw";
import { clamp, easeInOut, easeOut, lerp, seg } from "./engine-math";
import { palette, shades, type Shade } from "./engine-palette";
import { marks, openedIndexes, shortIndexes, text as words, timing, type StepId } from "./engine-timeline";

export type Variant = "wide" | "tall";

/** Logical size of each variant. The canvas is scaled to its container, so these set proportions, not pixels. */
export const sceneSize: Record<Variant, readonly [number, number]> = { wide: [1200, 700], tall: [520, 410] };

type Fonts = { sans: string; mono: string };

/** Where the clock stands, turned into the numbers the scene reads. */
type Moment = {
  step: StepId;
  /** Seconds into the step. */
  t: number;
  now: number;
  /** Progress through the step, 0..1. */
  u: number;
  /** 0..1: the many sources have shrunk to the short list. */
  a: number;
  /** 0..1: the few on the short list have been opened and read. */
  b: number;
  /** Entrance of the layer step `n` adds, over `d` seconds. Layers stay in once they have arrived. */
  enter: (n: StepId, d?: number) => number;
  /** Seconds into the repeating pass of a block through the citation gate. Negative means not yet. */
  gatePass: number;
  /** The gate and its signs fade in during step 4 and stay. */
  gateAlpha: number;
};

function momentOf(clock: Pick<Clock, "step" | "t" | "now" | "playing">): Moment {
  const { step, t, now, playing } = clock;
  const u = clamp(t / (timing.stepMs[step] / 1000));
  const inStep3 = (window: readonly [number, number]) => (step < 3 ? 0 : step > 3 ? 1 : easeInOut(seg(u, window[0], window[1])));
  return {
    step, t, now, u,
    a: inStep3(timing.shortListWindow),
    b: inStep3(timing.openWindow),
    enter: (n, d = 1) => (step > n ? 1 : step === n ? easeOut(clamp(t / d)) : 0),
    gatePass: !playing ? now % 3 : step === 4 ? (t - 1.6) % 2.7 : t % 3,
    gateAlpha: step === 4 ? clamp(t - 0.7) : 1,
  };
}

/** What the model is holding, by step. It reads "opened and read" once the opened sources have joined the tower. */
function holdingNow(m: Moment) {
  if (m.step === 1) return words.holdSub.full;
  if (m.step === 2 || (m.step === 3 && m.b <= 0.8)) return words.holdSub.question;
  return words.holdSub.read;
}

/** The answer opens to citations once step 3 has read its sources. */
const answerIsOpen = (m: Moment) => m.step > 3 || (m.step === 3 && m.b >= 1);

type Scene = { s: Surface; m: Moment; p: Projection; tall: boolean; by: <T>(wide: T, tall: T) => T; size: readonly [number, number] };

export function drawScene(g: CanvasRenderingContext2D, clock: Pick<Clock, "step" | "t" | "now" | "playing">, variant: Variant, fonts: Fonts) {
  const tall = variant === "tall";
  const scene: Scene = {
    s: { g, fontScale: tall ? 1.28 : 1, ...fonts },
    m: momentOf(clock),
    p: tall ? projection(13.2, 205, 100) : projection(34, 482, 62),
    tall,
    by: (wide, narrow) => (tall ? narrow : wide),
    size: sceneSize[variant],
  };
  drawBackdrop(scene);
  drawRoad(scene);
  const walls = applicationWalls(scene);
  walls.back();
  drawPlaza(scene);
  drawSearchPad(scene);
  const top = drawTower(scene);
  walls.front();
  drawGate(scene);
  drawEndpoints(scene);
  drawSockets(scene);
  drawLabels(scene, top);
}

function drawBackdrop({ s: { g }, p, size: [W, H] }: Scene) {
  const sky = g.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, palette.sky[0]);
  sky.addColorStop(1, palette.sky[1]);
  g.fillStyle = sky;
  g.fillRect(0, 0, W, H);
  const P = p.at;
  poly(g, [P(-0.5, 14.5, -0.7), P(22.5, 14.5, -0.7), P(22.5, 14.5, 0), P(-0.5, 14.5, 0)], palette.plate.front);
  poly(g, [P(22.5, -0.5, -0.7), P(22.5, 14.5, -0.7), P(22.5, 14.5, 0), P(22.5, -0.5, 0)], palette.plate.side);
  poly(g, [P(-0.5, -0.5), P(22.5, -0.5), P(22.5, 14.5), P(-0.5, 14.5)], palette.plate.top);
  for (let i = 0; i <= 22; i += 2) line(g, [P(i, -0.5), P(i, 14.5)], palette.plate.grid, 1);
  for (let i = 0; i <= 14; i += 2) line(g, [P(-0.5, i), P(22.5, i)], palette.plate.grid, 1);
}

/** The question travels in along the road. What leaves is red while the model is full, grey while the answer is shut, teal once it can be opened. */
function drawRoad({ s: { g }, m, p, by }: Scene) {
  const P = p.at;
  poly(g, [P(3.2, 2.6), P(19, 2.6), P(19, 3.8), P(3.2, 3.8)], palette.road);
  const dots = by(4, 2);
  flow(g, [P(3.4, 3.2, 0.05), P(9.6, 3.2, 0.05)], palette.doc, 3, dots, m.now);
  flow(g, [P(12.6, 3.2, 0.05), P(18.6, 3.2, 0.05)], m.step === 1 ? palette.alert : m.step >= 3 && m.b > 0.5 ? palette.case : palette.idle, 3, dots, m.now);
}

/** Step 4 raises glass walls around the tower. The back two are drawn before the plaza and the front three after the tower, so the tower stands inside them. */
function applicationWalls({ s, m, p, by }: Scene) {
  const { g } = s;
  const P = p.at;
  const rise = m.enter(4, 1.3);
  const height = 2.9 * rise;
  const wall = (pts: readonly (readonly [number, number])[]) => {
    if (rise <= 0) return;
    poly(g, [...pts.map(([x, y]) => P(x, y, 0)), ...[...pts].reverse().map(([x, y]) => P(x, y, height))], palette.wall);
    line(g, pts.map(([x, y]) => P(x, y, height)), palette.ink, by(3, 2));
  };
  return {
    back() {
      if (rise > 0) poly(g, [P(6.6, 0.4), P(15.4, 0.4), P(15.4, 6.6), P(6.6, 6.6)], palette.floor(0.14 * rise));
      wall([[6.6, 0.4], [15.4, 0.4]]);
      wall([[6.6, 0.4], [6.6, 6.6]]);
    },
    front() {
      if (rise <= 0) return;
      wall([[15.4, 0.4], [15.4, 6.6]]);
      wall([[6.6, 6.6], [10.3, 6.6]]);
      wall([[11.7, 6.6], [15.4, 6.6]]);
      const [x, y] = P(6.6, 0.4, height);
      const width = by(142, 92);
      g.save();
      g.globalAlpha = clamp(rise * 2);
      g.fillStyle = palette.ink;
      g.fillRect(x - width / 2, y - by(32, 26), width, by(24, 17));
      text(s, words.frameHeader, x, y - by(15, 14), { size: by(11, 7), align: "center", mono: true, weight: 500, color: palette.white });
      g.restore();
    },
  };
}

/** The knowledge: 24 blocks on the plaza. A case is a cylinder and a document is a cube. */
function drawPlaza({ s, m, p, by }: Scene) {
  const { g } = s;
  const { step, a, b, now } = m;
  const P = p.at;
  const slot = (i: number): Pt => [2.8 + (i % 8) * 1.5, 9.6 + Math.floor(i / 8) * 1.6];
  if (step >= 2 && a < 1) {
    const path = [P(11, 4.8, 0.03), P(11, 9.2, 0.03)];
    line(g, path, palette.amber, by(4, 2), [8, 7]);
    flow(g, path, palette.amberDark, 2, by(4, 2), now);
  }
  const byDepth = marks.map((kind, i) => ({ kind, i })).sort((l, r) => slot(l.i)[0] + slot(l.i)[1] - (slot(r.i)[0] + slot(r.i)[1]));
  for (const { kind, i } of byDepth) {
    const shortAt = shortIndexes.indexOf(i);
    const openAt = openedIndexes.indexOf(i);
    let [x, y] = slot(i);
    let z = 0;
    let height = 0.9;
    let alpha = step === 1 ? 0.42 : 1;
    const ping = step === 2 || (step === 3 && a < 1) ? Math.max(0, Math.sin(now * 3 - (x + y) * 0.55)) ** 6 : 0;
    if (shortAt >= 0 && a > 0) {
      x = lerp(x, 7.2 + shortAt * 1.3, a);
      y = lerp(y, 7.7, a);
      z = Math.sin(a * Math.PI) * 2.4;
    } else if (shortAt < 0) {
      height = lerp(0.9, 0.14, a);
      alpha *= lerp(1, 0.6, a);
    }
    if (openAt >= 0 && b > 0) {
      const k = easeInOut(seg(b, 0, 0.8));
      x = lerp(x, 11, k);
      y = lerp(y, 3, k);
      z = lerp(z, 0, k) + Math.sin(k * Math.PI) * 5;
      alpha *= 1 - seg(b, 0.82, 1);
    } else if (shortAt >= 0) {
      height = lerp(0.9, 0.5, b);
    }
    z += ping * 0.7;
    if (alpha <= 0.01) continue;
    if (kind === "doc") cube(g, p, [x - 0.42, y - 0.42, z], [0.84, 0.84, height], shades.ink, alpha);
    else cylinder(g, p, [x, y, z], 0.42, height, shades.teal, alpha);
  }
}

/** The search tool: an amber pad the model reaches the plaza through. */
function drawSearchPad({ s: { g }, m, p }: Scene) {
  const grow = m.enter(2, 0.7);
  if (grow > 0) cube(g, p, [9.9, 4.6, 0], [2.2, 1.3, 0.3 * grow], shades.amber);
}

/** The tower is the model. Each slab is something it holds. Returns the canvas point above it, for its label. */
function drawTower({ s: { g }, m, p }: Scene): Pt {
  const { step, u, t, now, b } = m;
  cube(g, p, [9.8, 1.8, 0], [2.4, 2.4, 0.35], shades.base);
  const slabs: Shade[] = [];
  if (step === 1) {
    const count = Math.ceil(lerp(1, 10, seg(u, 0, 0.75)));
    for (let i = 0; i < count; i++) slabs.push(i > 6 ? shades.red : shades.grey);
  } else {
    slabs.push(shades.amber);
    if (b > 0.8 || step > 3) slabs.push(shades.teal, shades.teal, shades.ink);
  }
  slabs.forEach((shade, i) => {
    const falling = step === 1 && i === slabs.length - 1 && u < 0.75 ? (1 - ((t * 1.9) % 1)) * 2.2 : 0;
    const wobble = step === 1 && i > 6 ? Math.sin(now * 4 + i) * 0.08 : 0;
    cube(g, p, [10 + wobble, 2 + wobble, 0.35 + i * 0.46 + falling], [2, 2, 0.4], shade);
  });
  return p.at(11, 3, 0.35 + slabs.length * 0.46 + 0.2);
}

/** The citation gate with its two signs, and the block that is turned back at it. */
function drawGate({ s, m, p, by }: Scene) {
  if (m.step < 4) return;
  const { g } = s;
  const P = p.at;
  g.save();
  g.globalAlpha = m.gateAlpha;
  cube(g, p, [15, 2.2, 0], [0.5, 0.3, 2.4], shades.ink);
  cube(g, p, [15, 3.9, 0], [0.5, 0.3, 2.4], shades.ink);
  cube(g, p, [15, 2.2, 2.4], [0.5, 2, 0.34], shades.ink);
  const c = m.gatePass;
  if (c >= 0 && c < 1.7) {
    const x = lerp(12.4, 14.7, easeInOut(clamp(c / 0.9))) - (c > 0.9 ? easeInOut(clamp((c - 0.9) / 0.8)) * 2.2 : 0);
    cube(g, p, [x, 2.9, 0.1], [0.6, 0.6, 0.6], shades.red);
  }
  line(g, [P(13.4, 0.9, 0), P(13.4, 0.9, 2.3)], palette.ink, by(4, 2));
  const [sx, sy] = P(13.4, 0.9, 2.3);
  stopSign(g, sx, sy, by(15, 8));
  cube(g, p, [10.3, 6.45, 0], [1.4, 0.3, 0.5], shades.ink);
  g.restore();
}

/** The question on the left and the answer on the right. The answer is shut until step 3 has read its sources, then it shows what can be opened. */
function drawEndpoints({ s, m, p, by, tall }: Scene) {
  const { g } = s;
  const P = p.at;
  cube(g, p, [1, 2, 0], [3, 2.4, 0.5], shades.white);
  const [qx, qy] = P(2.5, 3.2, 0.5);
  text(s, words.question[0], qx, qy + by(0, 3), { size: by(16, 10), align: "center" });
  if (!tall) text(s, words.question[1], qx, qy + 18, { size: 12, weight: 500, align: "center", color: palette.sub });

  const open = answerIsOpen(m);
  cube(g, p, [18.6, 2, 0], [3, 2.4, 0.5], open ? shades.white : shades.grey);
  const [ax, ay] = P(20.1, 3.2, 0.5);
  text(s, words.answer[0], ax, ay + by(0, 3), { size: by(16, 10), align: "center" });
  const note = open ? words.answer[1].open : words.answer[1].closed;
  if (!tall) text(s, note, ax, ay + 18, { size: 12, weight: 500, align: "center", color: open ? palette.case : palette.sub });
  if (!open) {
    lock(g, ax, ay - by(32, 12), palette.sub);
    return;
  }
  const [ox, oy] = P(20.1, 5, 0.1);
  const gap = by(24, 10);
  openedIndexes.forEach((markIndex, i) => mark(g, ox - gap + i * gap, oy + by(6, 5), by(7, 3.4), marks[markIndex]!));
  if (!tall) chip(s, words.chips, ox, oy + 36, { size: 12, weight: 500, align: "center", color: palette.sub });
}

/** Step 5: three planned sockets on the plate, wired to the application's wall. */
function drawSockets({ s, m, p, by }: Scene) {
  const { g } = s;
  const P = p.at;
  const grow = m.enter(5, 1);
  if (grow <= 0) return;
  words.sockets.forEach((socket, i) => {
    const k = easeOut(clamp(grow * 3 - i));
    const y = 8.8 + i * 2;
    const x = 15.7;
    const z = (1 - k) * 2;
    g.save();
    g.globalAlpha = k;
    line(g, [P(15.4, Math.min(6.6, 4 + i * 1.2)), P(x, y)], palette.ink, 1.6, [5, 4]);
    poly(g, [P(x, y - 0.8, z), P(x + 3.2, y - 0.8, z), P(x + 3.2, y + 0.8, z), P(x, y + 0.8, z)], palette.socketFace, palette.ink, 1.8);
    textAlongX(s, p, socket.name, [x + 0.6, y + 0.1, z], { size: by(13, 8) });
    textAlongX(s, p, words.planned, [x + 0.6, y + 0.62, z], { size: by(10.5, 5.6), mono: true, weight: 500, color: palette.sub });
    g.restore();
  });
}

/** Every label that sits over the world. Chips carry a white backing so they stay readable over blocks. */
function drawLabels({ s, m, p, by, tall }: Scene, towerTop: Pt) {
  const P = p.at;
  const { step, a } = m;
  const lx = by(34, 16);
  const ly = by(50, 30);
  text(s, words.hold, lx, ly, { size: by(12.5, 9.5), color: palette.sub });
  text(s, holdingNow(m), lx, ly + by(21, 16), { size: by(16, 11) });

  const [kx, ky] = P(2.4, 13);
  if (tall) chip(s, words.panel, 12, 392, { size: 9 });
  else chip(s, words.panel, kx - 14, ky + 6, { size: 13, align: "right" });

  const above = towerTop[1] - by(40, 18);
  chip(s, words.model[0], towerTop[0], above - by(21, 0), { size: by(16, 10), align: "center" });
  if (!tall) chip(s, words.model[1], towerTop[0], above, { size: 12, weight: 500, align: "center", color: palette.sub });

  if (m.enter(2, 0.7) > 0) {
    const [sx, sy] = P(9.9, 5.9, 0.2);
    chip(s, words.search, sx - by(6, 2), sy - by(20, 8), { size: by(14, 9), align: "right" });
    if (!tall) {
      const [first = "", second = ""] = words.searchSub.wide.replace(" and ", " and\n").split("\n");
      chip(s, first, sx - 6, sy - 1, { size: 12, weight: 500, align: "right", color: palette.sub });
      chip(s, second, sx - 6, sy + 17, { size: 12, weight: 500, align: "right", color: palette.sub });
    }
  }
  if (a > 0.6) {
    const [x, y] = P(14.6, 8, 0.4);
    chip(s, words.short, x + by(8, 2), y + by(6, 3), { size: by(12.5, 8.4), alpha: seg(a, 0.6, 1) });
  }
  if (step >= 4) {
    const alpha = m.gateAlpha;
    const small = by(12.5, 8.4);
    const [sx, sy] = P(13.4, 0.9, 2.3);
    chip(s, words.stop, sx + by(20, 10), sy + 4, { size: small, alpha });
    const [cx, cy] = P(15.5, 2.2, 3);
    chip(s, words.reject, cx + by(26, 14), cy + by(80, 36), { size: small, color: palette.alertText, alpha });
    chip(s, words.citeGate.join(" "), cx + by(26, 14), cy + by(102, 50), { size: small, alpha });
    const [fx, fy] = P(10.3, 8.8, 0);
    chip(s, words.readGate, fx, fy + by(20, 4), { size: small, alpha, align: "center" });
  }
}
