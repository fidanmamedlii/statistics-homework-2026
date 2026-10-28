(function (root) {
  'use strict';
  const DRAW_LIMIT = 5_000_000;
  const EPSILON = 0.1;

  function validate(n, m, p) {
    if (!Number.isInteger(n) || n < 1 || n > 5000) throw new RangeError('n must be an integer from 1 to 5,000.');
    if (!Number.isInteger(m) || m < 1 || m > 2000) throw new RangeError('m must be an integer from 1 to 2,000.');
    if (n * m > DRAW_LIMIT) throw new RangeError('Choose n and m so that n × m is no more than 5,000,000.');
    if (typeof p !== 'number' || !Number.isFinite(p) || p < 0 || p > 1) throw new RangeError('p must be between 0 and 1.');
  }

  function mulberry32(seed) {
    let state = seed >>> 0;
    return function next() {
      let t = state += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function moments(values) {
    const n = values.length;
    if (n < 1) throw new RangeError('At least one observation is required to calculate moments.');
    const mean = values.reduce((a, b) => a + b, 0) / n;
    return { mean, variance: values.reduce((a, x) => a + (x - mean) ** 2, 0) / n };
  }

  function simulate(model, n, m, p, seed) {
    return simulateMany(model, [n], m, p, seed)[0];
  }

  function makeResult(model, n, m, p, seed, scores, paths) {
    const avg = Array.from(scores, s => s / n);
    const rootScaled = Array.from(scores, s => s / Math.sqrt(n));
    const mu = model === 'bernoulli' ? p : 0;
    const sigma2 = model === 'bernoulli' ? p * (1 - p) : 1;
    const centeredZ = sigma2 === 0 ? null : Array.from(scores, s => (s - n * mu) / Math.sqrt(n * sigma2));
    const t = Array.from(scores).reduce((a, b) => a + b, 0);
    return {
      model, n, m, p, seed, mu, sigma2,
      scores: Array.from(scores), paths,
      metrics: { total: moments(Array.from(scores)), average: moments(avg), sqrt: moments(rootScaled) },
      centeredZ,
      fractionWithinTolerance: avg.filter(x => Math.abs(x - mu) < EPSILON).length / m,
      chebyshevBound: sigma2 === 0 ? 0 : Math.min(1, sigma2 / (n * EPSILON ** 2)),
      group: {
        totalMean: m * n * mu,
        totalVariance: m * n * sigma2,
        averageMean: mu,
        averageVariance: sigma2 / (m * n),
        normalizedMean: mu * Math.sqrt(m * n),
        normalizedVariance: sigma2,
        observedTotal: t,
        observedAverage: t / (m * n),
        observedNormalized: t / Math.sqrt(m * n)
      }
    };
  }

  function simulateMany(model, sizes, m, p, seed) {
    if (!Array.isArray(sizes) || sizes.length < 1 || sizes.some((n, i) => !Number.isInteger(n) || n < 1 || n > 5000 || (i > 0 && n <= sizes[i - 1]))) throw new RangeError('Provide increasing system sizes from 1 to 5,000.');
    const maxN = sizes[sizes.length - 1];
    validate(maxN, m, p);
    if (model !== 'bernoulli' && model !== 'rademacher') throw new RangeError('Unknown increment model.');
    if (!Number.isInteger(seed) || seed < 0 || seed > 0xFFFFFFFF) throw new RangeError('Seed must be a 32-bit unsigned integer.');

    const collected = sizes.map(() => new Float64Array(m));
    const paths = Array.from({ length: Math.min(12, m) }, () => new Float64Array(maxN + 1));
    for (let j = 0; j < m; j++) {
      const random = mulberry32((seed ^ Math.imul(j + 1, 0x9E3779B9)) >>> 0);
      let score = 0;
      let sizeIndex = 0;
      for (let i = 1; i <= maxN; i++) {
        score += model === 'bernoulli' ? (random() < p ? 1 : 0) : (random() < 0.5 ? -1 : 1);
        if (j < paths.length) paths[j][i] = score;
        if (i === sizes[sizeIndex]) { collected[sizeIndex][j] = score; sizeIndex++; }
      }
    }
    return sizes.map((n, index) => makeResult(model, n, m, p, seed, collected[index], paths.map(path => Array.from(path.slice(0, n + 1)))));
  }

  const api = Object.freeze({ DRAW_LIMIT, EPSILON, validate, moments, simulate, simulateMany });
  root.HW4 = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
