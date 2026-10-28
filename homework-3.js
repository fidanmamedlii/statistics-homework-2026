(() => {
  'use strict';
  const C = window.HW3, data = window.HW3Data;
  const $ = id => document.getElementById(id);
  const escape = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const fixed = (n, digits = 3) => n === null ? 'N/A' : n.toFixed(digits);
  let packet = null, lastCipher = '', studyRows = null, studyConfig = null, generation = 0, exportUrl = null;
  const status = (id, message, error = false) => { $(id).textContent = message; $(id).classList.toggle('error', error); };
  function integer(id, minimum, maximum) {
    const n = Number($(id).value);
    if (!$(id).value.trim() || !Number.isInteger(n) || n < minimum || n > maximum) throw new Error(`Enter an integer from ${minimum} to ${maximum}.`);
    return n;
  }
  function clearPacket() {
    generation++; packet = null;
    ['public-key-out', 'ephemeral-point-out', 'ecc-packet-out', 'ecc-plain-out', 'attack-out'].forEach(id => $(id).textContent = '—');
    $('ecc-metrics').textContent = 'Encrypt the current message to calculate ciphertext-byte statistics.';
    $('attack-comparison').replaceChildren();
    status('ecc-status', 'Inputs changed. Encrypt again to create a current packet.');
    status('attack-status', 'Encrypt a message first.'); status('tamper-status', 'Encrypt a message first.');
  }
  async function encrypt() {
    const current = ++generation;
    packet = null; $('ecc-encrypt').disabled = true;
    status('ecc-status', 'Calculating public points, agreeing on a secret, and encrypting…');
    try {
      const d = integer('private-d', 1, 64), r = integer('ephemeral-r', 1, 64);
      const created = await C.encrypt($('message').value, d, r);
      const plaintext = await C.decrypt(created, d);
      if (current !== generation) return;
      packet = created;
      $('public-key-out').textContent = C.pointHex(packet.Q);
      $('ephemeral-point-out').textContent = C.pointHex(packet.R);
      $('ecc-packet-out').textContent = `R     ${C.pointHex(packet.R)}\nsalt  ${C.bytesHex(packet.salt)}\nnonce ${C.bytesHex(packet.iv)}\nciphertext + 16-byte tag\n${C.bytesHex(packet.ciphertext)}`;
      $('ecc-plain-out').textContent = plaintext || '(empty message)';
      const metrics = C.byteStatistics(packet.ciphertext.slice(0, -16));
      $('ecc-metrics').textContent = `Ciphertext payload: ${metrics.total} bytes (tag excluded). Empirical entropy: ${fixed(metrics.entropy)} bits/byte. One-bit proportion: ${metrics.onesRate === null ? 'N/A' : (100 * metrics.onesRate).toFixed(1) + '%'}. These small-sample descriptors do not measure security.`;
      $('attack-out').textContent = 'The attack function receives the public packet only: Q, R, salt, nonce, and ciphertext + tag.';
      $('attack-comparison').replaceChildren();
      status('ecc-status', `Restored the original message. Both sides calculated the same point: ${d} × ${r}G = ${d * r}G. The actual point has large coordinates.`);
      status('attack-status', 'Ready. Choose the private scalar and search method to attack.');
      status('tamper-status', 'Ready to flip one bit in a copy of this packet.');
    } catch (e) { if (current === generation) status('ecc-status', e.message, true); }
    finally { $('ecc-encrypt').disabled = false; }
  }
  async function attack(compare = false) {
    if (!packet) { status('attack-status', 'Encrypt a message first.', true); return; }
    const captured = packet, current = generation;
    $('ecc-attack').disabled = true; $('ecc-compare').disabled = true;
    status('attack-status', 'Searching the declared interval using public information…');
    try {
      const target = $('attack-target').value, bound = integer('attack-bound', 1, 64);
      const methods = compare ? ['linear', 'bsgs'] : [$('attack-method').value];
      const results = [];
      for (const method of methods) results.push({ method, ...await C.recover(captured, target, method, bound) });
      if (current !== generation) return;
      $('attack-comparison').innerHTML = results.map(r => `<tr><td>${r.method === 'linear' ? 'Exhaustive' : 'Baby-step giant-step'}</td><td>${r.key ?? 'No match'}</td><td>${r.checks}</td><td>${r.steps}</td><td>${r.entries}</td><td>${r.milliseconds.toFixed(2)}</td></tr>`).join('');
      const found = results.find(r => r.key !== null);
      $('attack-out').textContent = found ? `Recovered ${target} = ${found.key}.\nComputed ${target === 'd' ? 'dR' : 'rQ'}, derived the AES key, and verified the GCM tag.\nDecrypted: ${found.plaintext || '(empty message)'}` : `No match in 1…${bound}. A failed bounded search does not prove security; the key may lie outside that interval.`;
      status('attack-status', found ? 'Recovered from public information. The restricted scalar range was sufficient to decrypt.' : 'Search finished without a match.');
    } catch (e) { if (current === generation) status('attack-status', e.message, true); }
    finally { $('ecc-attack').disabled = false; $('ecc-compare').disabled = false; }
  }
  async function tamper() {
    if (!packet) { status('tamper-status', 'Encrypt a message first.', true); return; }
    const current = generation;
    const altered = { ...packet, ciphertext: packet.ciphertext.slice() }; altered.ciphertext[0] ^= 1;
    try {
      await C.decrypt(altered, integer('private-d', 1, 64));
      if (current === generation) status('tamper-status', 'Unexpected result: modified data was accepted.', true);
    } catch (e) {
      if (current === generation) status('tamper-status', e.name === 'OperationError'
        ? 'Rejected: changing one bit made the authentication tag invalid. The original packet is unchanged.'
        : e.message, e.name !== 'OperationError');
    }
  }
  function clearRanking() {
    $('rank-rows').innerHTML = '<tr><td colspan="4">Press “Compare all 26 shifts” for the current inputs.</td></tr>';
    status('frequency-result', 'Inputs changed. Recalculate the ranking.');
  }
  function caesar() {
    try {
      const shift = integer('caesar-shift', 0, 25), message = $('message').value;
      lastCipher = C.shiftText(message, shift);
      $('caesar-plain-out').textContent = message || '(empty message)';
      $('caesar-cipher-out').textContent = lastCipher || '(empty message)';
      $('caesar-decrypt-out').textContent = C.shiftText(lastCipher, -shift) || '(empty message)';
      const a = C.textStatistics(message), b = C.textStatistics(lastCipher);
      $('caesar-metrics').textContent = `${a.total} A–Z letters. Letter entropy: ${fixed(a.entropy)} → ${fixed(b.entropy)} bits/letter. Index of coincidence: ${fixed(a.coincidence, 4)} → ${fixed(b.coincidence, 4)}. Caesar permutes counts, so both descriptors are preserved.`;
      status('caesar-status', 'Encryption and decryption complete. Only A–Z and a–z are shifted.');
      if ($('attack-ciphertext').dataset.userEdited !== 'true') $('attack-ciphertext').value = lastCipher;
      chart(); clearRanking();
    } catch (e) { status('caesar-status', e.message, true); }
  }
  function chart() {
    const a = C.counts($('training-corpus').value), b = C.counts($('attack-ciphertext').value);
    const max = Math.max(0.01, ...a.values.map(x => x / Math.max(1, a.total)), ...b.values.map(x => x / Math.max(1, b.total)));
    $('frequency-chart').innerHTML = a.values.map((x, i) => {
      const left = x / Math.max(1, a.total), right = b.values[i] / Math.max(1, b.total);
      return `<div class="frequency-row"><span class="letter">${String.fromCharCode(65 + i)}</span><span class="bar-track"><i class="bar-expected" style="width:${100 * left / max}%"></i><i class="bar-observed" style="width:${100 * right / max}%"></i></span><span>${(100 * left).toFixed(1)} / ${(100 * right).toFixed(1)}%</span></div>`;
    }).join('');
    $('corpus-size').textContent = `${a.total.toLocaleString()} A–Z letters in the corpus; ${b.total.toLocaleString()} in the ciphertext. Case is ignored for statistics.`;
  }
  function rank() {
    try {
      const result = C.analyze($('attack-ciphertext').value, C.corpusModel($('training-corpus').value));
      const method = $('rank-method').value;
      const rows = method === 'exhaustive' ? result.all : method === 'chi' ? result.chi : result.ngram;
      $('rank-rows').innerHTML = rows.map(r => `<tr><td>${r.shift}</td><td>${r.chi.toFixed(2)}</td><td>${r.ngram === null ? 'N/A' : r.ngram.toFixed(4)}</td><td class="candidate-text">${escape(r.plaintext)}</td></tr>`).join('');
      status('frequency-result', `Chi-square guess: shift ${result.chi[0].shift}. N-gram guess: ${result.ngramAvailable ? 'shift ' + result.ngram[0].shift : 'unavailable (need two ciphertext letters and three corpus letters)'}. Exhaustive search lists all 26 candidates and does not select a key. ${C.letters($('attack-ciphertext').value).length < 60 ? 'This short sample may be misclassified.' : 'A ranking is evidence, not a guarantee.'}`);
      chart();
    } catch (e) { status('frequency-result', e.message, true); $('rank-rows').replaceChildren(); }
  }
  function invalidateStudy() {
    studyRows = null; studyConfig = null; $('export-study').disabled = true;
    $('csv-preview').hidden = true;
    $('study-rows').innerHTML = '<tr><td colspan="5">Run the experiment for the current inputs.</td></tr>';
    status('study-summary', 'Results need recalculation.');
  }
  async function runStudy() {
    $('csv-preview').hidden = true;
    $('study-run').disabled = true; status('study-summary', 'Comparing methods on reproducible windows of separate test text…');
    await new Promise(resolve => setTimeout(resolve, 20));
    try {
      const shift = integer('study-shift', 0, 25), trials = integer('study-trials', 1, 100);
      const corpus = $('training-corpus').value, test = $('test-corpus').value;
      studyRows = C.study(corpus, test, shift, trials);
      studyConfig = { shift, trials, trainingLetters: C.letters(corpus).length, testLetters: C.letters(test).length };
      $('study-rows').innerHTML = studyRows.map(r => `<tr><td>${r.length}</td><td>${r.uniqueWindows}</td><td>${r.exhaustiveContains}/${r.trials} included</td><td>${r.chiWins}/${r.trials} (${(100 * r.chiWins / r.trials).toFixed(0)}%)</td><td>${r.ngramWins}/${r.trials} (${(100 * r.ngramWins / r.trials).toFixed(0)}%)</td></tr>`).join('');
      const a = studyRows[0], b = studyRows.at(-1);
      const failures = studyRows.reduce((n, r) => n + 2 * r.trials - r.chiWins - r.ngramWins, 0);
      status('study-summary', `Shift ${shift}; ${studyConfig.trainingLetters} training letters; ${studyConfig.testLetters} test letters; ${9 * trials} windows per method. At ${a.length} letters: chi-square ${a.chiWins}/${trials}, n-grams ${a.ngramWins}/${trials}; at ${b.length}: ${b.chiWins}/${trials} and ${b.ngramWins}/${trials}. ${failures} incorrect top guesses across both methods. Overlapping windows give descriptive results, not an independent success-rate estimate or a universal length threshold.`);
      $('export-study').disabled = false;
    } catch (e) { studyRows = null; $('export-study').disabled = true; $('study-rows').replaceChildren(); status('study-summary', e.message, true); }
    finally { $('study-run').disabled = false; }
  }
  function exportStudy() {
    if (!studyRows) return;
    const lines = ['letters,trials,unique_windows,shift,training_letters,test_letters,exhaustive_key_included,chi_correct,ngram_correct'];
    for (const r of studyRows) lines.push([r.length, r.trials, r.uniqueWindows, studyConfig.shift, studyConfig.trainingLetters, studyConfig.testLetters, r.exhaustiveContains, r.chiWins, r.ngramWins].join(','));
    if (exportUrl) URL.revokeObjectURL(exportUrl);
    const csv = lines.join('\n');
    exportUrl = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    $('csv-text').value = csv; $('csv-download').href = exportUrl;
    $('csv-preview').hidden = false;
  }
  $('training-corpus').value = data.training; $('test-corpus').value = data.test;
  $('ecc-encrypt').addEventListener('click', encrypt);
  $('ecc-attack').addEventListener('click', () => attack(false));
  $('ecc-compare').addEventListener('click', () => attack(true));
  $('tamper-run').addEventListener('click', tamper);
  ['private-d', 'ephemeral-r'].forEach(id => $(id).addEventListener('input', clearPacket));
  $('message').addEventListener('input', () => { clearPacket(); caesar(); });
  $('caesar-run').addEventListener('click', caesar); $('caesar-shift').addEventListener('input', caesar);
  $('load-caesar-cipher').addEventListener('click', () => { $('attack-ciphertext').value = lastCipher; $('attack-ciphertext').dataset.userEdited = 'false'; chart(); clearRanking(); });
  $('attack-ciphertext').addEventListener('input', () => { $('attack-ciphertext').dataset.userEdited = 'true'; chart(); clearRanking(); });
  $('training-corpus').addEventListener('input', () => { chart(); clearRanking(); invalidateStudy(); });
  ['test-corpus', 'study-shift', 'study-trials'].forEach(id => $(id).addEventListener('input', invalidateStudy));
  $('frequency-run').addEventListener('click', rank); $('rank-method').addEventListener('change', rank);
  $('study-run').addEventListener('click', runStudy); $('export-study').addEventListener('click', exportStudy);
  caesar(); rank(); runStudy();
})();
