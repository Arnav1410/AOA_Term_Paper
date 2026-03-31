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
    const capacity = document.getElementById('capacity').value;
    const epsilon = document.getElementById('epsilon').value;

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

renderItems();
setTimeout(solveKnapsack, 500);