document.addEventListener('DOMContentLoaded', async function() {
    if (!auth.isUserLoggedIn()) {
        return;
    }

    dataManager.init();
    await loadDashboardData();
});

async function loadDashboardData() {
    const [stats, income, expenses, savings] = await Promise.all([
        dataManager.getDashboardStats(),
        dataManager.getIncome(),
        dataManager.getExpenses(),
        dataManager.getSavings()
    ]);

    updateHeaderStats(stats);
    updateSummaryCards(income, expenses, savings);
    createExpensesChart(expenses);
    createMonthlyOverviewChart(income, expenses, savings);
    updateFinalSummary(stats);
}

function updateHeaderStats(stats) {
    const currentBalance = stats.spendableBalance;
    document.getElementById('current-balance').textContent = `${getCurrencySymbol()}${formatAmount(currentBalance)}`;

    const balanceElement = document.getElementById('current-balance');
    balanceElement.className = currentBalance >= 0 ? 'display-title text-4xl text-emerald-200' : 'display-title text-4xl text-rose-200';
}

function updateSummaryCards(income, expenses, savings) {
    const allIncome = income.reduce((sum, item) => sum + parseFloat(item.amount), 0);
    const allExpenses = expenses.reduce((sum, item) => sum + parseFloat(item.amount), 0);
    const totalSaved = savings.reduce((sum, goal) => sum + parseFloat(goal.savedAmount), 0);

    document.getElementById('total-income').textContent = `${getCurrencySymbol()}${formatAmount(allIncome)}`;
    document.getElementById('total-expenses').textContent = `${getCurrencySymbol()}${formatAmount(allExpenses)}`;
    document.getElementById('savings-progress').textContent = `${getCurrencySymbol()}${formatAmount(totalSaved)}`;
}

function updateFinalSummary(stats) {
    document.getElementById('monthly-income').textContent = `${getCurrencySymbol()}${formatAmount(stats.monthlyIncome)}`;
    document.getElementById('monthly-expenses').textContent = `${getCurrencySymbol()}${formatAmount(stats.monthlyExpenses)}`;
    document.getElementById('total-saved-summary').textContent = `${getCurrencySymbol()}${formatAmount(stats.monthlySavings)}`;
    document.getElementById('net-balance').textContent = `${getCurrencySymbol()}${formatAmount(stats.monthlySpendableBalance)}`;

    const netBalanceElement = document.getElementById('net-balance');
    netBalanceElement.className = stats.monthlySpendableBalance >= 0 ? 'text-2xl font-bold text-green-600' : 'text-2xl font-bold text-red-600';
}

function createExpensesChart(expenses) {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const monthlyExpenses = expenses.filter((item) => {
        const itemDate = new Date(item.date);
        return itemDate.getMonth() === currentMonth && itemDate.getFullYear() === currentYear;
    });

    const categoryData = {};
    monthlyExpenses.forEach((expense) => {
        const category = expense.category;
        const amount = parseFloat(expense.amount);
        categoryData[category] = (categoryData[category] || 0) + amount;
    });

    const labels = Object.keys(categoryData);
    const data = Object.values(categoryData);

    if (labels.length === 0) {
        document.getElementById('expenses-chart').parentElement.innerHTML = '<p class="text-gray-500 text-center py-8">No expense data for this month</p>';
        return;
    }

    const ctx = document.getElementById('expenses-chart').getContext('2d');
    new Chart(ctx, {
        type: 'pie',
        data: {
            labels,
            datasets: [{
                data,
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
                        label(context) {
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

function createMonthlyOverviewChart(income, expenses, savings) {
    const months = [];
    const incomeData = [];
    const expenseData = [];
    const savingsData = [];

    for (let i = 5; i >= 0; i -= 1) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        months.push(date.toLocaleDateString('en-US', { month: 'short' }));

        incomeData.push(
            income
                .filter((item) => {
                    const itemDate = new Date(item.date);
                    return itemDate.getMonth() === date.getMonth() && itemDate.getFullYear() === date.getFullYear();
                })
                .reduce((sum, item) => sum + parseFloat(item.amount), 0)
        );

        expenseData.push(
            expenses
                .filter((item) => {
                    const itemDate = new Date(item.date);
                    return itemDate.getMonth() === date.getMonth() && itemDate.getFullYear() === date.getFullYear();
                })
                .reduce((sum, item) => sum + parseFloat(item.amount), 0)
        );

        savingsData.push(
            savings
                .filter((goal) => {
                    const itemDate = new Date(goal.updatedAt || goal.createdAt || new Date());
                    return itemDate.getMonth() === date.getMonth() && itemDate.getFullYear() === date.getFullYear();
                })
                .reduce((sum, goal) => sum + parseFloat(goal.savedAmount), 0)
        );
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
                    backgroundColor: '#1f9d84',
                    borderColor: '#157f6b',
                    borderWidth: 1
                },
                {
                    label: 'Expenses',
                    data: expenseData,
                    backgroundColor: '#d96c75',
                    borderColor: '#b4434a',
                    borderWidth: 1
                },
                {
                    label: 'Savings',
                    data: savingsData,
                    backgroundColor: '#4f8df5',
                    borderColor: '#2f6de0',
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
                        label(context) {
                            return `${context.dataset.label}: ${getCurrencySymbol()}${context.parsed.y.toFixed(2)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback(value) {
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
        '#12344d', '#0f8b8d', '#e0a458', '#65c3ba', '#d96c75',
        '#7cc6fe', '#7a8b99', '#f2c078', '#39828d', '#c05a62',
        '#2f4858', '#88bdbc', '#f28f3b', '#4f6d7a', '#2a9d8f'
    ];
    return colors.slice(0, count);
}

function getCurrencySymbol() {
    const appSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');
    const currency = appSettings.currency || 'USD';
    const map = { USD: '$', EUR: '\u20AC', GBP: '\u00A3', CAD: 'C$', AUD: 'A$', JPY: '\u00A5', PHP: '\u20B1', SGD: 'S$', CNY: '\u00A5', KRW: '\u20A9', INR: '\u20B9' };
    return map[currency] || '$';
}

function formatAmount(amount) {
    return Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

window.addEventListener('currencyChanged', () => {
    loadDashboardData();
});
