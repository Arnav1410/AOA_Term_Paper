const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- MINIMUM KNAPSACK (Minimize Size to reach Target Profit) ---
function exactMinKnapsack(items, minProfit) {
    const INF = Number.MAX_SAFE_INTEGER;
    let dp = new Array(minProfit + 1).fill(INF);
    dp[0] = 0;
    for (const item of items) {
        for (let v = minProfit; v >= 0; v--) {
            let prev_v = Math.max(0, v - item.profit);
            if (dp[prev_v] !== INF) {
                dp[v] = Math.min(dp[v], dp[prev_v] + item.size);
            }
        }
    }
    return { result: dp[minProfit] === INF ? -1 : dp[minProfit], dpSize: minProfit + 1 };
}

function fptasMinKnapsack(items, minProfit, epsilon) {
    const n = items.length;
    if (n === 0) return { result: 0, dpSize: 0 };
    let max_p = Math.max(...items.map(i => i.profit));
    const K = (epsilon * max_p) / n;
    if (K <= 1.0) return exactMinKnapsack(items, minProfit);

    const scaled_items = items.map(item => ({
        profit: Math.floor(item.profit / K),
        size: item.size
    }));
    const scaled_min_profit = Math.ceil(minProfit / K);
    return exactMinKnapsack(scaled_items, scaled_min_profit);
}

function lpMinKnapsack(items, minProfit) {
    let sorted = [...items].sort((a, b) => (a.size / a.profit) - (b.size / b.profit));
    let totalSize = 0;
    let currentProfit = 0;

    for (let item of sorted) {
        if (currentProfit + item.profit <= minProfit) {
            currentProfit += item.profit;
            totalSize += item.size;
        } else {
            let remain = minProfit - currentProfit;
            totalSize += item.size * (remain / item.profit);
            currentProfit = minProfit;
            break;
        }
    }

    if (currentProfit < minProfit) {
        return -1; // -1 represents Infeasible
    }

    return parseFloat(totalSize.toFixed(2));
}

// --- 0-1 MAX KNAPSACK (Maximize Profit within Capacity) ---
function exactMaxKnapsack(items, capacity) {
    let dp = new Array(capacity + 1).fill(0);
    for (const item of items) {
        for (let w = capacity; w >= item.size; w--) {
            dp[w] = Math.max(dp[w], dp[w - item.size] + item.profit);
        }
    }
    return { result: dp[capacity], dpSize: capacity + 1 };
}

function fptasMaxKnapsack(items, capacity, epsilon) {
    const n = items.length;
    if (n === 0) return { result: 0, dpSize: 0 };
    let max_p = Math.max(...items.map(i => i.profit));
    if (max_p === 0) return { result: 0, dpSize: 0 };
    
    const K = (epsilon * max_p) / n;
    if (K <= 0) return exactMaxKnapsack(items, capacity);

    const scaled_items = items.map(item => ({
        profit: Math.floor(item.profit / K),
        size: item.size
    }));
    
    let max_scaled_p = scaled_items.reduce((sum, item) => sum + item.profit, 0);
    let dp = new Array(max_scaled_p + 1).fill(Number.MAX_SAFE_INTEGER);
    dp[0] = 0;

    for (const item of scaled_items) {
        for (let p = max_scaled_p; p >= item.profit; p--) {
            if (dp[p - item.profit] !== Number.MAX_SAFE_INTEGER) {
                dp[p] = Math.min(dp[p], dp[p - item.profit] + item.size);
            }
        }
    }

    let best_scaled_p = 0;
    for (let p = max_scaled_p; p >= 0; p--) {
        if (dp[p] <= capacity) {
            best_scaled_p = p;
            break;
        }
    }
    return { result: Math.floor(best_scaled_p * K), dpSize: max_scaled_p + 1 }; 
}

function lpMaxKnapsack(items, capacity) {
    // Sort items by Profit-to-Size ratio descending (most valuable per unit size)
    let sorted = [...items].sort((a, b) => (b.profit / b.size) - (a.profit / a.size));
    let totalProfit = 0;
    let currentWeight = 0;

    for (let item of sorted) {
        if (currentWeight + item.size <= capacity) {
            currentWeight += item.size;
            totalProfit += item.profit;
        } else {
            let remain = capacity - currentWeight;
            totalProfit += item.profit * (remain / item.size); // Take fractional profit
            break;
        }
    }
    return parseFloat(totalProfit.toFixed(2));
}

// --- API ENDPOINTS ---
app.post('/api/solve-min', (req, res) => {
    const { items, minProfit, epsilon } = req.body;
    
    const startExact = performance.now();
    const exactData = exactMinKnapsack(items, parseInt(minProfit));
    const endExact = performance.now();

    const startFptas = performance.now();
    const fptasData = fptasMinKnapsack(items, parseInt(minProfit), parseFloat(epsilon));
    const endFptas = performance.now();

    const startLp = performance.now();
    const lpResult = lpMinKnapsack(items, parseInt(minProfit));
    const endLp = performance.now();

    res.json({
        exactResult: exactData.result,
        fptasResult: fptasData.result,
        lpResult: lpResult,
        exactTime: (endExact - startExact).toFixed(4),
        fptasTime: (endFptas - startFptas).toFixed(4),
        lpTime: (endLp - startLp).toFixed(4),
        exactDpSize: exactData.dpSize,
        fptasDpSize: fptasData.dpSize
    });
});

app.post('/api/solve-max', (req, res) => {
    const { items, capacity, epsilon } = req.body;
    
    const startExact = performance.now();
    const exactData = exactMaxKnapsack(items, parseInt(capacity));
    const endExact = performance.now();

    const startFptas = performance.now();
    const fptasData = fptasMaxKnapsack(items, parseInt(capacity), parseFloat(epsilon));
    const endFptas = performance.now();

    const startLp = performance.now();
    const lpResult = lpMaxKnapsack(items, parseInt(capacity));
    const endLp = performance.now();

    res.json({
        exactResult: exactData.result,
        fptasResult: fptasData.result,
        lpResult: lpResult,
        exactTime: (endExact - startExact).toFixed(4),
        fptasTime: (endFptas - startFptas).toFixed(4),
        lpTime: (endLp - startLp).toFixed(4),
        exactDpSize: exactData.dpSize,
        fptasDpSize: fptasData.dpSize
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});