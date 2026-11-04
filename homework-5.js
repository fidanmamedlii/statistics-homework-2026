(function () {
  'use strict';

  const $ = function (id) { return document.getElementById(id); };
  const colors = { ink: '#29423d', muted: '#74837e', grid: '#e3e9e4', teal: '#16806d', orange: '#e98950' };
  let latest = null;

  function fmt(value, digits) {
    if (!Number.isFinite(value)) return '—';
    return value.toFixed(digits === undefined ? 4 : digits);
  }

  function setupCanvas(canvas) {
    const ratio = Math.max(1, window.devicePixelRatio || 1);
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(320, Math.floor(rect.width));
    const height = Math.max(220, Math.floor(rect.height));
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    const context = canvas.getContext('2d');
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);
    context.font = '11px DM Mono, monospace';
    context.fillStyle = colors.muted;
    return { context: context, width: width, height: height };
  }

  function drawHistogram(canvas, values, reference, referenceLabel) {
    const surface = setupCanvas(canvas);
    const ctx = surface.context, width = surface.width, height = surface.height;
    const pad = { left: 48, right: 18, top: 18, bottom: 42 };
    const chartW = width - pad.left - pad.right, chartH = height - pad.top - pad.bottom;
    if (!values.length) return;
    let low = Math.min.apply(null, values.concat([reference]));
    let high = Math.max.apply(null, values.concat([reference]));
    if (low === high) { low -= 1; high += 1; }
    const extra = (high - low) * 0.06;
    low -= extra; high += extra;
    const binCount = Math.min(36, Math.max(10, Math.ceil(Math.sqrt(values.length) * 1.1)));
    const bins = new Array(binCount).fill(0);
    values.forEach(function (value) {
      const index = Math.min(binCount - 1, Math.max(0, Math.floor((value - low) / (high - low) * binCount)));
      bins[index] += 1;
    });
    const top = Math.max(1, Math.max.apply(null, bins));

    ctx.strokeStyle = colors.grid;
    ctx.fillStyle = colors.muted;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let tick = 0; tick <= 4; tick += 1) {
      const y = pad.top + chartH * tick / 4;
      const label = Math.round(top * (4 - tick) / 4);
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(width - pad.right, y); ctx.stroke();
      ctx.fillText(String(label), pad.left - 8, y);
    }

    const barW = chartW / binCount;
    ctx.fillStyle = colors.teal;
    bins.forEach(function (count, index) {
      const barH = count / top * chartH;
      ctx.fillRect(pad.left + index * barW + 1, pad.top + chartH - barH, Math.max(1, barW - 2), barH);
    });

    const refX = pad.left + (reference - low) / (high - low) * chartW;
    ctx.strokeStyle = colors.orange;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(refX, pad.top); ctx.lineTo(refX, pad.top + chartH); ctx.stroke();
    ctx.fillStyle = colors.orange;
    ctx.textAlign = refX > width - 95 ? 'right' : 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(referenceLabel, refX > width - 95 ? refX - 4 : refX + 4, pad.top + 3);

    ctx.strokeStyle = colors.ink;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad.left, pad.top + chartH); ctx.lineTo(width - pad.right, pad.top + chartH); ctx.stroke();
    ctx.fillStyle = colors.muted;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let tick = 0; tick <= 4; tick += 1) {
      const x = pad.left + chartW * tick / 4;
      ctx.fillText(fmt(low + (high - low) * tick / 4, 1), x, pad.top + chartH + 8);
    }
    ctx.fillText('estimate', pad.left + chartW / 2, height - 15);
  }

  function drawLines(canvas, labels, datasets) {
    const surface = setupCanvas(canvas);
    const ctx = surface.context, width = surface.width, height = surface.height;
    const pad = { left: 52, right: 17, top: 18, bottom: 42 };
    const chartW = width - pad.left - pad.right, chartH = height - pad.top - pad.bottom;
    const all = datasets.flatMap(function (dataset) { return dataset.values; }).filter(Number.isFinite);
    const top = Math.max(0.01, Math.max.apply(null, all) * 1.15);
    ctx.strokeStyle = colors.grid;
    ctx.fillStyle = colors.muted;
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (let tick = 0; tick <= 4; tick += 1) {
      const y = pad.top + chartH * tick / 4;
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(width - pad.right, y); ctx.stroke();
      ctx.fillText(fmt(top * (4 - tick) / 4, 2), pad.left - 8, y);
    }
    datasets.forEach(function (dataset) {
      ctx.strokeStyle = dataset.color;
      ctx.lineWidth = dataset.dashed ? 2 : 2.5;
      ctx.setLineDash(dataset.dashed ? [6, 5] : []);
      ctx.beginPath();
      dataset.values.forEach(function (value, index) {
        const x = pad.left + (labels.length === 1 ? chartW / 2 : chartW * index / (labels.length - 1));
        const y = pad.top + chartH - value / top * chartH;
        if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.setLineDash([]);
      if (!dataset.dashed) dataset.values.forEach(function (value, index) {
        const x = pad.left + (labels.length === 1 ? chartW / 2 : chartW * index / (labels.length - 1));
        const y = pad.top + chartH - value / top * chartH;
        ctx.fillStyle = dataset.color;
        ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
      });
    });
    ctx.strokeStyle = colors.ink;
    ctx.beginPath(); ctx.moveTo(pad.left, pad.top + chartH); ctx.lineTo(width - pad.right, pad.top + chartH); ctx.stroke();
    ctx.fillStyle = colors.muted;
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    labels.forEach(function (label, index) {
      if (labels.length > 7 && index % 2) return;
      const x = pad.left + (labels.length === 1 ? chartW / 2 : chartW * index / (labels.length - 1));
      ctx.fillText(String(label), x, pad.top + chartH + 8);
    });
    ctx.fillText('systems per hacker (n)', pad.left + chartW / 2, height - 15);
  }

  function showLegendNote(id, observed, theory) {
    $(id).textContent = 'Observed ' + fmt(observed) + ' · theoretical ' + fmt(theory);
  }

  function render(result) {
    latest = result;
    const selected = result.selected;
    $('avg-means').textContent = fmt(selected.meanOfSampleMeans);
    $('avg-variances').textContent = fmt(selected.meanOfSampleVariances);
    $('mean-spread').textContent = fmt(selected.observedMeanEstimateSD) + ' / ' + fmt(selected.theoreticalMeanEstimateSD);
    $('variance-spread').textContent = fmt(selected.observedVarianceEstimateSD) + ' / ' + fmt(selected.theoreticalVarianceEstimateSD);
    showLegendNote('mean-spread-note', selected.observedMeanEstimateSD, selected.theoreticalMeanEstimateSD);
    showLegendNote('variance-spread-note', selected.observedVarianceEstimateSD, selected.theoreticalVarianceEstimateSD);

    drawHistogram($('means-chart'), Array.from(selected.sampleMeans), result.theoreticalMean, 'μ = 5');
    drawHistogram($('variances-chart'), Array.from(selected.sampleVariances), result.theoreticalVariance, 'σ² = 10');

    $('hacker-rows').innerHTML = Array.from({ length: Math.min(10, result.m) }, function (_, index) {
      return '<tr><td>' + (index + 1) + '</td><td>' + result.n + '</td><td>' +
        fmt(selected.sampleMeans[index]) + '</td><td>' +
        fmt(selected.sampleVariances[index]) + '</td></tr>';
    }).join('');

    const labels = result.results.map(function (point) { return point.n; });
    drawLines($('mean-sweep'), labels, [
      { color: colors.teal, values: result.results.map(function (point) { return point.observedMeanEstimateSD; }) },
      { color: colors.orange, values: result.results.map(function (point) { return point.theoreticalMeanEstimateSD; }), dashed: true }
    ]);
    drawLines($('variance-sweep'), labels, [
      { color: colors.teal, values: result.results.map(function (point) { return point.observedVarianceEstimateSD; }) },
      { color: colors.orange, values: result.results.map(function (point) { return point.theoreticalVarianceEstimateSD; }), dashed: true }
    ]);

    $('sweep-rows').innerHTML = result.results.map(function (point) {
      return '<tr><td>' + point.n + '</td><td>' + fmt(point.meanOfSampleMeans) +
        '</td><td>' + fmt(point.observedMeanEstimateSD) + '</td><td>' +
        fmt(point.theoreticalMeanEstimateSD) + '</td><td>' +
        fmt(point.meanOfSampleVariances) + '</td><td>' +
        fmt(point.observedVarianceEstimateSD) + '</td><td>' +
        fmt(point.theoreticalVarianceEstimateSD) + '</td></tr>';
    }).join('');

    $('status').textContent = 'Done. ' + result.m + ' hackers each received ' + result.n +
      ' scores. The same seeded score paths were used for every shorter n in the sweep.';
    $('download').disabled = false;
  }

  function run() {
    const n = Number($('systems').value);
    const m = Number($('hackers').value);
    const seed = Number($('seed').value);
    const status = $('status');
    status.classList.remove('error');
    try {
      status.textContent = 'Calculating each hacker’s running mean and variance…';
      const result = WelfordHW5.simulate({ n: n, m: m, seed: seed });
      render(result);
    } catch (error) {
      status.classList.add('error');
      status.textContent = error.message;
      $('download').disabled = true;
    }
  }

  function downloadCsv() {
    if (!latest) return;
    const selected = latest.selected;
    const rows = [['hacker', 'systems_n', 'sample_mean', 'sample_variance']];
    for (let index = 0; index < latest.m; index += 1) {
      rows.push([index + 1, latest.n, selected.sampleMeans[index], selected.sampleVariances[index]]);
    }
    const csv = rows.map(function (row) { return row.join(','); }).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'welford-sampling-estimates.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  $('run').addEventListener('click', run);
  $('download').addEventListener('click', downloadCsv);
  window.addEventListener('resize', function () { if (latest) render(latest); });
  run();
}());
