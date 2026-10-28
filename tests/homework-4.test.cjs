const { test } = require('node:test');
const assert = require('node:assert/strict');
const H = require('../homework-4-core.js');

test('Bernoulli increment formulas and endpoints match the simulated construction', () => {
  const r = H.simulate('bernoulli', 200, 1200, 0.3, 17);
  assert.equal(r.mu, 0.3);
  assert.equal(r.sigma2, 0.21);
  assert.ok(Math.abs(r.metrics.total.variance - 200 ** 2 * r.metrics.average.variance) < 1e-10);
  assert.ok(Math.abs(r.metrics.sqrt.variance - r.metrics.total.variance / 200) < 1e-12);
  assert.ok(r.scores.every(x => Number.isInteger(x) && x >= 0 && x <= 200));
  assert.ok(Math.abs(r.metrics.average.mean - 0.3) < 0.02);
  assert.equal(r.centeredZ.length, 1200);
  const zero = H.simulate('bernoulli', 10, 4, 0, 7);
  const one = H.simulate('bernoulli', 10, 4, 1, 7);
  assert.ok(zero.scores.every(x => x === 0));
  assert.ok(one.scores.every(x => x === 10));
  assert.equal(zero.centeredZ, null);
});

test('Rademacher scores are symmetric with mean zero and the expected variance scales', () => {
  const r = H.simulate('rademacher', 500, 2000, 0.5, 19);
  assert.equal(r.mu, 0);
  assert.equal(r.sigma2, 1);
  assert.ok(r.scores.every(x => Number.isInteger(x) && Math.abs(x) <= 500 && (x - 500) % 2 === 0));
  assert.ok(Math.abs(r.metrics.total.mean) < 1.5);
  assert.ok(Math.abs(r.metrics.total.variance - 500) < 25);
  assert.ok(Math.abs(r.metrics.average.variance - 1 / 500) < 0.001);
  assert.ok(Math.abs(r.metrics.sqrt.variance - 1) < 0.05);
  assert.equal(r.centeredZ.length, 2000);
});

test('the same seed is exactly reproducible and a changed seed changes paths', () => {
  const a = H.simulate('rademacher', 40, 25, 0.4, 20261028);
  const b = H.simulate('rademacher', 40, 25, 0.4, 20261028);
  const c = H.simulate('rademacher', 40, 25, 0.4, 20261029);
  assert.deepEqual(a.scores, b.scores);
  assert.deepEqual(a.paths, b.paths);
  assert.notDeepEqual(a.scores, c.scores);
  assert.equal(a.paths.length, 12);
  assert.equal(a.paths[0].length, 41);
  assert.equal(a.paths[0][0], 0);
  assert.equal(a.paths[0][40], a.scores[0]);
});

test('increasing-size sweep reuses nested attacker paths across n', () => {
  for (const model of ['bernoulli', 'rademacher']) {
    const sweep = H.simulateMany(model, [10, 25, 100], 80, 0.3, 1234);
    assert.deepEqual(sweep.map(r => r.n), [10, 25, 100]);
    assert.deepEqual(sweep[0].scores.slice(0, 12), sweep[2].paths.map(path => path[10]));
    assert.deepEqual(sweep[1].scores.slice(0, 12), sweep[2].paths.map(path => path[25]));
  }
  assert.throws(() => H.simulateMany('bernoulli', [10, 10], 1, .3, 3));
  assert.throws(() => H.simulateMany('bernoulli', [25, 10], 1, .3, 3));
});

test('group moments scale with attacker count and total visits', () => {
  const n = 25, m = 80, p = 0.4, r = H.simulate('bernoulli', n, m, p, 123);
  const q = p * (1 - p), visits = n * m;
  assert.equal(r.group.totalMean, visits * p);
  assert.equal(r.group.totalVariance, visits * q);
  assert.equal(r.group.averageMean, p);
  assert.equal(r.group.averageVariance, q / visits);
  assert.equal(r.group.normalizedMean, p * Math.sqrt(visits));
  assert.equal(r.group.normalizedVariance, q);
  assert.ok(Math.abs(r.group.observedAverage - p) < 0.03);
});

test('LLN closeness fraction and Chebyshev bound are valid proportions', () => {
  for (const r of [H.simulate('bernoulli', 100, 300, 0.3, 1), H.simulate('rademacher', 100, 300, 0.5, 2)]) {
    assert.ok(r.fractionWithinTolerance >= 0 && r.fractionWithinTolerance <= 1);
    assert.ok(r.chebyshevBound >= 0 && r.chebyshevBound <= 1);
    assert.ok(Math.abs(r.fractionWithinTolerance * r.m - Math.round(r.fractionWithinTolerance * r.m)) < 1e-9);
    assert.equal(r.paths.length, 12);
  }
  assert.equal(H.simulate('bernoulli', 20, 30, 0, 8).chebyshevBound, 0);
});

test('bounds reject non-integer and overly expensive experiment inputs', () => {
  for (const args of [['bernoulli', 0, 2, .5, 1], ['bernoulli', 5001, 1, .5, 1], ['rademacher', 1, 2001, .5, 1], ['rademacher', 4000, 1500, .5, 1], ['rademacher', 10, 2, 1.1, 1], ['other', 10, 2, .5, 1], ['rademacher', 2, 2, .5, -1]]) {
    assert.throws(() => H.simulate(...args));
  }
  assert.throws(() => H.validate(2.2, 1, 0.5));
  assert.throws(() => H.moments([]));
});

test('Bernoulli CLT standardization centers at np and has unit variance', () => {
  const r = H.simulate('bernoulli', 700, 2000, 0.3, 91);
  const z = r.centeredZ;
  const mz = z.reduce((a, b) => a + b, 0) / z.length;
  const vz = z.reduce((a, x) => a + (x - mz) ** 2, 0) / z.length;
  assert.ok(Math.abs(mz) < 0.06);
  assert.ok(Math.abs(vz - 1) < 0.15);
  const symmetric = H.simulate('rademacher', 700, 2000, 0.3, 92);
  assert.deepEqual(symmetric.centeredZ, symmetric.scores.map(x => x / Math.sqrt(700)));
});
