const INITIAL_HISTORY_ITEMS = 5;
let isIncomeHistoryExpanded = false;

document.addEventListener('DOMContentLoaded', async function() {
    if (window.auth?.ready) {
        await window.auth.ready;
    }

    if (!auth.isUserLoggedIn()) {
        return;
    }

    dataManager.init();
    document.getElementById('date').value = new Date().toISOString().split('T')[0];
    await populateIncomeCategoryDropdown();
    await loadIncomeData();

    const toggleHistoryBtn = document.getElementById('toggle-income-history');
    if (toggleHistoryBtn) {
        toggleHistoryBtn.addEventListener('click', async () => {
            isIncomeHistoryExpanded = !isIncomeHistoryExpanded;
            await loadIncomeData();
        });
    }

    document.getElementById('income-form').addEventListener('submit', function(e) {
        e.preventDefault();
        addIncome();
    });
});

async function loadIncomeData() {
    const incomes = await dataManager.getIncome();
    updateTotalIncome(incomes);
    displayRecentIncomes(incomes);
    displayAllIncomes(incomes);
}

function updateTotalIncome(incomes) {
    const total = incomes.reduce((sum, income) => sum + parseFloat(income.amount), 0);
    const formattedTotal = `${getCurrencySymbol()}${formatAmount(total)}`;
    document.getElementById('total-income').textContent = formattedTotal;

    const summaryTotal = document.getElementById('income-summary-total');
    if (summaryTotal) {
        summaryTotal.textContent = formattedTotal;
    }
}

function displayRecentIncomes(incomes) {
    const recentContainer = document.getElementById('recent-incomes');
    const recentIncomes = [...incomes].slice(-3).reverse();

    if (recentIncomes.length === 0) {
        recentContainer.innerHTML = '<p class="text-gray-500 text-sm">No income entries yet.</p>';
        return;
    }

    recentContainer.innerHTML = recentIncomes.map((income) => `
        <div class="list-card flex justify-between items-center">
            <div>
                <p class="font-semibold text-gray-900">${getCurrencySymbol()}${formatAmount(income.amount)}</p>
                <p class="text-sm text-gray-600">${income.category} | ${new Date(income.date).toLocaleDateString()}</p>
            </div>
        </div>
    `).join('');
}

function displayAllIncomes(incomes) {
    const allContainer = document.getElementById('all-incomes');
    const toggleHistoryBtn = document.getElementById('toggle-income-history');

    if (incomes.length === 0) {
        allContainer.innerHTML = '<p class="text-gray-500 text-center py-8">No income entries yet. Add your first income above!</p>';
        if (toggleHistoryBtn) {
            toggleHistoryBtn.classList.add('hidden');
        }
        return;
    }

    const allHistory = [...incomes].reverse();
    const visibleHistory = isIncomeHistoryExpanded ? allHistory : allHistory.slice(0, INITIAL_HISTORY_ITEMS);

    allContainer.innerHTML = visibleHistory.map((income) => `
        <div class="list-card flex justify-between items-center gap-4">
            <div class="flex-1">
                <div class="flex items-center space-x-3">
                    <div class="metric-icon metric-icon--income w-10 h-10 rounded-full flex items-center justify-center">
                        <span class="text-white font-medium">${getCurrencySymbol()}</span>
                    </div>
                    <div>
                        <p class="font-medium text-gray-900">${getCurrencySymbol()}${formatAmount(income.amount)}</p>
                        <p class="text-sm text-gray-600">${income.category}</p>
                    </div>
                </div>
            </div>
            <div class="flex items-center space-x-2">
                <span class="text-sm text-gray-500">${new Date(income.date).toLocaleDateString()}</span>
                <button onclick="editIncome('${income.id}')" class="text-blue-600 hover:text-blue-800 p-1">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                    </svg>
                </button>
                <button onclick="deleteIncome('${income.id}')" class="text-red-600 hover:text-red-800 p-1">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                </button>
            </div>
        </div>
    `).join('');

    if (toggleHistoryBtn) {
        const hasMoreItems = allHistory.length > INITIAL_HISTORY_ITEMS;
        toggleHistoryBtn.classList.toggle('hidden', !hasMoreItems);
        toggleHistoryBtn.textContent = isIncomeHistoryExpanded
            ? 'See less'
            : `See full history (${allHistory.length})`;
    }
}

async function addIncome() {
    const amount = document.getElementById('amount').value;
    const category = document.getElementById('category').value;
    const date = document.getElementById('date').value;

    if (!amount || !category || !date) {
        await window.appUI.alert('Please fill in all fields.', { title: 'Missing details' });
        return;
    }

    try {
        await dataManager.addIncome(amount, category, date);
        document.getElementById('income-form').reset();
        document.getElementById('date').value = new Date().toISOString().split('T')[0];
        resetIncomeSubmitButton();
        await populateIncomeCategoryDropdown();
        await loadIncomeData();
        showMessage('Income added successfully!', 'success');
    } catch (error) {
        showMessage(error.message || 'Failed to add income. Please try again.', 'error');
    }
}

async function deleteIncome(id) {
    try {
        const deleted = await dataManager.deleteIncome(id);
        if (deleted) {
            await loadIncomeData();
            showMessage('Income deleted successfully!', 'success');
        }
    } catch (error) {
        showMessage(error.message || 'Failed to delete income. Please try again.', 'error');
    }
}

async function editIncome(id) {
    const incomes = await dataManager.getIncome();
    const income = incomes.find((entry) => entry.id === id);

    if (!income) return;

    document.getElementById('amount').value = income.amount;
    document.getElementById('category').value = income.category;
    document.getElementById('date').value = income.date;

    const submitBtn = document.querySelector('#income-form button[type="submit"]');
    submitBtn.textContent = 'Update Income';
    submitBtn.onclick = function(e) {
        e.preventDefault();
        updateIncome(id);
    };

    document.getElementById('income-form').scrollIntoView({ behavior: 'smooth' });
}

async function updateIncome(id) {
    const amount = document.getElementById('amount').value;
    const category = document.getElementById('category').value;
    const date = document.getElementById('date').value;

    if (!amount || !category || !date) {
        await window.appUI.alert('Please fill in all fields.', { title: 'Missing details' });
        return;
    }

    try {
        await dataManager.updateIncome(id, amount, category, date);
        document.getElementById('income-form').reset();
        document.getElementById('date').value = new Date().toISOString().split('T')[0];
        resetIncomeSubmitButton();
        await populateIncomeCategoryDropdown();
        await loadIncomeData();
        showMessage('Income updated successfully!', 'success');
    } catch (error) {
        showMessage(error.message || 'Failed to update income. Please try again.', 'error');
    }
}

function resetIncomeSubmitButton() {
    const submitBtn = document.querySelector('#income-form button[type="submit"]');
    submitBtn.textContent = 'Add Income';
    submitBtn.onclick = null;
}

async function populateIncomeCategoryDropdown() {
    const defaultCategories = ['Salary', 'Bonus', 'Freelance', 'Investment', 'Gift', 'Bank', 'Other'];
    let categories = [];
    if (typeof dataManager !== 'undefined' && typeof dataManager.getSetting === 'function') {
        categories = await dataManager.getSetting('incomeCategories', defaultCategories);
    }

    if (!Array.isArray(categories) || categories.length === 0) {
        categories = [...defaultCategories];
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

function showMessage(message, type) {
    window.appUI.toast(message, type === 'success' ? 'success' : 'error');
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
    loadIncomeData();
});
