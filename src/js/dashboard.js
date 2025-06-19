document.addEventListener('DOMContentLoaded', function() {
    // Check if user is authenticated
    if (!auth.isUserLoggedIn()) {
        return; // Auth system will handle the redirect
    }

    // Initialize data manager
    dataManager.init();

    // Load dashboard data
    loadDashboardData();
});

function loadDashboardData() {
    const stats = dataManager.getDashboardStats();
    updateHeaderStats(stats);
    updateSummaryCards(stats);
    createExpensesChart();
    createMonthlyOverviewChart();
    updateFinalSummary(stats);
}

function updateHeaderStats(stats) {
    // Update current balance in header
    const currentBalance = stats.monthlyIncome - stats.monthlyExpenses;
    document.getElementById('current-balance').textContent = `${getCurrencySymbol()}${formatAmount(currentBalance)}`;
    
    // Color code the balance
    const balanceElement = document.getElementById('current-balance');
    if (currentBalance >= 0) {
        balanceElement.className = 'text-3xl font-bold text-green-300';
    } else {
        balanceElement.className = 'text-3xl font-bold text-red-300';
    }
}

function updateSummaryCards(stats) {
    // Calculate totals (all time, not just monthly)
    const allIncome = dataManager.getIncome().reduce((sum, item) => sum + parseFloat(item.amount), 0);
    const allExpenses = dataManager.getExpenses().reduce((sum, item) => sum + parseFloat(item.amount), 0);
    const savingsProgress = dataManager.getSavings().reduce((sum, goal) => sum + parseFloat(goal.savedAmount), 0);
    // Update currency icon in summary cards
    const incomeIcon = document.querySelector('#total-income').parentElement.previousElementSibling;
    const expensesIcon = document.querySelector('#total-expenses').parentElement.previousElementSibling;
    const savingsIcon = document.querySelector('#savings-progress').parentElement.previousElementSibling;
    if (incomeIcon) incomeIcon.innerHTML = `<span class='text-green-600 text-2xl font-bold'>${getCurrencySymbol()}</span>`;
    if (expensesIcon) expensesIcon.innerHTML = `<span class='text-red-600 text-2xl font-bold'>${getCurrencySymbol()}</span>`;
    if (savingsIcon) savingsIcon.innerHTML = `<span class='text-purple-600 text-2xl font-bold'>${getCurrencySymbol()}</span>`;
    document.getElementById('total-income').textContent = `${getCurrencySymbol()}${formatAmount(allIncome)}`;
    document.getElementById('total-expenses').textContent = `${getCurrencySymbol()}${formatAmount(allExpenses)}`;
    document.getElementById('savings-progress').textContent = `${getCurrencySymbol()}${formatAmount(savingsProgress)}`;
}

function updateFinalSummary(stats) {
    document.getElementById('monthly-income').textContent = `${getCurrencySymbol()}${formatAmount(stats.monthlyIncome)}`;
    document.getElementById('monthly-expenses').textContent = `${getCurrencySymbol()}${formatAmount(stats.monthlyExpenses)}`;
    
    const netBalance = stats.monthlyIncome - stats.monthlyExpenses;
    document.getElementById('net-balance').textContent = `${getCurrencySymbol()}${formatAmount(netBalance)}`;
    
    // Color code the net balance
    const netBalanceElement = document.getElementById('net-balance');
    if (netBalance >= 0) {
        netBalanceElement.className = 'text-2xl font-bold text-green-600';
    } else {
        netBalanceElement.className = 'text-2xl font-bold text-red-600';
    }
}

function createExpensesChart() {
    const expenses = dataManager.getExpenses();
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    // Filter for current month
    const monthlyExpenses = expenses.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate.getMonth() === currentMonth && itemDate.getFullYear() === currentYear;
    });

    // Group by category
    const categoryData = {};
    monthlyExpenses.forEach(expense => {
        const category = expense.category;
        const amount = parseFloat(expense.amount);
        categoryData[category] = (categoryData[category] || 0) + amount;
    });

    const labels = Object.keys(categoryData);
    const data = Object.values(categoryData);

    if (labels.length === 0) {
        document.getElementById('expenses-chart').parentElement.innerHTML = 
            '<p class="text-gray-500 text-center py-8">No expense data for this month</p>';
        return;
    }

    const ctx = document.getElementById('expenses-chart').getContext('2d');
    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: generateColors(labels.length),
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((context.parsed / total) * 100).toFixed(1);
                            return `${context.label}: ${getCurrencySymbol()}${context.parsed.toFixed(2)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function createMonthlyOverviewChart() {
    // Get data for the last 6 months
    const months = [];
    const incomeData = [];
    const expenseData = [];
    
    for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthName = date.toLocaleDateString('en-US', { month: 'short' });
        months.push(monthName);
        
        // Calculate income for this month
        const monthIncome = dataManager.getIncome()
            .filter(item => {
                const itemDate = new Date(item.date);
                return itemDate.getMonth() === date.getMonth() && itemDate.getFullYear() === date.getFullYear();
            })
            .reduce((sum, item) => sum + parseFloat(item.amount), 0);
        incomeData.push(monthIncome);
        
        // Calculate expenses for this month
        const monthExpenses = dataManager.getExpenses()
            .filter(item => {
                const itemDate = new Date(item.date);
                return itemDate.getMonth() === date.getMonth() && itemDate.getFullYear() === date.getFullYear();
            })
            .reduce((sum, item) => sum + parseFloat(item.amount), 0);
        expenseData.push(monthExpenses);
    }

    const ctx = document.getElementById('monthly-overview-chart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: months,
            datasets: [
                {
                    label: 'Income',
                    data: incomeData,
                    backgroundColor: '#10B981',
                    borderColor: '#059669',
                    borderWidth: 1
                },
                {
                    label: 'Expenses',
                    data: expenseData,
                    backgroundColor: '#EF4444',
                    borderColor: '#DC2626',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${getCurrencySymbol()}${context.parsed.y.toFixed(2)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return getCurrencySymbol() + value.toFixed(0);
                        }
                    }
                }
            }
        }
    });
}

function generateColors(count) {
    const colors = [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
        '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF6384',
        '#36A2EB', '#FFCE56', '#FF6384', '#C9CBCF', '#4BC0C0'
    ];
    return colors.slice(0, count);
}

function getCurrencySymbol() {
    if (typeof dataManager !== 'undefined') {
        const c = dataManager.getSetting('currency', 'USD');
        const map = {USD: '$', EUR: '€', GBP: '£', CAD: 'C$', AUD: 'A$', JPY: '¥', PHP: '₱', SGD: 'S$', CNY: '¥', KRW: '₩', INR: '₹'};
        return map[c] || '$';
    }
    return '$';
}

function formatAmount(amount) {
    return Number(amount).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

window.addEventListener('currencyChanged', () => {
  // Re-run all rendering functions that use currency
  renderDashboard();
});