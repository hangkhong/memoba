"use client";

import { useEffect, useLayoutEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import {
  answerCasesText, answerCasesTitle, answerPendingText, answerPendingTitle, answerProcessTitle, casesFound, layouts, links, nodeText, noteFor,
  question, runById, runs, timing, type EdgeId, type Layout, type NodeId, type OutcomeId,
} from "./engine-timeline";

type Point = { x: number; y: number };
type Phase = "hold" | "move" | "trace" | "rest";
type View = { run: OutcomeId; i: number; playing: boolean };
type Dom = { paths: Partial<Record<EdgeId, SVGPathElement>>; fills: Partial<Record<EdgeId, SVGPathElement>>; trace: SVGPathElement | null; token: SVGCircleElement | null; board: HTMLDivElement | null };

const ease = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
const present = <T,>(value: T | null | undefined): T => {
  if (value === null || value === undefined) throw new Error("Engine element is missing");
  return value;
};
const edgeId = (a: NodeId, b: NodeId): EdgeId => `${a}>${b}`;

function curve(layout: Layout, a: NodeId, b: NodeId) {
  const [x1, y1] = layout.nodes[a];
  const [x2, y2] = layout.nodes[b];
  if (x1 === x2 || y1 === y2) return `M${x1} ${y1}L${x2} ${y2}`;
  if (layout.axis === "x") { const m = (x1 + x2) / 2; return `M${x1} ${y1}C${m} ${y1} ${m} ${y2} ${x2} ${y2}`; }
  const m = (y1 + y2) / 2;
  return `M${x1} ${y1}C${x1} ${m} ${x2} ${m} ${x2} ${y2}`;
}

function tracePath(layout: Layout) {
  const [sx, sy] = layout.nodes.save;
  const [qx, qy] = layout.nodes.q;
  const end = qx - layout.w / 2 - timing.pad;
  return layout.axis === "x" ? `M${sx} ${sy + layout.h / 2}V${layout.viewBox[1] - 14}H14V${qy}H${end}` : `M${sx - layout.w / 2} ${sy}H10V${qy}H${end}`;
}

function along(points: Point[], u: number): Point {
  const f = u * (points.length - 1);
  const j = Math.min(points.length - 2, Math.floor(f));
  const a = present(points[j]);
  const b = present(points[j + 1]);
  const k = f - j;
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
}

/** The single clock. One rAF loop moves the token and fills the edge; arrival publishes one React render for the note, progress and answer. */
function createController(publish: (view: View) => void) {
  const dom: Dom = { paths: {}, fills: {}, trace: null, token: null, board: null };
  const m = { run: "found" as OutcomeId, i: 0, playing: false, phase: "hold" as Phase, t: 0, last: 0, dur: timing.hold as number, pts: null as Point[] | null, fill: null as SVGPathElement | null, visible: false, started: false, user: false };
  let layout: Layout = layouts.wide;
  let reduced = false;
  const commit = () => publish({ run: m.run, i: m.i, playing: m.playing });
  const pathOf = (a: NodeId, b: NodeId) => present(dom.paths[edgeId(a, b)]);
  const route = () => runById(m.run).path;
  const inside = (p: Point, id: NodeId, pad: number) => {
    const [x, y] = layout.nodes[id];
    return Math.abs(p.x - x) <= layout.w / 2 + pad && Math.abs(p.y - y) <= layout.h / 2 + pad;
  };
  const sample = (path: SVGPathElement, n = 120) => {
    const length = path.getTotalLength();
    const out: Point[] = [];
    for (let j = 0; j <= n; j++) out.push(path.getPointAtLength((length * j) / n));
    return out;
  };
  /** The token parks just outside the next node so it never covers a label, and passes under boxes between legs. */
  const legPoints = (from: NodeId, to: NodeId) => sample(pathOf(from, to)).filter((p) => !inside(p, to, timing.pad));
  const park = (id: NodeId): Point => {
    const P = route();
    const j = P.indexOf(id);
    if (j <= 0) return { x: layout.nodes.q[0] - layout.w / 2 - timing.pad, y: layout.nodes.q[1] };
    return present(legPoints(present(P[j - 1]), id).at(-1));
  };
  const incoming = (id: NodeId): Point[] => {
    const P = route();
    const j = P.indexOf(id);
    if (j <= 0) return [park(id), { x: layout.nodes.q[0], y: layout.nodes.q[1] }];
    const whole = sample(pathOf(present(P[j - 1]), id));
    const k = whole.findIndex((p) => inside(p, id, timing.pad));
    return whole.slice(Math.max(0, k - 1));
  };
  const setToken = (p: Point) => { const token = dom.token; if (token) token.style.transform = `translate(${p.x}px,${p.y}px)`; };
  const enter = (phase: Phase, dur: number, pts: Point[] | null, fill: SVGPathElement | null) => { m.phase = phase; m.t = 0; m.dur = dur; m.pts = pts; m.fill = fill; };

  function leg() {
    const P = route();
    if (m.i >= P.length - 1) { const trace = present(dom.trace); enter("trace", timing.trace, sample(trace, 200), null); return; }
    const from = present(P[m.i]);
    const to = present(P[m.i + 1]);
    const skip = m.i === 0 ? [] : incoming(from);
    enter("move", timing.move, [...skip, ...legPoints(from, to)], present(dom.fills[edgeId(from, to)]));
  }
  function arrive() { m.i++; m.fill = null; commit(); enter("hold", timing.hold, null, null); }
  function resetClock() {
    if (m.fill) m.fill.style.strokeDashoffset = "1";
    enter("hold", timing.hold, null, null);
    setToken(park(present(route()[m.i])));
    commit();
  }
  function tick(now: number) {
    const dt = Math.min(50, now - m.last);
    m.last = now;
    if (!m.playing || reduced || !m.visible || document.hidden) return;
    m.t += dt;
    const u = Math.min(1, m.t / m.dur);
    if (m.pts && m.phase !== "rest") {
      const e = ease(u);
      setToken(along(m.pts, e));
      if (m.fill) m.fill.style.strokeDashoffset = String(1 - e);
    }
    if (u < 1) return;
    if (m.phase === "move") arrive();
    else if (m.phase === "hold") leg();
    else if (m.phase === "trace") { if (m.user) { m.playing = false; commit(); } else enter("rest", timing.rest, null, null); }
    else { m.run = runs[(runs.findIndex((r) => r.id === m.run) + 1) % runs.length]!.id; m.i = 0; commit(); setToken(park("q")); enter("hold", timing.hold, null, null); }
  }
  function start() {
    if (reduced) return;
    if (m.phase === "trace" && m.t >= m.dur) { m.i = 0; resetClock(); }
    m.playing = true;
    if (m.phase !== "move" && m.phase !== "trace") enter("hold", timing.hold, null, null);
    commit();
  }
  function halt() { m.playing = false; commit(); }
  function seen(visible: boolean) {
    m.visible = visible;
    if (visible && !m.started) { m.started = true; start(); }
  }
  return {
    m,
    attachPath(key: EdgeId, el: SVGPathElement | null) { if (el) dom.paths[key] = el; },
    attachFill(key: EdgeId, el: SVGPathElement | null) { if (el) dom.fills[key] = el; },
    attachTrace(el: SVGPathElement | null) { dom.trace = el; },
    attachToken(el: SVGCircleElement | null) { dom.token = el; },
    attachBoard(el: HTMLDivElement | null) { dom.board = el; },
    observeBoard() {
      const board = dom.board;
      if (!board) return undefined;
      const observer = new IntersectionObserver(([entry]) => seen(entry?.isIntersecting ?? false), { threshold: 0.35 });
      observer.observe(board);
      return () => observer.disconnect();
    },
    tick,
    start,
    halt,
    begin(now: number) { m.last = now; },
    configure(next: Layout, isReduced: boolean) {
      if (next !== layout) enter("hold", timing.hold, null, null);
      layout = next;
      reduced = isReduced;
    },
    park() { setToken(park(present(route()[m.i]))); },
    movingFill: () => m.fill,
    fillOf: (key: EdgeId) => dom.fills[key],
    select(id: OutcomeId) { m.run = id; m.i = 0; m.user = true; resetClock(); start(); },
    replay() { m.i = 0; resetClock(); start(); },
    back() { m.playing = false; m.i = Math.max(0, m.i - 1); resetClock(); },
    forward() { m.playing = false; m.i = Math.min(route().length - 1, m.i + 1); resetClock(); },
    toggle() { if (m.playing) halt(); else start(); },
  };
}

function useMedia(query: string) {
  return useSyncExternalStore(
    (notify) => { const list = matchMedia(query); list.addEventListener("change", notify); return () => list.removeEventListener("change", notify); },
    () => matchMedia(query).matches,
    () => false,
  );
}

export function Engine({ intro, outcomes }: { intro: ReactNode; outcomes: ReactNode }) {
  const [view, setView] = useState<View>({ run: "found", i: 0, playing: false });
  const [ctl] = useState(() => createController(setView));
  const narrow = useMedia("(max-width: 900px)");
  const reduced = useMedia("(prefers-reduced-motion: reduce)");
  const layout = narrow ? layouts.tall : layouts.wide;
  const run = runById(view.run);
  const P = run.path;
  const at = reduced ? P.length - 1 : view.i;
  const node = P[at]!;
  const rcAt = P.indexOf("rc");
  const decided = reduced || at >= rcAt;
  const reachedSearch = at >= 2;
  const playing = view.playing && !reduced;

  useLayoutEffect(() => { ctl.configure(layout, reduced); }, [ctl, layout, reduced]);
  /* Edge fills follow the step. The edge being travelled is left to the clock. */
  useLayoutEffect(() => {
    const done = new Set(P.slice(0, at).map((id, j) => edgeId(id, P[j + 1]!)));
    for (const [a, b] of links) {
      const key = edgeId(a, b);
      const fill = ctl.fillOf(key);
      if (fill && fill !== ctl.movingFill()) fill.style.strokeDashoffset = done.has(key) ? "0" : "1";
    }
  });
  useLayoutEffect(() => { if (!reduced) ctl.park(); }, [ctl, view.run, view.i, layout, reduced]);
  useEffect(() => {
    let frame = 0;
    const loop = (now: number) => { ctl.tick(now); frame = requestAnimationFrame(loop); };
    frame = requestAnimationFrame((now) => { ctl.begin(now); loop(now); });
    return () => cancelAnimationFrame(frame);
  }, [ctl]);
  useEffect(() => ctl.observeBoard(), [ctl]);

  const pathGone = (key: EdgeId) => (decided && run.recedes.includes(key)) || (key === "dp>rd" && decided && reachedSearch && run.documentState !== "found");
  const fillGone = (key: EdgeId) => (decided && run.recedes.includes(key)) || (reachedSearch && run.failedEdges.includes(key));
  const nodeClass = (id: NodeId) => {
    const j = P.indexOf(id);
    let c = "nd" + (id === "cp" || id === "rc" ? " case" : "");
    if (reduced ? j >= 0 : j >= 0 && j < at) c += " seen";
    if (j === at && !reduced) c += " now";
    if (id === "dp" && reachedSearch) c += run.documentState === "found" ? " seen" : run.documentState === "none" ? " none" : " fail";
    if (id === "cp" && reachedSearch && !c.includes("now") && !c.includes("seen")) c += " seen";
    if (run.hidden.includes(id) && decided) c += " gone";
    return c;
  };
  const sub = (id: NodeId) => (id === "cp" ? (reachedSearch ? casesFound : "waiting") : id === "dp" ? (reachedSearch ? run.documentStatus : "waiting") : nodeText[id][1]);
  const note = noteFor(run, node);
  const wide = layout.axis === "x";

  return (
    <section className={"engine" + (reduced ? " static" : "")} id="engine" data-run={view.run} data-step={at}>
      <div className="wrap">
        {intro}
        <noscript><style>{".lp .engine .runs,.lp .engine .board,.lp .engine .prog,.lp .engine .ins,.lp .engine .ctl{display:none}.lp .engine .all{display:grid}"}</style></noscript>
        <div className="runs" role="group" aria-label="Choose an outcome">
          {runs.map((r) => <button key={r.id} type="button" data-r={r.id} aria-pressed={view.run === r.id} onClick={() => ctl.select(r.id)}>{r.label}</button>)}
        </div>
        <div className="board" ref={(el) => ctl.attachBoard(el)}>
          <p className="q"><b>Question:</b> <span>{question}</span></p>
          <svg key={wide ? "wide" : "tall"} className="map" role="img" viewBox={`0 0 ${layout.viewBox[0]} ${layout.viewBox[1]}`} style={{ maxWidth: wide ? undefined : 520, margin: "0 auto" }}
            aria-label="Diagram of a question passing through admission and search, into a case lane and a document lane, then to a written answer, a citation check, and a saved record, with a dashed line back to the start.">
            {links.map(([a, b]) => {
              const key = edgeId(a, b);
              const d = curve(layout, a, b);
              return [
                <path key={key} ref={(el) => ctl.attachPath(key, el)} d={d} className={"lk" + (reachedSearch && run.failedEdges.includes(key) ? " bad" : "") + (pathGone(key) ? " gone" : "")} />,
                <path key={key + "-fill"} ref={(el) => ctl.attachFill(key, el)} d={d} pathLength={1} className={"fill" + (fillGone(key) ? " gone" : "")} />,
              ];
            })}
            <path ref={(el) => ctl.attachTrace(el)} d={tracePath(layout)} className={"lk tr" + (at >= P.length - 1 ? " on" : "")} />
            {wide && <text x={560} y={layout.viewBox[1] - 24} textAnchor="middle" fontSize={15} fontWeight={600} fill="#5d5f60">Every run leaves a record you can reopen</text>}
            <circle ref={(el) => ctl.attachToken(el)} r={8} className="tok" style={{ opacity: reduced ? 0 : 1 }} />
            {(Object.keys(layout.nodes) as NodeId[]).map((id) => {
              const [x, y] = layout.nodes[id];
              const rx = id === "cp" || id === "rc" ? layout.h / 2 : id === "dp" || id === "rd" ? 0 : 10;
              return (
                <g key={id} className={nodeClass(id)} data-n={id}>
                  <rect x={x - layout.w / 2} y={y - layout.h / 2} width={layout.w} height={layout.h} rx={rx} />
                  <text x={x} y={y - 2}>{nodeText[id][0]}</text>
                  <text x={x} y={y + 15} className="s">{sub(id)}</text>
                </g>
              );
            })}
          </svg>
        </div>
        <div className="prog" aria-hidden="true">{P.map((id, j) => <i key={id} className={j < at ? "d" : j === at ? "n" : ""} />)}</div>
        <div className="ins">
          <div className="note"><h3>{note.title}</h3>{note.body && <p>{note.body}</p>}{note.code && <code>{note.code}</code>}</div>
          <div className={"out" + (run.id === "failed" && decided ? " fail" : "")}>
            {decided
              ? <><h3>{answerProcessTitle}</h3><p>{run.answerProcessText}</p><h3 style={{ marginTop: 12 }}>{answerCasesTitle}</h3><p>{answerCasesText}</p></>
              : <><h3>{answerPendingTitle}</h3><p>{answerPendingText}</p></>}
          </div>
        </div>
        <div className="ctl">
          <button type="button" aria-label="Previous step" onClick={() => ctl.back()}>Back</button>
          <button type="button" onClick={() => ctl.toggle()}>{playing ? "Pause" : "Play"}</button>
          <button type="button" aria-label="Next step" onClick={() => ctl.forward()}>Next</button>
          <button type="button" onClick={() => ctl.replay()}>Replay</button>
          <span>Step {at + 1} of {P.length}</span>
        </div>
        {outcomes}
      </div>
    </section>
  );
}
