document.addEventListener('DOMContentLoaded', async function() {
    if (!auth.isUserLoggedIn()) {
        return;
    }

    dataManager.init();
    document.getElementById('date').value = new Date().toISOString().split('T')[0];

    await loadExpenseData();
    await populateCategoryDropdown();

    document.getElementById('expense-form').addEventListener('submit', function(e) {
        e.preventDefault();
        addExpense();
    });
});

async function loadExpenseData() {
    const expenses = await dataManager.getExpenses();
    updateTotalExpenses(expenses);
    displayRecentExpenses(expenses);
    displayAllExpenses(expenses);
}

function updateTotalExpenses(expenses) {
    const total = expenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
    const formattedTotal = `${getCurrencySymbol()}${formatAmount(total)}`;
    document.getElementById('total-expenses').textContent = formattedTotal;

    const summaryTotal = document.getElementById('expenses-summary-total');
    if (summaryTotal) {
        summaryTotal.textContent = formattedTotal;
    }
}

function displayRecentExpenses(expenses) {
    const recentContainer = document.getElementById('recent-expenses');
    const recentExpenses = [...expenses].slice(-5).reverse();

    if (recentExpenses.length === 0) {
        recentContainer.innerHTML = '<p class="text-gray-500 text-sm">No expense entries yet.</p>';
        return;
    }

    recentContainer.innerHTML = recentExpenses.map((expense) => `
        <div class="list-card flex justify-between items-center">
            <div>
                <p class="font-semibold text-gray-900">${getCurrencySymbol()}${formatAmount(expense.amount)}</p>
                <p class="text-sm text-gray-600">${expense.category} | ${new Date(expense.date).toLocaleDateString()}</p>
            </div>
        </div>
    `).join('');
}

function displayAllExpenses(expenses) {
    const allContainer = document.getElementById('all-expenses');

    if (expenses.length === 0) {
        allContainer.innerHTML = '<p class="text-gray-500 text-center py-8">No expense entries yet. Add your first expense above!</p>';
        return;
    }

    allContainer.innerHTML = [...expenses].reverse().map((expense) => `
        <div class="list-card flex justify-between items-center gap-4">
            <div class="flex-1">
                <div class="flex items-center space-x-3">
                    <div class="metric-icon metric-icon--expense w-10 h-10 rounded-full flex items-center justify-center">
                        <span class="text-white font-medium">${getCurrencySymbol()}</span>
                    </div>
                    <div>
                        <p class="font-medium text-gray-900">${getCurrencySymbol()}${formatAmount(expense.amount)}</p>
                        <p class="text-sm text-gray-600">${expense.category}</p>
                    </div>
                </div>
            </div>
            <div class="flex items-center space-x-2">
                <span class="text-sm text-gray-500">${new Date(expense.date).toLocaleDateString()}</span>
                <button onclick="editExpense('${expense.id}')" class="text-blue-600 hover:text-blue-800 p-1">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                    </svg>
                </button>
                <button onclick="deleteExpense('${expense.id}')" class="text-red-600 hover:text-red-800 p-1">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                </button>
            </div>
        </div>
    `).join('');
}

async function addExpense() {
    const amount = document.getElementById('amount').value;
    const category = document.getElementById('category').value;
    const date = document.getElementById('date').value;

    if (!amount || !category || !date) {
        await window.appUI.alert('Please fill in all fields.', { title: 'Missing details' });
        return;
    }

    try {
        await dataManager.addExpense(amount, category, date);
        document.getElementById('expense-form').reset();
        document.getElementById('date').value = new Date().toISOString().split('T')[0];
        resetExpenseSubmitButton();
        await loadExpenseData();
        await populateCategoryDropdown();
        showMessage('Expense added successfully!', 'success');
    } catch (error) {
        showMessage(error.message || 'Failed to add expense. Please try again.', 'error');
    }
}

async function deleteExpense(id) {
    try {
        const deleted = await dataManager.deleteExpense(id);
        if (deleted) {
            await loadExpenseData();
            await populateCategoryDropdown();
            showMessage('Expense deleted successfully!', 'success');
        }
    } catch (error) {
        showMessage(error.message || 'Failed to delete expense. Please try again.', 'error');
    }
}

async function editExpense(id) {
    const expenses = await dataManager.getExpenses();
    const expense = expenses.find((entry) => entry.id === id);

    if (!expense) return;

    document.getElementById('amount').value = expense.amount;
    document.getElementById('category').value = expense.category;
    document.getElementById('date').value = expense.date;

    const submitBtn = document.querySelector('#expense-form button[type="submit"]');
    submitBtn.textContent = 'Update Expense';
    submitBtn.onclick = function(e) {
        e.preventDefault();
        updateExpense(id);
    };

    document.getElementById('expense-form').scrollIntoView({ behavior: 'smooth' });
}

async function updateExpense(id) {
    const amount = document.getElementById('amount').value;
    const category = document.getElementById('category').value;
    const date = document.getElementById('date').value;

    if (!amount || !category || !date) {
        await window.appUI.alert('Please fill in all fields.', { title: 'Missing details' });
        return;
    }

    try {
        await dataManager.updateExpense(id, amount, category, date);
        document.getElementById('expense-form').reset();
        document.getElementById('date').value = new Date().toISOString().split('T')[0];
        resetExpenseSubmitButton();
        await loadExpenseData();
        await populateCategoryDropdown();
        showMessage('Expense updated successfully!', 'success');
    } catch (error) {
        showMessage(error.message || 'Failed to update expense. Please try again.', 'error');
    }
}

function resetExpenseSubmitButton() {
    const submitBtn = document.querySelector('#expense-form button[type="submit"]');
    submitBtn.textContent = 'Add Expense';
    submitBtn.onclick = null;
}

function showMessage(message, type) {
    window.appUI.toast(message, type === 'success' ? 'success' : 'error');
}

function getCurrencySymbol() {
    const appSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');
    const currency = appSettings.currency || 'USD';
    const map = { USD: '$', EUR: '\u20AC', GBP: '\u00A3', CAD: 'C$', AUD: 'A$', JPY: '\u00A5', PHP: '\u20B1', SGD: 'S$', CNY: '\u00A5', KRW: '\u20A9', INR: '\u20B9' };
    return map[currency] || '$';
}

async function populateCategoryDropdown() {
    let categories = [];
    if (typeof dataManager !== 'undefined' && typeof dataManager.getSetting === 'function') {
        categories = await dataManager.getSetting('categories', [
            'Food', 'Transportation', 'Rent', 'Utilities', 'Entertainment', 'Healthcare', 'Shopping', 'Education', 'Other'
        ]);
    }

    const categorySelect = document.getElementById('category');
    if (!categorySelect) return;

    categorySelect.innerHTML = '<option value="">Select category</option>';
    categories.forEach((cat) => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        categorySelect.appendChild(opt);
    });
}

function formatAmount(amount) {
    return Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

window.addEventListener('currencyChanged', () => {
    loadExpenseData();
});
