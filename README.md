# Nori's free prediction intervals on real SF 311 data

An unofficial check of one claim in the [synthefy-nori](https://github.com/Synthefy/synthefy-nori) README:
prediction intervals "come free — no conformal/quantile add-ons". The eval harness scores only point
predictions today ([#177](https://github.com/Synthefy/synthefy-nori/issues/177), [#191](https://github.com/Synthefy/synthefy-nori/pull/191)),
so this measures calibration on a messy real dataset instead.

**Setup.** DataSF 311 Cases (10 street/sidewalk categories), days-to-close capped at 90 and log-transformed.
Context: July 2026 tickets (16,786). Test: 1,500 random Aug 1–14 tickets (all have 90 days of follow-up).
Learning curve over 250 → 16,786 context rows, 3 seeds, Nori-1-5 against a tuned HistGradientBoosting quantile
model, conformal variants of both, and a per-category lookup table. Metrics: pinball loss over q10/q50/q90,
coverage and width of the q10–q90 band, MAE of the median in days.

**Result.** See the page. Every number comes from `study/logs/**.jsonl` through `study/aggregate.py`.

## Reproduce

```sh
python -m venv .venv && . .venv/bin/activate
pip install synthefy-nori pandas scikit-learn     # synthefy-nori 0.23.0, torch 2.13, CPU is fine
python study/curve.py 2000 1 nori,hgb_tuned,hgb_cqr_cv,nori_cc,table   # <context rows> <seed> <arms>
python study/examples.py                          # the six worked-example tickets
python study/aggregate.py                         # logs -> app/curve.json
```

Arms: `nori`, `nori_cc` (5-fold cross-conformal on Nori's own quantiles), `hgb_default`, `hgb_tuned`
(8 configs, 3-fold CV), `hgb_cqr` (split conformal, half/half), `hgb_cqr_cv` (5-fold cross-conformal), `table`.
Pass `99999` as the size to use every July row. `data/sf311-2026-11-13.csv.gz` is the snapshot used;
`study/fetch.sh` pulls a fresh copy (tickets close over time, so numbers will move).

The page is Next.js: `npm i && npm run dev`. `npm test` checks the helpers that compute the page's claims.

Unofficial demo by Cheryl Aurelia: not affiliated with Synthefy.
