// Limits fetched from server (with defaults)
let LIMITS = {
    maxItems: 100,
    maxCapacity: 50000,
    maxValue: 10000,
    maxWeight: 5000,
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
        'randMaxValue': `Max Value (≤${LIMITS.maxValue})`,
        'randMaxWeight': `Max Weight (≤${LIMITS.maxWeight})`,
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

function clearItems() {
    items = [];
    nextId = 1;
    renderItems();
}

async function solveKnapsack() {
    const capacity = parseInt(document.getElementById('capacity').value);
    const epsilon = parseFloat(document.getElementById('epsilon').value);

    // Validate inputs
    if (capacity > LIMITS.maxCapacity) {
        alert(`Capacity must be ≤ ${LIMITS.maxCapacity} for reasonable computation.`);
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
        const response = await fetch('/api/solve-max', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items, capacity, epsilon })
        });

        const data = await response.json();
        
        document.getElementById('resExact').innerText = data.exactResult;
        document.getElementById('resFptas').innerText = data.fptasResult;
        document.getElementById('resLp').innerText = data.lpResult;

        document.getElementById('timeExact').innerText = data.exactTime;
        document.getElementById('dpExact').innerText = data.exactDpSize;
        document.getElementById('timeFptas').innerText = data.fptasTime;
        document.getElementById('dpFptas').innerText = data.fptasDpSize;
        document.getElementById('timeLp').innerText = data.lpTime;

        // Update approximation analysis
        document.getElementById('errorMargin').innerText = data.errorMargin;
        document.getElementById('theoreticalError').innerText = data.theoreticalMaxError;
        document.getElementById('speedup').innerText = data.speedup;
        document.getElementById('scalingK').innerText = data.scalingFactor;

        updateChart(data.exactResult, data.fptasResult, data.lpResult);

    } catch (error) {
        console.error('Error fetching solution:', error);
        alert('Failed to calculate. Check console for details.');
    }
}

function updateChart(exact, fptas, lp) {
    const ctx = document.getElementById('comparisonChart').getContext('2d');
    
    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Exact DP', 'FPTAS Approximation', 'LP (Fractional Bound)'],
            datasets: [{
                label: 'Maximum Profit Achieved',
                data: [exact, fptas, lp],
                backgroundColor: [
                    'rgba(107, 114, 128, 0.6)', 
                    'rgba(34, 197, 94, 0.6)',   
                    'rgba(168, 85, 247, 0.6)'   
                ],
                borderColor: [
                    'rgb(75, 85, 99)',
                    'rgb(21, 128, 61)',
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
    const minValue = parseInt(document.getElementById('randMinValue').value);
    const maxValue = parseInt(document.getElementById('randMaxValue').value);
    const minWeight = parseInt(document.getElementById('randMinWeight').value);
    const maxWeight = parseInt(document.getElementById('randMaxWeight').value);
    const capacityRatio = parseFloat(document.getElementById('randCapRatio').value);

    // Validate inputs
    if (numItems < 1 || numItems > LIMITS.maxItems) {
        alert(`Number of items must be between 1 and ${LIMITS.maxItems}.`);
        return;
    }
    if (maxValue > LIMITS.maxValue || minValue < 1) {
        alert(`Values must be between 1 and ${LIMITS.maxValue}.`);
        return;
    }
    if (maxWeight > LIMITS.maxWeight || minWeight < 1) {
        alert(`Weights must be between 1 and ${LIMITS.maxWeight}.`);
        return;
    }
    if (minValue > maxValue || minWeight > maxWeight) {
        alert('Min values must be ≤ max values.');
        return;
    }

    try {
        const response = await fetch('/api/generate-random', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ numItems, minValue, maxValue, minWeight, maxWeight, capacityRatio })
        });

        const data = await response.json();
        
        items = data.items;
        nextId = items.length + 1;
        document.getElementById('capacity').value = data.capacity;
        
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
    const minValue = parseInt(document.getElementById('stressMinValue').value);
    const maxValue = parseInt(document.getElementById('stressMaxValue').value);
    const minWeight = parseInt(document.getElementById('stressMinWeight').value);
    const maxWeight = parseInt(document.getElementById('stressMaxWeight').value);
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
    if (maxValue > LIMITS.maxValue || minValue < 1) {
        alert(`Values must be between 1 and ${LIMITS.maxValue}.`);
        return;
    }
    if (maxWeight > LIMITS.maxWeight || minWeight < 1) {
        alert(`Weights must be between 1 and ${LIMITS.maxWeight}.`);
        return;
    }
    if (epsilon < 0.01 || epsilon > 1) {
        alert('Epsilon must be between 0.01 and 1.');
        return;
    }

    btn.disabled = true;
    btn.innerText = 'Running...';

    try {
        const response = await fetch('/api/stress-test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                numTests, numItems, minValue, maxValue, minWeight, maxWeight, 
                capacityRatio: 0.5, epsilon 
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
                <td class="p-2 border text-center">${r.exactResult}</td>
                <td class="p-2 border text-center">${r.fptasResult}</td>
                <td class="p-2 border text-center font-bold">${r.error}%</td>
                <td class="p-2 border text-center">${r.speedup}x</td>
                <td class="p-2 border text-center">${r.exactDpSize}</td>
                <td class="p-2 border text-center">${r.fptasDpSize}</td>
            </tr>`;
            tbody.innerHTML += row;
        });
        
    } catch (error) {
        console.error('Error running stress test:', error);
        alert('Failed to run stress test.');
    } finally {
        btn.disabled = false;
        btn.innerText = 'Run Stress Test';
    }
}

renderItems();
fetchLimits();
setTimeout(solveKnapsack, 500);