# Course Homework 5 — Riemann/Lebesgue Integration and the Normal CDF

The assignment appears as the sixth page in this site because the first course homework has two separate pages (Exercises 1 and 2). The page is `homework-6.html`; it belongs in the course spreadsheet's `HOMEWORK 5` column.

## Exercise 1: numerical integration

### The two approximations

For an interval `[a,b]` divided into `N` equal pieces, the midpoint Riemann sum is

```text
Δx = (b-a)/N
R_N = Δx Σ f(a + (i + 1/2)Δx),   i = 0,...,N-1.
```

For the range-partition approximation, split a bounded output interval into `B` bands `I_k`. Let `c_k` be the midpoint of band `I_k`. Estimate the length of the preimage `f⁻¹(I_k)` by counting the x-midpoints whose outputs land in that band:

```text
L_(N,B) = Σ c_k · estimated_length(f⁻¹(I_k))
         = Δx Σ c_k · count_k.
```

This is a finite, Lebesgue-inspired simple-function approximation. It estimates preimage measures with midpoint counts; it does not calculate the exact measure of every preimage. For bounded functions, using the band midpoint introduces a pointwise height error of at most half a band width when the preimage measures are exact. The finite x-sample contributes an additional sampling error.

Both methods evaluate the function about `N` times, so midpoint Riemann costs `O(N)` and the range method costs `O(N+B)` with `B` output counts. Exact preimage measures can sometimes make a true Lebesgue simple-function calculation efficient, but estimating those measures numerically can be costly.

### Examples and reference integrals

| Function and interval | Reference integral | Mathematical note |
| --- | ---: | --- |
| `sin(x)`, `[0,π]` | `2` | Smooth and Riemann-integrable |
| `x²`, `[0,1]` | `1/3` | Smooth and Riemann-integrable |
| `1` for `x<0.5`, `3` otherwise | `2` | One jump; both definitions agree |
| `|x−0.5|`, `[0,1]` | `1/4` | Continuous with a corner |
| `1/√x`, `(0,1]` | `2` | Improper integral; unbounded but finite |
| `1` for `x<0.5`, `0` otherwise | `1/2` | One jump; both definitions agree |
| `sin(x)/x`, `[0,π]`, with `f(0)=1` | `Si(π) ≈ 1.85193705` | The value at zero is filled in by the continuous limit |
| Dirichlet: `1` on rationals, `0` on irrationals | Lebesgue integral `0` | Not Riemann-integrable |
| Thomae: `1/q` at reduced rational `p/q`, `0` on irrationals | `0` | Bounded and Riemann-integrable despite its rational discontinuities |

For bounded Riemann-integrable examples, the Riemann and range-partition estimates approach the same value as the x-samples become dense and the range bands become narrow. A fixed `B` leaves range quantization error even when `N` is very large. The interactive page lets the reader vary both `N` and `B` and see this distinction.

The `1/√x` range is unbounded. The page makes a finite, sample-dependent top band and groups all sampled tail values there. That is a practical illustration, not a uniform error guarantee; the range estimate can depend strongly on the chosen cap and number of bands. The midpoint rule avoids evaluating at the singular endpoint and converges to the improper integral.

### Pathological functions

Every nonempty interval contains rational and irrational numbers. Thus for the Dirichlet function, every interval has supremum `1` and infimum `0`; every Riemann upper sum is `1`, every lower sum is `0`, and the gap never closes. The rationals are countable and have measure zero, so the Lebesgue integral is `0`.

Every midpoint in the regular finite grid is rational. The page therefore evaluates the Dirichlet function as `1` at every sampled midpoint and prints a finite estimate of `1` for both sample-based algorithms. This is not the Lebesgue integral. It demonstrates that ordinary finite point samples cannot reliably detect a set of measure zero.

Thomae's function gives positive values at rational sample points too. However, the value `1/q` shrinks as the reduced denominator `q` grows. The sampled sums tend toward `0`, which is both its Riemann and Lebesgue integral. Its behavior differs from Dirichlet's because the rational spikes become small away from any finite collection of low-denominator rationals.

## Exercise 2: standard normal CDF

The standard normal density and cumulative distribution are

```text
φ(t) = (1/√(2π)) exp(−t²/2)
Φ(z) = ∫ from −∞ to z of φ(t) dt.
```

The computation uses symmetry, `Φ(−z)=1−Φ(z)`, and integrates only from `0` to `|z|` for the quadrature method.

### Implemented methods

1. **Composite Simpson's rule:** integrates the density from `0` to `|z|`. For `M` even panels, its cost is `O(M)` density evaluations. Increasing `M` generally decreases discretization error until floating-point rounding becomes relevant.
2. **Integrated power series:** integrating the Maclaurin series of `exp(−t²/2)` term by term gives

   ```text
   Φ(z) = 1/2 + (1/√(2π)) Σ from k=0 to ∞
          [ (−1)^k z^(2k+1) / (2^k k! (2k+1)) ].
   ```

   The code uses compensated summation and stops when the next term is tiny or a maximum term count is reached. It suppresses this direct series for `|z| > 4`, because large alternating terms then cancel enough to make the result unreliable.
3. **Abramowitz–Stegun erf approximation:** the page evaluates a fixed short approximation to `erf` and uses the exact relation `Φ(z)=½[1+erf(z/√2)]`. Its work per input is `O(1)` and the page compares its displayed values with the reference table.

### Web reference values

The NIST/SEMATECH Engineering Statistics Handbook provides the following standard-normal CDF values to five decimal places. The live page compares each method to these values; because the reference is rounded, differences smaller than its displayed precision should not be over-interpreted.

| `z` | NIST `Φ(z)` |
| ---: | ---: |
| `−3` | `0.00135` |
| `−2` | `0.02275` |
| `−1` | `0.15866` |
| `0` | `0.50000` |
| `1` | `0.84134` |
| `2` | `0.97725` |
| `3` | `0.99865` |

The browser benchmark times 3,000 repeated calls for each method at the same input. Results depend on browser, device, background load, and the chosen Simpson panel count. Complexity predicts the broad pattern: the fixed erf formula should be fastest, while Simpson's method gets slower as the panel count grows. Timing is supporting evidence, not an accuracy proof.

### Liouville's theorem and the error function

An elementary antiderivative of `exp(−x²)` does not exist. Liouville's theorem in differential algebra gives criteria for when an elementary integrand has an elementary antiderivative; applied to the Gaussian exponential, it rules out an elementary expression. A change of variables reduces the normal CDF antiderivative to this same Gaussian integral.

One short way to see the relevant obstruction is that an elementary primitive of `exp(−x²)` would require a rational `R(x)` with `R′−2xR=1`, since `(R exp(−x²))′=(R′−2xR)exp(−x²)`. A finite pole of `R` would create a stronger pole in `R′` that `−2xR` cannot cancel, so `R` would have to be a polynomial. For a nonzero polynomial, `−2xR` has degree one higher than `R′`; their sum cannot be the constant 1. Thus this required rational function does not exist. This is the Liouville-theorem obstruction, not a proof of the full theorem.

The special function `erf` names that exact integral:

```text
erf(u) = (2/√π) ∫ from 0 to u of exp(−t²) dt
Φ(z)   = 1/2 · [1 + erf(z/√2)].
```

The second equation is an exact analytical representation, although `erf` itself is not elementary. A decimal computer result still requires a numerical algorithm, a lookup table, or a library approximation. The page's three implementations show the trade-offs among numerical quadrature, a convergent series, and a short special-function approximation.

## References

- NIST/SEMATECH, [Cumulative Distribution Function of the Standard Normal Distribution](https://www.itl.nist.gov/div898/handbook/eda/section3/eda3671.htm).
- NIST Digital Library of Mathematical Functions, [§7.2 Definitions of erf and erfc](https://dlmf.nist.gov/7.2).
- Keith Conrad, Stanford, [Impossibility Theorems for Elementary Integration](https://math.stanford.edu/~conrad/papers/elemint.pdf).
- Hogg, McKean & Craig, [Section 3.4: The Normal Distribution](https://faculty.etsu.edu/gardnerr/4047/notes-Hogg-McKean-Craig/Hogg-McKean-Craig-3-4.pdf), supplied with the assignment.
- GNU Scientific Library, [Error function documentation](https://gsl.ampl.com/ref/erf.html), including references to Abramowitz & Stegun.
