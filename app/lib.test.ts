import { test } from "node:test";
import assert from "node:assert/strict";
import { type Point, bestAt, headToHead, days, scale, sizesWonBy, smallestMatching } from "./lib.ts";

const s = (v: number) => ({ mean: v, min: v, max: v });

const pt = (arm: string, n: number, pinball: number): Point => ({
  arm,
  n,
  seeds: [1],
  pinball: s(pinball),
  cov80: s(0.8),
  width: s(1),
  mae_days: s(10),
  secs: s(1),
});

const pts = [pt("nori", 250, 0.3), pt("gbm", 250, 0.33), pt("nori", 1000, 0.29), pt("gbm", 1000, 0.28), pt("gbm", 4000, 0.295)];

test("bestAt picks the lowest mean pinball at a size", () => {
  assert.equal(bestAt(pts, 250), "nori");
  assert.equal(bestAt(pts, 1000), "gbm");
  assert.equal(bestAt(pts, 999), "");
});

test("sizesWonBy lists only the sizes an arm wins", () => {
  assert.deepEqual(sizesWonBy(pts, "nori"), [250]);
});

test("smallestMatching finds the first size that beats the rival's point", () => {
  assert.equal(smallestMatching(pts, "nori", "gbm", 4000), 1000);
  assert.equal(smallestMatching(pts, "nori", "gbm", 1000), undefined);
  assert.equal(smallestMatching(pts, "nori", "missing", 4000), undefined);
});

test("scale maps the domain onto the range and survives a flat domain", () => {
  const f = scale([0, 10], [100, 0]);
  assert.equal(f(0), 100);
  assert.equal(f(5), 50);
  assert.equal(scale([3, 3], [7, 9])(3), 7);
});

test("days formats hours, short and long spans", () => {
  assert.equal(days(0.5), "12 h");
  assert.equal(days(2.94), "2.9 d");
  assert.equal(days(76.5), "77 d");
});

test("headToHead counts wins only where both arms ran", () => {
  assert.deepEqual(headToHead(pts, "nori", "gbm"), { wins: 1, of: 2, maxN: 1000 });
});
