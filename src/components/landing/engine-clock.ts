import { lastStep, timing, type StepId } from "./engine-timeline";

/** The one clock the engine runs on. `t` is seconds into the step. `now` is an ambient clock that keeps moving the small things (dots, pings) while paused. */
export type Clock = {
  step: StepId;
  t: number;
  now: number;
  playing: boolean;
  /** Set by the canvas. The loop calls it each frame the board is on screen. */
  paint: (() => void) | null;
};

export const stepSeconds = (step: StepId) => timing.stepMs[step] / 1000;

/** The ambient time of the resting frame. It shows a rejected block at the gate. */
export const restingNow = 1;

/** The whole step has played: every layer is in and the sources have moved. */
export function settle(clock: Clock, step: StepId) {
  clock.step = step;
  clock.t = stepSeconds(step);
  clock.playing = false;
}

/** What the canvas sees of the clock: a way to read it, and a way to be called on each frame. */
export type ClockSource = {
  read: () => Clock;
  /** Registers the function that paints one frame. Returns a function that removes it. */
  attach: (paint: () => void) => () => void;
};

/** Before the board is seen, and for reduced motion and no JavaScript, the board rests on the full picture. */
export function restingClock(): Clock {
  const clock: Clock = { step: lastStep, t: 0, now: restingNow, playing: false, paint: null };
  settle(clock, lastStep);
  return clock;
}
