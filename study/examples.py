# Worked example: 6 held-out Aug 1-14 tickets chosen by a fixed seed (7) BEFORE predicting,
# Nori-1-5 with 2,000 July rows as context (seed 1), q10/q50/q90 back-transformed to days.
import json, numpy as np
from prep import TR, TE0, feats, q, CAP
from synthefy_nori import NoriRegressor
ctx=TR.sample(2000,random_state=1)
ex=TE0.sample(6,random_state=7)
r=NoriRegressor(model="nori-1-5"); r.fit(ctx[feats],ctx.y.values)
lo,mid,hi=r.predict(ex[feats],output_type="quantiles",quantiles=q)
d=lambda v: round(float(np.expm1(v)),2)
out=[dict(id=str(t.service_request_id),requested=str(t.requested_datetime)[:16],service=str(t.service_name),subtype=str(t.service_subtype),
          neighborhood=str(t.analysis_neighborhood),source=str(t.source),actual_days=d(t.y),capped=bool(t.y>=np.log1p(CAP)-1e-9),
          q10=d(lo[i]),q50=d(mid[i]),q90=d(hi[i])) for i,t in enumerate(ex.itertuples())]
print(json.dumps(out,indent=1))
