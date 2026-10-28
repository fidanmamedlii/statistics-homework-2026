# Cryptography & Statistics Homework

This buildless static site contains four educational assignments:

- `homework-1.html` and `homework-1.js` — interactive elliptic-curve multiplication on the toy curve y² = x³ + 7 (mod 17), with point trace, optional animation, and a small descriptive statistical interpretation.
- `homework-2.html` — sourced explanation of the mnemonic-to-Ethereum-address pipeline and the different purposes of its standards and primitives.
- `homework-3.html` — complete encryption and statistical cryptanalysis assignment, including both optional discussions and working alternative methods. Its scripts are `homework-3-core.js` (algorithms), `homework-3-data.js` (separate original training/test texts), and `homework-3.js` (interface).
- `homework-4.html` — interactive Bernoulli/Rademacher penetration-score experiment with multiple systems and attackers, empirical distributions, LLN checks, and CLT comparisons. Its scripts are `homework-4-core.js` (simulation) and `homework-4.js` (interface and charts).

The mod-17 curve and restricted secp256k1 key range are intentionally insecure teaching examples and must not be used to protect assets. The demos run in the browser; no mnemonic or real wallet secret is collected or processed. Homework 03 uses the browser's built-in Web Crypto API and no external JavaScript packages.

## Homework 3

Open `homework-3.html` through HTTPS or a localhost server so Web Crypto is available. The public page is [Homework 3](https://fidanmamedlii.github.io/statistics-homework-2026/homework-3.html).

- Same-message ECC hybrid and Caesar encryption/decryption, with key roles and statistical comparisons.
- Exhaustive Caesar candidates, corpus-based chi-square, and combined character bigram/trigram scoring.
- Reproducible length experiments using a separate test text; editable corpus, CSV preview and download, and explicit limits on interpreting the results.
- Exhaustive and baby-step giant-step recovery of either the receiver's private scalar or the temporary sender scalar.
- GCM tamper rejection, alternative attacks, full-size security discussion, and separation of restricted-key weaknesses from protocol/implementation issues.
- An on-page assignment coverage list maps every required and optional part to the corresponding section.

[HW3-REPORT.md](HW3-REPORT.md) records the method, default measured results, assignment coverage, and validation.

## Homework 4

The experiment treats `m` attackers as independent sample paths, each with one random score increment on each of `n` systems. Set a repeatable random seed to reproduce the paths. The Bernoulli model uses the chosen probability `p`; the Rademacher model is always symmetric. The interactive page reports the theoretical and measured moments of the total, per-system average, and square-root-scaled total, shows trajectories and histograms, checks LLN closeness and Chebyshev's bound, and overlays N(0,1) on correctly standardized histograms for both models. The group score `T` across all `mn` visits is reported separately so its scaling with m and n is clear.

The Bernoulli CLT requires centering by `np` before division by `sqrt(np(1-p))`. Its uncentered `S_n/sqrt(n)` drifts when `p>0`. The fair Rademacher model is already zero-mean, so `S_n/sqrt(n)` is the CLT quantity. The page states the independent/equal-probability model assumptions and their limits as a realistic cyber-risk forecast.

The page also runs a seeded increasing-n sweep up to the selected network size. Each attacker keeps a nested path as n increases; the line charts and table compare the variance of averages, the observed LLN closeness fraction, and Chebyshev's bound. [HW4-REPORT.md](HW4-REPORT.md) gives the formulas, assumptions, sample run, and coverage.

## Verification

Requires Node.js 20 or newer for the built-in Web Crypto API:

```sh
node --test tests/homework-3.test.cjs
node --test tests/homework-4.test.cjs
```

The browser smoke test additionally needs Playwright and an installed Google Chrome. It runs an isolated headless browser and a local static server:

```sh
node tests/browser-smoke.cjs
```

To run only the Homework 4 browser checks:

```sh
node tests/homework-4-browser-smoke.cjs
```

An absolute Playwright module directory can be passed as the first argument; a deployed page URL can be passed as the second. The browser test checks encryption, both searches, the temporary-key attack, tamper rejection, invalid input, all 26 Caesar candidates, HTML escaping, CSV export, and mobile layout. It saves verification artifacts in a sibling `hw3-verification` directory.
