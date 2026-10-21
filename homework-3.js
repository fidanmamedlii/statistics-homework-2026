(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const FIELD_P = 0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2fn;
  const GROUP_N = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n;
  const G = {
    x: 0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798n,
    y: 0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8n
  };
  const MAX_DEMO_KEY = 64;
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  // This original teaching sample gives the demo a self-contained English letter model.
  // A larger or more representative corpus can be pasted in the page.
  const DEFAULT_TRAINING = `
  On a quiet morning the town wakes slowly. First a few lamps go dark in the shops, then the baker opens a blue door and lets warm bread cool near the window. A bus crosses the bridge with a small crowd of students. Some carry books, some carry coffee, and some look out at the river while the streets become brighter. The same journey takes a different shape in rain, when umbrellas turn along the pavement and every passing car leaves a silver line on the road. By noon the market is busy. A farmer weighs apples, a child asks for a pear, and a neighbor compares the price of tea. Nothing in the scene is extraordinary, yet its details form a useful picture of how people share a place.

  A careful observer does not begin with a conclusion. She writes down what happened, decides what should be counted, and checks whether the record is complete. If a school wants to know how students travel, it may count walks, buses, bicycles, and cars. The total number matters, but so does the way the question is asked. A survey that reaches only students who arrive early may miss people who take a later bus. A table can summarize the answers, while a graph can show how the groups differ. Neither display explains every cause. Good statistics describe the evidence, state the limits, and leave room for a better question.

  In a library, information is arranged so that another reader can find it again. A title identifies a book, a catalog groups related subjects, and a shelf gives the item a visible place. Computers follow a similar principle when they store names, dates, and records in an organized form. A search can return a page in a moment, but the result is only useful when its source is trustworthy and its meaning is clear. Readers compare evidence, notice missing details, and ask who prepared the material. A number without a unit can mislead; a percentage without a total can hide the size of a group. Context turns a list of values into a useful account.

  The weather changes throughout the year, and the same measurements help people understand those changes. A thermometer records temperature, a rain gauge collects water, and a calendar places each observation in time. One cold evening tells very little about a season. A long series of readings can reveal the usual range, the wettest months, or a rare event. Averages are convenient, though they may hide a very hot day or a very dry week. A chart with a careful scale helps a reader see both the common pattern and the unusual point. The method is simple: measure consistently, keep the original observations, and explain how a summary was made.

  People also use patterns to protect a message. A secret code may replace each letter with another symbol, while a modern cryptographic system uses mathematical operations with carefully chosen keys. The visible steps can be public, but a private key must stay under the owner's control. A hash function produces a fixed-size fingerprint of data, and a digital signature allows others to check who approved a message. These tools solve different problems. Encryption hides content, a signature supports authenticity, and a checksum can help detect mistakes. No single label makes a system safe. Its design, implementation, key size, and use all matter, and a small classroom example should never be trusted with real money or private records.

  When a group compares two plans, it helps to define the outcome before looking at the numbers. A town may test two ways of reducing traffic near a school. One plan could add a crossing guard, while another changes the timing of a signal. The number of cars, the waiting time, and the safety of children are related but not identical measures. A fair comparison collects the same kind of information in both places and watches for other changes, such as road work or a holiday. If one neighborhood is much larger, raw totals may create a false impression; rates per person or per hour can be more useful. An honest report explains the choice of measure and the uncertainty in the estimate.

  Learning a new skill often follows a similar process. A learner first sees an example, tries a small version, and then changes one part at a time. If every setting changes at once, it becomes difficult to explain why the result changed. A notebook keeps the input, the steps, and the output together. Repeating the same calculation checks whether the method is deterministic. Testing a different input shows whether the program responds as expected. When an error appears, the learner can compare the result with a known example and trace the calculation backward. This careful habit is useful in mathematics, science, software, and everyday decisions. It turns curiosity into a method that another person can follow.

  Across a wide landscape, a river joins small streams before it reaches the sea. Along the way, its depth, speed, and color change with the ground and the season. People build bridges at narrow points and gardens near fertile banks. A map gives a simplified view, not the whole experience of standing beside the water. It leaves out the smell of wet leaves, the sound of a boat, and the exact path of every ripple. A useful model does not need to copy every detail; it needs to preserve the details relevant to a question. A statistic, a map, or a cryptographic formula is a model too. Understanding what it includes and excludes is part of using it well.

  Clear writing gives a reader a path through an idea. A short opening states the question, the next paragraphs explain the method, and a final section interprets the result. Tables should have labels, units, and totals. A source should be named so that another person can check it. When evidence is uncertain, the writer can say so directly instead of hiding the uncertainty behind a confident sentence. Readers do not need every detail at once; they need enough detail to understand how the conclusion follows from the evidence. A practical explanation connects a formula to a concrete example, then returns to the limits of that example. This is especially important when a demonstration resembles a real system but uses tiny numbers.

  In a busy city, a delivery worker plans a route through many streets. A map can suggest a short path, but road closures and traffic may change the best choice. A careful route planner asks for current conditions, checks each turn, and keeps a backup plan. The same principle applies to data work: the method must fit the question and the conditions. A summary that was accurate last month may be stale today. A small sample can show a possibility, but it may not describe a much larger population. Repeating a measurement under different conditions reveals which features stay stable and which depend on the setting. The more clearly the conditions are recorded, the easier it is to judge the result.

  A garden grows through patient attention. The gardener chooses a place, prepares the soil, adds water, and waits to see which seeds take root. Too much water can be as harmful as too little. A single plant does not describe every seed, and one sunny day does not tell the gardener how a season will end. Notes about shade, soil, and rainfall help explain the difference between plants. People use the same careful thinking when they study a population or compare a program. They observe a group, record conditions, and look for patterns without assuming that every member is identical. Variation is not a mistake in the data; it is often the feature that the study is trying to understand.

  A message sent across a network travels through devices that may not belong to its sender. A secure design assumes that other people can observe the public information. The receiver publishes a public key, but keeps the private key hidden. A sender can use the public key to arrange a shared secret without sending that secret directly. A symmetric cipher then protects the actual message. The mathematics does not remove every risk: weak randomness, a stolen device, a copied secret, or a faulty implementation can still expose information. Security is a process, not a magic property of a curve or a long string. Good practice keeps secrets private, uses reviewed software, and avoids treating a demonstration as a safe wallet.
  `;

  const DEFAULT_TEST_TEXT = `
  Quizzical zebras crossed the sunny meadow before noon, while a small group met in a bright room above the station. They planned a visit to the museum and marked the route on a paper map. One person checked the train time, another brought water, and a third wrote the names of the streets in a notebook. The conversation moved from the old harbor to a new bridge, from local history to the changes in the market. They did not agree on every detail, so they looked for a record that could settle the question. A dated photograph showed the former shape of the road, while a report described the later repairs. Each source answered part of the problem. Together they made a clearer account than any single memory could provide.

  After the visit, the group compared what they had expected with what they observed. The museum was quieter than they imagined, but the harbor was crowded with families. A guide explained how ships once carried timber, grain, and letters between distant ports. The old warehouse had become a public hall, and the wide doors still showed marks from years of use. People paused to read the signs and asked how the town had changed. A map beside the entrance showed the river, the railway, and the path to the market. It was a simple display, yet it helped everyone connect separate stories to the same place.

  When the group returned, they wrote a short summary for other visitors. They included the time of the train, the walking distance, and the location of the public entrance. They also mentioned that the stairway was steep and that a different entrance could be used by anyone who needed it. Small details can change how useful a report becomes. A clear heading helps the reader find a topic; a unit explains what a number means; a source allows someone else to check the claim. The writers removed guesses that could not be supported and kept the observations that they had recorded. Their final account was brief, but another person could follow the route and understand how they reached it.

  The next week, a class used the visit as an example in a statistics lesson. Students listed the observations, chose categories, and counted how often each appeared. They found that most visitors arrived in pairs or small families, while a few came alone. The sample covered only one afternoon, so it could not describe every day of the year. A second visit on a rainy morning might show a different pattern. The class discussed how a larger sample could improve the estimate and how the question might be changed to collect more useful information. The exercise showed that counting is only one part of statistics: choosing what to count and explaining the limits matter just as much.
  `;

  let lastPacket = null;
  let lastCaesarCipher = '';

  function mod(value, modulus = FIELD_P) {
    const result = value % modulus;
    return result < 0n ? result + modulus : result;
  }

  function inverse(value, modulus) {
    let oldR = mod(value, modulus);
    let r = modulus;
    let oldS = 1n;
    let s = 0n;
    while (r !== 0n) {
      const quotient = oldR / r;
      [oldR, r] = [r, oldR - quotient * r];
      [oldS, s] = [s, oldS - quotient * s];
    }
    if (oldR !== 1n) throw new Error('The modular inverse does not exist.');
    return mod(oldS, modulus);
  }

  function pointAdd(left, right) {
    if (left === null) return right;
    if (right === null) return left;
    let slope;
    if (left.x === right.x && mod(left.y + right.y) === 0n) return null;
    if (left.x === right.x && left.y === right.y) {
      slope = mod(3n * left.x * left.x * inverse(2n * left.y, FIELD_P));
    } else {
      slope = mod((right.y - left.y) * inverse(right.x - left.x, FIELD_P));
    }
    const x = mod(slope * slope - left.x - right.x);
    const y = mod(slope * (left.x - x) - left.y);
    return { x, y };
  }

  function scalarMultiply(scalar, point = G) {
    let value = BigInt(scalar);
    if (value < 0n || value >= GROUP_N) throw new Error('Scalar is outside the secp256k1 range.');
    let addend = point;
    let result = null;
    while (value > 0n) {
      if (value & 1n) result = pointAdd(result, addend);
      addend = pointAdd(addend, addend);
      value >>= 1n;
    }
    return result;
  }

  function samePoint(left, right) {
    return left === null ? right === null : right !== null && left.x === right.x && left.y === right.y;
  }

  function hex32(value) {
    return value.toString(16).padStart(64, '0');
  }

  function pointHex(point) {
    return `04${hex32(point.x)}${hex32(point.y)}`;
  }

  function numberToBytes(value) {
    const hex = hex32(value);
    const bytes = new Uint8Array(32);
    for (let index = 0; index < 32; index += 1) bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
    return bytes;
  }

  function bytesToHex(bytes) {
    return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  async function deriveAesKey(sharedPoint, salt) {
    const keyMaterial = await crypto.subtle.importKey('raw', numberToBytes(sharedPoint.x), 'HKDF', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'HKDF', hash: 'SHA-256', salt, info: encoder.encode('statistics-homework/ecdh-aes-gcm/v1') },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  function readDemoScalar(id, label) {
    const value = Number($(id).value);
    if (!Number.isInteger(value) || value < 1 || value > MAX_DEMO_KEY) {
      throw new Error(`${label} must be an integer from 1 to ${MAX_DEMO_KEY}.`);
    }
    return BigInt(value);
  }

  async function encryptEcc() {
    const status = $('ecc-status');
    status.classList.remove('error');
    try {
      if (!crypto?.subtle || !crypto?.getRandomValues) throw new Error('This browser does not expose Web Crypto here. Open the page on its HTTPS GitHub Pages address.');
      const d = readDemoScalar('private-d', 'Private d');
      const r = readDemoScalar('ephemeral-r', 'Ephemeral r');
      const message = $('message').value;
      const Q = scalarMultiply(d);
      const R = scalarMultiply(r);
      const senderShared = scalarMultiply(r, Q);
      const receiverShared = scalarMultiply(d, R);
      if (!samePoint(senderShared, receiverShared)) throw new Error('The ECDH shared points did not match.');

      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const aesKey = await deriveAesKey(senderShared, salt);
      const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, tagLength: 128 }, aesKey, encoder.encode(message));
      const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv, tagLength: 128 }, await deriveAesKey(receiverShared, salt), ciphertext);

      lastPacket = { d, r, Q, R, salt, iv, ciphertext };
      $('public-key-out').textContent = pointHex(Q);
      $('ephemeral-point-out').textContent = pointHex(R);
      $('ecc-packet-out').textContent = `salt  ${bytesToHex(salt)}\nnonce ${bytesToHex(iv)}\ncipher ${bytesToHex(ciphertext)}`;
      $('ecc-plain-out').textContent = decoder.decode(decrypted);
      $('attack-out').textContent = 'Packet ready. The attacker is given only Q, R, salt, nonce, and ciphertext.';
      $('attack-status').textContent = 'Ready to search the 64 candidate private keys.';
      $('attack-status').classList.remove('error');
      status.textContent = `Success. Sender and receiver derived the same shared point; AES-GCM restored ${encoder.encode(message).length} message bytes.`;
    } catch (error) {
      status.textContent = error.message || String(error);
      status.classList.add('error');
    }
  }

  async function attackEcc() {
    const status = $('attack-status');
    status.classList.remove('error');
    if (!lastPacket) {
      status.textContent = 'Encrypt a message first.';
      status.classList.add('error');
      return;
    }
    try {
      status.textContent = 'Searching candidate private keys…';
      await Promise.resolve();
      let recovered = null;
      let attempts = 0;
      for (let candidate = 1n; candidate <= BigInt(MAX_DEMO_KEY); candidate += 1n) {
        attempts += 1;
        if (samePoint(scalarMultiply(candidate), lastPacket.Q)) {
          recovered = candidate;
          break;
        }
      }
      if (recovered === null) {
        $('attack-out').textContent = `No match after ${attempts} candidates. The actual key is outside 1–${MAX_DEMO_KEY}.`;
        status.textContent = 'Search ended without a match.';
        return;
      }
      const attackerShared = scalarMultiply(recovered, lastPacket.R);
      const attackerKey = await deriveAesKey(attackerShared, lastPacket.salt);
      const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: lastPacket.iv, tagLength: 128 }, attackerKey, lastPacket.ciphertext);
      $('attack-out').textContent = `Recovered d = ${recovered} after ${attempts} candidate(s).\nComputed dR = rQ; HKDF derived the AES key.\nAES-GCM authenticated and decrypted: “${decoder.decode(decrypted)}”`;
      status.textContent = `Key recovered in ${attempts} point checks. The deliberately small range was the weakness.`;
    } catch (error) {
      $('attack-out').textContent = error.message || String(error);
      status.textContent = 'The attack could not complete.';
      status.classList.add('error');
    }
  }

  function shiftText(text, shift) {
    const normalized = ((Number(shift) % 26) + 26) % 26;
    return text.replace(/[A-Za-z]/g, (character) => {
      const base = character >= 'a' && character <= 'z' ? 97 : 65;
      return String.fromCharCode(((character.charCodeAt(0) - base + normalized) % 26) + base);
    });
  }

  function runCaesar() {
    const shift = Number($('caesar-shift').value);
    if (!Number.isInteger(shift) || shift < 0 || shift > 25) return;
    const message = $('message').value;
    lastCaesarCipher = shiftText(message, shift);
    $('caesar-plain-out').textContent = message || '(empty message)';
    $('caesar-cipher-out').textContent = lastCaesarCipher || '(empty ciphertext)';
    $('caesar-decrypt-out').textContent = shiftText(lastCaesarCipher, -shift) || '(empty plaintext)';
    if ($('attack-ciphertext').dataset.userEdited !== 'true') $('attack-ciphertext').value = lastCaesarCipher;
    renderFrequencyChart($('attack-ciphertext').value);
  }

  function letterCounts(text) {
    const counts = Array(26).fill(0);
    let total = 0;
    for (const character of text.toUpperCase()) {
      const code = character.charCodeAt(0) - 65;
      if (code >= 0 && code < 26) {
        counts[code] += 1;
        total += 1;
      }
    }
    return { counts, total };
  }

  function modelFromCorpus(text) {
    const { counts, total } = letterCounts(text);
    const smoothing = 0.5;
    const denominator = total + smoothing * 26;
    return { counts: counts.map((count) => (count + smoothing) / denominator), total };
  }

  function chiSquared(text, model) {
    const { counts, total } = letterCounts(text);
    if (total === 0 || model.total === 0) return Number.POSITIVE_INFINITY;
    let score = 0;
    for (let index = 0; index < 26; index += 1) {
      const expected = model.counts[index] * total;
      const difference = counts[index] - expected;
      score += (difference * difference) / expected;
    }
    return score;
  }

  function rankShifts(ciphertext, corpus) {
    const model = modelFromCorpus(corpus);
    const { total } = letterCounts(ciphertext);
    if (model.total < 1 || total < 1) throw new Error('Both the training corpus and ciphertext need at least one A–Z letter.');
    const candidates = [];
    for (let shift = 0; shift < 26; shift += 1) {
      const plaintext = shiftText(ciphertext, -shift);
      candidates.push({ shift, plaintext, score: chiSquared(plaintext, model) });
    }
    candidates.sort((left, right) => left.score - right.score);
    return { model, candidates, letters: total };
  }

  function renderFrequencyChart(ciphertext) {
    const chart = $('frequency-chart');
    if (!chart) return;
    const corpus = letterCounts($('training-corpus').value);
    const observed = letterCounts(ciphertext || '');
    const maxFrequency = Math.max(0.01, ...corpus.counts.map((count) => count / Math.max(1, corpus.total)), ...observed.counts.map((count) => count / Math.max(1, observed.total)));
    chart.innerHTML = '';
    for (let index = 0; index < 26; index += 1) {
      const expectedRate = corpus.counts[index] / Math.max(1, corpus.total);
      const observedRate = observed.counts[index] / Math.max(1, observed.total);
      const row = document.createElement('div');
      row.className = 'frequency-row';
      row.innerHTML = `<span class="letter">${String.fromCharCode(65 + index)}</span><span class="bar-track"><i class="bar-expected" style="width:${(expectedRate / maxFrequency) * 100}%"></i><i class="bar-observed" style="width:${(observedRate / maxFrequency) * 100}%"></i></span><span>${(expectedRate * 100).toFixed(1)} / ${(observedRate * 100).toFixed(1)}%</span>`;
      chart.appendChild(row);
    }
    $('corpus-size').textContent = `${corpus.total.toLocaleString()} alphabetic characters in the current reference corpus. The model is recomputed from this text.`;
  }

  function runFrequencyAttack() {
    const result = $('frequency-result');
    result.classList.remove('error');
    try {
      const ciphertext = $('attack-ciphertext').value;
      const corpus = $('training-corpus').value;
      const ranked = rankShifts(ciphertext, corpus);
      const best = ranked.candidates[0];
      const caution = ranked.letters < 60 ? ' Very short ciphertext: treat this as a weak guess.' : '';
      result.innerHTML = `<strong>Best guess: decrypt shift ${best.shift}.</strong> The attack scored ${ranked.candidates.length} candidates using ${ranked.letters} ciphertext letters. Candidate plaintext begins: “${escapeHtml(best.plaintext.slice(0, 150))}”.${caution}`;
      $('rank-rows').innerHTML = ranked.candidates.slice(0, 8).map((candidate, index) => `<tr><td>${index + 1}</td><td>${candidate.shift}</td><td>${candidate.score.toFixed(2)}</td></tr>`).join('');
      renderFrequencyChart(ciphertext);
    } catch (error) {
      result.textContent = error.message || String(error);
      result.classList.add('error');
      $('rank-rows').innerHTML = '<tr><td colspan="3">No candidate ranking available.</td></tr>';
    }
  }

  function escapeHtml(value) {
    return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  }

  function firstLetters(text, wanted) {
    let count = 0;
    let output = '';
    for (const character of text) {
      output += character;
      const code = character.toUpperCase().charCodeAt(0) - 65;
      if (code >= 0 && code < 26) count += 1;
      if (count >= wanted) break;
    }
    return output;
  }

  function runLengthStudy() {
    const body = $('study-rows');
    const summary = $('study-summary');
    const requestedShift = Number($('study-shift').value);
    if (!Number.isInteger(requestedShift) || requestedShift < 1 || requestedShift > 25) {
      summary.textContent = 'Choose a test shift from 1 to 25.';
      return;
    }
    const corpus = $('training-corpus').value;
    const testText = DEFAULT_TEST_TEXT.trim();
    const lengths = [5, 10, 20, 40, 80, 160, 320, 640, 1000];
    let correctCount = 0;
    body.innerHTML = '';
    for (const length of lengths) {
      const plain = firstLetters(testText, length);
      const actualLetters = letterCounts(plain).total;
      const cipher = shiftText(plain, requestedShift);
      const ranked = rankShifts(cipher, corpus);
      const guess = ranked.candidates[0];
      const correct = guess.shift === requestedShift;
      if (correct) correctCount += 1;
      const row = document.createElement('tr');
      row.innerHTML = `<td>${actualLetters}</td><td>${guess.shift}</td><td>${guess.score.toFixed(2)}</td><td class="${correct ? 'study-row-success' : 'study-row-fail'}">${correct ? 'Yes' : 'No'}</td>`;
      body.appendChild(row);
    }
    summary.textContent = `${correctCount} of ${lengths.length} tested lengths recovered shift ${requestedShift}. This one sample does not establish a universal length threshold; other text and corpus choices can change the result.`;
  }

  $('ecc-encrypt').addEventListener('click', encryptEcc);
  $('ecc-attack').addEventListener('click', attackEcc);
  $('caesar-run').addEventListener('click', runCaesar);
  $('message').addEventListener('input', runCaesar);
  $('caesar-shift').addEventListener('input', runCaesar);
  $('training-corpus').addEventListener('input', () => renderFrequencyChart($('attack-ciphertext').value));
  $('attack-ciphertext').addEventListener('input', () => {
    $('attack-ciphertext').dataset.userEdited = 'true';
    renderFrequencyChart($('attack-ciphertext').value);
  });
  $('load-caesar-cipher').addEventListener('click', () => {
    $('attack-ciphertext').value = lastCaesarCipher;
    $('attack-ciphertext').dataset.userEdited = 'false';
    renderFrequencyChart(lastCaesarCipher);
  });
  $('frequency-run').addEventListener('click', runFrequencyAttack);
  $('study-run').addEventListener('click', runLengthStudy);

  $('training-corpus').value = DEFAULT_TRAINING.trim();
  runCaesar();
  renderFrequencyChart(lastCaesarCipher);
  runFrequencyAttack();
  runLengthStudy();
})();
