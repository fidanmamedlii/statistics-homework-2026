(() => {
  'use strict';
  const p = 17;
  const curvePoints = [];
  const mod = n => ((n % p) + p) % p;
  for (let x = 0; x < p; x++) for (let y = 0; y < p; y++) if (mod(y * y - x * x * x - 7) === 0) curvePoints.push([x, y]);
  const inverse = a => {
    a = mod(a);
    if (a === 0) throw new Error('Zero has no modular inverse.');
    for (let n = 1; n < p; n++) if (mod(a * n) === 1) return n;
    throw new Error('No inverse exists.');
  };
  const add = (P, R) => {
    if (!P) return R;
    if (!R) return P;
    const [x1, y1] = P, [x2, y2] = R;
    if (x1 === x2 && mod(y1 + y2) === 0) return null;
    const slope = x1 === x2 && y1 === y2
      ? mod(3 * x1 * x1 * inverse(2 * y1))
      : mod((y2 - y1) * inverse(x2 - x1));
    const x3 = mod(slope * slope - x1 - x2);
    return [x3, mod(slope * (x1 - x3) - y1)];
  };
  const multiples = (G, limit = 18) => {
    const out = [];
    let point = null;
    for (let k = 1; k <= limit; k++) {
      point = add(point, G);
      out.push(point);
    }
    return out;
  };
  const pointText = P => P ? `(${P[0]}, ${P[1]})` : 'O (point at infinity)';
  const svg = document.getElementById('curvePlot');
  const trace = document.getElementById('trace');
  const scalar = document.getElementById('scalar');
  const base = document.getElementById('basepoint');
  const result = document.getElementById('publicKey');
  const orderNote = document.getElementById('orderNote');
  const status = document.getElementById('animationStatus');
  const btnStep = document.getElementById('step'), btnPlay = document.getElementById('play'), btnStop = document.getElementById('stop');
  let activeK = 6, timer = null;
  const mk = (tag, attrs = {}, children = []) => {
    const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    for (const child of children) node.append(child);
    return node;
  };
  const plot = (G, Q) => {
    svg.replaceChildren();
    const left = 42, top = 16, width = 345, height = 295;
    const sx = x => left + x / 16 * width, sy = y => top + (16 - y) / 16 * height;
    for (let v = 0; v <= 16; v += 4) {
      svg.append(mk('line', { x1: sx(v), y1: top, x2: sx(v), y2: top + height, class: 'curve-grid' }));
      svg.append(mk('line', { x1: left, y1: sy(v), x2: left + width, y2: sy(v), class: 'curve-grid' }));
      const tx = mk('text', { x: sx(v), y: top + height + 19, 'text-anchor': 'middle', class: 'curve-label' }); tx.textContent = String(v); svg.append(tx);
      const ty = mk('text', { x: left - 13, y: sy(v) + 3, 'text-anchor': 'end', class: 'curve-label' }); ty.textContent = String(v); svg.append(ty);
    }
    svg.append(mk('line', { x1: left, y1: top + height, x2: left + width + 3, y2: top + height, class: 'curve-axis' }));
    svg.append(mk('line', { x1: left, y1: top, x2: left, y2: top + height, class: 'curve-axis' }));
    for (const P of curvePoints) {
      const isBase = P[0] === G[0] && P[1] === G[1], isQ = Q && P[0] === Q[0] && P[1] === Q[1];
      const circle = mk('circle', { cx: sx(P[0]), cy: sy(P[1]), r: isQ ? 7 : isBase ? 6 : 4.5, class: isQ ? 'curve-current' : isBase ? 'curve-base' : 'curve-point' });
      const title = mk('title'); title.textContent = isBase ? `G = ${pointText(P)}` : isQ ? `Q = kG = ${pointText(P)}` : pointText(P);
      circle.append(title); svg.append(circle);
    }
    if (G[0] !== Q?.[0] || G[1] !== Q?.[1]) {
      for (const [P, labelText] of [[G, 'G'], [Q, 'Q']]) if (P) { const label = mk('text', { x: sx(P[0]) + 8, y: sy(P[1]) - 8, class: 'curve-label' }); label.textContent = labelText; svg.append(label); }
    }
  };
  const calculate = () => {
    stop();
    let k = Number.parseInt(scalar.value, 10);
    if (!Number.isInteger(k) || k < 1 || k > 17) { scalar.value = '6'; k = 6; }
    activeK = k;
    const G = base.value.split(',').map(Number);
    const chain = multiples(G);
    const Q = chain[k - 1];
    result.textContent = pointText(Q);
    const order = chain.findIndex(P => P === null) + 1;
    orderNote.textContent = `${order}G is the point at infinity O; the base point has order ${order}.`;
    trace.replaceChildren();
    for (let i = 0; i < k; i++) {
      const tr = document.createElement('tr');
      const vals = [`${i + 1}G`, pointText(chain[i]), i === 0 ? 'Start at G' : `Add G to ${i}G`];
      for (const value of vals) { const td = document.createElement('td'); td.textContent = value; tr.append(td); }
      if (i === k - 1) tr.className = 'active';
      tr.dataset.k = String(i + 1); trace.append(tr);
    }
    plot(G, Q);
    status.textContent = `Computed ${k}G.`;
  };
  function stop() {
    if (timer) clearInterval(timer);
    timer = null; btnStop.disabled = true; btnPlay.disabled = false;
  }
  const showStep = () => {
    const rows = [...trace.querySelectorAll('tr')];
    const current = rows.findIndex(row => row.classList.contains('active'));
    if (current >= rows.length - 1) { status.textContent = 'Sequence complete.'; stop(); return; }
    rows[current]?.classList.remove('active'); rows[current + 1]?.classList.add('active');
    const G = base.value.split(',').map(Number), k = current + 2;
    const Q = multiples(G)[k - 1];
    result.textContent = pointText(Q); plot(G, Q); status.textContent = `Showing ${k}G.`;
  };
  document.getElementById('compute').addEventListener('click', calculate);
  base.addEventListener('change', calculate);
  scalar.addEventListener('keydown', event => { if (event.key === 'Enter') calculate(); });
  btnStep.addEventListener('click', showStep);
  btnPlay.addEventListener('click', () => { if (!trace.children.length) calculate(); btnPlay.disabled = true; btnStop.disabled = false; status.textContent = 'Adding one G every 700 ms…'; timer = setInterval(showStep, 700); });
  btnStop.addEventListener('click', () => { stop(); status.textContent = 'Paused.'; });
  calculate();
})();
