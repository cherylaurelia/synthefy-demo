// Turns the aggregated run log (curve.json, built by study/aggregate.py) into what the page shows.
// Every number on the page goes through here, so a claim can't drift from the logs.

export type Stat = { mean: number; min: number; max: number };

export type Point = {
  arm: string;
  n: number;
  seeds: number[];
  pinball: Stat;
  cov80: Stat;
  width: Stat;
  mae_days: Stat;
  secs: Stat;
};

export type Arm = {
  id: string;
  label: string;
  short: string;
  color: string;
  dash: string;
  inChart: boolean;
  about: string;
};

// Chart colors pass the dataviz palette validator in light mode (#CE602A, #1F6FB5, #1A9E77).
// The two conformal arms reuse their base model's hue and are told apart by a dashed line.
export const ARMS: Arm[] = [
  {
    id: "nori",
    label: "Nori-1-5, raw quantiles",
    short: "Nori",
    color: "#CE602A",
    dash: "",
    inChart: true,
    about: "NoriRegressor(model=\"nori-1-5\"), output_type=\"quantiles\", nothing added.",
  },
  {
    id: "nori_cc",
    label: "Nori + cross-conformal",
    short: "Nori + conformal",
    color: "#CE602A",
    dash: "6 4",
    inChart: true,
    about: "Nori's q10/q90 widened by a 5-fold out-of-fold conformal margin (CQR scores).",
  },
  {
    id: "hgb_tuned",
    label: "Gradient boosting, tuned",
    short: "GBM tuned",
    color: "#1F6FB5",
    dash: "",
    inChart: true,
    about: "scikit-learn HistGradientBoosting quantile loss, one model per quantile, 8 configs picked by 3-fold CV.",
  },
  {
    id: "hgb_cqr_cv",
    label: "Gradient boosting + cross-conformal",
    short: "GBM + conformal",
    color: "#1F6FB5",
    dash: "6 4",
    inChart: true,
    about: "Default HistGradientBoosting quantiles widened by the same 5-fold conformal margin.",
  },
  {
    id: "table",
    label: "Lookup table per category",
    short: "Lookup table",
    color: "#1A9E77",
    dash: "2 4",
    inChart: true,
    about: "The q10/q50/q90 of past tickets in the same service category. No model.",
  },
  {
    id: "hgb_default",
    label: "Gradient boosting, defaults",
    short: "GBM default",
    color: "#1F6FB5",
    dash: "",
    inChart: false,
    about: "HistGradientBoosting quantile loss with default settings.",
  },
  {
    id: "hgb_cqr",
    label: "Gradient boosting + split conformal (half/half)",
    short: "GBM + split conformal",
    color: "#1F6FB5",
    dash: "",
    inChart: false,
    about: "Fits on half the rows and calibrates on the other half, so it sees half the data. Shown for completeness.",
  },
];

export function sizes(points: Point[]): number[] {
  return [...new Set(points.map((p) => p.n))].toSorted((a, b) => a - b);
}

export function pointFor(points: Point[], arm: string, n: number): Point | undefined {
  return points.find((p) => p.arm === arm && p.n === n);
}

export function armsPresent(points: Point[]): Arm[] {
  const ids = new Set(points.map((p) => p.arm));

  return ARMS.filter((a) => ids.has(a.id));
}

// Which arm has the lowest mean pinball loss at each context size.
export function bestAt(points: Point[], n: number): string {
  const here = points.filter((p) => p.n === n);
  const best = here.toSorted((a, b) => a.pinball.mean - b.pinball.mean)[0];

  return best ? best.arm : "";
}

export function sizesWonBy(points: Point[], arm: string): number[] {
  return sizes(points).filter((n) => bestAt(points, n) === arm);
}

export function range(points: Point[], arm: string, metric: "cov80" | "pinball" | "mae_days"): Stat {
  const v = points.flatMap((p) => (p.arm === arm ? [p[metric].mean] : []));

  return { mean: v.reduce((s, x) => s + x, 0) / Math.max(v.length, 1), min: Math.min(...v), max: Math.max(...v) };
}

// Smallest context size at which `arm` beats `rival`'s pinball loss at `rivalN` rows.
export function smallestMatching(points: Point[], arm: string, rival: string, rivalN: number): number | undefined {
  const target = pointFor(points, rival, rivalN);

  if (!target) {
    return undefined;
  }

  return sizes(points).find((n) => {
    const p = pointFor(points, arm, n);

    return p !== undefined && p.pinball.mean < target.pinball.mean;
  });
}

// Linear scale with the log2 of context size on x.
export function scale(domain: [number, number], rangePx: [number, number]): (v: number) => number {
  const [d0, d1] = domain;
  const [r0, r1] = rangePx;

  return (v) => (d1 === d0 ? r0 : r0 + ((v - d0) / (d1 - d0)) * (r1 - r0));
}

export function fmtN(n: number): string {
  return n.toLocaleString("en-US");
}

export function pct(v: number): string {
  return `${Math.round(v * 100)}%`;
}

export function days(v: number): string {
  if (v < 1) {
    return `${Math.round(v * 24)} h`;
  }

  return `${v < 10 ? v.toFixed(1) : Math.round(v)} d`;
}

// Sizes where both arms ran, and how many of those `arm` has the lower mean pinball loss.
export function headToHead(points: Point[], arm: string, rival: string) {
  const shared = sizes(points).filter((n) => pointFor(points, arm, n) && pointFor(points, rival, n));
  const wins = shared.filter((n) => (pointFor(points, arm, n)?.pinball.mean ?? 1) < (pointFor(points, rival, n)?.pinball.mean ?? 0));

  return { wins: wins.length, of: shared.length, maxN: shared.at(-1) ?? 0 };
}
