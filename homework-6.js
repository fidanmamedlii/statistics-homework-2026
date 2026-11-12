(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
  const fmt = (value, digits = 8) => Number.isFinite(value) ? value.toFixed(digits) : '—';
  const gcd = (a, b) => {
    while (b) [a, b] = [b, a % b];
    return a;
  };

  const functions = {
    sin: {
      label: 'sin(x)', a: 0, b: Math.PI, ymin: 0, ymax: 1, reference: 2,
      referenceLabel: 'Exact: 2', f: (x) => Math.sin(x)
    },
    square: {
      label: 'x²', a: 0, b: 1, ymin: 0, ymax: 1, reference: 1 / 3,
      referenceLabel: 'Exact: 1/3', f: (x) => x * x
    },
    step13: {
      label: '1 on first half; 3 on second half', a: 0, b: 1, ymin: 1, ymax: 3, reference: 2,
      referenceLabel: 'Exact: 2', f: (x) => x < 0.5 ? 1 : 3
    },
    absolute: {
      label: '|x − 0.5|', a: 0, b: 1, ymin: 0, ymax: 0.5, reference: 0.25,
      referenceLabel: 'Exact: 1/4', f: (x) => Math.abs(x - 0.5)
    },
    'inverse-root': {
      label: '1 / √x', a: 0, b: 1, ymin: 1, ymax: 1, reference: 2,
      referenceLabel: 'Improper integral: 2', f: (x) => 1 / Math.sqrt(x), unboundedRange: true
    },
    step10: {
      label: '1 on first half; 0 on second half', a: 0, b: 1, ymin: 0, ymax: 1, reference: 0.5,
      referenceLabel: 'Exact: 1/2', f: (x) => x < 0.5 ? 1 : 0
    },
    sinc: {
      label: 'sin(x) / x, extended at zero', a: 0, b: Math.PI, ymin: 0, ymax: 1, reference: 1.851937051982466,
      referenceLabel: 'Reference: Si(π) ≈ 1.85193705', f: (x) => x === 0 ? 1 : Math.sin(x) / x
    },
    dirichlet: {
      label: 'Dirichlet function', a: 0, b: 1, ymin: 0, ymax: 1, reference: 0,
      referenceLabel: 'Lebesgue integral: 0; no Riemann integral', f: () => 1,
      noRiemann: true
    },
    thomae: {
      label: 'Thomae function', a: 0, b: 1, ymin: 0, ymax: 1, reference: 0,
      referenceLabel: 'Exact integral: 0', f: () => 0,
      sampleAtIndex: (i, n) => {
        const numerator = 2 * i + 1;
        const denominator = 2 * n;
        return 1 / (denominator / gcd(numerator, denominator));
      }
    }
  };

  function getSample(spec, i, n) {
    const x = spec.a + (i + 0.5) * (spec.b - spec.a) / n;
    return { x, y: spec.sampleAtIndex ? spec.sampleAtIndex(i, n) : spec.f(x) };
  }

  function sampleValues(spec, n) {
    const values = new Array(n);
    for (let i = 0; i < n; i += 1) values[i] = getSample(spec, i, n).y;
    return values;
  }

  function riemannMidpoint(spec, n, values) {
    const dx = (spec.b - spec.a) / n;
    let sum = 0;
    for (let i = 0; i < n; i += 1) sum += values[i];
    return dx * sum;
  }

  function rangeEstimate(spec, n, bins, values) {
    const counts = new Uint32Array(bins);
    const min = spec.ymin;
    const max = spec.unboundedRange ? Math.max(2, Math.sqrt(2 * n)) : spec.ymax;
    const width = max - min;
    const dx = (spec.b - spec.a) / n;
    for (let i = 0; i < n; i += 1) {
      const y = values[i];
      const index = clamp(Math.floor((y - min) / width * bins), 0, bins - 1);
      counts[index] += 1;
    }
    let sum = 0;
    for (let k = 0; k < bins; k += 1) {
      if (!counts[k]) continue;
      const center = min + (k + 0.5) * width / bins;
      sum += center * (counts[k] * dx);
    }
    return sum;
  }

  function drawFunction(spec, n, values) {
    const canvas = $('function-plot');
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(rect.width * ratio));
    canvas.height = Math.max(1, Math.round(rect.height * ratio));
    const ctx = canvas.getContext('2d');
    ctx.scale(ratio, ratio);
    const w = rect.width;
    const h = rect.height;
    const pad = { left: 42, right: 14, top: 14, bottom: 29 };
    const plotW = w - pad.left - pad.right;
    const plotH = h - pad.top - pad.bottom;
    const topValue = spec.unboundedRange ? Math.min(8, Math.max(2, Math.sqrt(2 * n))) : spec.ymax;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#fbfcf9';
    ctx.fillRect(pad.left, pad.top, plotW, plotH);
    ctx.strokeStyle = '#e0e7e1';
    ctx.lineWidth = 1;
    for (let j = 0; j <= 4; j += 1) {
      const y = pad.top + plotH * j / 4;
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + plotW, y); ctx.stroke();
    }
    ctx.strokeStyle = '#8da39b';
    ctx.beginPath(); ctx.moveTo(pad.left, pad.top); ctx.lineTo(pad.left, pad.top + plotH); ctx.lineTo(pad.left + plotW, pad.top + plotH); ctx.stroke();
    ctx.fillStyle = '#647371';
    ctx.font = '10px monospace';
    ctx.fillText(fmt(topValue, 2), 4, pad.top + 4);
    ctx.fillText('0', 22, pad.top + plotH + 3);
    ctx.fillText(spec.a.toFixed(2), pad.left, h - 7);
    ctx.fillText(spec.b.toFixed(2), pad.left + plotW - 34, h - 7);
    const count = Math.min(n, 700);
    const stride = Math.max(1, Math.floor(n / count));
    ctx.fillStyle = '#187766';
    for (let i = 0; i < n; i += stride) {
      const xValue = spec.a + (i + 0.5) * (spec.b - spec.a) / n;
      const px = pad.left + (xValue - spec.a) / (spec.b - spec.a) * plotW;
      const py = pad.top + (1 - clamp(values[i], 0, topValue) / topValue) * plotH;
      ctx.beginPath(); ctx.arc(px, py, 2.2, 0, Math.PI * 2); ctx.fill();
    }
  }

  function updateIntegration() {
    const spec = functions[$('function-choice').value];
    const n = clamp(Math.floor(Number($('x-samples').value) || 512), 8, 100000);
    const bins = clamp(Math.floor(Number($('y-bins').value) || 40), 2, 300);
    $('x-samples').value = n;
    $('y-bins').value = bins;
    const values = sampleValues(spec, n);
    const riemann = riemannMidpoint(spec, n, values);
    const leb = rangeEstimate(spec, n, bins, values);
    $('integral-reference').textContent = spec.noRiemann ? '0 (Lebesgue)' : fmt(spec.reference, 8);
    $('reference-kind').textContent = spec.referenceLabel;
    $('riemann-result').textContent = fmt(riemann, 8);
    $('riemann-error').textContent = spec.noRiemann ? 'Not an error: this function has no Riemann integral' : `Absolute error: ${fmt(Math.abs(riemann - spec.reference), 8)}`;
    $('lebesgue-result').textContent = fmt(leb, 8);
    $('lebesgue-error').textContent = spec.noRiemann
      ? `Difference from Lebesgue integral 0: ${fmt(Math.abs(leb), 8)}`
      : `Absolute error vs reference: ${fmt(Math.abs(leb - spec.reference), 8)}`;
    $('evaluation-count').textContent = n.toLocaleString();
    $('operation-count').textContent = `N unique midpoints shared by both methods; range estimate adds ${bins} bands`;
    if (spec.noRiemann) {
      $('integration-status').textContent = 'The exact Lebesgue integral is 0. This regular midpoint grid samples only rational points, so its finite estimate is 1.';
    } else if (spec.unboundedRange) {
      $('integration-status').textContent = 'This is an improper integral with an unbounded range. The top height band groups the sampled tail, so the range estimate can be crude.';
    } else if (spec.sampleAtIndex) {
      $('integration-status').textContent = 'Every sampled midpoint is rational, so the finite Thomae samples are positive; the values should shrink as their reduced denominators grow.';
    } else {
      $('integration-status').textContent = `Both estimates use N = ${n} midpoint samples; the range method additionally replaces each value with its band center.`;
    }
    drawFunction(spec, n, values);

    const sizes = [...new Set([8, 16, 32, 64, 128, 256, 512, 1024, n].filter((x) => x <= 100000))].sort((a, b) => a - b);
    $('convergence-rows').innerHTML = sizes.map((size) => {
      const samples = sampleValues(spec, size);
      const r = riemannMidpoint(spec, size, samples);
      const l = rangeEstimate(spec, size, bins, samples);
      const re = spec.noRiemann ? '—' : fmt(Math.abs(r - spec.reference), 6);
      const le = fmt(Math.abs(l - spec.reference), 6);
      return `<tr class="${size === n ? 'highlight' : ''}"><td>${size}</td><td>${fmt(r, 7)}</td><td>${re}</td><td>${fmt(l, 7)}</td><td>${le}</td></tr>`;
    }).join('');
  }

  const sqrt2 = Math.sqrt(2);
  const invSqrt2Pi = 1 / Math.sqrt(2 * Math.PI);

  function erfApprox(x) {
    const sign = x < 0 ? -1 : 1;
    const ax = Math.abs(x);
    const t = 1 / (1 + 0.3275911 * ax);
    const poly = (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t);
    return sign * (1 - poly * Math.exp(-ax * ax));
  }

  function cdfErf(z) {
    return clamp(0.5 * (1 + erfApprox(z / sqrt2)), 0, 1);
  }

  function cdfSimpson(z, panelCount) {
    const m = Math.max(2, panelCount % 2 === 0 ? panelCount : panelCount + 1);
    const end = Math.abs(z);
    if (end === 0) return 0.5;
    const h = end / m;
    const density = (x) => invSqrt2Pi * Math.exp(-0.5 * x * x);
    let total = density(0) + density(end);
    for (let i = 1; i < m; i += 1) total += (i % 2 ? 4 : 2) * density(i * h);
    const area = h * total / 3;
    return clamp(0.5 + (z < 0 ? -area : area), 0, 1);
  }

  function cdfSeries(z, maxTerms = 500) {
    if (Math.abs(z) > 4) return { value: NaN, terms: 0, stable: false };
    if (z === 0) return { value: 0.5, terms: 0, stable: true };
    let term = z;
    let sum = 0;
    let correction = 0;
    let used = 0;
    for (let k = 0; k < maxTerms; k += 1) {
      const y = term - correction;
      const next = sum + y;
      correction = (next - sum) - y;
      sum = next;
      used = k + 1;
      const nextTerm = term * (-z * z * (2 * k + 1)) / (2 * (k + 1) * (2 * k + 3));
      if (Math.abs(nextTerm) <= 1e-16 * Math.max(1, Math.abs(sum))) break;
      term = nextTerm;
    }
    return { value: clamp(0.5 + invSqrt2Pi * sum, 0, 1), terms: used, stable: true };
  }

  const nist = new Map([
    [-3, 0.00135], [-2, 0.02275], [-1, 0.15866], [0, 0.5],
    [1, 0.84134], [2, 0.97725], [3, 0.99865]
  ]);

  function drawCdf() {
    const canvas = $('cdf-plot');
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(rect.width * ratio));
    canvas.height = Math.max(1, Math.round(rect.height * ratio));
    const ctx = canvas.getContext('2d');
    ctx.scale(ratio, ratio);
    const w = rect.width;
    const h = rect.height;
    const pad = { left: 39, right: 13, top: 13, bottom: 28 };
    const plotW = w - pad.left - pad.right;
    const plotH = h - pad.top - pad.bottom;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#fbfcf9'; ctx.fillRect(pad.left, pad.top, plotW, plotH);
    ctx.strokeStyle = '#e0e7e1'; ctx.lineWidth = 1;
    for (let j = 0; j <= 4; j += 1) {
      const y = pad.top + plotH * j / 4;
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + plotW, y); ctx.stroke();
    }
    ctx.strokeStyle = '#8da39b';
    ctx.beginPath(); ctx.moveTo(pad.left, pad.top); ctx.lineTo(pad.left, pad.top + plotH); ctx.lineTo(pad.left + plotW, pad.top + plotH); ctx.stroke();
    ctx.fillStyle = '#647371'; ctx.font = '10px monospace';
    ctx.fillText('1', 18, pad.top + 4); ctx.fillText('0', 18, pad.top + plotH + 3);
    ctx.fillText('−4', pad.left, h - 7); ctx.fillText('0', pad.left + plotW / 2 - 3, h - 7); ctx.fillText('4', pad.left + plotW - 7, h - 7);
    ctx.strokeStyle = '#187766'; ctx.lineWidth = 2.5; ctx.beginPath();
    for (let i = 0; i <= 240; i += 1) {
      const z = -4 + 8 * i / 240;
      const x = pad.left + i / 240 * plotW;
      const y = pad.top + (1 - cdfErf(z)) * plotH;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.fillStyle = '#e98950';
    for (const [z, value] of nist) {
      const x = pad.left + (z + 4) / 8 * plotW;
      const y = pad.top + (1 - value) * plotH;
      ctx.beginPath(); ctx.arc(x, y, 3.1, 0, Math.PI * 2); ctx.fill();
    }
  }

  function renderCdfTable() {
    $('cdf-rows').innerHTML = [...nist.entries()].map(([z, ref]) => {
      const fast = cdfErf(z);
      const simpson = cdfSimpson(z, 200);
      const series = cdfSeries(z).value;
      return `<tr><td>${z}</td><td>${ref.toFixed(5)}</td><td>${fmt(fast, 8)}</td><td>${fmt(Math.abs(fast - ref), 8)}</td><td>${fmt(simpson, 8)}</td><td>${fmt(series, 8)}</td></tr>`;
    }).join('');
  }

  function evaluateCdf() {
    const raw = Number($('cdf-z').value);
    if (!Number.isFinite(raw)) {
      $('cdf-status').textContent = 'Enter a finite z-value between −8 and 8.';
      $('cdf-status').classList.add('error');
      return;
    }
    const z = clamp(raw, -8, 8);
    const panels = clamp(Math.floor(Number($('simpson-panels').value) || 200), 10, 5000);
    $('cdf-z').value = z;
    $('simpson-panels').value = panels % 2 === 0 ? panels : panels + 1;
    const simpson = cdfSimpson(z, panels);
    const series = cdfSeries(z);
    $('selected-cdf').textContent = fmt(cdfErf(z), 10);
    $('selected-simpson').textContent = fmt(simpson, 10);
    $('selected-series').textContent = series.stable ? fmt(series.value, 10) : '—';
    $('simpson-detail').textContent = `${panels % 2 === 0 ? panels : panels + 1} panels; O(M) evaluations`;
    $('series-detail').textContent = series.stable ? `${series.terms} terms used; O(K) operations` : 'Not used: direct series is unstable beyond |z| = 4';
    $('cdf-status').textContent = Math.abs(z) > 4
      ? `For z = ${z}, the fast erf method gives Φ(z) ≈ ${fmt(cdfErf(z), 8)}. The direct power series is hidden here because cancellation makes it unreliable beyond |z| = 4.`
      : `For z = ${z}, the fast erf method gives Φ(z) ≈ ${fmt(cdfErf(z), 8)}.`;
    $('cdf-status').classList.remove('error');
  }

  function benchmarkCdf() {
    const z = 1.2345;
    const repeats = 3000;
    const panels = clamp(Math.floor(Number($('simpson-panels').value) || 200), 10, 1000);
    const methods = [
      ['Fast erf approximation', () => cdfErf(z)],
      ['Series', () => cdfSeries(z).value],
      [`Simpson (${panels} panels)`, () => cdfSimpson(z, panels)]
    ];
    const rows = methods.map(([name, fn]) => {
      for (let i = 0; i < 30; i += 1) fn();
      const start = performance.now();
      let check = 0;
      for (let i = 0; i < repeats; i += 1) check += fn();
      const ms = performance.now() - start;
      return `${name}: ${ms.toFixed(2)} ms for ${repeats.toLocaleString()} calls`;
    });
    $('cdf-benchmark').textContent = rows.join(' · ');
  }

  $('compare-integrals').addEventListener('click', updateIntegration);
  $('function-choice').addEventListener('change', updateIntegration);
  $('evaluate-cdf').addEventListener('click', evaluateCdf);
  $('benchmark-cdf').addEventListener('click', benchmarkCdf);
  $('simpson-panels').addEventListener('change', evaluateCdf);
  window.addEventListener('resize', () => {
    const spec = functions[$('function-choice').value];
    const n = clamp(Math.floor(Number($('x-samples').value) || 512), 8, 100000);
    drawFunction(spec, n, sampleValues(spec, n));
    drawCdf();
  });

  renderCdfTable();
  updateIntegration();
  evaluateCdf();
  drawCdf();
})();
