/** Every colour the engine scene paints, in one place. The canvas cannot read CSS, so these are constants.
 *  Teal is a case, dark ink is a document. A shade is [top, left face, right face] of a block. */
export type Shade = readonly [top: string, left: string, right: string];

export const palette = {
  ink: "#131416",
  doc: "#20282c",
  case: "#1b6c80",
  sub: "#5d5f60",
  alert: "#e5484d",
  alertText: "#c9282d",
  amber: "#ffb703",
  amberDark: "#e09f00",
  idle: "#aab6bf",
  sky: ["#f1eefb", "#dcecf6"],
  plate: { top: "#ffffff", front: "#b8c8ea", side: "#9fb2dc", grid: "rgba(90,110,170,.13)" },
  road: "#e7ecf6",
  wall: "rgba(62,163,187,.14)",
  floor: (alpha: number) => `rgba(62,163,187,${alpha})`,
  chipBackdrop: "rgba(255,255,255,.93)",
  socketFace: "rgba(255,255,255,.85)",
  white: "#ffffff",
} as const;

export const shades = {
  teal: ["#3ea3bb", "#1b6c80", "#145362"],
  ink: ["#4a5a63", "#20282c", "#14191c"],
  base: ["#3a444b", "#20282c", "#14191c"],
  white: ["#ffffff", "#d9e0e6", "#c3ccd4"],
  red: ["#ff7b80", "#e5484d", "#b8333a"],
  amber: ["#ffd166", "#ffb703", "#d99a00"],
  grey: ["#c9d3da", "#aab6bf", "#95a3ad"],
} as const satisfies Record<string, Shade>;
