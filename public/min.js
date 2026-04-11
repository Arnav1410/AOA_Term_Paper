// Limits fetched from server (with defaults)
let LIMITS = {
    maxItems: 100,
    maxProfit: 10000,
    maxSize: 5000,
    maxStressTests: 50,
    maxStressItems: 50
};

// Fetch limits from server on load
async function fetchLimits() {
    try {
        const response = await fetch('/api/limits');
        LIMITS = await response.json();
        console.log('Loaded limits:', LIMITS);
        updateLimitLabels();
    } catch (e) {
        console.warn('Using default limits');
    }
}

function updateLimitLabels() {
    // Update HTML labels with actual limits
    const labels = {
        'randNumItems': `Items (max ${LIMITS.maxItems})`,
        'randMaxProfit': `Max Profit (≤${LIMITS.maxProfit})`,
        'randMaxSize': `Max Size (≤${LIMITS.maxSize})`,
        'stressNumTests': `Tests (max ${LIMITS.maxStressTests})`,
        'stressNumItems': `Items (max ${LIMITS.maxStressItems})`
    };
    for (const [id, text] of Object.entries(labels)) {
        const input = document.getElementById(id);
        if (input && input.previousElementSibling) {
            input.previousElementSibling.textContent = text;
        }
    }
}

let items = [
    { id: 1, profit: 40, size: 20 },
    { id: 2, profit: 50, size: 30 },
    { id: 3, profit: 100, size: 50 },
    { id: 4, profit: 95, size: 40 },
    { id: 5, profit: 30, size: 10 }
];

let nextId = 6;
let chartInstance = null;

// Chart instances for stress test graphs
let errorTrendChart = null;
let speedupTrendChart = null;
let dpSizeChart = null;
let timeComparisonChart = null;

function renderItems() {
    const list = document.getElementById('itemsList');
    list.innerHTML = '';
    
    items.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'flex gap-2 items-center bg-gray-50 p-2 rounded border';
        div.innerHTML = `
            <span class="text-sm font-bold w-6 text-gray-500">#${item.id}</span>
            <input type="number" value="${item.profit}" onchange="updateItem(${index}, 'profit', this.value)" class="p-1 border rounded w-full" placeholder="Profit">
            <input type="number" value="${item.size}" onchange="updateItem(${index}, 'size', this.value)" class="p-1 border rounded w-full" placeholder="Size">
            <button onclick="removeItem(${index})" class="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 text-xs font-bold">X</button>
        `;
        list.appendChild(div);
    });
}

function addItem() {
    if (items.length >= LIMITS.maxItems) {
        alert(`Maximum ${LIMITS.maxItems} items allowed.`);
        return;
    }
    items.push({ id: nextId++, profit: 10, size: 10 });
    renderItems();
}

function removeItem(index) {
    items.splice(index, 1);
    renderItems();
}

function updateItem(index, field, value) {
    items[index][field] = parseInt(value);
}

async function solveKnapsack() {
    const minProfit = parseInt(document.getElementById('minProfit').value);
    const epsilon = parseFloat(document.getElementById('epsilon').value);

    // Validate inputs
    if (minProfit > LIMITS.maxProfit) {
        alert(`Min profit must be ≤ ${LIMITS.maxProfit} for reasonable computation.`);
        return;
    }
    if (epsilon < 0.01 || epsilon > 1) {
        alert('Epsilon must be between 0.01 and 1.');
        return;
    }
    if (items.length === 0) {
        alert('Add at least one item.');
        return;
    }

    try {
        const response = await fetch('/api/solve-min', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items, minProfit, epsilon })
        });

        const data = await response.json();
        
        document.getElementById('resExact').innerText = data.exactResult === -1 ? "Infeasible" : data.exactResult;
        document.getElementById('resFptas').innerText = data.fptasResult === -1 ? "Infeasible" : data.fptasResult;
        document.getElementById('resLp').innerText = data.lpResult === -1 ? "Infeasible" : data.lpResult;

        document.getElementById('timeExact').innerText = data.exactTime;
        document.getElementById('dpExact').innerText = data.exactDpSize;
        document.getElementById('timeFptas').innerText = data.fptasTime;
        document.getElementById('dpFptas').innerText = data.fptasDpSize;
        document.getElementById('timeLp').innerText = data.lpTime;

        updateChart(data.exactResult, data.fptasResult, data.lpResult);

    } catch (error) {
        console.error('Error fetching solution:', error);
        alert('Failed to calculate. Check console for details.');
    }
}

function updateChart(exact, fptas, lp) {
    const ctx = document.getElementById('comparisonChart').getContext('2d');
    
    const exactData = exact === -1 ? 0 : exact;
    const fptasData = fptas === -1 ? 0 : fptas;
    const lpData = lp === -1 ? 0 : lp;

    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Exact DP', 'FPTAS Approximation', 'LP (Fractional Bound)'],
            datasets: [{
                label: 'Minimum Size Required',
                data: [exactData, fptasData, lpData],
                backgroundColor: [
                    'rgba(107, 114, 128, 0.6)', 
                    'rgba(59, 130, 246, 0.6)',   
                    'rgba(168, 85, 247, 0.6)'    
                ],
                borderColor: [
                    'rgb(75, 85, 99)',
                    'rgb(37, 99, 235)',
                    'rgb(126, 34, 206)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true } }
        }
    });
}

// Random Test Generator
async function generateRandom() {
    const numItems = parseInt(document.getElementById('randNumItems').value);
    const minProfit = parseInt(document.getElementById('randMinProfit').value);
    const maxProfit = parseInt(document.getElementById('randMaxProfit').value);
    const minSize = parseInt(document.getElementById('randMinSize').value);
    const maxSize = parseInt(document.getElementById('randMaxSize').value);
    const minProfitTarget = parseInt(document.getElementById('randMinProfitTarget').value);
    const epsilon = parseFloat(document.getElementById('randEpsilon').value);

    // Validate inputs
    if (numItems < 1 || numItems > LIMITS.maxItems) {
        alert(`Number of items must be between 1 and ${LIMITS.maxItems}.`);
        return;
    }
    if (maxProfit > LIMITS.maxProfit || minProfit < 1) {
        alert(`Profits must be between 1 and ${LIMITS.maxProfit}.`);
        return;
    }
    if (maxSize > LIMITS.maxSize || minSize < 1) {
        alert(`Sizes must be between 1 and ${LIMITS.maxSize}.`);
        return;
    }
    if (minProfit > maxProfit || minSize > maxSize) {
        alert('Min values must be ≤ max values.');
        return;
    }
    if (minProfitTarget < 1 || minProfitTarget > 100000) {
        alert('Min profit target must be between 1 and 100000.');
        return;
    }
    if (epsilon < 0.01 || epsilon > 1) {
        alert('Epsilon must be between 0.01 and 1.');
        return;
    }

    try {
        const response = await fetch('/api/generate-random-min', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ numItems, minProfit, maxProfit, minSize, maxSize, minProfitTarget })
        });

        const data = await response.json();
        
        items = data.items;
        nextId = items.length + 1;
        document.getElementById('minProfit').value = data.minProfitTarget;
        document.getElementById('epsilon').value = epsilon;
        
        renderItems();
        solveKnapsack();
        
    } catch (error) {
        console.error('Error generating random test:', error);
        alert('Failed to generate random test case.');
    }
}

// Batch Stress Test
async function runStressTest() {
    const btn = document.getElementById('stressBtn');
    
    const numTests = parseInt(document.getElementById('stressNumTests').value);
    const numItems = parseInt(document.getElementById('stressNumItems').value);
    const minProfit = parseInt(document.getElementById('stressMinProfit').value);
    const maxProfit = parseInt(document.getElementById('stressMaxProfit').value);
    const minSize = parseInt(document.getElementById('stressMinSize').value);
    const maxSize = parseInt(document.getElementById('stressMaxSize').value);
    const minProfitTarget = parseInt(document.getElementById('stressMinProfitTarget').value);
    const epsilon = parseFloat(document.getElementById('stressEpsilon').value);

    // Validate inputs
    if (numTests < 1 || numTests > LIMITS.maxStressTests) {
        alert(`Number of tests must be between 1 and ${LIMITS.maxStressTests}.`);
        return;
    }
    if (numItems < 1 || numItems > LIMITS.maxStressItems) {
        alert(`Items per test must be between 1 and ${LIMITS.maxStressItems}.`);
        return;
    }
    if (maxProfit > LIMITS.maxProfit || minProfit < 1) {
        alert(`Profits must be between 1 and ${LIMITS.maxProfit}.`);
        return;
    }
    if (maxSize > LIMITS.maxSize || minSize < 1) {
        alert(`Sizes must be between 1 and ${LIMITS.maxSize}.`);
        return;
    }
    if (minProfitTarget < 1 || minProfitTarget > 100000) {
        alert('Min profit target must be between 1 and 100000.');
        return;
    }
    if (epsilon < 0.01 || epsilon > 1) {
        alert('Epsilon must be between 0.01 and 1.');
        return;
    }

    btn.disabled = true;
    btn.innerText = 'Running...';

    try {
        const response = await fetch('/api/stress-test-min', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                numTests, numItems, minProfit, maxProfit, minSize, maxSize, 
                minProfitTarget, epsilon 
            })
        });

        const data = await response.json();
        
        // Show results section
        document.getElementById('stressResults').classList.remove('hidden');
        
        // Update summary
        document.getElementById('stressAvgError').innerText = data.summary.avgError + '%';
        document.getElementById('stressMaxError').innerText = data.summary.maxError + '%';
        document.getElementById('stressAvgSpeedup').innerText = data.summary.avgSpeedup + 'x';
        document.getElementById('stressTotalExact').innerText = data.summary.totalExactTime + ' ms';
        document.getElementById('stressTotalFptas').innerText = data.summary.totalFptasTime + ' ms';
        document.getElementById('stressTheoreticalMax').innerText = data.summary.theoreticalMaxError;
        
        // Populate table
        const tbody = document.getElementById('stressTable');
        tbody.innerHTML = '';
        
        data.results.forEach(r => {
            const errorClass = parseFloat(r.error) > parseFloat(data.summary.theoreticalMaxError) ? 
                'bg-red-100' : '';
            const row = `<tr class="${errorClass}">
                <td class="p-2 border text-center">${r.testNum}</td>
                <td class="p-2 border text-center">${r.exactResult === -1 ? "Inf" : r.exactResult}</td>
                <td class="p-2 border text-center">${r.fptasResult === -1 ? "Inf" : r.fptasResult}</td>
                <td class="p-2 border text-center font-bold">${r.error}%</td>
                <td class="p-2 border text-center">${r.speedup}x</td>
                <td class="p-2 border text-center">${r.exactDpSize}</td>
                <td class="p-2 border text-center">${r.fptasDpSize}</td>
            </tr>`;
            tbody.innerHTML += row;
        });
        
        // Update graphs
        updateStressTestGraphs(data);
        
    } catch (error) {
        console.error('Error running stress test:', error);
        alert('Failed to run stress test.');
    } finally {
        btn.disabled = false;
        btn.innerText = 'Run Stress Test';
    }
}

// Function to update all stress test graphs
function updateStressTestGraphs(data) {
    const graphsSection = document.getElementById('stressGraphs');
    if (graphsSection) {
        graphsSection.classList.remove('hidden');
    }

    // Prepare data
    const testNumbers = data.results.map(r => `Test ${r.testNum}`);
    const errors = data.results.map(r => parseFloat(r.error));
    const speedups = data.results.map(r => parseFloat(r.speedup));
    const exactDpSizes = data.results.map(r => r.exactDpSize);
    const fptasDpSizes = data.results.map(r => r.fptasDpSize);
    const exactTimes = data.results.map(r => parseFloat(r.exactTime));
    const fptasTimes = data.results.map(r => parseFloat(r.fptasTime));
    const theoreticalMax = parseFloat(data.summary.theoreticalMaxError);

    // Error Trend Chart
    updateErrorTrendChart(testNumbers, errors, theoreticalMax);

    // Speedup Trend Chart
    updateSpeedupTrendChart(testNumbers, speedups);

    // DP Size Chart
    updateDpSizeChart(testNumbers, exactDpSizes, fptasDpSizes);

    // Time Comparison Chart
    updateTimeComparisonChart(testNumbers, exactTimes, fptasTimes);
}

// Error Trend Chart
function updateErrorTrendChart(testNumbers, errors, theoreticalMax) {
    const ctx = document.getElementById('errorTrendChart').getContext('2d');
    
    if (errorTrendChart) errorTrendChart.destroy();

    errorTrendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: testNumbers,
            datasets: [
                {
                    label: 'Actual Error %',
                    data: errors,
                    borderColor: 'rgb(239, 68, 68)',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 3,
                    pointBackgroundColor: 'rgb(239, 68, 68)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                },
                {
                    label: 'Theoretical Max (%)',
                    data: new Array(errors.length).fill(theoreticalMax),
                    borderColor: 'rgb(249, 115, 22)',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    fill: false,
                    tension: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Error (%)'
                    }
                }
            }
        }
    });
}

// Speedup Trend Chart
function updateSpeedupTrendChart(testNumbers, speedups) {
    const ctx = document.getElementById('speedupTrendChart').getContext('2d');
    
    if (speedupTrendChart) speedupTrendChart.destroy();

    speedupTrendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: testNumbers,
            datasets: [
                {
                    label: 'Speedup (×)',
                    data: speedups,
                    borderColor: 'rgb(34, 197, 94)',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 3,
                    pointBackgroundColor: 'rgb(34, 197, 94)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Speedup (×)'
                    }
                }
            }
        }
    });
}

// DP Size Comparison Chart
function updateDpSizeChart(testNumbers, exactDpSizes, fptasDpSizes) {
    const ctx = document.getElementById('dpSizeChart').getContext('2d');
    
    if (dpSizeChart) dpSizeChart.destroy();

    dpSizeChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: testNumbers,
            datasets: [
                {
                    label: 'Exact DP Size',
                    data: exactDpSizes,
                    borderColor: 'rgb(107, 114, 128)',
                    backgroundColor: 'rgba(107, 114, 128, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 3,
                    pointBackgroundColor: 'rgb(107, 114, 128)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                },
                {
                    label: 'FPTAS DP Size',
                    data: fptasDpSizes,
                    borderColor: 'rgb(34, 197, 94)',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 3,
                    pointBackgroundColor: 'rgb(34, 197, 94)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Array Size'
                    }
                }
            }
        }
    });
}

// Execution Time Comparison Chart
function updateTimeComparisonChart(testNumbers, exactTimes, fptasTimes) {
    const ctx = document.getElementById('timeComparisonChart').getContext('2d');
    
    if (timeComparisonChart) timeComparisonChart.destroy();

    timeComparisonChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: testNumbers,
            datasets: [
                {
                    label: 'Exact DP Time (ms)',
                    data: exactTimes,
                    borderColor: 'rgb(107, 114, 128)',
                    backgroundColor: 'rgba(107, 114, 128, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 3,
                    pointBackgroundColor: 'rgb(107, 114, 128)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                },
                {
                    label: 'FPTAS Time (ms)',
                    data: fptasTimes,
                    borderColor: 'rgb(34, 197, 94)',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 3,
                    pointBackgroundColor: 'rgb(34, 197, 94)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Time (ms)'
                    }
                }
            }
        }
    });
}

renderItems();
fetchLimits();
setTimeout(solveKnapsack, 500);