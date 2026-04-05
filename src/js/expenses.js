const INITIAL_HISTORY_ITEMS = 5;
let isExpenseHistoryExpanded = false;
let fundingCategoryBreakdown = new Map();
let currentEditingExpenseId = null;

document.addEventListener('DOMContentLoaded', async function() {
    if (window.auth?.ready) {
        await window.auth.ready;
    }

    if (!auth.isUserLoggedIn()) {
        return;
    }

    dataManager.init();
    document.getElementById('date').value = new Date().toISOString().split('T')[0];

    await loadExpenseData();
    await populateCategoryDropdown();
    await populateBudgetMonthDropdown();
    await populateFundingCategoryDropdown();
    updateFundingCategoryHelper();

    const toggleHistoryBtn = document.getElementById('toggle-expense-history');
    if (toggleHistoryBtn) {
        toggleHistoryBtn.addEventListener('click', async () => {
            isExpenseHistoryExpanded = !isExpenseHistoryExpanded;
            await loadExpenseData();
        });
    }

    document.getElementById('expense-form').addEventListener('submit', function(e) {
        e.preventDefault();
        addExpense();
    });

    const amountInput = document.getElementById('amount');
    const fundingCategorySelect = document.getElementById('funding-category');
    const budgetMonthSelect = document.getElementById('budget-month');
    if (amountInput) {
        amountInput.addEventListener('input', () => updateFundingCategoryHelper());
    }
    if (fundingCategorySelect) {
        fundingCategorySelect.addEventListener('change', () => updateFundingCategoryHelper());
    }
    if (budgetMonthSelect) {
        budgetMonthSelect.addEventListener('change', async () => {
            await populateFundingCategoryDropdown(fundingCategorySelect?.value || '');
        });
    }
});

async function loadExpenseData() {
    const expenses = await dataManager.getExpenses();
    updateTotalExpenses(expenses);
    displayRecentExpenses(expenses);
    displayAllExpenses(expenses);
    await populateBudgetMonthDropdown();
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
    const recentExpenses = [...expenses].slice(-3).reverse();

    if (recentExpenses.length === 0) {
        recentContainer.innerHTML = '<p class="text-gray-500 text-sm">No expense entries yet.</p>';
        return;
    }

    recentContainer.innerHTML = recentExpenses.map((expense) => `
        <div class="list-card flex justify-between items-center">
            <div>
                <p class="font-semibold text-gray-900">${getCurrencySymbol()}${formatAmount(expense.amount)}</p>
                <p class="text-sm text-gray-600">${expense.category} | ${new Date(expense.date).toLocaleDateString()}</p>
                <p class="text-xs text-slate-500">Paid from: ${expense.fundingCategory || 'Not set'}</p>
                <p class="text-xs text-slate-500">Budget month: ${dataManager.formatBudgetMonthLabel(dataManager.getExpenseBudgetMonth(expense))}</p>
            </div>
        </div>
    `).join('');
}

function displayAllExpenses(expenses) {
    const allContainer = document.getElementById('all-expenses');
    const toggleHistoryBtn = document.getElementById('toggle-expense-history');

    if (expenses.length === 0) {
        allContainer.innerHTML = '<p class="text-gray-500 text-center py-8">No expense entries yet. Add your first expense above!</p>';
        if (toggleHistoryBtn) {
            toggleHistoryBtn.classList.add('hidden');
        }
        return;
    }

    const allHistory = [...expenses].reverse();
    const visibleHistory = isExpenseHistoryExpanded ? allHistory : allHistory.slice(0, INITIAL_HISTORY_ITEMS);

    allContainer.innerHTML = visibleHistory.map((expense) => `
        <div class="list-card flex justify-between items-center gap-4">
            <div class="flex-1">
                <div class="flex items-center space-x-3">
                    <div class="metric-icon metric-icon--expense w-10 h-10 rounded-full flex items-center justify-center">
                        <span class="text-white font-medium">${getCurrencySymbol()}</span>
                    </div>
                    <div>
                        <p class="font-medium text-gray-900">${getCurrencySymbol()}${formatAmount(expense.amount)}</p>
                        <p class="text-sm text-gray-600">${expense.category}</p>
                        <p class="text-xs text-slate-500">Paid from: ${expense.fundingCategory || 'Not set'}</p>
                        <p class="text-xs text-slate-500">Budget month: ${dataManager.formatBudgetMonthLabel(dataManager.getExpenseBudgetMonth(expense))}</p>
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

    if (toggleHistoryBtn) {
        const hasMoreItems = allHistory.length > INITIAL_HISTORY_ITEMS;
        toggleHistoryBtn.classList.toggle('hidden', !hasMoreItems);
        toggleHistoryBtn.textContent = isExpenseHistoryExpanded
            ? 'See less'
            : `See full history (${allHistory.length})`;
    }
}

async function addExpense() {
    const amount = document.getElementById('amount').value;
    const category = document.getElementById('category').value;
    const date = document.getElementById('date').value;
    const budgetMonth = document.getElementById('budget-month').value;
    const fundingCategory = document.getElementById('funding-category').value;

    if (!amount || !category || !date || !budgetMonth || !fundingCategory) {
        await window.appUI.alert('Please fill in all fields.', { title: 'Missing details' });
        return;
    }

    try {
        await dataManager.addExpense(amount, category, date, budgetMonth, fundingCategory);
        document.getElementById('expense-form').reset();
        document.getElementById('date').value = new Date().toISOString().split('T')[0];
        currentEditingExpenseId = null;
        resetExpenseSubmitButton();
        await loadExpenseData();
        await populateCategoryDropdown();
        await populateFundingCategoryDropdown();
        updateFundingCategoryHelper();
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

    currentEditingExpenseId = id;
    await populateBudgetMonthDropdown(dataManager.getExpenseBudgetMonth(expense));
    await populateFundingCategoryDropdown(expense.fundingCategory || '');
    document.getElementById('amount').value = expense.amount;
    document.getElementById('category').value = expense.category;
    document.getElementById('date').value = expense.date;
    document.getElementById('budget-month').value = dataManager.getExpenseBudgetMonth(expense);
    document.getElementById('funding-category').value = expense.fundingCategory || '';
    updateFundingCategoryHelper();

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
    const budgetMonth = document.getElementById('budget-month').value;
    const fundingCategory = document.getElementById('funding-category').value;

    if (!amount || !category || !date || !budgetMonth || !fundingCategory) {
        await window.appUI.alert('Please fill in all fields.', { title: 'Missing details' });
        return;
    }

    try {
        await dataManager.updateExpense(id, amount, category, date, budgetMonth, fundingCategory);
        document.getElementById('expense-form').reset();
        document.getElementById('date').value = new Date().toISOString().split('T')[0];
        currentEditingExpenseId = null;
        resetExpenseSubmitButton();
        await loadExpenseData();
        await populateCategoryDropdown();
        await populateFundingCategoryDropdown();
        updateFundingCategoryHelper();
        showMessage('Expense updated successfully!', 'success');
    } catch (error) {
        showMessage(error.message || 'Failed to update expense. Please try again.', 'error');
    }
}

function resetExpenseSubmitButton() {
    currentEditingExpenseId = null;
    const submitBtn = document.querySelector('#expense-form button[type="submit"]');
    submitBtn.textContent = 'Add Expense';
    submitBtn.onclick = null;
    updateFundingCategoryHelper();
}

async function populateBudgetMonthDropdown(selectedKey = '') {
    const budgetMonthSelect = document.getElementById('budget-month');
    const budgetMonthHelp = document.getElementById('budget-month-help');
    if (!budgetMonthSelect) return;

    const months = await getSelectableBudgetMonths(selectedKey || budgetMonthSelect.value);
    const existingValue = selectedKey || budgetMonthSelect.value;

    budgetMonthSelect.innerHTML = '<option value="">Select budget month</option>';

    months.forEach((month) => {
        const option = document.createElement('option');
        option.value = month.key;
        option.textContent = `${month.label} (${getCurrencySymbol()}${formatAmount(month.remaining)} left)`;
        budgetMonthSelect.appendChild(option);
    });

    if (existingValue && [...budgetMonthSelect.options].some((option) => option.value === existingValue)) {
        budgetMonthSelect.value = existingValue;
    }

    if (budgetMonthHelp) {
        budgetMonthHelp.textContent = months.length
            ? 'Only months with remaining budget are shown.'
            : 'No month has remaining budget right now. Add income first or free up an earlier month.';
    }

    budgetMonthSelect.disabled = months.length === 0;
}

async function getSelectableBudgetMonths(selectedKey = '') {
    const months = await dataManager.getAvailableBudgetMonths();

    if (!selectedKey || months.some((month) => month.key === selectedKey)) {
        return months;
    }

    const [income, expenses, savings] = await Promise.all([
        dataManager.getIncome(),
        dataManager.getExpenses(),
        dataManager.getSavings()
    ]);
    const fallbackMonth = dataManager
        .getBudgetMonthBreakdown(income, expenses, savings)
        .find((month) => month.key === selectedKey);

    if (!fallbackMonth) {
        return months;
    }

    return [
        ...months,
        {
            ...fallbackMonth,
            label: `${fallbackMonth.label} (currently assigned)`
        }
    ].sort((a, b) => b.key.localeCompare(a.key));
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
    const defaultCategories = ['Food', 'Transportation', 'Rent', 'Utilities', 'Entertainment', 'Healthcare', 'Shopping', 'Education', 'Other'];
    let categories = [];
    if (typeof dataManager !== 'undefined' && typeof dataManager.getSetting === 'function') {
        categories = await dataManager.getSetting(
            'expenseCategories',
            await dataManager.getSetting('categories', defaultCategories)
        );
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

async function populateFundingCategoryDropdown(selectedValue = '') {
    const defaultFundingCategories = ['Salary', 'Bonus', 'Freelance', 'Investment', 'Gift', 'Bank', 'Other'];
    let categories = [];
    if (typeof dataManager !== 'undefined' && typeof dataManager.getSetting === 'function') {
        categories = await dataManager.getSetting('incomeCategories', defaultFundingCategories);
    }

    if (!Array.isArray(categories) || categories.length === 0) {
        categories = [...defaultFundingCategories];
    }

    const normalizedCategories = [...new Set(categories.map((category) => String(category || '').trim()).filter(Boolean))];
    if (selectedValue && !normalizedCategories.includes(selectedValue)) {
        normalizedCategories.push(selectedValue);
    }
    const selectedBudgetMonth = document.getElementById('budget-month')?.value || '';
    fundingCategoryBreakdown = await getFundingCategoryBreakdown(
        normalizedCategories,
        selectedBudgetMonth,
        currentEditingExpenseId
    );

    const fundingCategorySelect = document.getElementById('funding-category');
    if (!fundingCategorySelect) return;

    fundingCategorySelect.innerHTML = '<option value="">Select money source</option>';
    normalizedCategories.forEach((category) => {
        const breakdown = fundingCategoryBreakdown.get(category) || { remaining: 0 };
        const option = document.createElement('option');
        option.value = category;
        option.textContent = selectedBudgetMonth
            ? `${category} (${getCurrencySymbol()}${formatAmount(breakdown.remaining)} left in ${dataManager.formatBudgetMonthLabel(selectedBudgetMonth)})`
            : `${category} (${getCurrencySymbol()}${formatAmount(breakdown.remaining)} left)`;
        fundingCategorySelect.appendChild(option);
    });

    if (selectedValue) {
        fundingCategorySelect.value = selectedValue;
    }

    updateFundingCategoryHelper();
}

async function getFundingCategoryBreakdown(categories, budgetMonthKey = '', excludeExpenseId = null) {
    const [income, expenses] = await Promise.all([
        dataManager.getIncome(),
        dataManager.getExpenses()
    ]);

    return categories.reduce((breakdownMap, category) => {
        const incomeTotal = income
            .filter((entry) => !budgetMonthKey || dataManager.getBudgetMonthKey(entry.date) === budgetMonthKey)
            .filter((entry) => entry.category === category)
            .reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);
        const expenseTotal = expenses
            .filter((entry) => !excludeExpenseId || entry.id !== excludeExpenseId)
            .filter((entry) => !budgetMonthKey || dataManager.getExpenseBudgetMonth(entry) === budgetMonthKey)
            .filter((entry) => entry.fundingCategory === category)
            .reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);

        breakdownMap.set(category, {
            income: incomeTotal,
            used: expenseTotal,
            remaining: incomeTotal - expenseTotal
        });
        return breakdownMap;
    }, new Map());
}

function updateFundingCategoryHelper() {
    const fundingCategorySelect = document.getElementById('funding-category');
    const fundingCategoryHelp = document.getElementById('funding-category-help');
    const amountInput = document.getElementById('amount');
    const budgetMonthSelect = document.getElementById('budget-month');

    if (!fundingCategorySelect || !fundingCategoryHelp) {
        return;
    }

    const selectedBudgetMonth = budgetMonthSelect?.value || '';
    if (!selectedBudgetMonth) {
        fundingCategoryHelp.textContent = 'Select a budget month first.';
        return;
    }

    const selectedCategory = fundingCategorySelect.value;
    if (!selectedCategory) {
        fundingCategoryHelp.textContent = 'Choose a money source.';
        return;
    }

    const breakdown = fundingCategoryBreakdown.get(selectedCategory) || { income: 0, used: 0, remaining: 0 };
    const plannedExpenseAmount = Number(amountInput?.value) || 0;
    const remainingAfterExpense = breakdown.remaining - plannedExpenseAmount;
    fundingCategoryHelp.textContent = `After this expense, you will have ${getCurrencySymbol()}${formatAmount(remainingAfterExpense)} left in ${selectedCategory}.`;
}

function formatAmount(amount) {
    return Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

window.addEventListener('currencyChanged', () => {
    loadExpenseData();
});
