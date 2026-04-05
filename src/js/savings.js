document.addEventListener('DOMContentLoaded', async () => {
  if (window.auth?.ready) {
    await window.auth.ready;
  }

  const form = document.getElementById('goal-form');
  const goalsList = document.getElementById('goals-list');
  const emptyMessage = document.getElementById('empty-message');
  const savedAmountInput = document.getElementById('savedAmount');
  const initialFundingCategorySelect = document.getElementById('initial-funding-category');
  let editingGoalId = null;
  let savingsFundingBreakdown = new Map();

  async function updateStats() {
    const goals = await dataManager.getSavings();
    const totalTarget = goals.reduce((sum, goal) => sum + Number(goal.targetAmount), 0);
    const totalSaved = goals.reduce((sum, goal) => sum + dataManager.getSavingsGoalTotal(goal), 0);
    const progress = totalTarget ? (totalSaved / totalTarget) * 100 : 0;

    const progressLabel = `${progress.toFixed(1)}%`;
    document.getElementById('total-progress-percent').textContent = progressLabel;
    document.getElementById('overall-progress-percent').textContent = progressLabel;
    document.getElementById('overall-bar').style.width = `${progress}%`;
    document.getElementById('total-progress-text').textContent = `${getCurrencySymbol()}${formatAmount(totalSaved)} of ${getCurrencySymbol()}${formatAmount(totalTarget)}`;
    document.getElementById('total-saved').textContent = `${getCurrencySymbol()}${formatAmount(totalSaved)}`;
    document.getElementById('active-goals').textContent = goals.length;
    emptyMessage.classList.toggle('hidden', goals.length !== 0);
  }

  async function renderGoals() {
    const goals = await dataManager.getSavings();
    goalsList.innerHTML = '';

    for (const goal of goals) {
      const container = document.createElement('div');
      container.className = 'surface-panel rounded-[1.6rem] p-6';
      const savedAmount = dataManager.getSavingsGoalTotal(goal);
      const progress = goal.targetAmount ? (savedAmount / goal.targetAmount) * 100 : 0;
      const isCompleted = progress >= 100;
      const createdDate = goal.createdDate || goal.createdAt || new Date().toISOString().split('T')[0];

      container.innerHTML = `
        <div class="flex justify-between mb-4 gap-4 flex-col md:flex-row md:items-start">
          <div>
            <h3 class="text-xl font-semibold">${goal.goalName}</h3>
            <p class="text-sm text-gray-500">Created on ${new Date(createdDate).toLocaleDateString()}</p>
          </div>
          <div class="flex gap-2">
            <button class="edit-btn text-sm px-4 py-2 rounded-full border border-slate-200 hover:bg-slate-50 transition">Edit</button>
            <button class="delete-btn text-sm text-red-600 border border-red-200 px-4 py-2 rounded-full hover:bg-red-50 transition">Delete</button>
          </div>
        </div>
        <div class="mb-4">
          <div class="flex justify-between text-sm mb-1">
            <span>Progress</span>
            <span class="${isCompleted ? 'text-green-600' : 'text-teal-700'} font-bold">${progress.toFixed(1)}%</span>
          </div>
          <div class="w-full bg-slate-200 rounded-full h-3 mb-2 overflow-hidden">
            <div class="h-3 rounded-full ${isCompleted ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-gradient-to-r from-amber-500 to-teal-500'}" style="width: ${Math.min(progress, 100)}%;"></div>
          </div>
          <div class="flex justify-between text-sm text-gray-600">
            <span>${getCurrencySymbol()}${formatAmount(savedAmount)}</span>
            <span>${getCurrencySymbol()}${formatAmount(goal.targetAmount)}</span>
          </div>
        </div>
        ${
          isCompleted
            ? '<div class="text-center bg-green-50 border border-green-200 p-3 rounded-2xl text-green-700 font-medium">Goal Completed!</div>'
            : `<div class="space-y-3">
                <div class="flex gap-2 flex-col sm:flex-row">
                  <input type="number" placeholder="Add amount" class="update-input form-input flex-1" />
                  <button class="add-btn primary-button px-4 py-3">Add</button>
                </div>
                <div class="grid md:grid-cols-2 gap-4">
                  <div>
                    <select class="budget-month-select form-select">
                      <option value="">Select budget month</option>
                    </select>
                    <p class="budget-month-note text-xs text-slate-500 mt-2">Choose the month this savings contribution should reduce.</p>
                  </div>
                  <div>
                    <select class="funding-category-select form-select">
                      <option value="">Select money source</option>
                    </select>
                    <p class="funding-category-note text-xs text-slate-500 mt-2">Choose where this savings contribution comes from.</p>
                  </div>
                </div>
              </div>`
        }
      `;

      container.querySelector('.delete-btn').addEventListener('click', async () => {
        await dataManager.deleteSavingsGoal(goal.id);
        await renderGoals();
        await updateStats();
      });

      container.querySelector('.edit-btn').addEventListener('click', () => {
        document.getElementById('goalName').value = goal.goalName;
        document.getElementById('targetAmount').value = goal.targetAmount;
        document.getElementById('savedAmount').value = savedAmount;
        editingGoalId = goal.id;
        form.querySelector("button[type='submit']").textContent = 'Update Goal';
      });

      const addBtn = container.querySelector('.add-btn');
      const input = container.querySelector('.update-input');
      const budgetMonthSelect = container.querySelector('.budget-month-select');
      const budgetMonthNote = container.querySelector('.budget-month-note');
      const fundingCategorySelect = container.querySelector('.funding-category-select');
      const fundingCategoryNote = container.querySelector('.funding-category-note');
      if (budgetMonthSelect) {
        await populateBudgetMonthSelect(budgetMonthSelect, budgetMonthNote);
      }
      if (fundingCategorySelect) {
        await populateSavingsFundingCategorySelect(fundingCategorySelect, fundingCategoryNote, budgetMonthSelect?.value || '', '');
      }

      if (budgetMonthSelect && fundingCategorySelect) {
        budgetMonthSelect.addEventListener('change', async () => {
          await populateSavingsFundingCategorySelect(fundingCategorySelect, fundingCategoryNote, budgetMonthSelect.value, fundingCategorySelect.value);
          updateSavingsFundingHelper(fundingCategoryNote, fundingCategorySelect.value, budgetMonthSelect.value, Number(input?.value || 0));
        });
      }

      if (input && fundingCategorySelect && budgetMonthSelect && fundingCategoryNote) {
        input.addEventListener('input', () => {
          updateSavingsFundingHelper(fundingCategoryNote, fundingCategorySelect.value, budgetMonthSelect.value, Number(input.value || 0));
        });
        fundingCategorySelect.addEventListener('change', () => {
          updateSavingsFundingHelper(fundingCategoryNote, fundingCategorySelect.value, budgetMonthSelect.value, Number(input.value || 0));
        });
      }

      if (addBtn && input && budgetMonthSelect && fundingCategorySelect) {
        addBtn.addEventListener('click', async () => {
          const addAmount = parseFloat(input.value || '0');
          const budgetMonth = budgetMonthSelect.value;
          const fundingCategory = fundingCategorySelect.value;
          if (isNaN(addAmount) || addAmount <= 0 || !budgetMonth || !fundingCategory) {
            await window.appUI.alert('Enter an amount, choose a budget month, and choose a money source.', { title: 'Missing details' });
            return;
          }

          await dataManager.addSavingsContribution(goal.id, addAmount, new Date().toISOString(), budgetMonth, fundingCategory);
          await renderGoals();
          await updateStats();
        });
      }

      goalsList.appendChild(container);
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('goalName').value.trim();
    const target = parseFloat(document.getElementById('targetAmount').value);
    const saved = parseFloat(document.getElementById('savedAmount').value);
    const initialBudgetMonth = document.getElementById('initial-budget-month').value;
    const initialFundingCategory = document.getElementById('initial-funding-category').value;

    if (!name || isNaN(target) || isNaN(saved)) {
      await window.appUI.alert('Please fill in all fields correctly.', { title: 'Missing details' });
      return;
    }

    if (!editingGoalId && saved > 0 && (!initialBudgetMonth || !initialFundingCategory)) {
      await window.appUI.alert('Choose which budget month and money source should absorb this saved amount.', { title: 'Missing details' });
      return;
    }

    if (editingGoalId) {
      await dataManager.updateSavingsGoal(editingGoalId, name, target, saved);
      editingGoalId = null;
      form.querySelector("button[type='submit']").textContent = 'Create Goal';
    } else {
      await dataManager.addSavingsGoal(name, target, saved, initialBudgetMonth, initialFundingCategory);
    }

    form.reset();
    form.querySelector("button[type='submit']").textContent = 'Create Goal';
    await updateInitialBudgetMonthState();
    await renderGoals();
    await updateStats();
  });

  if (savedAmountInput) {
    savedAmountInput.addEventListener('input', async () => {
      await updateInitialBudgetMonthState();
      await updateInitialFundingCategoryState();
    });
  }
  if (initialFundingCategorySelect) {
    initialFundingCategorySelect.addEventListener('change', () => {
      updateInitialFundingCategoryHelper();
    });
  }
  const initialBudgetMonthSelect = document.getElementById('initial-budget-month');
  if (initialBudgetMonthSelect) {
    initialBudgetMonthSelect.addEventListener('change', async () => {
      await populateInitialFundingCategorySelect(initialFundingCategorySelect?.value || '');
      await updateInitialFundingCategoryState();
    });
  }

  await populateInitialBudgetMonthSelect();
  await updateInitialBudgetMonthState();
  await populateInitialFundingCategorySelect();
  await updateInitialFundingCategoryState();
  await renderGoals();
  await updateStats();

  window.addEventListener('currencyChanged', async () => {
    await populateInitialBudgetMonthSelect();
    await updateInitialBudgetMonthState();
    await populateInitialFundingCategorySelect();
    await updateInitialFundingCategoryState();
    await renderGoals();
    await updateStats();
  });

  async function populateInitialBudgetMonthSelect(selectedKey = '') {
    const select = document.getElementById('initial-budget-month');
    const note = document.getElementById('initial-budget-month-help');
    if (!select) return;

    await populateBudgetMonthSelect(select, note, selectedKey);
  }

  async function updateInitialBudgetMonthState() {
    const select = document.getElementById('initial-budget-month');
    const note = document.getElementById('initial-budget-month-help');
    const amount = parseFloat(savedAmountInput?.value || '0');

    if (!select) return;

    if (amount > 0) {
      select.disabled = select.options.length <= 1;
      if (note && select.options.length > 1) {
        note.textContent = 'Choose the month this saved amount should reduce.';
      }
      return;
    }

    select.value = '';
    select.disabled = true;
    if (note) {
      note.textContent = 'Required only when the saved amount is greater than zero.';
    }
  }

  async function populateInitialFundingCategorySelect(selectedValue = '') {
    const select = document.getElementById('initial-funding-category');
    const note = document.getElementById('initial-funding-category-help');
    const budgetMonth = document.getElementById('initial-budget-month')?.value || '';
    if (!select) return;

    await populateSavingsFundingCategorySelect(select, note, budgetMonth, selectedValue);
  }

  async function updateInitialFundingCategoryState() {
    const select = document.getElementById('initial-funding-category');
    const amount = parseFloat(savedAmountInput?.value || '0');
    if (!select) return;

    if (amount > 0) {
      select.disabled = !document.getElementById('initial-budget-month')?.value || select.options.length <= 1;
      updateInitialFundingCategoryHelper();
      return;
    }

    select.value = '';
    select.disabled = true;
    const note = document.getElementById('initial-funding-category-help');
    if (note) {
      note.textContent = 'Required only when the saved amount is greater than zero.';
    }
  }

  function updateInitialFundingCategoryHelper() {
    const note = document.getElementById('initial-funding-category-help');
    const selectedCategory = document.getElementById('initial-funding-category')?.value || '';
    const budgetMonth = document.getElementById('initial-budget-month')?.value || '';
    const amount = Number(savedAmountInput?.value || 0);
    updateSavingsFundingHelper(note, selectedCategory, budgetMonth, amount);
  }
});

async function populateBudgetMonthSelect(select, noteElement, selectedKey = '') {
  if (!select) return;

  const months = await getSelectableBudgetMonths(selectedKey || select.value);
  const existingValue = selectedKey || select.value;

  select.innerHTML = '<option value="">Select budget month</option>';

  months.forEach((month) => {
    const option = document.createElement('option');
    option.value = month.key;
    option.textContent = `${month.label} (${getCurrencySymbol()}${formatAmount(month.remaining)} left)`;
    select.appendChild(option);
  });

  if (existingValue && [...select.options].some((option) => option.value === existingValue)) {
    select.value = existingValue;
  }

  if (noteElement && months.length === 0) {
    noteElement.textContent = 'No month has remaining budget right now. Add income first or free up an earlier month.';
  } else if (noteElement && !noteElement.id) {
    noteElement.textContent = 'Choose the month this savings contribution should reduce.';
  }
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

async function populateSavingsFundingCategorySelect(select, noteElement, budgetMonth, selectedValue = '') {
  if (!select) return;

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

  const breakdown = await getSavingsFundingCategoryBreakdown(normalizedCategories, budgetMonth);
  select.innerHTML = '<option value="">Select money source</option>';

  normalizedCategories.forEach((category) => {
    const option = document.createElement('option');
    const remaining = breakdown.get(category)?.remaining || 0;
    option.value = category;
    option.textContent = `${category} (${getCurrencySymbol()}${formatAmount(remaining)} left)`;
    select.appendChild(option);
  });

  if (selectedValue && [...select.options].some((option) => option.value === selectedValue)) {
    select.value = selectedValue;
  }

  select.dataset.breakdown = JSON.stringify(Object.fromEntries([...breakdown.entries()].map(([key, value]) => [key, value.remaining])));
  updateSavingsFundingHelper(noteElement, select.value, budgetMonth, 0);
}

async function getSavingsFundingCategoryBreakdown(categories, budgetMonth) {
  const [income, expenses, savings] = await Promise.all([
    dataManager.getIncome(),
    dataManager.getExpenses(),
    dataManager.getSavings()
  ]);

  return categories.reduce((map, category) => {
    const incomeTotal = income
      .filter((entry) => !budgetMonth || dataManager.getBudgetMonthKey(entry.date) === budgetMonth)
      .filter((entry) => entry.category === category)
      .reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);

    const expenseTotal = expenses
      .filter((entry) => !budgetMonth || dataManager.getExpenseBudgetMonth(entry) === budgetMonth)
      .filter((entry) => entry.fundingCategory === category)
      .reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);

    const savingsTotal = savings
      .flatMap((goal) => goal.contributions || [])
      .filter((entry) => !budgetMonth || (entry.budgetMonth || dataManager.getBudgetMonthKey(entry.date)) === budgetMonth)
      .filter((entry) => entry.fundingCategory === category)
      .reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);

    map.set(category, {
      remaining: incomeTotal - expenseTotal - savingsTotal
    });
    return map;
  }, new Map());
}

function updateSavingsFundingHelper(noteElement, selectedCategory, budgetMonth, amount) {
  if (!noteElement) return;

  if (!budgetMonth) {
    noteElement.textContent = 'Select a budget month first.';
    return;
  }

  if (!selectedCategory) {
    noteElement.textContent = 'Choose a money source.';
    return;
  }

  const select = noteElement.previousElementSibling;
  let remainingLookup = {};
  try {
    remainingLookup = JSON.parse(select?.dataset.breakdown || '{}');
  } catch (error) {
    remainingLookup = {};
  }

  const remaining = Number(remainingLookup[selectedCategory] || 0);
  const remainingAfter = remaining - (Number(amount) || 0);
  noteElement.textContent = `After this savings, you will have ${getCurrencySymbol()}${formatAmount(remainingAfter)} left in ${selectedCategory}.`;
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
