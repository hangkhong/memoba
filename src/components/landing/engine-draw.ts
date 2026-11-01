/** Canvas drawing primitives for the engine scene: text, marks, lines, and isometric blocks.
 *  Nothing here knows the five steps. The scene decides what to draw, these functions draw it. */
import { lerp } from "./engine-math";
import { palette, type Shade } from "./engine-palette";
import type { Kind } from "./engine-timeline";

export type Pt = readonly [number, number];

/** The context plus the two font stacks and the factor that scales type for the phone layout. */
export type Surface = { g: CanvasRenderingContext2D; fontScale: number; sans: string; mono: string };

export type TextStyle = { size?: number; weight?: number; color?: string; align?: CanvasTextAlign; mono?: boolean; alpha?: number };

export function text(s: Surface, str: string, x: number, y: number, { size = 14, weight = 600, color = palette.ink, align = "left", mono = false, alpha = 1 }: TextStyle = {}) {
  const { g } = s;
  g.save();
  g.globalAlpha *= alpha;
  g.font = `${weight} ${size * s.fontScale}px ${mono ? s.mono : s.sans}`;
  g.fillStyle = color;
  g.textAlign = align;
  g.textBaseline = "alphabetic";
  if (mono) g.letterSpacing = ".6px";
  g.fillText(str, x, y);
  g.restore();
}

/** Text that runs along the plate's x axis, so it lies on a slab instead of crossing its edges. */
export function textAlongX(s: Surface, p: Projection, str: string, at: readonly [number, number, number], style: TextStyle = {}) {
  const [px, py] = p.at(...at);
  s.g.save();
  s.g.transform(0.866, 0.5, 0, 1, px, py);
  text(s, str, 0, 0, style);
  s.g.restore();
}

/** A label on a translucent white backing, so it stays readable over blocks and grid lines. */
export function chip(s: Surface, str: string, x: number, y: number, { size = 13, weight = 600, color = palette.ink, align = "left", alpha = 1 }: TextStyle = {}) {
  const { g } = s;
  const px = size * s.fontScale;
  g.save();
  g.font = `${weight} ${px}px ${s.sans}`;
  const w = g.measureText(str).width + 12;
  const h = px + 9;
  const left = align === "right" ? x - w : align === "center" ? x - w / 2 : x;
  g.globalAlpha *= alpha;
  g.fillStyle = palette.chipBackdrop;
  g.fillRect(left, y - h + 5, w, h);
  g.fillStyle = color;
  g.textAlign = "left";
  g.fillText(str, left + 6, y);
  g.restore();
}

/** A circle is a case and a square is a document. */
export function mark(g: CanvasRenderingContext2D, x: number, y: number, size: number, kind: Kind) {
  g.fillStyle = kind === "doc" ? palette.doc : palette.case;
  g.beginPath();
  if (kind === "doc") g.rect(x - size, y - size, size * 2, size * 2);
  else g.arc(x, y, size, 0, Math.PI * 2);
  g.fill();
}

export function line(g: CanvasRenderingContext2D, pts: readonly Pt[], color: string, width = 2, dash?: readonly number[]) {
  g.save();
  g.strokeStyle = color;
  g.lineWidth = width;
  if (dash) g.setLineDash([...dash]);
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.stroke();
  g.restore();
}

/** The point a fraction `f` of the way along a polyline. */
export function along(pts: readonly Pt[], f: number): Pt {
  const lengths = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i]![0], p[1] - pts[i]![1]));
  let rest = f * lengths.reduce((sum, l) => sum + l, 0);
  for (let i = 0; i < lengths.length; i++) {
    const len = lengths[i]!;
    if (rest <= len || i === lengths.length - 1) {
      const k = len ? rest / len : 0;
      return [lerp(pts[i]![0], pts[i + 1]![0], k), lerp(pts[i]![1], pts[i + 1]![1], k)];
    }
    rest -= len;
  }
  return pts[0]!;
}

/** Dots travelling along a line. `now` is the ambient clock in seconds. */
export function flow(g: CanvasRenderingContext2D, pts: readonly Pt[], color: string, count: number, size: number, now: number) {
  g.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const [x, y] = along(pts, (now * 0.45 + i / count) % 1);
    g.beginPath();
    g.arc(x, y, size, 0, Math.PI * 2);
    g.fill();
  }
}

export function poly(g: CanvasRenderingContext2D, pts: readonly Pt[], fill?: string, stroke?: string, width = 1.5) {
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.closePath();
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = width; g.stroke(); }
}

export function lock(g: CanvasRenderingContext2D, x: number, y: number, color: string) {
  g.save();
  g.strokeStyle = color;
  g.fillStyle = color;
  g.lineWidth = 2.5;
  g.beginPath();
  g.arc(x, y - 5, 5.5, Math.PI, 0);
  g.stroke();
  g.fillRect(x - 8, y - 5, 16, 12);
  g.restore();
}

export function stopSign(g: CanvasRenderingContext2D, x: number, y: number, r: number) {
  g.fillStyle = palette.alert;
  g.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = Math.PI / 8 + (i * Math.PI) / 4;
    if (i) g.lineTo(x + r * Math.cos(a), y + r * Math.sin(a));
    else g.moveTo(x + r * Math.cos(a), y + r * Math.sin(a));
  }
  g.closePath();
  g.fill();
  g.fillStyle = palette.white;
  g.fillRect(x - r * 0.55, y - r * 0.14, r * 1.1, r * 0.28);
}

/** Maps a point on the plate (x right-down, y left-down, z up) to canvas pixels. `scale` is the pixel size of one plate unit. */
export type Projection = { at: (x: number, y: number, z?: number) => Pt; scale: number };

export function projection(scale: number, originX: number, originY: number): Projection {
  return { scale, at: (x, y, z = 0) => [originX + (x - y) * 0.866 * scale, originY + (x + y) * 0.5 * scale - z * scale] };
}

/** A box with its back corner at (x, y, z), `w` along x, `d` along y, `h` tall. */
export function cube(g: CanvasRenderingContext2D, p: Projection, [x, y, z]: readonly [number, number, number], [w, d, h]: readonly [number, number, number], shade: Shade, alpha = 1) {
  const P = p.at;
  g.save();
  g.globalAlpha *= alpha;
  poly(g, [P(x, y + d, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x, y + d, z + h)], shade[1]);
  poly(g, [P(x + w, y, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x + w, y, z + h)], shade[2]);
  poly(g, [P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)], shade[0]);
  g.restore();
}

/** An upright cylinder centred on (x, y) with radius `r`. */
export function cylinder(g: CanvasRenderingContext2D, p: Projection, [x, y, z]: readonly [number, number, number], r: number, h: number, shade: Shade, alpha = 1) {
  const [bx, by] = p.at(x, y, z);
  const [tx, ty] = p.at(x, y, z + h);
  const rx = r * p.scale * 1.22;
  const ry = rx * 0.5;
  g.save();
  g.globalAlpha *= alpha;
  g.fillStyle = shade[1];
  g.beginPath();
  g.ellipse(bx, by, rx, ry, 0, 0, Math.PI);
  g.lineTo(tx - rx, ty);
  g.lineTo(tx + rx, ty);
  g.lineTo(bx + rx, by);
  g.fill();
  g.fillStyle = shade[2];
  g.beginPath();
  g.ellipse(bx, by, rx, ry, 0, 0, Math.PI / 2);
  g.lineTo(tx, ty + ry);
  g.lineTo(tx + rx, ty);
  g.lineTo(bx + rx, by);
  g.fill();
  g.fillStyle = shade[0];
  g.beginPath();
  g.ellipse(tx, ty, rx, ry, 0, 0, Math.PI * 2);
  g.fill();
  g.restore();
}
