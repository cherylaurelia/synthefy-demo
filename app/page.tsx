import curve from "./curve.json";
import examples from "./examples.json";
import { LineChart } from "./chart";
import {
  type Point,
  ARMS,
  armsPresent,
  days,
  fmtN,
  pct,
  pointFor,
  range,
  sizes,
  sizesWonBy,
  smallestMatching,
  headToHead,
} from "./lib";

const DEMO_REPO = "https://github.com/cherylaurelia/synthefy-demo";
const NORI_REPO = "https://github.com/Synthefy/synthefy-nori";
const ISSUE_177 = "https://github.com/Synthefy/synthefy-nori/issues/177";
const PR_191 = "https://github.com/Synthefy/synthefy-nori/pull/191";
const DATA = "https://data.sfgov.org/City-Infrastructure/311-Cases/vw6y-z8j6";

const points: Point[] = curve.points;

export default function Home() {
  const ns = sizes(points);
  const maxN = ns.at(-1) ?? 0;
  const won = sizesWonBy(points, "nori");
  const wonAll = won.length === ns.length;
  const noriCov = range(points, "nori", "cov80");
  const noriCcCov = range(points, "nori_cc", "cov80");
  const tableCov = range(points, "table", "cov80");
  const gbmCov = range(points, "hgb_tuned", "cov80");
  const cqrCov = range(points, "hgb_cqr_cv", "cov80");
  const vsCqr = headToHead(points, "nori", "hgb_cqr_cv");
  const maeNori = range(points, "nori", "mae_days");
  const maeTable = range(points, "table", "mae_days");
  const maeGbm = range(points, "hgb_tuned", "mae_days");
  const matchAll = smallestMatching(points, "nori", "hgb_tuned", maxN);
  const noriSmall = pointFor(points, "nori", ns[0] ?? 0);
  const gbmSmall = pointFor(points, "hgb_tuned", ns[0] ?? 0);
  const seeds = [...new Set(points.flatMap((p) => p.seeds))].toSorted();
  const inBand = examples.filter((e) => e.actual_days >= e.q10 && e.actual_days <= e.q90).length;

  return (
    <main className="mx-auto max-w-4xl px-5 py-12 sm:py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-deep">
        synthefy-nori 0.23.0 · nori-1-5 · real public data
      </p>
      <h1 className="mt-3 font-serif text-4xl leading-tight sm:text-5xl">
        Do Nori&apos;s free prediction intervals hold up on messy real data?
      </h1>
      <p className="mt-5 text-lg leading-relaxed">
        <strong>The question:</strong> Nori&apos;s README says intervals come free, with no conformal or quantile add-ons.
        The eval harness only scores point predictions today (
        <a className="underline decoration-orange underline-offset-2" href={ISSUE_177}>
          #177
        </a>
        ), so calibration hasn&apos;t been measured there.
      </p>
      <p className="mt-3 text-lg leading-relaxed">
        <strong>What I found:</strong> on {fmtN(maxN)} San Francisco 311 tickets, Nori{" "}
        {wonAll
          ? "had the lowest interval loss at every context size I tried"
          : `had the lowest interval loss at ${won.length} of ${ns.length} context sizes`}
        , from {fmtN(ns[0] ?? 0)} rows to all of them. Its 80% bands ran a little narrow ({pct(noriCov.min)} to{" "}
        {pct(noriCov.max)} coverage).
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <a className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white" href={DEMO_REPO}>
          Scripts, data query and raw logs
        </a>
        <a className="rounded-full border border-ink px-5 py-2.5 text-sm font-semibold" href={NORI_REPO}>
          synthefy-nori on GitHub
        </a>
      </div>

      <p className="mt-8 rounded-xl border-l-4 border-orange bg-orange-soft p-4 text-sm leading-relaxed">
        <strong>This is about intervals, not accuracy.</strong> The median prediction barely changes between methods: its mean
        absolute error is {maeNori.min.toFixed(1)} to {maeNori.max.toFixed(1)} days for Nori and {maeTable.min.toFixed(1)} to{" "}
        {maeTable.max.toFixed(1)} days for a plain lookup table at every size (the tuned GBM ranges from{" "}
        {maeGbm.min.toFixed(1)} to {maeGbm.max.toFixed(1)}, worst with few rows).
        The difference is how sharp and how honest the 10th to 90th percentile band is.
      </p>

      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-stone p-4">
          <p className="text-3xl font-semibold">
            {won.length}/{ns.length}
          </p>
          <p className="mt-1 text-sm text-muted">context sizes where Nori had the lowest pinball loss (mean of {seeds.length} seeds)</p>
        </div>
        <div className="rounded-xl bg-stone p-4">
          <p className="text-3xl font-semibold">{matchAll === undefined ? "–" : fmtN(matchAll)}</p>
          <p className="mt-1 text-sm text-muted">
            rows of context at which Nori matched a CV-tuned gradient-boosting model fit on all {fmtN(maxN)} (a tie, not a
            win)
          </p>
        </div>
        <div className="rounded-xl bg-stone p-4">
          <p className="text-3xl font-semibold">
            {pct(noriCov.min)}–{pct(noriCov.max)}
          </p>
          <p className="mt-1 text-sm text-muted">
            coverage of Nori&apos;s raw 80% band; with a conformal step on top: {pct(noriCcCov.min)}–{pct(noriCcCov.max)}
          </p>
        </div>
      </section>


      <section className="mt-10 grid gap-6">
        <LineChart
          points={points}
          metric="pinball"
          title="Interval loss vs. context size (lower is better)"
          yLabel="pinball loss, q10/q50/q90"
          yFormat={(v) => v.toFixed(3)}
        />
        <LineChart
          points={points}
          metric="cov80"
          title="How often the truth lands inside the 80% band"
          yLabel="coverage of q10–q90"
          yFormat={pct}
          reference={{ value: 0.8, label: "nominal 80%" }}
        />
        <p className="text-sm text-muted">
          Dots are means over seeds {seeds.join(", ")}; whiskers show the min and max across seeds. Hover a dot for the
          numbers. Every value comes from the run logs in the repo.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="font-serif text-2xl">What holds, and what doesn&apos;t</h2>
        <ul className="mt-4 grid gap-3 text-[15px] leading-relaxed">
          <li>
            <strong>Holds:</strong> with {fmtN(ns[0] ?? 0)} rows, Nori&apos;s pinball loss was{" "}
            {noriSmall?.pinball.mean.toFixed(3)} against {gbmSmall?.pinball.mean.toFixed(3)} for the tuned GBM, with no
            training and no tuning. Fitting is storing rows; predicting {fmtN(1500)} tickets took{" "}
            {noriSmall?.secs.mean.toFixed(0)} s to {pointFor(points, "nori", maxN)?.secs.mean.toFixed(0)} s on a laptop CPU.
          </li>
          <li>
            <strong>Holds:</strong> a 5-fold conformal step lifts the GBM&apos;s coverage from {pct(gbmCov.min)}–{pct(gbmCov.max)}{" "}
            to {pct(cqrCov.min)}–{pct(cqrCov.max)}, but Nori&apos;s raw output still had the lower loss at {vsCqr.wins} of{" "}
            {vsCqr.of} sizes. (Both conformal arms stop at {fmtN(vsCqr.maxN)} rows: the full-size cross-conformal run
            needs six Nori passes over 13k-row contexts and ran out of memory on my laptop.)
          </li>
          <li>
            <strong>Doesn&apos;t quite:</strong> Nori&apos;s raw 80% band covered {pct(noriCov.min)} to {pct(noriCov.max)}, not
            80%. The test window is a later fortnight than the context. Wrapping Nori in the same
            5-fold conformal step barely moved it ({pct(noriCcCov.min)} to {pct(noriCcCov.max)}): the margin it learned from
            July rows came out close to zero, so within July Nori&apos;s bands were already about right. The shortfall shows up
            only on the later fortnight, which is consistent with drift. With one test window I can&apos;t rule out plain
            miscalibration.
          </li>
          <li>
            <strong>Baseline to beat:</strong> a per-category lookup table covers {pct(tableCov.min)} to{" "}
            {pct(tableCov.max)} by being wide, and its loss stays flat no matter how much data it gets.
          </li>
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="font-serif text-2xl">Six held-out tickets</h2>
        <p className="mt-2 text-sm text-muted">
          Picked by a fixed seed (7) from the August test window before predicting. Nori had 2,000 July tickets as context.{" "}
          {inBand} of {examples.length} landed inside the band. Across all 1,500 test tickets, about one in four falls
          outside it. Graffiti tickets show how wide the band gets when outcomes split between &ldquo;same day&rdquo; and
          &ldquo;months&rdquo;.
        </p>
        <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-2 font-medium">Ticket</th>
                <th className="px-4 py-2 font-medium">Neighborhood</th>
                <th className="px-4 py-2 font-medium">Nori 80% band</th>
                <th className="px-4 py-2 font-medium">Median</th>
                <th className="px-4 py-2 font-medium">Actual</th>
              </tr>
            </thead>
            <tbody>
              {examples.map((e) => (
                <tr key={e.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-2">
                    {e.service}
                    <span className="block text-xs text-muted">
                      {e.subtype.replaceAll("_", " ")} · {e.source} · {e.requested.slice(0, 10)}
                    </span>
                  </td>
                  <td className="px-4 py-2">{e.neighborhood}</td>
                  <td className="px-4 py-2 tabular-nums">
                    {days(e.q10)} to {days(e.q90)}
                  </td>
                  <td className="px-4 py-2 tabular-nums">{days(e.q50)}</td>
                  <td className="px-4 py-2 tabular-nums">
                    {e.capped ? "still open at 90 d" : days(e.actual_days)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-serif text-2xl">All the numbers</h2>
        <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[640px] text-left text-sm">
            <caption className="px-4 pt-3 text-left text-xs text-muted">
              Pinball loss / 80% coverage / mean band width (log-days), mean over seeds. Bold = lowest loss at that size.
            </caption>
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-2 font-medium">Method</th>
                {ns.map((n) => (
                  <th key={n} className="px-3 py-2 text-right font-medium">
                    {fmtN(n)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {armsPresent(points).map((a) => (
                <tr key={a.id} className="border-b border-line align-top last:border-0">
                  <td className="px-4 py-2 font-sans">{a.short}</td>
                  {ns.map((n) => {
                    const p = pointFor(points, a.id, n);
                    const best = sizesWonBy(points, a.id).includes(n);

                    return (
                      <td key={n} className="px-3 py-2 text-right text-xs">
                        {p ? (
                          <>
                            <span className={best ? "font-bold" : ""}>{p.pinball.mean.toFixed(3)}</span>
                            <span className="block text-muted">{pct(p.cov80.mean)}</span>
                            <span className="block text-muted">{p.width.mean.toFixed(2)}</span>
                          </>
                        ) : (
                          "–"
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-serif text-2xl">How it was run</h2>
        <ul className="mt-4 grid gap-2 text-[15px] leading-relaxed">
          <li>
            <strong>Data:</strong>{" "}
            <a className="underline decoration-orange underline-offset-2" href={DATA}>
              DataSF 311 Cases
            </a>
            , ten street and sidewalk categories, pulled 2026-11-13. Target: days from report to close, capped at 90 and
            log-transformed. Many tickets stay open, so I only used tickets old enough to have 90 days of follow-up: July
            2026 as context, 1,500 random tickets from Aug 1–14 as the test set.
          </li>
          <li>
            <strong>Features:</strong> category, subtype, neighborhood and channel (passed to Nori as pandas categoricals),
            hour, weekday, latitude and longitude. No scaling, as the README says.
          </li>
          <li>
            <strong>Methods:</strong>
            <ul className="mt-1 grid gap-1 pl-4 text-sm text-muted">
              {ARMS.map((a) => (
                <li key={a.id}>
                  <span className="text-ink">{a.label}:</span> {a.about}
                </li>
              ))}
            </ul>
          </li>
          <li>
            <strong>Runs:</strong> {curve.runs} logged runs (each arm × size × seed). Context rows are drawn per seed, and
            the test sample changes with the seed too. One city, one test fortnight: treat this as one honest data point,
            not a benchmark.
          </li>
          <li>
            <strong>Reproduce:</strong>{" "}
            <code className="rounded bg-stone px-1.5 py-0.5 text-sm">pip install synthefy-nori</code>, then{" "}
            <code className="rounded bg-stone px-1.5 py-0.5 text-sm">python study/curve.py 2000 1 nori,hgb_tuned</code>{" "}
            (README in the repo). If coverage metrics land in the eval (
            <a className="underline decoration-orange underline-offset-2" href={PR_191}>
              #191
            </a>
            ), this is the kind of dataset I&apos;d want them run on.
          </li>
        </ul>
      </section>

      <footer className="mt-16 border-t border-line pt-6 text-sm text-muted">
        Unofficial demo by Cheryl Aurelia: not affiliated with Synthefy. Nori is Synthefy&apos;s Apache-2.0 model; all
        runs used the public package and weights.
      </footer>
    </main>
  );
}
