const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const C = require('../homework-3-core.js');
const data = require('../homework-3-data.js');

test('secp256k1 points agree with OpenSSL for the entire classroom key space and n−1', () => {
  for (const d of [...Array.from({ length: 64 }, (_, i) => BigInt(i + 1)), C.N - 1n]) {
    const reference = crypto.createECDH('secp256k1');
    reference.setPrivateKey(Buffer.from(d.toString(16).padStart(64, '0'), 'hex'));
    assert.equal(C.pointHex(C.multiply(d)), reference.getPublicKey('hex', 'uncompressed'));
  }
  assert.equal(C.multiply(0), null);
  assert.equal(C.add(C.G, C.negate(C.G)), null);
  assert.equal(C.validPoint(null), false);
  assert.equal(C.validPoint({ x: C.G.x + C.P, y: C.G.y }), false);
  assert.equal(C.validPoint({ x: 1n, y: 1n }), false);
});

test('both bounded searches recover every classroom key, including the last value', () => {
  for (let d = 1; d <= 64; d++) for (const method of ['linear', 'bsgs']) {
    assert.equal(C.boundedSearch(C.multiply(d), 64, method).key, d);
    if (d > 1) assert.equal(C.boundedSearch(C.multiply(d), d - 1, method).key, null);
  }
  assert.equal(C.boundedSearch(C.multiply(65), 64, 'bsgs').key, null);
  assert.equal(C.boundedSearch(C.multiply(64), 64, 'bsgs').entries, 9);
  assert.equal(C.boundedSearch(C.multiply(37)).checks, 37);
});

test('public packet decrypts through independent OpenSSL HKDF and AES-GCM APIs', async () => {
  const message = 'HELLO, CYBER CLASS! Azərbaycan: əıöşüç 🔐';
  const packet = await C.encrypt(message, 37, 11);
  assert.deepEqual(Object.keys(packet).sort(), ['Q', 'R', 'ciphertext', 'iv', 'salt'].sort());
  const receiver = crypto.createECDH('secp256k1');
  receiver.setPrivateKey(Buffer.from((37).toString(16).padStart(64, '0'), 'hex'));
  const sharedX = receiver.computeSecret(Buffer.from(C.pointHex(packet.R), 'hex'));
  const key = Buffer.from(crypto.hkdfSync('sha256', sharedX, packet.salt, Buffer.from('statistics-homework/ecdh-aes-gcm/v2'), 32));
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, packet.iv);
  decipher.setAAD(Buffer.from(`statistics-homework/v2|${C.pointHex(packet.Q)}|${C.pointHex(packet.R)}`));
  decipher.setAuthTag(packet.ciphertext.slice(-16));
  assert.equal(Buffer.concat([decipher.update(packet.ciphertext.slice(0, -16)), decipher.final()]).toString('utf8'), message);
  assert.equal(await C.decrypt(packet, 37), message);
  for (const target of ['d', 'r']) for (const method of ['linear', 'bsgs']) {
    const recovered = await C.recover(packet, target, method);
    assert.equal(recovered.key, target === 'd' ? 37 : 11);
    assert.equal(recovered.plaintext, message);
  }
});

test('tampering, wrong keys, invalid points, and invalid demo scalars are rejected', async () => {
  const p = await C.encrypt('Authenticated message', 37, 11);
  for (const field of ['ciphertext', 'iv', 'salt']) {
    const modified = { ...p, [field]: p[field].slice() }; modified[field][0] ^= 1;
    await assert.rejects(C.decrypt(modified, 37));
  }
  await assert.rejects(C.decrypt(p, 38));
  await assert.rejects(C.decrypt({ ...p, Q: C.multiply(38) }, 37));
  await assert.rejects(C.decrypt({ ...p, R: { x: 1n, y: 1n } }, 37));
  for (const key of [0, 65, 1.5, NaN]) await assert.rejects(C.encrypt('x', key, 11));
  const empty = await C.encrypt('', 1, 64);
  assert.equal(await C.decrypt(empty, 1), '');
  assert.equal(empty.ciphertext.length, 16);
  const next = await C.encrypt('Authenticated message', 37, 11);
  assert.notDeepEqual(next.iv, p.iv); assert.notDeepEqual(next.salt, p.salt);
});

test('Caesar preserves round trips, counts, entropy, and coincidence for every shift', () => {
  const message = 'HELLO, Zebra! AaZz 123. əıöşüç ß';
  const baseline = C.textStatistics(message);
  assert.equal(C.shiftText('HELLO', 7), 'OLSSV');
  assert.equal(C.shiftText('Zz', 1), 'Aa');
  assert.equal(C.letters('əıöşüç ßABCxyz'), 'ABCXYZ');
  for (let s = 0; s < 26; s++) {
    const encrypted = C.shiftText(message, s), stats = C.textStatistics(encrypted);
    assert.equal(C.shiftText(encrypted, -s), message);
    assert.deepEqual([...stats.values].sort((a, b) => a - b), [...baseline.values].sort((a, b) => a - b));
    assert.ok(Math.abs(stats.entropy - baseline.entropy) < 1e-12);
    assert.equal(stats.coincidence, baseline.coincidence);
  }
  assert.equal(C.textStatistics('').entropy, null);
});

test('scorers enumerate all 26 keys without a key input, and handle short samples', () => {
  const model = C.corpusModel(data.training);
  const sample = C.letters(data.test).slice(-1000);
  for (let key = 0; key < 26; key++) {
    const ranked = C.analyze(C.shiftText(sample, key), model);
    assert.equal(ranked.all.length, 26);
    assert.equal(ranked.all[key].plaintext, sample);
    assert.equal(ranked.chi[0].shift, key);
    assert.equal(ranked.ngram[0].shift, key);
    assert.ok(ranked.all.every(x => Number.isFinite(x.chi) && Number.isFinite(x.ngram)));
  }
  assert.equal(C.analyze('X', model).ngramAvailable, false);
  assert.equal(C.analyze('XY', model).ngramAvailable, true);
  assert.throws(() => C.analyze('123', model));
  assert.throws(() => C.corpusModel(''));
});

test('length experiment is deterministic, separates texts, and reports inclusion honestly', () => {
  const a = C.study(data.training, data.test, 7, 20);
  const b = C.study(data.training, data.test, 7, 20);
  assert.deepEqual(a, b);
  assert.deepEqual(a.map(r => r.length), [5, 10, 20, 40, 80, 160, 320, 640, 1000]);
  assert.ok(a.every(r => r.exhaustiveContains === 20 && r.chiWins <= 20 && r.ngramWins <= 20));
  assert.ok(a.some(r => r.chiWins < 20));
  assert.throws(() => C.study(data.training, data.training));
  assert.throws(() => C.study(data.training, 'too short'));
  assert.throws(() => C.study(data.training, data.test, 30));
  console.log('Default length study:', JSON.stringify(a));
});
