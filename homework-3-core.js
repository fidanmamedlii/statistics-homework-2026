/* Educational arithmetic, deliberately small demo keys; not production cryptography. */
(function (root) {
  'use strict';
  const P = 0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2fn;
  const N = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n;
  const G = Object.freeze({
    x: 0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798n,
    y: 0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8n
  });
  const MAX_KEY = 64;
  const encoder = new TextEncoder();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  const mod = (x, m = P) => ((x % m) + m) % m;
  function inverse(x, m = P) {
    let a = mod(x, m), b = m, u = 1n, v = 0n;
    while (b) { const q = a / b; [a, b] = [b, a - q * b]; [u, v] = [v, u - q * v]; }
    if (a !== 1n) throw new Error('No modular inverse.');
    return mod(u, m);
  }
  function add(a, b) {
    if (a === null) return b;
    if (b === null) return a;
    if (a.x === b.x && mod(a.y + b.y) === 0n) return null;
    const slope = a.x === b.x
      ? mod(3n * a.x * a.x * inverse(2n * a.y))
      : mod((b.y - a.y) * inverse(b.x - a.x));
    const x = mod(slope * slope - a.x - b.x);
    return { x, y: mod(slope * (a.x - x) - a.y) };
  }
  const negate = a => a === null ? null : { x: a.x, y: mod(-a.y) };
  function multiply(k, point = G) {
    k = BigInt(k);
    if (k < 0n || k >= N) throw new Error('Scalar must be in 0…n−1.');
    let result = null;
    while (k) { if (k & 1n) result = add(result, point); point = add(point, point); k >>= 1n; }
    return result;
  }
  const equal = (a, b) => a === null ? b === null : b !== null && a.x === b.x && a.y === b.y;
  function validPoint(a) {
    return !!a && typeof a.x === 'bigint' && typeof a.y === 'bigint' &&
      a.x >= 0n && a.x < P && a.y >= 0n && a.y < P && mod(a.y * a.y) === mod(a.x ** 3n + 7n);
  }
  function assertPoint(a) { if (!validPoint(a)) throw new Error('Invalid secp256k1 public point.'); }
  function scalar(value) {
    const x = Number(value);
    if (!Number.isInteger(x) || x < 1 || x > MAX_KEY) throw new Error('Demo private scalars must be integers from 1 to 64.');
    return BigInt(x);
  }
  const hex32 = x => x.toString(16).padStart(64, '0');
  const pointHex = a => a === null ? 'INF' : `04${hex32(a.x)}${hex32(a.y)}`;
  const bytesHex = x => Array.from(new Uint8Array(x), b => b.toString(16).padStart(2, '0')).join('');
  const xBytes = a => Uint8Array.from(hex32(a.x).match(/../g), h => parseInt(h, 16));
  const aad = packet => encoder.encode(`statistics-homework/v2|${pointHex(packet.Q)}|${pointHex(packet.R)}`);
  function cryptoApi() {
    if (!root.crypto?.subtle) throw new Error('Web Crypto is unavailable. Open this page over HTTPS or localhost.');
    return root.crypto;
  }
  async function deriveKey(shared, salt) {
    assertPoint(shared);
    const api = cryptoApi();
    const material = await api.subtle.importKey('raw', xBytes(shared), 'HKDF', false, ['deriveKey']);
    return api.subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt,
      info: encoder.encode('statistics-homework/ecdh-aes-gcm/v2') }, material,
      { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }
  async function decryptShared(packet, shared) {
    assertPoint(packet.Q); assertPoint(packet.R);
    const key = await deriveKey(shared, packet.salt);
    const plain = await cryptoApi().subtle.decrypt({ name: 'AES-GCM', iv: packet.iv,
      additionalData: aad(packet), tagLength: 128 }, key, packet.ciphertext);
    return decoder.decode(plain);
  }
  async function decrypt(packet, d) {
    assertPoint(packet.R);
    const k = BigInt(d);
    if (k < 1n || k >= N) throw new Error('Invalid private scalar.');
    return decryptShared(packet, multiply(k, packet.R));
  }
  async function encrypt(message, d, r) {
    d = scalar(d); r = scalar(r);
    const api = cryptoApi();
    const Q = multiply(d), R = multiply(r), shared = multiply(r, Q);
    if (!equal(shared, multiply(d, R))) throw new Error('Shared point mismatch.');
    const packet = { Q, R, salt: api.getRandomValues(new Uint8Array(16)),
      iv: api.getRandomValues(new Uint8Array(12)) };
    const key = await deriveKey(shared, packet.salt);
    packet.ciphertext = new Uint8Array(await api.subtle.encrypt({ name: 'AES-GCM', iv: packet.iv,
      additionalData: aad(packet), tagLength: 128 }, key, encoder.encode(message)));
    return packet; // Public packet only: never attach d, r, shared, key, or plaintext.
  }
  function boundedSearch(target, limit = MAX_KEY, method = 'linear') {
    assertPoint(target);
    if (!Number.isInteger(limit) || limit < 1 || limit > 4096) throw new Error('Search bound must be 1…4096.');
    if (!['linear', 'bsgs'].includes(method)) throw new Error('Unknown search method.');
    let steps = 0, checks = 0;
    const stepAdd = (a, b) => { steps++; return add(a, b); };
    if (method === 'linear') {
      let candidatePoint = null;
      for (let k = 1; k <= limit; k++) {
        candidatePoint = stepAdd(candidatePoint, G); checks++;
        if (equal(candidatePoint, target)) return { key: k, checks, steps, entries: 1 };
      }
      return { key: null, checks, steps, entries: 1 };
    }
    const m = Math.ceil(Math.sqrt(limit + 1));
    const babies = new Map(); let baby = null;
    for (let j = 0; j < m; j++) { babies.set(pointHex(baby), j); baby = stepAdd(baby, G); }
    const minusMG = negate(baby); let giant = target;
    for (let i = 0; i <= Math.floor(limit / m); i++) {
      checks++;
      const j = babies.get(pointHex(giant));
      if (j !== undefined) {
        const k = i * m + j;
        if (k >= 1 && k <= limit) return { key: k, checks, steps, entries: babies.size };
      }
      if (i < Math.floor(limit / m)) giant = stepAdd(giant, minusMG);
    }
    return { key: null, checks, steps, entries: babies.size };
  }
  async function recover(packet, target = 'd', method = 'linear', limit = MAX_KEY) {
    if (!['d', 'r'].includes(target)) throw new Error('Unknown attack target.');
    const start = performance.now();
    const result = boundedSearch(target === 'd' ? packet.Q : packet.R, limit, method);
    if (result.key === null) return { ...result, plaintext: null, milliseconds: performance.now() - start };
    const shared = multiply(BigInt(result.key), target === 'd' ? packet.R : packet.Q);
    const plaintext = await decryptShared(packet, shared);
    return { ...result, plaintext, milliseconds: performance.now() - start };
  }
  function shiftText(text, shift) {
    if (!Number.isInteger(shift)) throw new Error('Shift must be an integer.');
    const s = ((shift % 26) + 26) % 26;
    return text.replace(/[A-Za-z]/g, c => {
      const base = c >= 'a' && c <= 'z' ? 97 : 65;
      return String.fromCharCode((c.charCodeAt(0) - base + s) % 26 + base);
    });
  }
  const letters = text => text.replace(/[^A-Za-z]/g, '').toUpperCase();
  function counts(text) {
    const clean = letters(text), values = Array(26).fill(0);
    for (const c of clean) values[c.charCodeAt(0) - 65]++;
    return { values, total: clean.length };
  }
  function corpusModel(text) {
    const clean = letters(text), stats = counts(clean);
    if (!stats.total) throw new Error('The corpus needs A–Z letters.');
    const grams = [null, null, new Map(), new Map()], totals = [0, 0, 0, 0];
    for (const n of [2, 3]) for (let i = 0; i <= clean.length - n; i++) {
      const gram = clean.slice(i, i + n); grams[n].set(gram, (grams[n].get(gram) || 0) + 1); totals[n]++;
    }
    return { total: stats.total, probabilities: stats.values.map(x => (x + 0.5) / (stats.total + 13)), grams, totals };
  }
  function chiSquare(text, model) {
    const observed = counts(text);
    if (!observed.total) throw new Error('Ciphertext needs at least one A–Z letter.');
    return observed.values.reduce((score, x, i) => {
      const expected = observed.total * model.probabilities[i];
      return score + (x - expected) ** 2 / expected;
    }, 0);
  }
  function ngramScore(text, model) {
    const clean = letters(text);
    if (clean.length < 2 || model.total < 3) return null;
    let score = 0;
    for (const n of [2, 3]) {
      const count = clean.length - n + 1;
      if (count <= 0) continue;
      let sum = 0;
      const denominator = model.totals[n] + 0.5 * 26 ** n;
      for (let i = 0; i < count; i++) sum += Math.log(((model.grams[n].get(clean.slice(i, i + n)) || 0) + 0.5) / denominator);
      score += sum / count;
    }
    return score; // Mean log probabilities, bigram + trigram; higher is better.
  }
  function analyze(ciphertext, model) {
    if (!letters(ciphertext).length) throw new Error('Ciphertext needs at least one A–Z letter.');
    const all = Array.from({ length: 26 }, (_, shift) => {
      const plaintext = shiftText(ciphertext, -shift);
      return { shift, plaintext, chi: chiSquare(plaintext, model), ngram: ngramScore(plaintext, model) };
    });
    const chi = [...all].sort((a, b) => a.chi - b.chi || a.shift - b.shift);
    const ngram = [...all].sort((a, b) => (b.ngram ?? -Infinity) - (a.ngram ?? -Infinity) || a.shift - b.shift);
    return { all, chi, ngram, ngramAvailable: all[0].ngram !== null };
  }
  function study(corpus, testText, shift = 7, trials = 20) {
    if (!Number.isInteger(shift) || shift < 0 || shift > 25) throw new Error('Study shift must be 0…25.');
    if (!Number.isInteger(trials) || trials < 1 || trials > 100) throw new Error('Trials must be 1…100.');
    const clean = letters(testText), model = corpusModel(corpus);
    if (clean.length < 1000) throw new Error('The separate test text needs at least 1,000 A–Z letters.');
    if (letters(corpus) === clean) throw new Error('Use separate training and test texts to avoid exact data reuse.');
    const rows = [];
    for (const length of [5, 10, 20, 40, 80, 160, 320, 640, 1000]) {
      let chiWins = 0, ngramWins = 0;
      const starts = new Set();
      for (let trial = 0; trial < trials; trial++) {
        const start = trials === 1 ? 0 : Math.floor(trial * (clean.length - length) / (trials - 1));
        starts.add(start);
        const plain = clean.slice(start, start + length);
        const ranking = analyze(shiftText(plain, shift), model);
        if (ranking.chi[0].shift === shift) chiWins++;
        if (ranking.ngramAvailable && ranking.ngram[0].shift === shift) ngramWins++;
      }
      rows.push({ length, trials, uniqueWindows: starts.size, exhaustiveContains: trials, chiWins, ngramWins });
    }
    return rows;
  }
  function entropy(values) {
    const total = values.reduce((a, b) => a + b, 0);
    return total ? -values.reduce((sum, x) => x ? sum + x / total * Math.log2(x / total) : sum, 0) : null;
  }
  function textStatistics(text) {
    const c = counts(text);
    return { ...c, entropy: entropy(c.values), coincidence: c.total < 2 ? null :
      c.values.reduce((s, n) => s + n * (n - 1), 0) / (c.total * (c.total - 1)) };
  }
  function byteStatistics(bytes) {
    const values = Array(256).fill(0); let ones = 0;
    for (const byte of bytes) { values[byte]++; for (let b = 0; b < 8; b++) ones += (byte >> b) & 1; }
    return { total: bytes.length, entropy: entropy(values), onesRate: bytes.length ? ones / (bytes.length * 8) : null };
  }
  const api = { P, N, G, MAX_KEY, mod, add, negate, multiply, equal, validPoint, scalar,
    pointHex, bytesHex, encrypt, decrypt, boundedSearch, recover, shiftText, letters, counts,
    corpusModel, chiSquare, ngramScore, analyze, study, textStatistics, byteStatistics };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.HW3 = api;
})(globalThis);
