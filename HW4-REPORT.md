# Homework 4 — Penetration Scores as a Stochastic Process

## Model and interpretation

For one attacker, system i adds the random score increment X_i. For attacker j, the total after n systems is S_n^(j)=sum(i=1..n) X_i^(j). There are m independent simulated attackers, so the m final scores provide an empirical distribution. The interactive experiment also shows the first twelve running paths.

This operationally interprets “m attackers” as m independent sample trajectories, with each attacker taking one modeled step per system. Real attacks may share infrastructure, learn from one another, or choose systems selectively; the independent equal-distribution assumption is only a classroom model.

The app uses a fixed, user-visible seed to make each run reproducible. For each attacker, a deterministic pseudorandom stream is generated. In the increasing-n sweep, smaller trajectories are prefixes of longer trajectories. Both models use the same n and m; their random streams are separate.

## Expected values and variances

For independent, identically distributed increments with mean μ and variance σ²:

| Quantity | Mean | Variance |
|---|---:|---:|
| S_n | nμ | nσ² |
| S_n/n | μ | σ²/n |
| S_n/√n | μ√n | σ² |

In the Bernoulli model, X_i is 1 with probability p and 0 otherwise. Thus μ=p and σ²=p(1−p). The total is binomial(n,p). The average S_n/n approaches p, and its variance tends to zero. If p>0, the uncentered S_n/√n has a mean p√n that grows; it does not approach a fixed centered normal distribution. For 0<p<1 the CLT quantity is (S_n−np)/√(np(1−p)), which approaches N(0,1). At p=0 or p=1 the variance is zero, so this standardized quantity is undefined.

For a fair Rademacher model, X_i is −1 or +1 with equal probability. Thus μ=0 and σ²=1. The average has variance 1/n and converges in probability to 0. The total divided by √n has mean 0 and variance 1 and converges in distribution to N(0,1). For finite n, its possible values remain discrete, with the same even/odd parity as n.

## Law of Large Numbers

For ε>0, Chebyshev’s inequality gives:

P(|S_n/n−μ|≥ε) ≤ σ²/(nε²).

The page uses ε=0.1. It counts the fraction of attackers with |S_n/n−μ|<0.1 and shows the theoretical upper bound on the complementary probability. The bound is clipped at 1 (100%). At small n it can be uninformative; this does not contradict the LLN. Observed fractions also fluctuate, and they need not improve monotonically at every finite n.

## How m attackers affect the group total

If T is the sum across all m attackers and all n systems, then there are mn independent increments. E[T]=mnμ and Var(T)=mnσ². The pooled per-visit average T/(mn) has mean μ and variance σ²/(mn). Therefore more attackers give more observations and a steadier estimate of μ. The unscaled group total’s variance rises with m, even while the normalized pooled total T/√(mn) retains variance σ². m does not change an individual attacker’s score distribution.

## Reproducible example

The default run uses n=100, m=500, p=0.3, seed 20261028 for Bernoulli, and the next 32-bit seed for Rademacher. The increasing-size sweep uses 10, 25, 50, and 100 systems. These are sample observations, not universal guarantees.

| Model | n | Observed variance of average | Theoretical variance | Within 0.1 of mean | Chebyshev upper bound |
|---|---:|---:|---:|---:|---:|
| Bernoulli | 10 | 0.020102 | 0.021000 | 48.4% | 100% |
| Bernoulli | 25 | 0.007834 | 0.008400 | 75.2% | 84.0% |
| Bernoulli | 50 | 0.003892 | 0.004200 | 89.4% | 42.0% |
| Bernoulli | 100 | 0.001949 | 0.002100 | 97.2% | 21.0% |
| Rademacher | 10 | 0.098199 | 0.100000 | 23.4% | 100% |
| Rademacher | 25 | 0.035238 | 0.040000 | 35.2% | 100% |
| Rademacher | 50 | 0.019080 | 0.020000 | 54.8% | 100% |
| Rademacher | 100 | 0.009829 | 0.010000 | 64.0% | 100% |

In this run, the variances of the sample averages tracked the predicted 1/n scaling. The within-tolerance fractions rose over these four sizes, while Chebyshev’s bound remained conservative, particularly for Rademacher. Rerunning with another seed can change empirical values.

The standardized histograms use the same m=500 attacker outcomes and overlay the standard normal density. A finite sample can visibly differ, especially for smaller n; CLT describes the limit as n increases, not an exact finite-n identity.

## Cybersecurity context and limits

The score is an abstract tally of modeled penetration outcomes. For Bernoulli, each system visit either adds one success point or zero. For Rademacher, it adds one point or subtracts one, creating a symmetric zero-mean random walk. Increasing n changes the score path length; increasing m adds independent attackers/observations. The group-total table distinguishes increased total exposure from the stability of a pooled average.

This simulation does not estimate real-world breach probabilities or predict whether an attacker will compromise a system. Actual attacker behavior, system defenses, dependencies, and success rates are not independent and identical. The model isolates how repeated random increments behave under the LLN and CLT.

## Assignment coverage and checks

- Both increment models, multiple values of n, and a selectable m are simulated.
- The three requested quantities have theoretical and empirical distributions, means, and variances.
- Reproducible sample trajectories, histograms, and a sweep of increasing n are displayed.
- The LLN is checked with a convergence-in-probability criterion and Chebyshev upper bound.
- The Rademacher square-root-normalized sum is compared with N(0,1). Correct centering for Bernoulli is included to explain why S_n/√n itself does not have the claimed zero-mean limit.
- The n/m interpretation and model assumptions are explained in the page and this report.

Validation performed: eight Node test groups passed. A Chrome browser smoke test passed on desktop and a 390-pixel mobile viewport; the test checked both score models, all three score quantities, LLN/CLT displays, increasing-n sweep, reproducible reruns, degenerate p=0 handling, input limits, and absence of JavaScript errors.
