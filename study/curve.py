# learning curve: Nori vs tuned HGB quantile vs CQR-conformalized HGB vs per-category table
import pandas as pd, numpy as np, time, sys, json, warnings
warnings.filterwarnings('ignore')
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.model_selection import KFold
from synthefy_nori import NoriRegressor
CAP=90; q=[0.1,0.5,0.9]
d=pd.read_csv('data/sf311-2026-11-13.csv.gz',parse_dates=['requested_datetime','closed_date'])
d=d[d.source.isin(['Web','Mobile','Phone','Integrated Agency'])]
end=d.closed_date.fillna(pd.Timestamp('2026-11-13'))
d['y']=np.log1p(np.minimum((end-d.requested_datetime).dt.total_seconds()/86400,CAP))
d=d[np.isfinite(d.y)]
d['hour']=d.requested_datetime.dt.hour; d['dow']=d.requested_datetime.dt.day_of_week
cats=['service_name','service_subtype','analysis_neighborhood','source']; feats=cats+['hour','dow','lat','long']
for c in cats: d[c]=d[c].fillna('NA').astype('category')
TR=d[(d.requested_datetime>='2026-07-01')&(d.requested_datetime<'2026-08-01')]
TE0=d[(d.requested_datetime>='2026-08-01')&(d.requested_datetime<'2026-08-15')]
Xs=lambda f: f[feats].assign(**{c:f[c].cat.codes for c in cats})
def pin(y,p,a): e=y-p; return np.mean(np.maximum(a*e,(a-1)*e))
def score(y,P): return dict(pinball=float(np.mean([pin(y,P[i],a) for i,a in enumerate(q)])), cov80=float(np.mean((y>=P[0])&(y<=P[2]))), width=float(np.mean(P[2]-P[0])), mae_days=float(np.mean(np.abs(np.expm1(y)-np.expm1(P[1])))))
GRID=[dict(learning_rate=lr,max_leaf_nodes=ml,min_samples_leaf=msl) for lr in (0.05,0.1) for ml in (15,31) for msl in (5,20)]
def hgb(a,p,X,y): return HistGradientBoostingRegressor(loss='quantile',quantile=a,categorical_features=[0,1,2,3],random_state=0,**p).fit(X,y)
def tuned(ctx,te):
    X,y=Xs(ctx),ctx.y.values; best=None
    for p in GRID:
        s=0
        for tri,vai in KFold(3,shuffle=True,random_state=0).split(X):
            s+=np.mean([pin(y[vai],hgb(a,p,X.iloc[tri],y[tri]).predict(X.iloc[vai]),a) for a in q])
        if best is None or s<best[0]: best=(s,p)
    return [hgb(a,best[1],X,y).predict(Xs(te)) for a in q]
def cqr(ctx,te):  # split conformal (CQR) on default HGB, half train / half calibrate
    c=ctx.sample(frac=1,random_state=0); h=len(c)//2; A,B=c.iloc[:h],c.iloc[h:]
    m=[hgb(a,{},Xs(A),A.y.values) for a in q]
    lo,hi=m[0].predict(Xs(B)),m[2].predict(Xs(B)); s=np.maximum(lo-B.y.values,B.y.values-hi)
    k=np.quantile(s,min(1,np.ceil((len(B)+1)*0.8)/len(B)))
    P=[mm.predict(Xs(te)) for mm in m]; return [P[0]-k,P[1],P[2]+k]
def cross_conf(ctx,te,fitpred,K=5):
    # cross-conformal (CV+ style): out-of-fold CQR scores from K folds; final band = full-context model +/- k
    X=ctx.reset_index(drop=True); sc=[]
    for tri,vai in KFold(K,shuffle=True,random_state=0).split(X):
        A,B=X.iloc[tri],X.iloc[vai]; P=fitpred(A,B)
        sc.append(np.maximum(P[0]-B.y.values,B.y.values-P[2]))
    sc=np.concatenate(sc); k=np.quantile(sc,min(1,np.ceil((len(sc)+1)*0.8)/len(sc)))
    P=fitpred(X,te); return [P[0]-k,P[1],P[2]+k]
def nori_fp(A,B):
    r=NoriRegressor(model="nori-1-5"); r.fit(A[feats],A.y.values); return list(r.predict(B[feats],output_type="quantiles",quantiles=q))
def hgb_fp(A,B): return [hgb(a,{},Xs(A),A.y.values).predict(Xs(B)) for a in q]
n=int(sys.argv[1]); seed=int(sys.argv[2]); arms=sys.argv[3].split(',')
ctx=TR.sample(n,random_state=seed) if n<len(TR) else TR
te=TE0.sample(1500,random_state=seed)
for arm in arms:
    t=time.time()
    if arm=='nori':
        r=NoriRegressor(model="nori-1-5"); r.fit(ctx[feats],ctx.y.values); P=list(r.predict(te[feats],output_type="quantiles",quantiles=q))
    elif arm=='hgb_default': P=[hgb(a,{},Xs(ctx),ctx.y.values).predict(Xs(te)) for a in q]
    elif arm=='hgb_tuned': P=tuned(ctx,te)
    elif arm=='hgb_cqr': P=cqr(ctx,te)
    elif arm=='nori_cc': P=cross_conf(ctx,te,nori_fp)
    elif arm=='hgb_cqr_cv': P=cross_conf(ctx,te,hgb_fp)
    elif arm=='table': P=[te.service_name.map(ctx.groupby('service_name',observed=True).y.quantile(a)).astype(float).fillna(ctx.y.quantile(a)).values for a in q]
    rec=dict(n=len(ctx),seed=seed,arm=arm,secs=round(time.time()-t,1),**score(te.y.values,P))
    print(json.dumps(rec),flush=True)
