# Course Homework 6 — Statistical Independence

The page is the seventh site page because course Homework 1 has two separate pages. It is named `homework-7.html` and belongs in the spreadsheet's `HOMEWORK 6` column.

## What the interactive program does

The program accepts paired categorical observations `(X, F)` and constructs a two-way contingency table. It preserves category order from first appearance, counts each pair, computes row and column totals, and reports marginal and conditional frequencies. Three synthetic datasets demonstrate exact independence, a clear association, and a small sample with weak evidence. Users can also paste their own paired records into the browser; the page performs the analysis locally.

For observed count `Oᵢⱼ`, row total `Rᵢ`, column total `Cⱼ`, and total sample size `N`, it calculates

```text
Eᵢⱼ = Rᵢ Cⱼ / N
χ² = ΣᵢΣⱼ (Oᵢⱼ - Eᵢⱼ)² / Eᵢⱼ
df = (r - 1)(c - 1)
```

It also calculates the upper-tail p-value from the chi-square distribution using the regularized upper incomplete gamma function, plus Cramér's V as a descriptive effect size. The page warns when the common expected-count conditions for the chi-square approximation may be poor.

## Demonstration calculations

### Exact independent pattern

The department/MFA example has rows `(30, 20)`, `(24, 16)`, and `(18, 12)`. Each department has the same 60% MFA-on proportion. The column totals are 72 and 48, so independence predicts the same observed counts in every cell. Thus `χ² = 0`, `df = 2`, and `p = 1`.

### Phishing-training example

The invented data have 120 records: trained `(8 clicked, 52 did not click)` and untrained `(28 clicked, 32 did not click)`. The column totals are 36 and 84; both row totals are 60. Expected counts in each row are therefore 18 clicked and 42 non-clicked. The cell contributions are `5.5556`, `2.3810`, `5.5556`, and `2.3810`, giving `χ² ≈ 15.873` with `df = 1` and an upper-tail p-value of about `0.00007`. This is a strong association in this synthetic sample. It does not establish that training caused the difference.

### Small sample

The weak-evidence example has counts `(7, 23)` and `(11, 19)`. It illustrates that a non-significant result means the sample did not provide enough evidence to reject independence at the selected threshold; it does not prove independence.

## Interpretation

Statistical independence means `P(X=i, F=j) = P(X=i)P(F=j)` for every category pair. Equivalently, the conditional distribution of one variable is unchanged across the categories of the other. The test's null hypothesis is independence; the alternative is an association.

A small p-value indicates that a table at least this discrepant from the independence expectations would be unusual under the null model and test assumptions. It is not the probability that the null hypothesis is true, and statistical significance does not measure practical importance. Cramér's V provides a scale-free descriptive measure of association strength.

Association is not causation. A contingency table alone cannot eliminate confounding, reverse direction, selection effects, or other explanations. Causal conclusions require an appropriate design, such as random assignment where ethically and practically suitable, plus domain knowledge.

The chi-square approximation relies on independent observations and sufficiently large expected counts. This page warns if any expected count is below 1 or if more than 20% are below 5, following NIST's guidance. Sparse tables may need an exact procedure or a justified category redesign. Categories should not be merged merely to obtain a preferred p-value.

## References

- NIST/SEMATECH, [Chi-Square Independence Test](https://www.itl.nist.gov/div898/software/dataplot/refman1/auxillar/chistest.htm).
- SciPy, [`chi2_contingency`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.chi2_contingency.html).
- American Statistical Association, [Statement on Statistical Significance and P-Values](https://www.amstat.org/asa/files/pdfs/p-valuestatement.pdf).
- NIST/SEMATECH, [Association Does Not Imply Causality](https://www.itl.nist.gov/div898/handbook/eda/section3/eda33q.htm).
