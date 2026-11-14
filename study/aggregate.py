"""Build app/curve.json (mean/min/max over seeds per arm x context size) from the raw run logs.
Every number on the page comes from this file. Usage: python study/aggregate.py"""
import json, glob, os, statistics
here = os.path.dirname(os.path.abspath(__file__))
rows = []
for f in sorted(glob.glob(os.path.join(here, "logs", "curve*", "*.jsonl"))):
    rows += [json.loads(l) for l in open(f) if l.strip()]
out = {}
for r in rows:
    out.setdefault(r["arm"], {}).setdefault(r["n"], []).append(r)
res = []
for arm, by_n in out.items():
    for n, rs in sorted(by_n.items()):
        agg = {"arm": arm, "n": n, "seeds": sorted(x["seed"] for x in rs)}
        for k in ("pinball", "cov80", "width", "mae_days", "secs"):
            v = [x[k] for x in rs]
            agg[k] = {"mean": round(statistics.mean(v), 4), "min": round(min(v), 4), "max": round(max(v), 4)}
        res.append(agg)
json.dump({"runs": len(rows), "points": res}, open(os.path.join(here, "..", "app", "curve.json"), "w"), indent=1)
print(f"{len(rows)} runs -> {len(res)} points")
