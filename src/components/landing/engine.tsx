"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { Board } from "./engine-board";
import { tall, wide } from "./engine-layout";
import { lastStep, steps, text, timing, type StepId } from "./engine-timeline";

type View = { step: StepId; sub: number; playing: boolean };

/** Before the board is seen, and for reduced motion and no JavaScript, the board rests on the full picture. */
const resting: View = { step: lastStep, sub: 2, playing: false };

function useMedia(query: string) {
  return useSyncExternalStore(
    (notify) => { const list = matchMedia(query); list.addEventListener("change", notify); return () => list.removeEventListener("change", notify); },
    () => matchMedia(query).matches,
    () => false,
  );
}

const clamp = (n: number): StepId => Math.min(lastStep, Math.max(1, n)) as StepId;
const enter = (step: StepId, playing: boolean): View => ({ step, sub: step === 3 && playing ? 0 : 2, playing });

/** One requestAnimationFrame clock moves the step. It runs only while the board is on screen and the tab is visible. */
function useEngine(reduced: boolean) {
  const [view, setView] = useState<View>(resting);
  const board = useRef<HTMLDivElement>(null);
  const clock = useRef({ t: 0, last: 0, visible: false, started: false, view: resting });
  const show = (next: View) => { clock.current.view = next; clock.current.t = 0; setView(next); };

  useEffect(() => {
    if (reduced) return undefined;
    const c = clock.current;
    let frame = 0;
    const loop = (now: number) => {
      const dt = Math.min(50, now - c.last);
      c.last = now;
      const v = c.view;
      if (v.playing && c.visible && !document.hidden) {
        c.t += dt;
        if (c.t >= timing.stepMs[v.step]) {
          c.t = 0;
          c.view = enter(v.step === lastStep ? 1 : clamp(v.step + 1), true);
          setView(c.view);
        } else if (v.step === 3) {
          const sub = timing.filterAt.filter((at) => c.t >= at).length - 1;
          if (sub !== v.sub) { c.view = { ...v, sub }; setView(c.view); }
        }
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame((now) => { c.last = now; loop(now); });
    const el = board.current;
    const observer = new IntersectionObserver(([entry]) => {
      c.visible = entry?.isIntersecting ?? false;
      if (c.visible && !c.started) { c.started = true; c.t = 0; c.view = enter(1, true); setView(c.view); }
    }, { threshold: 0.35 });
    if (el) observer.observe(el);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [reduced]);

  return {
    view: reduced ? resting : view,
    board,
    go: (step: number) => { clock.current.started = true; show(enter(clamp(step), false)); },
    toggle: () => {
      const v = clock.current.view;
      clock.current.started = true;
      if (v.playing) show({ ...v, playing: false, sub: 2 });
      else show(enter(v.step === lastStep ? 1 : v.step, true));
    },
  };
}

export function Engine({ intro }: { intro: ReactNode }) {
  const reduced = useMedia("(prefers-reduced-motion: reduce)");
  const { view, board, go, toggle } = useEngine(reduced);
  const step = steps[view.step - 1]!;

  return (
    <section className={"engine" + (reduced ? " static" : "")} id="engine" data-step={view.step}>
      <div className="wrap">
        {intro}
        <noscript><style>{".lp .engine .live{display:none}.lp .engine .all{display:grid}"}</style></noscript>
        <div className="board" ref={board}>
          <div className="only-wide"><Board layout={wide} step={view.step} sub={view.sub} /></div>
          <div className="only-tall"><Board layout={tall} step={view.step} sub={view.sub} /></div>
        </div>
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
