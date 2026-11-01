"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { restingClock, settle, stepSeconds, type Clock, type ClockSource } from "./engine-clock";
import { EngineCanvas } from "./engine-canvas";
import { lastStep, steps, text, type StepId } from "./engine-timeline";

/** What the controls and the captions need. The clock moves faster than this, so React hears only when the step or the play state changes. */
type View = { step: StepId; playing: boolean };

function useMedia(query: string) {
  return useSyncExternalStore(
    (notify) => { const list = matchMedia(query); list.addEventListener("change", notify); return () => list.removeEventListener("change", notify); },
    () => matchMedia(query).matches,
    () => false,
  );
}

const clamp = (n: number): StepId => Math.min(lastStep, Math.max(1, n)) as StepId;

/** One requestAnimationFrame clock moves the step and the scene. It runs only while the board is on screen and the tab is visible. */
function useEngine(reduced: boolean) {
  const clock = useRef<Clock>(restingClock());
  const [view, setView] = useState<View>({ step: lastStep, playing: false });
  const board = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const visible = useRef(false);

  const sync = useCallback(() => setView({ step: clock.current.step, playing: clock.current.playing }), []);
  const begin = useCallback((step: StepId) => { const c = clock.current; c.step = step; c.t = 0; c.playing = true; sync(); }, [sync]);

  useEffect(() => {
    if (reduced) return undefined;
    const c = clock.current;
    let last = 0;
    let frame = 0;
    const loop = (time: number) => {
      const dt = Math.min(0.05, (time - last) / 1000);
      last = time;
      if (visible.current && !document.hidden) {
        c.now += dt;
        if (c.playing) {
          c.t += dt;
          if (c.t >= stepSeconds(c.step)) begin(c.step === lastStep ? 1 : clamp(c.step + 1));
        }
        c.paint?.();
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame((time) => { last = time; loop(time); });
    const el = board.current;
    const observer = new IntersectionObserver(([entry]) => {
      visible.current = entry?.isIntersecting ?? false;
      if (visible.current && !started.current) { started.current = true; begin(1); }
    }, { threshold: 0.35 });
    if (el) observer.observe(el);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [reduced, begin]);

  const source = useMemo<ClockSource>(() => ({
    read: () => clock.current,
    attach: (paint) => { clock.current.paint = paint; return () => { if (clock.current.paint === paint) clock.current.paint = null; }; },
  }), []);

  return {
    view: reduced ? { step: lastStep, playing: false } : view,
    source,
    board,
    go: (step: number) => { started.current = true; settle(clock.current, clamp(step)); sync(); },
    toggle: () => {
      const c = clock.current;
      started.current = true;
      if (c.playing) { c.playing = false; sync(); }
      else if (c.t >= stepSeconds(c.step)) begin(c.step === lastStep ? 1 : c.step);
      else { c.playing = true; sync(); }
    },
  };
}

export function Engine({ intro }: { intro: ReactNode }) {
  const reduced = useMedia("(prefers-reduced-motion: reduce)");
  const tall = useMedia("(max-width: 900px)");
  const { view, source, board, go, toggle } = useEngine(reduced);
  const step = steps[view.step - 1]!;

  return (
    <section className={"engine" + (reduced ? " static" : "")} id="engine" data-step={view.step}>
      <div className="wrap">
        {intro}
        <noscript><style>{".lp .engine .live{display:none}.lp .engine .all{display:grid}"}</style></noscript>
        <div className="board" ref={board}><EngineCanvas source={source} variant={tall ? "tall" : "wide"} /></div>
        <p className="legend"><span><i className="c" />{text.legend.case}</span><span><i className="k" />{text.legend.doc}</span></p>
        <div className="live">
          <div className="now"><p className="stepno">Step {view.step} of {lastStep} · {step.title}</p><p className="stepcap">{step.caption}</p></div>
          <div className="prog" role="group" aria-label="Steps">
            {steps.map((s) => <button key={s.id} type="button" aria-current={s.id === view.step ? "step" : undefined} aria-label={`Step ${s.id}: ${s.title}`} onClick={() => go(s.id)}><b>{s.id}</b><span>{s.short}</span></button>)}
          </div>
          <div className="ctl">
            <button type="button" aria-label="Previous step" onClick={() => go(view.step - 1)} disabled={view.step === 1}>Back</button>
            <button type="button" onClick={toggle}>{view.playing ? "Pause" : "Play"}</button>
            <button type="button" aria-label="Next step" onClick={() => go(view.step + 1)} disabled={view.step === lastStep}>Next</button>
          </div>
        </div>
        <ol className="all">{steps.map((s) => <li key={s.id}><h3>{s.id}. {s.title}</h3><p>{s.caption}</p></li>)}</ol>
      </div>
    </section>
  );
}
