(function () {
  'use strict';

  const palette = ['#b9ece0', '#f4b889', '#c9bce0', '#a9c9e8', '#e6c98e', '#b9d69d', '#e5a8a8', '#b6c7c2', '#d5b9a3', '#9fd1cb', '#cab9d5', '#d7dda1'];
  const demos = {
    training: {
      description: 'Synthetic example: click rates differ between training groups. The data are invented for teaching, not evidence about a real training program.',
      x: ['Training', 'No training'], f: ['Clicked', 'Did not click'], counts: [[8, 52], [28, 32]]
    },
    independent: {
      description: 'Synthetic example: each department has the same 60% MFA-on rate. The margins and conditional percentages match exactly, so this sample table is independent by construction.',
      x: ['Team A', 'Team B', 'Team C'], f: ['MFA on', 'MFA off'], counts: [[30, 20], [24, 16], [18, 12]]
    },
    weak: {
      description: 'Synthetic small sample: the observed rates differ a little, but the evidence may be too weak to reject independence. A non-significant result is not proof that the variables are independent.',
      x: ['Group A', 'Group B'], f: ['Outcome 1', 'Outcome 2'], counts: [[7, 23], [11, 19]]
    }
  };

  const byId = (id) => document.getElementById(id);
  const demoSelect = byId('demo-select');
  const alphaSelect = byId('alpha-select');
  let currentRecords = [];

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  }

  function demoRecords(demo) {
    const records = [];
    demo.x.forEach((x, i) => demo.f.forEach((f, j) => {
      for (let k = 0; k < demo.counts[i][j]; k += 1) records.push([x, f]);
    }));
    return records;
  }

  function parsePairs(raw, hasHeader) {
    const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (hasHeader && lines.length) lines.shift();
    const records = [];
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const separator = line.includes('\t') ? '\t' : (line.includes(';') ? ';' : ',');
      const pair = line.split(separator).map((part) => part.trim().replace(/^"|"$/g, ''));
      if (pair.length !== 2 || !pair[0] || !pair[1]) {
        throw new Error(`Line ${index + 1} must contain exactly two non-empty values separated by a tab, comma, or semicolon.`);
      }
      records.push(pair);
    }
    if (records.length < 2) throw new Error('Please provide at least two paired observations.');
    if (records.length > 5000) throw new Error('This demo accepts up to 5,000 observations at a time.');
    return records;
  }

  function calculate(records) {
    const xCategories = [];
    const fCategories = [];
    const xSeen = new Set();
    const fSeen = new Set();
    for (const [x, f] of records) {
      if (!xSeen.has(x)) { xSeen.add(x); xCategories.push(x); }
      if (!fSeen.has(f)) { fSeen.add(f); fCategories.push(f); }
    }
    if (xCategories.length < 2 || fCategories.length < 2) throw new Error('Both variables need at least two distinct categories to test independence.');
    if (xCategories.length > 12 || fCategories.length > 12) throw new Error('For a readable table, use no more than 12 categories per variable.');

    const xIndex = new Map(xCategories.map((value, index) => [value, index]));
    const fIndex = new Map(fCategories.map((value, index) => [value, index]));
    const observed = Array.from({ length: xCategories.length }, () => Array(fCategories.length).fill(0));
    const rowTotals = Array(xCategories.length).fill(0);
    const colTotals = Array(fCategories.length).fill(0);
    records.forEach(([x, f]) => {
      const i = xIndex.get(x);
      const j = fIndex.get(f);
      observed[i][j] += 1;
      rowTotals[i] += 1;
      colTotals[j] += 1;
    });

    const n = records.length;
    const expected = observed.map((row, i) => row.map((_, j) => rowTotals[i] * colTotals[j] / n));
    let chiSquare = 0;
    expected.forEach((row, i) => row.forEach((e, j) => { chiSquare += ((observed[i][j] - e) ** 2) / e; }));
    const df = (xCategories.length - 1) * (fCategories.length - 1);
    const pValue = regularizedGammaQ(df / 2, chiSquare / 2);
    const cramerV = Math.sqrt(chiSquare / (n * Math.min(xCategories.length - 1, fCategories.length - 1)));
    return { xCategories, fCategories, observed, expected, rowTotals, colTotals, n, chiSquare, df, pValue, cramerV };
  }

  const lanczos = [
    676.5203681218851, -1259.1392167224028, 771.3234287776531,
    -176.6150291621406, 12.507343278686905, -0.13857109526572012,
    9.984369578019572e-6, 1.5056327351493116e-7
  ];

  function logGamma(z) {
    if (z < 0.5) return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - logGamma(1 - z);
    let x = 0.99999999999980993;
    const shifted = z - 1;
    for (let i = 0; i < lanczos.length; i += 1) x += lanczos[i] / (shifted + i + 1);
    const t = shifted + lanczos.length - 0.5;
    return 0.5 * Math.log(2 * Math.PI) + (shifted + 0.5) * Math.log(t) - t + Math.log(x);
  }

  function regularizedGammaQ(a, x) {
    if (x <= 0) return 1;
    if (a <= 0) return NaN;
    const logFactor = -x + a * Math.log(x) - logGamma(a);
    const epsilon = 1e-14;
    const tiny = 1e-300;
    if (x < a + 1) {
      let ap = a;
      let term = 1 / a;
      let sum = term;
      for (let n = 1; n <= 10000; n += 1) {
        ap += 1;
        term *= x / ap;
        sum += term;
        if (Math.abs(term) <= Math.abs(sum) * epsilon) break;
      }
      const p = sum * Math.exp(logFactor);
      return Math.max(0, Math.min(1, 1 - p));
    }
    let b = x + 1 - a;
    let c = 1 / tiny;
    let d = 1 / Math.max(Math.abs(b), tiny);
    if (b < 0) d = -d;
    let h = d;
    for (let i = 1; i <= 10000; i += 1) {
      const an = -i * (i - a);
      b += 2;
      d = an * d + b;
      if (Math.abs(d) < tiny) d = tiny;
      c = b + an / c;
      if (Math.abs(c) < tiny) c = tiny;
      d = 1 / d;
      const delta = d * c;
      h *= delta;
      if (Math.abs(delta - 1) < epsilon) break;
    }
    return Math.max(0, Math.min(1, Math.exp(logFactor) * h));
  }

  const fmt = (number, digits = 3) => Number(number).toLocaleString(undefined, { maximumFractionDigits: digits });
  function formatP(p) {
    if (p < 0.0001) return p === 0 ? '< 1×10⁻³⁰⁰' : p.toExponential(2);
    return p.toFixed(4);
  }

  function setCellTable(tableId, headCells, bodyRows, footerCells) {
    const table = byId(tableId);
    let html = `<thead><tr>${headCells.map((cell) => `<th scope="col">${cell}</th>`).join('')}</tr></thead><tbody>`;
    html += bodyRows.map((row) => `<tr>${row.map((cell, index) => index === 0 ? `<th scope="row">${cell}</th>` : `<td>${cell}</td>`).join('')}</tr>`).join('');
    html += '</tbody>';
    if (footerCells) html += `<tfoot><tr>${footerCells.map((cell, index) => index === 0 ? `<th scope="row">${cell}</th>` : `<td>${cell}</td>`).join('')}</tr></tfoot>`;
    table.innerHTML = html;
  }

  function renderTables(result) {
    const { xCategories, fCategories, observed, expected, rowTotals, colTotals, n } = result;
    const head = [`X \\ F`, ...fCategories.map(escapeHTML), 'Row total · marginal count / frequency'];
    const rows = xCategories.map((x, i) => [escapeHTML(x), ...fCategories.map((_, j) => `<span class="hw7-cell-observed">${observed[i][j]}</span><span class="hw7-cell-expected">E = ${fmt(expected[i][j])}</span>`), `${rowTotals[i]} · ${fmt(rowTotals[i] / n * 100, 1)}%`]);
    const foot = ['Column total · marginal count / frequency', ...colTotals.map((total) => `${total} · ${fmt(total / n * 100, 1)}%`), `${n} · 100%`];
    setCellTable('observed-table', head, rows, foot);

    const rowConditional = xCategories.map((x, i) => [escapeHTML(x), ...fCategories.map((f, j) => `${fmt(observed[i][j] / rowTotals[i] * 100, 1)}% <span class="hw7-cell-expected">${observed[i][j]} / ${rowTotals[i]}</span>`), `${rowTotals[i]} total`]);
    setCellTable('row-conditional', [`X · row`, ...fCategories.map(escapeHTML), 'Row N'], rowConditional);

    const columnConditional = fCategories.map((f, j) => [escapeHTML(f), ...xCategories.map((x, i) => `${fmt(observed[i][j] / colTotals[j] * 100, 1)}% <span class="hw7-cell-expected">${observed[i][j]} / ${colTotals[j]}</span>`), `${colTotals[j]} total`]);
    setCellTable('column-conditional', [`F · column`, ...xCategories.map(escapeHTML), 'Column N'], columnConditional);
  }

  function renderBars(result) {
    const { xCategories, fCategories, observed, rowTotals } = result;
    byId('legend').innerHTML = fCategories.map((f, j) => `<span><i class="hw7-swatch" style="background:${palette[j % palette.length]}"></i>${escapeHTML(f)}</span>`).join('');
    byId('conditional-bars').innerHTML = xCategories.map((x, i) => {
      const segments = fCategories.map((f, j) => {
        const percent = observed[i][j] / rowTotals[i] * 100;
        const text = percent >= 13 ? `${fmt(percent, 0)}%` : '';
        return `<span class="hw7-segment" title="${escapeHTML(f)}: ${fmt(percent, 1)}%" style="width:${percent}%;background:${palette[j % palette.length]}">${text}</span>`;
      }).join('');
      return `<div class="hw7-bar-row"><span class="hw7-bar-label">${escapeHTML(x)}</span><div class="hw7-bar" role="img" aria-label="${escapeHTML(x)}: ${fCategories.map((f, j) => `${escapeHTML(f)} ${fmt(observed[i][j] / rowTotals[i] * 100, 1)} percent`).join(', ')}">${segments}</div></div>`;
    }).join('');
  }

  function renderResult(result) {
    byId('metric-n').textContent = result.n.toLocaleString();
    byId('metric-chi').textContent = fmt(result.chiSquare, 4);
    byId('metric-df').textContent = result.df.toLocaleString();
    byId('metric-p').textContent = formatP(result.pValue);
    byId('metric-v').textContent = fmt(result.cramerV, 3);
    renderTables(result);
    renderBars(result);

    const alpha = Number(alphaSelect.value);
    const decision = byId('decision');
    if (result.pValue < alpha) {
      decision.className = 'hw7-decision warn';
      decision.innerHTML = `<strong>At α = ${alpha}, reject the independence model.</strong><span>This sample provides evidence of an association between X and F (χ²(${result.df}) = ${fmt(result.chiSquare, 3)}, p = ${formatP(result.pValue)}). This does not show that one variable causes the other.</span>`;
    } else {
      decision.className = 'hw7-decision';
      decision.innerHTML = `<strong>At α = ${alpha}, fail to reject the independence model.</strong><span>This sample does not provide strong enough evidence of an association by this test. That is not proof that X and F are independent; sample size and study design matter.</span>`;
    }

    const cells = result.expected.flat();
    const belowFive = cells.filter((value) => value < 5).length;
    const minimum = Math.min(...cells);
    const warning = byId('expected-warning');
    if (minimum < 1 || belowFive / cells.length > 0.2) {
      warning.hidden = false;
      warning.textContent = `Small expected-count warning: the smallest expected count is ${fmt(minimum)}; ${belowFive} of ${cells.length} cells are below 5. The chi-square approximation may be unreliable for this table. Consider a suitable exact or simulation-based method.`;
    } else {
      warning.hidden = true;
      warning.textContent = '';
    }
  }

  function useDemo() {
    const demo = demos[demoSelect.value];
    currentRecords = demoRecords(demo);
    byId('dataset-description').textContent = demo.description;
    byId('lab-status').className = 'hw7-status';
    byId('lab-status').textContent = `Loaded ${currentRecords.length} synthetic paired observations.`;
    renderResult(calculate(currentRecords));
  }

  byId('analyze-custom').addEventListener('click', () => {
    try {
      const parsed = parsePairs(byId('custom-data').value, byId('has-header').checked);
      const result = calculate(parsed);
      currentRecords = parsed;
      byId('dataset-description').textContent = 'Custom paired observations are active. The data are analyzed in the order you pasted them; no names or records are sent to a server.';
      byId('lab-status').className = 'hw7-status';
      byId('lab-status').textContent = `Built a contingency table from ${parsed.length} pasted records.`;
      renderResult(result);
    } catch (error) {
      byId('lab-status').className = 'hw7-status error';
      byId('lab-status').textContent = error.message;
    }
  });

  byId('restore-demo').addEventListener('click', useDemo);
  demoSelect.addEventListener('change', useDemo);
  alphaSelect.addEventListener('change', () => {
    if (currentRecords.length) renderResult(calculate(currentRecords));
  });

  useDemo();
})();
