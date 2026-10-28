# Homework 3 — method, results, and coverage

Completed revision: 22 October 2026. The page is an educational experiment, not a production cryptographic application.

## Required and optional work

| Requirement | Implementation or discussion |
|---|---|
| Encrypt/decrypt a simple message with a restricted-key secp256k1 scheme; explain steps and keys | Real secp256k1 parameters, classroom scalars d and r in 1–64, ephemeral ECDH, HKDF-SHA-256, and AES-256-GCM. The page explains d, Q, r, R, the shared point, derived key, salt, nonce, tag, and receiving procedure. |
| Caesar encryption and decryption of the same message | One message field supplies both demonstrations. Caesar uses shifts 0–25 for ASCII English letters and preserves other characters. |
| Compare procedures, key spaces, and statistical properties | Comparison table, letter-frequency chart, entropy, index of coincidence, ciphertext-byte descriptors, and explicit discussion of units and small-sample limitations. |
| Corpus-based Caesar key recovery | Editable English corpus; smoothed letter probabilities; all 26 candidate decryptions ranked by chi-square. The scorer never receives the original key. |
| Different ciphertext lengths; effectiveness and limits | Nine lengths, 20 deterministic windows per length by default, separate test text, calculated recovery counts and rates, CSV export, and discussion of overlap, language mismatch, corpus size, and short-text uncertainty. |
| Optional: compare exhaustive search, frequency analysis, and n-grams | All three are available in the interface. N-grams combine smoothed character bigram and trigram mean log scores. Exhaustive search is reported as containing the correct answer, not as automatically identifying it. |
| Recover the restricted ECC private key or decrypt | Incremental exhaustive public-point search recovers d, then derives the AES key and decrypts with tag verification. |
| Contrast the ECC and Caesar attacks; explain full-size infeasibility | Exact equation matching versus language-statistical ranking; 64 classroom keys versus approximately 2^256 valid scalars; generic square-root attacks are also discussed. |
| Optional: alternative ECC attacks and sources of weakness | Working baby-step giant-step and temporary-r recovery; discussion of Pollard rho/kangaroo; key entropy, identity/authentication, randomness, nonce reuse, public-point validation, side channels, and integrity/confidentiality are treated separately. |

## Relationship to Homework 1

The previous page used the small curve y²=x³+7 mod 17 and demonstrated public-key derivation, not an encryption scheme. The new assignment explicitly names secp256k1. This revision uses the standard secp256k1 curve and generator while deliberately shrinking the private-scalar range. The resulting hybrid is described as an ECIES-style teaching construction, not a claim of implementing a standardized production ECIES profile.

## Statistical method

Normalize scoring input by retaining only ASCII A–Z/a–z, then uppercase it. Encryption preserves case, spaces, punctuation, and non-ASCII characters. The English-alphabet scoring limitation is visible on the page.

For letter count c_i and N corpus letters, p_i=(c_i+0.5)/(N+13). Each candidate gets chi-square sum((O_i−L*p_i)^2/(L*p_i)); lower is better. The score is used for ranking, not as a claimed hypothesis-test p-value on sparse texts.

N-gram scoring counts overlapping normalized character pairs and triples, including across removed spaces. For order n, p(g)=(count(g)+0.5)/(total_grams+0.5*26^n). The candidate score is the mean bigram log probability plus the mean trigram log probability; higher is better. Two-letter candidates use bigrams only; one-letter candidates have no n-gram score. Ties select the smaller shift. This is a simple scoring heuristic rather than a calibrated probability of a sentence or key.

The original teaching corpus and separate original test text are stored visibly in `homework-3-data.js`. They share a broadly similar prose style, so results should not be generalized to every English domain. Both can be replaced. Larger representative corpora are especially useful for sparse n-grams.

## Measured default results

Parameters: Caesar shift 7; 20 windows per length; the bundled training and test texts. For M test letters, L window letters, T windows, start_j=floor(j*(M−L)/(T−1)); T=1 starts at zero. Windows can overlap. These counts are reproducible descriptive observations, not estimates from independent random trials.

| Letters | Chi-square correct top key | N-gram correct top key | Exhaustive includes key |
|---:|---:|---:|---:|
| 5 | 13/20 (65%) | 16/20 (80%) | 20/20 |
| 10 | 15/20 (75%) | 19/20 (95%) | 20/20 |
| 20 | 18/20 (90%) | 20/20 (100%) | 20/20 |
| 40 | 19/20 (95%) | 20/20 (100%) | 20/20 |
| 80 | 20/20 (100%) | 20/20 (100%) | 20/20 |
| 160 | 20/20 (100%) | 20/20 (100%) | 20/20 |
| 320 | 20/20 (100%) | 20/20 (100%) | 20/20 |
| 640 | 20/20 (100%) | 20/20 (100%) | 20/20 |
| 1,000 | 20/20 (100%) | 20/20 (100%) | 20/20 |

In these samples, more letters helped both statistical approaches and n-grams improved the short-text guesses. This is not evidence for a universal 80-letter threshold, nor proof that n-grams always win. Exhaustive inclusion is a different outcome: a human or scoring method must still choose among its 26 outputs. Repeating the experiment with names, technical text, or a mismatched corpus can change the ranking.

## ECC attacks and interpretation

The public packet contains Q, R, salt, nonce, and ciphertext/tag only. Neither private scalar nor plaintext is attached to it. Both attack algorithms consume this packet and a declared bound. They can recover d by matching dG=Q or r by matching rG=R, then decrypt through dR or rQ respectively.

For d=37 and bound 64, exhaustive search checks 37 candidates. BSGS stores 9 baby points and trades storage for fewer group steps. Interface counts separate candidate checks/table lookups, point-add steps, and stored entries. Timing includes HKDF and decryption and is not a calibrated benchmark. A key outside the chosen interval produces no match; that alone does not establish security.

The 1–64 choice has only six bits of entropy per scalar if sampled uniformly; AES-256 and HKDF do not compensate. A small r alone allows decryption even if d were strong. Public-key identity, sender authentication, valid-point handling, nonce uniqueness, and side-channel resistance are independent design concerns explained on the page. The tamper test rejects a changed packet while the restricted-key attack still decrypts a legitimate one.

## Validation performed

Seven Node test groups passed:

1. All 64 classroom public points and n−1 agree with OpenSSL's secp256k1 implementation; invalid points and the identity are handled.
2. Both searches recover every key from 1 through 64, including boundary cases, and reject out-of-interval matches.
3. An independently wired OpenSSL ECDH/HKDF/AES-GCM path decrypts the generated UTF-8 packet; both attack targets and methods recover the message.
4. Modified ciphertext, nonce, salt, or authenticated context; a wrong private key; invalid points; and invalid demo scalars are rejected. Empty messages and fresh random fields are covered.
5. Every Caesar shift round-trips text and preserves letter-count permutation, entropy, and coincidence; non-ASCII characters are handled consistently.
6. Statistical routines enumerate 26 candidates without receiving the key, recover a selected long held-out sample for every shift, and handle short/empty inputs.
7. The length experiment is deterministic, enforces separate input texts, and distinguishes exhaustive inclusion from statistical recovery.

The Chrome browser test passed at desktop and 390px mobile width: encryption/decryption, both searches, temporary-key recovery, tamper rejection, invalid inputs, all candidate rows, safe display of HTML-like text, experiment errors, CSV preview/download, no page overflow, and no uncaught JavaScript errors. Screenshots were inspected. Browser downloads required running the browser test outside the restricted execution sandbox; the page also retains a copyable CSV preview.

Reproduction commands and the script layout are in `README.md`. Primary references are linked on the page.
