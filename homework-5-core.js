(function (global) {
  'use strict';

  const SCORE_MIN = 0;
  const SCORE_MAX = 10;
  const OUTCOMES = SCORE_MAX - SCORE_MIN + 1;
  const THEORETICAL_MEAN = 5;
  const THEORETICAL_VARIANCE = 10;
  const FOURTH_CENTRAL_MOMENT = 178;

  function createRandomUint32(seed) {
    let state = Number(seed) >>> 0;
    return function nextUint32() {
      state = (state + 0x6D2B79F5) >>> 0;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return (value ^ (value >>> 14)) >>> 0;
    };
  }

  function drawUniformScore(nextUint32) {
    const range = 0x100000000;
    const usable = Math.floor(range / OUTCOMES) * OUTCOMES;
    let value;
    do {
      value = nextUint32();
    } while (value >= usable);
    return SCORE_MIN + (value % OUTCOMES);
  }

  function createAccumulator() {
    return { count: 0, mean: 0, M2: 0 };
  }

  function update(accumulator, value) {
    accumulator.count += 1;
    const delta = value - accumulator.mean;
    accumulator.mean += delta / accumulator.count;
    accumulator.M2 += delta * (value - accumulator.mean);
    return accumulator;
  }

  function summarize(values) {
    const accumulator = createAccumulator();
    for (const value of values) update(accumulator, value);
    const variance = accumulator.count ? accumulator.M2 / accumulator.count : 0;
    return {
      count: accumulator.count,
      mean: accumulator.mean,
      variance: variance,
      standardDeviation: Math.sqrt(variance)
    };
  }

  function sweepSizes(maxN) {
    const preferred = [2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000];
    const sizes = preferred.filter(function (value) { return value <= maxN; });
    if (sizes[sizes.length - 1] !== maxN) sizes.push(maxN);
    return sizes;
  }

  function theoreticalSampleVarianceVariance(n) {
    if (n < 2) return null;
    const sigma4 = THEORETICAL_VARIANCE * THEORETICAL_VARIANCE;
    return (
      FOURTH_CENTRAL_MOMENT -
      ((n - 3) / (n - 1)) * sigma4
    ) / n;
  }

  function summarizeCheckpoint(point, m) {
    const means = summarize(point.means);
    const variances = summarize(point.variances);
    const meanEstimatorVariance = THEORETICAL_VARIANCE / point.n;
    const varianceEstimatorVariance = theoreticalSampleVarianceVariance(point.n);
    return {
      n: point.n,
      m: m,
      meanOfSampleMeans: means.mean,
      meanOfSampleVariances: variances.mean,
      observedMeanEstimateSD: means.standardDeviation,
      theoreticalMeanEstimateSD: Math.sqrt(meanEstimatorVariance),
      observedVarianceEstimateSD: variances.standardDeviation,
      theoreticalVarianceEstimateSD: Math.sqrt(varianceEstimatorVariance),
      meanOfMeansSE: Math.sqrt(meanEstimatorVariance / m),
      meanOfVariancesSE: Math.sqrt(varianceEstimatorVariance / m),
      sampleMeans: point.means,
      sampleVariances: point.variances
    };
  }

  function simulate(options) {
    const n = Number(options.n);
    const m = Number(options.m);
    const seed = Number(options.seed);
    if (!Number.isInteger(n) || n < 2 || n > 5000) {
      throw new RangeError('Systems n must be an integer from 2 to 5000.');
    }
    if (!Number.isInteger(m) || m < 2 || m > 2000) {
      throw new RangeError('Hackers m must be an integer from 2 to 2000.');
    }
    if (!Number.isInteger(seed) || seed < 1 || seed > 0xFFFFFFFF) {
      throw new RangeError('Seed must be an integer from 1 to 4294967295.');
    }
    if (n * m > 5000000) {
      throw new RangeError('The simulation is limited to 5 million scores.');
    }

    const sizes = sweepSizes(n);
    const checkpoints = sizes.map(function (size) {
      return { n: size, means: new Float64Array(m), variances: new Float64Array(m) };
    });

    for (let hacker = 0; hacker < m; hacker += 1) {
      const pathSeed = (seed + Math.imul(hacker, 0x9E3779B9)) >>> 0;
      const random = createRandomUint32(pathSeed);
      const accumulator = createAccumulator();
      let checkpointIndex = 0;

      for (let step = 1; step <= n; step += 1) {
        const score = drawUniformScore(random);
        update(accumulator, score);

        if (step === checkpoints[checkpointIndex].n) {
          checkpoints[checkpointIndex].means[hacker] = accumulator.mean;
          checkpoints[checkpointIndex].variances[hacker] =
            accumulator.M2 / (accumulator.count - 1);
          checkpointIndex += 1;
        }
      }
    }

    const results = checkpoints.map(function (point) {
      return summarizeCheckpoint(point, m);
    });
    return {
      n: n,
      m: m,
      seed: seed,
      theoreticalMean: THEORETICAL_MEAN,
      theoreticalVariance: THEORETICAL_VARIANCE,
      fourthCentralMoment: FOURTH_CENTRAL_MOMENT,
      results: results,
      selected: results[results.length - 1]
    };
  }

  global.WelfordHW5 = Object.freeze({
    SCORE_MIN: SCORE_MIN,
    SCORE_MAX: SCORE_MAX,
    THEORETICAL_MEAN: THEORETICAL_MEAN,
    THEORETICAL_VARIANCE: THEORETICAL_VARIANCE,
    createAccumulator: createAccumulator,
    update: update,
    summarize: summarize,
    theoreticalSampleVarianceVariance: theoreticalSampleVarianceVariance,
    simulate: simulate
  });
}(typeof window === 'undefined' ? globalThis : window));
