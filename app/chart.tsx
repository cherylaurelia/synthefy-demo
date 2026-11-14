import { type Point, armsPresent, fmtN, pointFor, scale, sizes } from "./lib";

const W = 640;
const H = 300;
const PAD = { l: 52, r: 120, t: 16, b: 40 };

type Props = {
  points: Point[];
  metric: "pinball" | "cov80";
  title: string;
  yLabel: string;
  yFormat: (v: number) => string;
  reference?: { value: number; label: string };
};

export function LineChart({ points, metric, title, yLabel, yFormat, reference }: Props) {
  const ns = sizes(points);
  const arms = armsPresent(points).filter((a) => a.inChart);
  const shown = points.filter((p) => arms.some((a) => a.id === p.arm));
  const vals = shown.flatMap((p) => [p[metric].min, p[metric].max]);

  if (reference) {
    vals.push(reference.value);
  }

  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const padY = (hi - lo) * 0.08;
  const y = scale([lo - padY, hi + padY], [H - PAD.b, PAD.t]);
  const x = scale([0, ns.length - 1], [PAD.l, W - PAD.r]);
  const ticks = [0, 1, 2, 3, 4].map((i) => lo - padY + ((hi + padY - (lo - padY)) * i) / 4);
  const lastN = ns.at(-1) ?? 0;

  // Direct labels at the right edge, nudged apart so they never overlap.
  const ends = arms
    .map((a) => ({ arm: a, v: pointFor(points, a.id, lastN)?.[metric].mean }))
    .filter((e): e is { arm: (typeof arms)[number]; v: number } => e.v !== undefined)
    .map((e) => ({ ...e, y: y(e.v) }))
    .toSorted((a, b) => a.y - b.y);

  for (let i = 1; i < ends.length; i++) {
    ends[i].y = Math.max(ends[i].y, ends[i - 1].y + 14);
  }

  return (
    <figure className="rounded-xl border border-line bg-surface p-4">
      <figcaption className="mb-2 text-sm font-semibold">{title}</figcaption>
      <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full min-w-[560px]" role="img" aria-label={title}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="#ece8df" />
            <text x={PAD.l - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#52605f">
              {yFormat(t)}
            </text>
          </g>
        ))}
        {ns.map((n, i) => (
          <text key={n} x={x(i)} y={H - PAD.b + 18} textAnchor="middle" fontSize="11" fill="#52605f">
            {fmtN(n)}
          </text>
        ))}
        <text x={(PAD.l + W - PAD.r) / 2} y={H - 4} textAnchor="middle" fontSize="11" fill="#52605f">
          context rows (log scale)
        </text>
        <text x={12} y={H / 2} textAnchor="middle" fontSize="11" fill="#52605f" transform={`rotate(-90 12 ${H / 2})`}>
          {yLabel}
        </text>
        {reference ? (
          <g>
            <line
              x1={PAD.l}
              x2={W - PAD.r}
              y1={y(reference.value)}
              y2={y(reference.value)}
              stroke="#243740"
              strokeWidth="1"
              strokeDasharray="1 3"
            />
            <text x={PAD.l + 4} y={y(reference.value) - 5} fontSize="11" fill="#243740">
              {reference.label}
            </text>
          </g>
        ) : null}
        {arms.map((a) => {
          const pts = ns.flatMap((n, i) => {
            const p = pointFor(points, a.id, n);

            return p ? [{ i, n, p }] : [];
          });

          return (
            <g key={a.id}>
              <polyline
                fill="none"
                stroke={a.color}
                strokeWidth="2"
                strokeDasharray={a.dash}
                points={pts.map(({ i, p }) => `${x(i)},${y(p[metric].mean)}`).join(" ")}
              />
              {pts.map(({ i, n, p }) => (
                <g key={n}>
                  <line x1={x(i)} x2={x(i)} y1={y(p[metric].min)} y2={y(p[metric].max)} stroke={a.color} strokeWidth="1.5" opacity="0.5" />
                  <circle cx={x(i)} cy={y(p[metric].mean)} r="4" fill={a.color} stroke="#fff" strokeWidth="2">
                    <title>
                      {`${a.short}, ${fmtN(n)} rows: ${yFormat(p[metric].mean)} (seeds ${p.seeds.join(", ")}: ${yFormat(p[metric].min)} to ${yFormat(p[metric].max)})`}
                    </title>
                  </circle>
                  <circle cx={x(i)} cy={y(p[metric].mean)} r="12" fill="transparent">
                    <title>
                      {`${a.short}, ${fmtN(n)} rows: ${yFormat(p[metric].mean)} (seeds ${p.seeds.join(", ")}: ${yFormat(p[metric].min)} to ${yFormat(p[metric].max)})`}
                    </title>
                  </circle>
                </g>
              ))}
            </g>
          );
        })}
        {ends.map((e) => (
          <text key={e.arm.id} x={W - PAD.r + 10} y={e.y + 4} fontSize="11" fill="#243740">
            {e.arm.short}
          </text>
        ))}
      </svg>
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        {arms.map((a) => (
          <li key={a.id} className="flex items-center gap-1.5">
            <svg width="22" height="8" aria-hidden="true">
              <line x1="0" x2="22" y1="4" y2="4" stroke={a.color} strokeWidth="2" strokeDasharray={a.dash} />
            </svg>
            {a.label}
          </li>
        ))}
      </ul>
    </figure>
  );
}
