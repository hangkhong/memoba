import type { CSSProperties, ReactNode } from "react";
import { edgeIds, edgeStep } from "./engine-edges";
import type { Anchor, Box, Layout, Pt } from "./engine-layout";
import { marks, openedIndexes, shortIndexes, text, type StepId } from "./engine-timeline";

type Props = { layout: Layout; step: StepId; sub: number };

const path = (pts: readonly Pt[]) => pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x} ${y}`).join("");
const cx = (b: Box) => b.x + b.w / 2;
const cy = (b: Box) => b.y + b.h / 2;
const frameOf = ({ x, y, w, h }: Box) => `M${x} ${y}H${x + w}V${y + h}H${x}Z`;

function Label({ at, anchor = "start", className, children }: { at: Pt; anchor?: Anchor; className?: string; children: ReactNode }) {
  return <text x={at[0]} y={at[1]} textAnchor={anchor} className={className}>{children}</text>;
}

/** A layer fades in when its step arrives. Layers are only ever added. */
function Layer({ on, children }: { on: boolean; children: ReactNode }) {
  return <g className={"ly" + (on ? "" : " off")}>{children}</g>;
}

export function Board({ layout: L, step, sub }: Props) {
  const gid = `acc-${L.id}`;
  const tall = L.id === "tall";
  const accent = (layer: StepId): CSSProperties | undefined => (step === layer ? { stroke: `url(#${gid})` } : undefined);
  const accentFill = (layer: StepId): CSSProperties | undefined => (step === layer ? { fill: `url(#${gid})` } : undefined);
  const has = (layer: StepId) => step >= layer;
  /** 0: the knowledge as a crowd. 1: the short list. 2: the opened sources. */
  const phase = step < 3 ? 0 : step === 3 ? sub : 2;
  const readNow = step >= 3 && phase === 2;
  const holdState = step === 1 ? "full" : readNow ? "read" : "question";

  const markAt = (i: number): Pt => {
    const o = openedIndexes.indexOf(i);
    const s = shortIndexes.indexOf(i);
    if (phase >= 2 && o >= 0) return L.openedSlots[o]!;
    if (phase >= 1 && s >= 0) return L.shortSlots[s]!;
    return L.home[i]!;
  };
  const markOpacity = (i: number) => (step < 2 ? 0 : phase === 0 || shortIndexes.includes(i) ? (phase === 2 && !openedIndexes.includes(i) ? 0.6 : 1) : 0.16);

  const g = L.half * 0.5;
  const holdRows = 8;
  const rowWidth = [1, 0.8, 0.95, 0.6, 1, 0.85, 0.7, 0.95];
  const innerW = L.hold.w - 20;

  return (
    <svg className={`map map-${L.id}`} role="img" aria-label={text.board} viewBox={`0 0 ${L.view[0]} ${L.view[1]}`}>
      <defs>
        <linearGradient id={gid} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={tall ? 0 : L.view[0]} y2={tall ? L.view[1] : 0}>
          <stop offset="0" style={{ stopColor: "var(--chart-1)" }} />
          <stop offset="0.5" style={{ stopColor: "var(--chart-2)" }} />
          <stop offset="1" style={{ stopColor: "color-mix(in srgb, var(--chart-3) 75%, #fff)" }} />
        </linearGradient>
        <marker id={`${gid}-a`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" markerUnits="userSpaceOnUse" orient="auto">
          <path d="M0 1L10 5L0 9z" className="ah" />
        </marker>
      </defs>

      <Layer on={has(4)}><path d={frameOf(L.frame)} className="frame" style={accent(4)} /></Layer>

      {edgeIds.map((id) => <path key={id} d={path(L.edges[id])} pathLength={1} markerEnd={`url(#${gid}-a)`} className={"lk" + (has(edgeStep[id]) ? "" : " off")} style={accent(edgeStep[id])} />)}
      <path d={path(L.pushed)} pathLength={1} markerEnd={`url(#${gid}-a)`} className={"lk" + (step === 1 ? "" : " off")} style={accent(1)} />

      <g className="nd"><rect x={L.q.x} y={L.q.y} width={L.q.w} height={L.q.h} style={accent(1)} /><Label at={[cx(L.q), cy(L.q) - 2]} anchor="middle">{text.question[0]}</Label><Label at={[cx(L.q), cy(L.q) + 15]} anchor="middle" className="s">{text.question[1]}</Label></g>
      <g className="nd model"><rect x={L.model.x} y={L.model.y} width={L.model.w} height={L.model.h} style={accent(1)} /><Label at={[cx(L.model), cy(L.model) - 2]} anchor="middle">{text.model[0]}</Label><Label at={[cx(L.model), cy(L.model) + 15]} anchor="middle" className="s">{text.model[1]}</Label></g>
      <g className="nd"><rect x={L.answer.x} y={L.answer.y} width={L.answer.w} height={L.answer.h} style={accent(1)} /><Label at={[cx(L.answer), cy(L.answer) - 2]} anchor="middle">{text.answer[0]}</Label><Label at={[cx(L.answer), cy(L.answer) + 15]} anchor="middle" className="s">{readNow ? text.answer[1].open : text.answer[1].closed}</Label></g>

      <g className="hold">
        <rect x={L.hold.x} y={L.hold.y} width={L.hold.w} height={L.hold.h} className="hb" style={accent(1)} />
        <g className={"fade" + (holdState === "full" ? "" : " off")}>
          {Array.from({ length: holdRows }, (_, i) => <rect key={i} x={L.hold.x + 10} y={L.hold.y + 8 + i * ((L.hold.h - 20) / (holdRows - 1))} width={innerW * rowWidth[i]!} height={3} className="bar" />)}
        </g>
        <g className={"fade" + (holdState === "question" ? "" : " off")}><rect x={L.hold.x + 10} y={L.hold.y + L.hold.h / 2 - 2} width={innerW * 0.55} height={4} className="bar dark" /></g>
        <g className={"fade" + (holdState === "read" ? "" : " off")}>
          {openedIndexes.map((m, i) => {
            const y = L.hold.y + (L.hold.h * (i + 0.5)) / 3;
            const bar = innerW * [0.6, 0.5, 0.55][i]!;
            return (
              <g key={m}>
                {marks[m] === "case" ? <circle cx={L.hold.x + 16} cy={y} r={g} className="read" style={accentFill(3)} /> : <rect x={L.hold.x + 16 - g} y={y - g} width={g * 2} height={g * 2} className="read" style={accentFill(3)} />}
                <rect x={L.hold.x + 16 + g + 6} y={y - 2} width={bar - g * 2} height={4} className="bar dark" style={accentFill(3)} />
              </g>
            );
          })}
        </g>
      </g>
      <Label at={L.holdLabel} anchor={L.holdAnchor} className="lab">{text.hold}</Label>
      <Label at={L.holdSub} anchor={L.holdAnchor} className="s2">{text.holdSub[holdState]}</Label>

      <Layer on={has(2)}>
        <g className="nd"><rect x={L.search.x} y={L.search.y} width={L.search.w} height={L.search.h} style={accent(2)} /><Label at={[cx(L.search), cy(L.search) - 2]} anchor="middle">{text.search}</Label><Label at={[cx(L.search), cy(L.search) + 15]} anchor="middle" className="s">{text.searchSub[L.id]}</Label></g>
        <rect x={L.panel.x} y={L.panel.y} width={L.panel.w} height={L.panel.h} className="zone" style={accent(2)} />
        <Label at={L.panelLabel} className="lab">{text.panel}</Label>
      </Layer>
      <Layer on={has(3)}>
        <rect x={L.short.x} y={L.short.y} width={L.short.w} height={L.short.h} className="zone" style={accent(3)} />
        <Label at={L.shortLabel} className="lab">{text.short}</Label>
        <rect x={L.opened.x} y={L.opened.y} width={L.opened.w} height={L.opened.h} className="zone" style={accent(3)} />
        <Label at={L.openedLabel} className="lab">{text.opened}</Label>
      </Layer>

      {marks.map((kind, i) => {
        const [x, y] = markAt(i);
        const opened = phase >= 2 && openedIndexes.includes(i);
        const style: CSSProperties = { transform: `translate(${x}px,${y}px)`, opacity: markOpacity(i) };
        return (
          <g key={i} className="mk" style={style}>
            {kind === "case" ? <circle r={L.half} className="c" style={opened ? accent(3) : undefined} /> : <rect x={-L.half} y={-L.half} width={L.half * 2} height={L.half * 2} className="k" style={opened ? accent(3) : undefined} />}
          </g>
        );
      })}

      <g className={"ly" + (readNow ? "" : " off")}>
        {openedIndexes.map((m, i) => (marks[m] === "case" ? <circle key={m} cx={L.chips[i]![0]} cy={L.chips[i]![1]} r={g + 1} className="c2" /> : <rect key={m} x={L.chips[i]![0] - g - 1} y={L.chips[i]![1] - g - 1} width={(g + 1) * 2} height={(g + 1) * 2} className="k2" />))}
        <Label at={L.chipText} className="s2">{text.chips}</Label>
      </g>

      <Layer on={has(4)}>
        <Label at={L.frameHeader} anchor={L.frameHeaderAnchor} className="mono">{text.frameHeader}</Label>
        <rect x={L.stop.x} y={L.stop.y} width={L.stop.w} height={L.stop.h} className="chip" />
        <rect x={L.stop.x + 10} y={cy(L.stop) - 5} width={10} height={10} className="stopglyph" />
        <Label at={[L.stop.x + 28, cy(L.stop) + 4]} className="chiptext">{text.stop}</Label>
        <rect x={L.reject.x} y={L.reject.y} width={L.reject.w} height={L.reject.h} className="chip dashed" />
        <Label at={[L.reject.x + 10, cy(L.reject) + 4]} className="chiptext">✕ {text.reject}</Label>
        <path d={path(L.readGate)} className="gate" />
        <path d={path(L.citeGate)} className="gate" />
        <Label at={L.readLabel} anchor={L.readLabelAnchor} className="gl">{text.readGate}</Label>
        <text x={L.citeLabel[0]} y={L.citeLabel[1]} textAnchor={L.citeLabelAnchor} className="gl">{text.citeGate.map((line, i) => <tspan key={line} x={L.citeLabel[0]} dy={i === 0 ? 0 : 14}>{line}</tspan>)}</text>
      </Layer>

      <Layer on={has(5)}>
        {L.sockets.map((box, i) => {
          const s = text.sockets[i]!;
          const [a, b] = L.stems[i]!;
          return (
            <g key={s.name}>
              <path d={path([a, b])} className="stem" style={accent(5)} />
              <rect x={box.x} y={box.y} width={box.w} height={box.h} className="socket" style={accent(5)} />
              <text x={box.x + 10} y={box.y + (tall ? 19 : 22)} className="sname">{s.name}</text>
              <text x={tall ? box.x + 10 : box.x + box.w - 8} y={box.y + (tall ? 32 : 21)} textAnchor={tall ? "start" : "end"} className="tagp">{text.planned}</text>
              <text x={box.x + 10} y={box.y + (tall ? 47 : 42)} className="s2">{tall ? s.sub[0] : s.sub.join(" ")}</text>
              {tall && <text x={box.x + 10} y={box.y + 60} className="s2">{s.sub[1]}</text>}
            </g>
          );
        })}
      </Layer>
    </svg>
  );
}
