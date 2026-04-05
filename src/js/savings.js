document.addEventListener('DOMContentLoaded', async () => {
  if (window.auth?.ready) {
    await window.auth.ready;
  }

  const form = document.getElementById('goal-form');
  const goalsList = document.getElementById('goals-list');
  const emptyMessage = document.getElementById('empty-message');
  const savedAmountInput = document.getElementById('savedAmount');
  let editingGoalId = null;

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
                <div>
                  <select class="budget-month-select form-select">
                    <option value="">Select budget month</option>
                  </select>
                  <p class="budget-month-note text-xs text-slate-500 mt-2">Choose the month this savings contribution should reduce.</p>
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
      if (budgetMonthSelect) {
        await populateBudgetMonthSelect(budgetMonthSelect, budgetMonthNote);
      }

      if (addBtn && input && budgetMonthSelect) {
        addBtn.addEventListener('click', async () => {
          const addAmount = parseFloat(input.value || '0');
          const budgetMonth = budgetMonthSelect.value;
          if (isNaN(addAmount) || addAmount <= 0 || !budgetMonth) {
            await window.appUI.alert('Enter an amount and choose a budget month with remaining balance.', { title: 'Missing details' });
            return;
          }

          await dataManager.addSavingsContribution(goal.id, addAmount, new Date().toISOString(), budgetMonth);
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

    if (!name || isNaN(target) || isNaN(saved)) {
      await window.appUI.alert('Please fill in all fields correctly.', { title: 'Missing details' });
      return;
    }

    if (!editingGoalId && saved > 0 && !initialBudgetMonth) {
      await window.appUI.alert('Choose which budget month should absorb this saved amount.', { title: 'Missing budget month' });
      return;
    }

    if (editingGoalId) {
      await dataManager.updateSavingsGoal(editingGoalId, name, target, saved);
      editingGoalId = null;
      form.querySelector("button[type='submit']").textContent = 'Create Goal';
    } else {
      await dataManager.addSavingsGoal(name, target, saved, initialBudgetMonth);
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
    });
  }

  await populateInitialBudgetMonthSelect();
  await updateInitialBudgetMonthState();
  await renderGoals();
  await updateStats();

  window.addEventListener('currencyChanged', async () => {
    await populateInitialBudgetMonthSelect();
    await updateInitialBudgetMonthState();
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

function getCurrencySymbol() {
  const appSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');
  const currency = appSettings.currency || 'USD';
  const map = { USD: '$', EUR: '\u20AC', GBP: '\u00A3', CAD: 'C$', AUD: 'A$', JPY: '\u00A5', PHP: '\u20B1', SGD: 'S$', CNY: '\u00A5', KRW: '\u20A9', INR: '\u20B9' };
  return map[currency] || '$';
}

function formatAmount(amount) {
    return Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
