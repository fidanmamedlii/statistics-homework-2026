(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const COLORS = ['#156f61', '#e98950', '#8068a8', '#4a78a8', '#9d566a', '#72954b', '#cc9c2f', '#4f8588', '#bd6b37', '#6b657c', '#588c6e', '#b55e7a'];
  let results = null;
  let csvUrl = null;

  function fmt(x) {
    if (x === null || !Number.isFinite(x)) return '—';
    if (Object.is(x, -0)) x = 0;
    const a = Math.abs(x);
    if (a !== 0 && (a >= 1e6 || a < 1e-4)) return x.toExponential(3);
    return Number(x.toPrecision(5)).toLocaleString(undefined, { maximumSignificantDigits: 5 });
  }

  function prepCanvas(canvas) {
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(280, rect.width);
    const height = Math.max(220, rect.height);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    return { ctx, width, height };
  }

  function frame(ctx, w, h, xMin, xMax, yMax, yLabel) {
    const pad = { l: 55, r: 18, t: 16, b: 42 };
    const pw = w - pad.l - pad.r, ph = h - pad.t - pad.b;
    ctx.clearRect(0, 0, w, h);
    ctx.font = '10px "DM Mono", monospace';
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (let i = 0; i <= 4; i++) {
      const y = pad.t + ph * (1 - i / 4);
      ctx.strokeStyle = '#e3e9e3'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke();
      ctx.fillStyle = '#647371'; ctx.fillText(fmt(yMax * i / 4), pad.l - 7, y);
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (let i = 0; i <= 4; i++) {
      const xVal = xMin + (xMax - xMin) * i / 4;
      const x = pad.l + pw * i / 4;
      ctx.fillStyle = '#647371'; ctx.fillText(fmt(xVal), x, h - pad.b + 7);
    }
    ctx.strokeStyle = '#91a29a'; ctx.beginPath(); ctx.moveTo(pad.l, pad.t); ctx.lineTo(pad.l, h - pad.b); ctx.lineTo(w - pad.r, h - pad.b); ctx.stroke();
    ctx.save(); ctx.translate(14, pad.t + ph / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#475956'; ctx.fillText(yLabel, 0, 0); ctx.restore();
    return { pad, pw, ph, x: v => pad.l + (v - xMin) / (xMax - xMin) * pw, y: v => pad.t + ph * (1 - v / yMax) };
  }

  function drawPaths(canvas, legend, result) {
    const { ctx, width: w, height: h } = prepCanvas(canvas);
    const paths = result.paths;
    let lo = 0, hi = 0;
    for (const path of paths) for (const value of path) { lo = Math.min(lo, value); hi = Math.max(hi, value); }
    if (lo === hi) { lo -= 1; hi += 1; }
    const yMin = lo - (hi - lo) * 0.08, yMax = hi + (hi - lo) * 0.08;
    const pad = { l: 48, r: 13, t: 13, b: 35 }, pw = w - pad.l - pad.r, ph = h - pad.t - pad.b;
    ctx.clearRect(0, 0, w, h); ctx.font = '10px "DM Mono", monospace'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (let j = 0; j <= 4; j++) {
      const y = pad.t + ph * j / 4, score = yMax - (yMax - yMin) * j / 4;
      ctx.strokeStyle = '#e3e9e3'; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke(); ctx.fillStyle = '#647371'; ctx.fillText(fmt(score), pad.l - 5, y);
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (let j = 0; j <= 4; j++) {
      const x = pad.l + pw * j / 4;
      ctx.fillStyle = '#647371'; ctx.fillText(fmt(result.n * j / 4), x, h - pad.b + 6);
    }
    ctx.strokeStyle = '#91a29a'; ctx.beginPath(); ctx.moveTo(pad.l, pad.t); ctx.lineTo(pad.l, h - pad.b); ctx.lineTo(w - pad.r, h - pad.b); ctx.stroke();
    ctx.save(); ctx.translate(11, pad.t + ph / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'center'; ctx.fillStyle = '#475956'; ctx.fillText('running score', 0, 0); ctx.restore();
    const stride = Math.max(1, Math.ceil(result.n / Math.max(1, Math.floor(pw))));
    paths.forEach((path, index) => {
      ctx.strokeStyle = COLORS[index % COLORS.length]; ctx.globalAlpha = 0.78; ctx.lineWidth = 1.5; ctx.beginPath();
      for (let i = 0; i <= result.n; i += stride) {
        const x = pad.l + i / result.n * pw, y = pad.t + (yMax - path[i]) / (yMax - yMin) * ph;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      if (result.n % stride !== 0) { const i = result.n; ctx.lineTo(pad.l + pw, pad.t + (yMax - path[i]) / (yMax - yMin) * ph); }
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
    legend.replaceChildren(...paths.map((_, i) => {
      const span = document.createElement('span'), dot = document.createElement('i');
      dot.className = 'legend-dot'; dot.style.backgroundColor = COLORS[i % COLORS.length];
      span.append(dot, document.createTextNode(`Attacker ${i + 1}`)); return span;
    }));
  }

  function drawHistogram(canvas, values, expected) {
    const { ctx, width: w, height: h } = prepCanvas(canvas);
    if (!values || !values.length) { ctx.clearRect(0, 0, w, h); return; }
    let min = Math.min(...values), max = Math.max(...values);
    if (min === max) { min -= 0.5; max += 0.5; }
    const pad = { l: 55, r: 18, t: 16, b: 42 }, bins = Math.min(36, Math.max(12, Math.ceil(Math.sqrt(values.length) * 1.25)));
    const width = (max - min) / bins, counts = new Array(bins).fill(0);
    for (const value of values) counts[Math.min(bins - 1, Math.floor((value - min) / width))]++;
    const top = Math.max(1, ...counts), graph = frame(ctx, w, h, min, max, top * 1.15, 'number of attackers');
    const barWidth = graph.pw / bins;
    counts.forEach((count, i) => { ctx.fillStyle = '#7ebbaa'; ctx.fillRect(graph.x(min + i * width) + 1, graph.y(count), Math.max(1, barWidth - 2), h - graph.pad.b - graph.y(count)); });
    if (expected !== null && expected >= min && expected <= max) {
      ctx.strokeStyle = '#d96941'; ctx.lineWidth = 2; ctx.setLineDash([5, 3]); ctx.beginPath(); ctx.moveTo(graph.x(expected), graph.pad.t); ctx.lineTo(graph.x(expected), h - graph.pad.b); ctx.stroke(); ctx.setLineDash([]);
    }
    return { min, max, mean: values.reduce((a, b) => a + b, 0) / values.length };
  }

  function drawNormalComparison(canvas, values) {
    const { ctx, width: w, height: h } = prepCanvas(canvas);
    if (!values) { ctx.clearRect(0, 0, w, h); ctx.fillStyle = '#647371'; ctx.font = '13px "DM Sans", sans-serif'; ctx.fillText('A non-zero variance is needed for standardization.', 14, 36); return; }
    const lo = -4.2, hi = 4.2, bins = 32, binWidth = (hi - lo) / bins, counts = new Array(bins).fill(0);
    for (const value of values) if (value >= lo && value <= hi) counts[Math.min(bins - 1, Math.floor((value - lo) / binWidth))]++;
    const densities = counts.map(c => c / (values.length * binWidth));
    const yTop = Math.max(0.42, ...densities) * 1.14;
    const graph = frame(ctx, w, h, lo, hi, yTop, 'density');
    const bw = graph.pw / bins;
    densities.forEach((density, i) => { ctx.fillStyle = '#d9cfe9'; ctx.fillRect(graph.x(lo + i * binWidth) + 1, graph.y(density), bw - 2, h - graph.pad.b - graph.y(density)); });
    ctx.strokeStyle = '#665586'; ctx.lineWidth = 2.2; ctx.beginPath();
    for (let i = 0; i <= 160; i++) {
      const x = lo + (hi - lo) * i / 160, y = Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI);
      if (i === 0) ctx.moveTo(graph.x(x), graph.y(y)); else ctx.lineTo(graph.x(x), graph.y(y));
    }
    ctx.stroke();
  }

  function drawLines(canvas, legend, xs, series, yMax, yLabel) {
    const { ctx, width: w, height: h } = prepCanvas(canvas);
    const xMin = xs[0], xMax = xs[xs.length - 1] === xMin ? xMin + 1 : xs[xs.length - 1];
    const graph = frame(ctx, w, h, xMin, xMax, yMax, yLabel);
    series.forEach(item => {
      ctx.strokeStyle = item.color; ctx.lineWidth = item.dashed ? 1.8 : 2.2;
      ctx.setLineDash(item.dashed ? [5, 3] : []); ctx.beginPath();
      item.values.forEach((value, i) => {
        const x = graph.x(xs[i]), y = graph.y(value);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke(); ctx.setLineDash([]);
      item.values.forEach((value, i) => { ctx.fillStyle = item.color; ctx.beginPath(); ctx.arc(graph.x(xs[i]), graph.y(value), 2.7, 0, Math.PI * 2); ctx.fill(); });
    });
    legend.replaceChildren(...series.map(item => {
      const span = document.createElement('span'), dot = document.createElement('i');
      dot.className = `legend-dot${item.dashed ? ' orange' : ''}`; dot.style.backgroundColor = item.color;
      span.append(dot, document.createTextNode(item.name)); return span;
    }));
  }

  function selectedValues(result, quantity) {
    if (quantity === 'average') return result.scores.map(s => s / result.n);
    if (quantity === 'sqrt') return result.scores.map(s => s / Math.sqrt(result.n));
    return result.scores;
  }

  function renderMoments() {
    const rows = [];
    for (const r of [results.bernoulli, results.rademacher]) {
      const specs = [
        ['total', 'Sₙ', r.n * r.mu, r.n * r.sigma2],
        ['average', 'Sₙ/n', r.mu, r.sigma2 / r.n],
        ['sqrt', 'Sₙ/√n', r.mu * Math.sqrt(r.n), r.sigma2]
      ];
      for (const [key, label, mean, variance] of specs) {
        const actual = r.metrics[key];
        rows.push(`<tr><td>${r.model === 'bernoulli' ? 'Bernoulli' : 'Rademacher'}</td><td>${label}</td><td>${fmt(mean)}</td><td>${fmt(variance)}</td><td>${fmt(actual.mean)}</td><td>${fmt(actual.variance)}</td></tr>`);
      }
    }
    $('moment-rows').innerHTML = rows.join('');
    $('lln-rows').innerHTML = [results.bernoulli, results.rademacher].map(r => `<tr><td>${r.model === 'bernoulli' ? 'Bernoulli' : 'Rademacher'}</td><td>${fmt(r.mu)}</td><td>${(100 * r.fractionWithinTolerance).toFixed(1)}% (${Math.round(r.fractionWithinTolerance * r.m)}/${r.m})</td><td>≤ ${(100 * r.chebyshevBound).toFixed(1)}%</td></tr>`).join('');
    $('group-rows').innerHTML = [results.bernoulli, results.rademacher].map(r => `<tr><td>${r.model === 'bernoulli' ? 'Bernoulli' : 'Rademacher'}</td><td>${fmt(r.group.totalMean)} · ${fmt(r.group.totalVariance)}</td><td>${fmt(r.group.averageMean)} · ${fmt(r.group.averageVariance)}</td><td>${fmt(r.group.normalizedMean)} · ${fmt(r.group.normalizedVariance)}</td></tr>`).join('');
  }

  function renderSweep() {
    const sizes = results.sweep.map(point => point.n);
    const bVar = results.sweep.map(point => point.bernoulli.metrics.average.variance);
    const rVar = results.sweep.map(point => point.rademacher.metrics.average.variance);
    const bVarTheory = results.sweep.map(point => point.bernoulli.sigma2 / point.n);
    const rVarTheory = results.sweep.map(point => point.rademacher.sigma2 / point.n);
    drawLines($('sweep-variance'), $('sweep-variance-legend'), sizes, [
      { name: 'Bernoulli observed', values: bVar, color: COLORS[0] },
      { name: 'Bernoulli σ²/n', values: bVarTheory, color: COLORS[0], dashed: true },
      { name: 'Rademacher observed', values: rVar, color: COLORS[2] },
      { name: 'Rademacher σ²/n', values: rVarTheory, color: COLORS[2], dashed: true }
    ], Math.max(...bVar, ...rVar, ...bVarTheory, ...rVarTheory, 1e-6) * 1.12, 'variance');
    const bClose = results.sweep.map(point => point.bernoulli.fractionWithinTolerance);
    const rClose = results.sweep.map(point => point.rademacher.fractionWithinTolerance);
    drawLines($('sweep-lln'), $('sweep-lln-legend'), sizes, [
      { name: 'Bernoulli observed', values: bClose, color: COLORS[0] },
      { name: 'Bernoulli bound', values: results.sweep.map(point => point.bernoulli.chebyshevBound), color: COLORS[0], dashed: true },
      { name: 'Rademacher observed', values: rClose, color: COLORS[2] },
      { name: 'Rademacher bound', values: results.sweep.map(point => point.rademacher.chebyshevBound), color: COLORS[2], dashed: true }
    ], 1, 'fraction');
    $('sweep-rows').innerHTML = results.sweep.flatMap(point => [
      ['Bernoulli', point.bernoulli], ['Rademacher', point.rademacher]
    ].map(([name, r]) => `<tr><td>${r.n}</td><td>${name}</td><td>${fmt(r.sigma2 / r.n)}</td><td>${fmt(r.metrics.average.variance)}</td><td>${(100 * r.fractionWithinTolerance).toFixed(1)}% (${Math.round(r.fractionWithinTolerance * r.m)}/${r.m})</td><td>≤ ${(100 * r.chebyshevBound).toFixed(1)}%</td></tr>`)).join('');
  }

  function renderHistograms() {
    if (!results) return;
    const quantity = $('quantity').value, label = $('quantity').selectedOptions[0].textContent;
    for (const [model, r] of [['bernoulli', results.bernoulli], ['rademacher', results.rademacher]]) {
      const values = selectedValues(r, quantity), predicted = r.metrics[quantity].mean;
      const obs = drawHistogram($(`${model}-hist`), values, predicted);
      $(`${model}-summary`).textContent = `${label}: theoretical mean ${fmt(predicted)}, simulated mean ${fmt(obs.mean)}. The dashed orange line marks the expected value.`;
    }
  }

  function render() {
    for (const [model, r] of [['bernoulli', results.bernoulli], ['rademacher', results.rademacher]]) drawPaths($(`${model}-paths`), $(`${model}-path-legend`), r);
    renderMoments(); renderHistograms(); renderSweep();
    drawNormalComparison($('bernoulli-clt'), results.bernoulli.centeredZ);
    drawNormalComparison($('rademacher-clt'), results.rademacher.centeredZ);
    $('bernoulli-clt-note').textContent = results.bernoulli.centeredZ ? `Across ${results.bernoulli.m} attackers; empirical standardized mean ${fmt(results.bernoulli.centeredZ.reduce((a, b) => a + b, 0) / results.bernoulli.m)}. More systems generally improve the normal approximation.` : 'p is 0 or 1, so the variance is zero and this standardized quantity is undefined.';
    $('rademacher-clt-note').textContent = `Across ${results.rademacher.m} attackers; empirical standardized mean ${fmt(results.rademacher.centeredZ.reduce((a, b) => a + b, 0) / results.rademacher.m)}. The finite-n scores lie on a lattice.`;
  }

  function makeCSV() {
    const { bernoulli, rademacher } = results;
    const lines = ['model,attacker,n,m,p,seed,total,average,total_over_sqrt_n'];
    for (const r of [bernoulli, rademacher]) r.scores.forEach((score, index) => lines.push([r.model, index + 1, r.n, r.m, r.p, r.seed, score, score / r.n, score / Math.sqrt(r.n)].join(',')));
    return lines.join('\n') + '\n';
  }

  $('run-simulation').addEventListener('click', () => {
    const n = Number($('systems').value), m = Number($('attackers').value), p = Number($('probability').value), seed = Number($('seed').value);
    try { HW4.validate(n, m, p); if (!Number.isInteger(seed) || seed < 1 || seed > 4294967295) throw new RangeError('Choose a whole seed between 1 and 4,294,967,295.'); }
    catch (error) { $('run-status').textContent = error.message; $('run-status').classList.add('error'); return; }
    const button = $('run-simulation'); button.disabled = true; $('run-status').classList.remove('error'); $('run-status').textContent = 'Running the independent attacker paths…';
    requestAnimationFrame(() => setTimeout(() => {
      try {
        const sizes = [...new Set([10, 25, 50, 100, 250, 500, 1000, 2500, 5000].filter(value => value < n).concat(n))];
        const bernoulliSweep = HW4.simulateMany('bernoulli', sizes, m, p, seed);
        const rademacherSweep = HW4.simulateMany('rademacher', sizes, m, p, (seed + 1) >>> 0);
        results = {
          bernoulli: bernoulliSweep[bernoulliSweep.length - 1],
          rademacher: rademacherSweep[rademacherSweep.length - 1],
          sweep: sizes.map((size, i) => ({ n: size, bernoulli: bernoulliSweep[i], rademacher: rademacherSweep[i] }))
        };
        render();
        $('run-status').textContent = `Done: ${fmt(n)} systems × ${fmt(m)} attackers in each model. Seed ${seed}; the two models use independent streams.`;
        $('download-csv').disabled = false;
      } catch (error) { $('run-status').textContent = error.message; $('run-status').classList.add('error'); }
      finally { button.disabled = false; }
    }, 20));
  });

  $('quantity').addEventListener('change', renderHistograms);
  $('download-csv').addEventListener('click', () => {
    if (!results) return;
    if (csvUrl) URL.revokeObjectURL(csvUrl);
    csvUrl = URL.createObjectURL(new Blob([makeCSV()], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = csvUrl; link.download = 'penetration-score-simulation.csv'; link.click();
    $('run-status').textContent = 'CSV downloaded: one result row per attacker and model.';
  });
  window.addEventListener('resize', () => { if (results) render(); });
})();
