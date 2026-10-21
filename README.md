# Cryptography & Statistics Homework

This buildless static site contains three educational assignments:

- `homework-1.html` and `homework-1.js` — interactive elliptic-curve multiplication on the toy curve y² = x³ + 7 (mod 17), with point trace, optional animation, and a small descriptive statistical interpretation.
- `homework-2.html` — sourced explanation of the mnemonic-to-Ethereum-address pipeline and the different purposes of its standards and primitives.
- `homework-3.html` and `homework-3.js` — interactive secp256k1 ECDH + AES-GCM teaching demo, Caesar cipher, corpus-based chi-square attack, and a brute-force demonstration against a deliberately restricted ECC private-key range.

The mod-17 curve and restricted secp256k1 key range are intentionally insecure teaching examples and must not be used to protect assets. The demos run in the browser; no mnemonic or real wallet secret is collected or processed. Homework 03 uses the browser's built-in Web Crypto API and no external JavaScript packages.
