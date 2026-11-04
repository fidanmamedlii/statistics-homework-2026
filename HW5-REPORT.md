# Homework 5 — Welford’s Recurrence and Sampling Estimates

## Exercise 1: derive the recurrence

For observations x₁, ..., xₙ₋₁, let the current mean be mean_old and define:

    M2_old = sum from i=1 to n−1 of (xᵢ − mean_old)²

When a new observation xₙ arrives, set:

    delta = xₙ − mean_old

The new mean is:

    mean_new = mean_old + delta/n

This is the online-mean recurrence: the new observation changes the old mean by its difference from that mean, divided by the updated sample count.

Now let delta2 = xₙ − mean_new. The updated sum of squared deviations is:

    M2_new = M2_old + delta × delta2

To see why, the deviations of the old observations from their old mean sum to zero. Shifting their reference from mean_old to mean_new, then adding the new observation’s squared deviation, simplifies to delta × delta2. This avoids subtracting two large, nearly equal sums of squares.

The three recurrence lines, with n already set to the new count, are:

    delta = x - mean
    mean += delta / n
    M2 += delta * (x - mean)

The final line deliberately uses the updated mean. The sample variance is s² = M2/(n−1) for n ≥ 2. Dividing by n instead gives the population variance of the observed values.

## Exercise 2: distribution choice

Each system score is sampled independently and uniformly from the eleven integers {0, 1, ..., 10}. Every score has probability 1/11.

The theoretical mean is:

    μ = (0 + 1 + ... + 10)/11 = 5

The theoretical variance is:

    σ² = sum of (x − 5)² / 11 = 110/11 = 10

For each hacker, the simulation streams n scores through Welford’s update and retains the sample mean and unbiased sample variance. It repeats this independently for m hackers. It then calculates the average of the m sample means and the average of the m sample variances.

## Expected results and interpretation

For independent scores from this distribution:

- The sample mean of one hacker has expected value μ = 5 and variance σ²/n = 10/n.
- The unbiased sample variance of one hacker has expected value σ² = 10.
- Therefore, across many hackers, the averages of the sample means and sample variances should approach 5 and 10, respectively. Finite simulation results fluctuate around those values.
- Increasing n makes both estimates less variable across hackers. For sample means, the theoretical standard deviation is √(10/n).

For an additional theoretical guide to the variance-estimate spread, the fourth central moment of the selected distribution is μ₄ = E[(X−5)⁴] = 178. The variance of an unbiased sample variance is:

    Var(s²) = [μ₄ − ((n−3)/(n−1)) × σ⁴] / n

for n ≥ 2. Since σ⁴ = 100, this becomes:

    Var(s²) = (78n + 122) / (n(n−1))

Its square root is the theoretical standard deviation of the individual hackers’ sample-variance estimates. It decreases toward zero as n grows. The simulation plots this theoretical spread alongside the observed spread.

| Systems per hacker n | SD of sample means, theory | SD of sample variances, theory |
|---:|---:|---:|
| 10 | 1.000 | 3.166 |
| 50 | 0.447 | 1.281 |
| 100 | 0.316 | 0.895 |
| 500 | 0.141 | 0.396 |

These are spreads among individual hackers’ estimates, not errors guaranteed for one run. The average across m hackers is steadier still: the standard error of the average sample mean is √(10/(mn)). The standard error of the average sample variance is the individual variance-estimate SD divided by √m.

## Why this matters for inferential statistics

In many studies, the full population cannot be measured. A researcher observes a sample and uses its sample mean and sample variance to estimate population properties. Comparing estimates across independent simulated samples shows that the estimates center on the theoretical values and become more stable as the sample size grows.

Welford’s recurrence is useful when observations arrive one at a time. It updates the mean and variance using a constant amount of memory, without storing every score. It is also numerically more stable than calculating variance as average(x²) − average(x)² when the values are large and their spread is small.

## Simulation details and limits

The page defaults to n = 100, m = 500, and a repeatable random seed. The seed makes the same run reproducible; changing it gives another sample. A sweep reports selected values of n up to the user’s chosen maximum. For a fair comparison, every shorter run is a prefix of the same hacker’s longer score path.

The model assumes independent scores from the same fixed distribution. It is an educational sampling experiment, not a claim that real intrusion scores follow a uniform distribution.
