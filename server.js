require('dotenv').config();
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Configurable limits via environment variables
const LIMITS = {
    maxItems: parseInt(process.env.MAX_ITEMS) || 100,
    maxCapacity: parseInt(process.env.MAX_CAPACITY) || 50000,
    maxValue: parseInt(process.env.MAX_VALUE) || 10000,
    maxWeight: parseInt(process.env.MAX_WEIGHT) || 5000,
    maxStressTests: parseInt(process.env.MAX_STRESS_TESTS) || 50,
    maxStressItems: parseInt(process.env.MAX_STRESS_ITEMS) || 50
};

console.log('Configured limits:', LIMITS);

app.use(express.json({ limit: '1mb' }));
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
    if (n === 0) return { result: 0, dpSize: 0, scalingFactor: 0 };
    let max_p = Math.max(...items.map(i => i.profit));
    if (max_p === 0) return { result: 0, dpSize: 0, scalingFactor: 0 };
    
    const K = (epsilon * max_p) / n;
    if (K <= 0) {
        const exactResult = exactMaxKnapsack(items, capacity);
        return { ...exactResult, scalingFactor: 0 };
    }

    const scaled_items = items.map((item, idx) => ({
        profit: Math.floor(item.profit / K),
        size: item.size,
        originalProfit: item.profit,
        idx: idx
    }));
    
    let max_scaled_p = scaled_items.reduce((sum, item) => sum + item.profit, 0);
    let dp = new Array(max_scaled_p + 1).fill(Number.MAX_SAFE_INTEGER);
    let parent = new Array(max_scaled_p + 1).fill(-1);
    dp[0] = 0;

    // Track which items are selected for each profit level
    let itemUsed = new Array(max_scaled_p + 1).fill(null).map(() => []);
    itemUsed[0] = [];

    for (let i = 0; i < scaled_items.length; i++) {
        const item = scaled_items[i];
        for (let p = max_scaled_p; p >= item.profit; p--) {
            if (dp[p - item.profit] !== Number.MAX_SAFE_INTEGER) {
                const newWeight = dp[p - item.profit] + item.size;
                if (newWeight < dp[p]) {
                    dp[p] = newWeight;
                    itemUsed[p] = [...itemUsed[p - item.profit], i];
                }
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
    
    // Calculate actual profit from selected items
    let actualProfit = 0;
    const selectedItems = itemUsed[best_scaled_p] || [];
    for (const idx of selectedItems) {
        actualProfit += scaled_items[idx].originalProfit;
    }
    
    return { 
        result: actualProfit, 
        dpSize: max_scaled_p + 1,
        scalingFactor: K,
        selectedCount: selectedItems.length
    }; 
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

    // Calculate approximation metrics
    const exactResult = exactData.result;
    const fptasResult = fptasData.result;
    const errorMargin = exactResult > 0 ? ((exactResult - fptasResult) / exactResult * 100) : 0;
    const speedup = parseFloat((endExact - startExact)) / Math.max(0.0001, parseFloat((endFptas - startFptas)));

    res.json({
        exactResult: exactResult,
        fptasResult: fptasResult,
        lpResult: lpResult,
        exactTime: (endExact - startExact).toFixed(4),
        fptasTime: (endFptas - startFptas).toFixed(4),
        lpTime: (endLp - startLp).toFixed(4),
        exactDpSize: exactData.dpSize,
        fptasDpSize: fptasData.dpSize,
        errorMargin: errorMargin.toFixed(2),
        speedup: speedup.toFixed(2),
        scalingFactor: fptasData.scalingFactor ? fptasData.scalingFactor.toFixed(4) : '0',
        theoreticalMaxError: (parseFloat(epsilon) * 100).toFixed(1)
    });
});

// --- Random Test Case Generator API ---
app.post('/api/generate-random', (req, res) => {
    const { numItems, minValue, maxValue, minWeight, maxWeight, capacityRatio } = req.body;
    
    const items = [];
    let totalWeight = 0;
    
    for (let i = 1; i <= numItems; i++) {
        const profit = Math.floor(Math.random() * (maxValue - minValue + 1)) + minValue;
        const size = Math.floor(Math.random() * (maxWeight - minWeight + 1)) + minWeight;
        items.push({ id: i, profit, size });
        totalWeight += size;
    }
    
    // Capacity is a fraction of total weight
    const capacity = Math.floor(totalWeight * capacityRatio);
    
    res.json({ items, capacity });
});

// --- Batch Stress Test API ---
app.post('/api/stress-test', (req, res) => {
    const { numTests, numItems, minValue, maxValue, minWeight, maxWeight, capacityRatio, epsilon } = req.body;
    
    const results = [];
    let totalError = 0;
    let maxError = 0;
    let totalSpeedup = 0;
    let exactTotalTime = 0;
    let fptasTotalTime = 0;
    
    for (let t = 0; t < numTests; t++) {
        // Generate random items
        const items = [];
        let totalWeight = 0;
        
        for (let i = 1; i <= numItems; i++) {
            const profit = Math.floor(Math.random() * (maxValue - minValue + 1)) + minValue;
            const size = Math.floor(Math.random() * (maxWeight - minWeight + 1)) + minWeight;
            items.push({ id: i, profit, size });
            totalWeight += size;
        }
        
        const capacity = Math.floor(totalWeight * capacityRatio);
        
        // Run algorithms
        const startExact = performance.now();
        const exactData = exactMaxKnapsack(items, capacity);
        const endExact = performance.now();
        
        const startFptas = performance.now();
        const fptasData = fptasMaxKnapsack(items, capacity, epsilon);
        const endFptas = performance.now();
        
        const exactTime = endExact - startExact;
        const fptasTime = endFptas - startFptas;
        
        const error = exactData.result > 0 ? 
            ((exactData.result - fptasData.result) / exactData.result * 100) : 0;
        const speedup = exactTime / Math.max(0.0001, fptasTime);
        
        totalError += error;
        maxError = Math.max(maxError, error);
        totalSpeedup += speedup;
        exactTotalTime += exactTime;
        fptasTotalTime += fptasTime;
        
        results.push({
            testNum: t + 1,
            exactResult: exactData.result,
            fptasResult: fptasData.result,
            exactTime: exactTime.toFixed(4),
            fptasTime: fptasTime.toFixed(4),
            error: error.toFixed(2),
            speedup: speedup.toFixed(2),
            exactDpSize: exactData.dpSize,
            fptasDpSize: fptasData.dpSize
        });
    }
    
    res.json({
        results,
        summary: {
            avgError: (totalError / numTests).toFixed(2),
            maxError: maxError.toFixed(2),
            avgSpeedup: (totalSpeedup / numTests).toFixed(2),
            totalExactTime: exactTotalTime.toFixed(2),
            totalFptasTime: fptasTotalTime.toFixed(2),
            theoreticalMaxError: (epsilon * 100).toFixed(1)
        }
    });
});

// API endpoint to get current limits (for frontend)
app.get('/api/limits', (req, res) => {
    res.json(LIMITS);
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});