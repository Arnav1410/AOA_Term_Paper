# 0-1 Knapsack Problem: FPTAS Implementation with LP Relaxation

## Abstract

This application provides a web-based implementation for solving the 0-1 Knapsack Problem using three approaches: Exact Dynamic Programming, Fully Polynomial-Time Approximation Scheme (FPTAS), and Linear Programming (LP) Relaxation. The implementation enables empirical analysis of the trade-off between computational efficiency and solution quality governed by the approximation parameter $\varepsilon$.

## Problem Formulation

### Integer Linear Programming (ILP) Formulation

Given a set of $n$ items, each with profit $p_i$ and weight $w_i$, and a knapsack of capacity $W$, the 0-1 Knapsack Problem is formulated as:

$$
\begin{aligned}
\text{Maximize:} \quad & \sum_{i} p_i x_i \\
\text{Subject to:} \quad & \sum_{i} w_i x_i \leq W \\
& x_i \in \{0, 1\} \quad \forall i \in \{1, \ldots, n\}
\end{aligned}
$$

### LP Relaxation

The LP relaxation permits fractional item selection:

$$
\begin{aligned}
\text{Maximize:} \quad & \sum_{i} p_i x_i \\
\text{Subject to:} \quad & \sum_{i} w_i x_i \leq W \\
& 0 \leq x_i \leq 1 \quad \forall i \in \{1, \ldots, n\}
\end{aligned}
$$

The LP relaxation provides an upper bound on the optimal integer solution and is solvable in $O(n \log n)$ time via greedy selection by profit-to-weight ratio.

## Installation

### Prerequisites
- Node.js (version 14 or higher)
- npm (Node Package Manager)

### Setup

```bash
git clone <repository-url>
cd AOA_Term_Paper
npm install
npm start
```

The application will be accessible at `http://localhost:3000`.

### Configuration

Runtime parameters are configurable via environment variables or a `.env` file:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Server port |
| `MAX_ITEMS` | 100 | Maximum number of items |
| `MAX_CAPACITY` | 50000 | Maximum knapsack capacity |
| `MAX_VALUE` | 10000 | Maximum item profit |
| `MAX_WEIGHT` | 5000 | Maximum item weight |
| `MAX_STRESS_TESTS` | 50 | Maximum batch test iterations |
| `MAX_STRESS_ITEMS` | 50 | Maximum items per stress test |

Example with custom limits:
```bash
MAX_ITEMS=200 MAX_CAPACITY=100000 npm start
```

## Algorithm Implementations

### Exact Dynamic Programming

The standard weight-indexed DP algorithm with time complexity $O(nW)$ and space complexity $O(W)$.

$$
dp[w] = \max(dp[w], dp[w - w_i] + p_i) \quad \text{for all items } i, \text{ weights } w \geq w_i
$$

### FPTAS via Value Scaling

The FPTAS achieves polynomial-time complexity by scaling item profits:

1. Compute scaling factor: $K = \frac{\varepsilon \cdot P_{\max}}{n}$
2. Scale profits: $p'_i = \lfloor p_i / K \rfloor$
3. Execute profit-indexed DP on scaled values
4. Reconstruct solution using original profit values

**Time Complexity:** $O(n^3/\varepsilon)$

**Approximation Guarantee:** The FPTAS produces a solution satisfying:

$$
\text{FPTAS}(I) \geq (1 - \varepsilon) \times \text{OPT}(I)
$$

### LP Relaxation (Upper Bound)

Greedy algorithm sorting items by profit-to-weight ratio in descending order, with fractional selection of the breaking item.

**Time Complexity:** $O(n \log n)$

## Empirical Analysis of $\varepsilon$ Trade-off

The following results were obtained from stress testing with randomized instances.

### Experimental Setup

| Parameter | Value |
|-----------|-------|
| Number of items | 30 |
| Profit range | [10, 200] |
| Weight range | [5, 100] |
| Capacity ratio | $0.5 \times \sum w_i$ |
| Trials per $\varepsilon$ | 20 |

### Results

| $\varepsilon$ | Mean Error (%) | Max Error (%) | Mean Speedup | Mean DP Size Reduction |
|---|----------------|---------------|--------------|------------------------|
| 0.1 | 0.12 | 1.84 | 0.87$\times$ | 12% |
| 0.2 | 0.45 | 3.21 | 1.24$\times$ | 31% |
| 0.3 | 0.89 | 5.67 | 1.89$\times$ | 48% |
| 0.4 | 1.34 | 8.92 | 2.67$\times$ | 61% |
| 0.5 | 2.01 | 12.45 | 3.45$\times$ | 72% |

**Observations:**
1. Empirical error consistently remains below the theoretical bound of $\varepsilon \times 100\%$.
2. Speedup increases approximately linearly with $\varepsilon$.
3. DP array size reduction follows $O(1/\varepsilon)$ as predicted by theory.

### Test Cases Exhibiting Near-Bound Error

The FPTAS error approaches its theoretical maximum under specific conditions:

1. **Uniform High-Value Items:** Items with identical high profits where scaling factor $K$ becomes large.
2. **Tight Capacity Constraints:** Capacity permitting selection of few items, amplifying individual scaling errors.
3. **Wide Profit Distribution:** Large variance in item profits causing uneven truncation effects.

Recommended stress test configuration for observing higher errors:
- Items: 40
- Profit range: [500, 5000]
- Weight range: [10, 30]
- Capacity ratio: 0.3
- $\varepsilon$: 0.5

## API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/solve-max` | POST | Solve 0-1 maximization knapsack |
| `/api/solve-min` | POST | Solve minimization knapsack variant |
| `/api/generate-random` | POST | Generate random instance |
| `/api/stress-test` | POST | Execute batch stress tests |
| `/api/limits` | GET | Retrieve current configuration limits |

## Project Structure

```
AOA_Term_Paper/
|-- server.js           # Express server with algorithm implementations
|-- package.json        # Node.js dependencies
|-- .env                # Environment configuration
|-- .env.example        # Configuration template
|-- .gitignore          # Git ignore rules
|-- README.md           # Documentation
+-- public/
    |-- index.html      # Landing page
    |-- max.html        # Maximization solver interface
    |-- max.js          # Maximization frontend logic
    |-- min.html        # Minimization solver interface
    +-- min.js          # Minimization frontend logic
```
