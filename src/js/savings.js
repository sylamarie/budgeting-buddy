document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('goal-form');
  const goalsList = document.getElementById('goals-list');
  const emptyMessage = document.getElementById('empty-message');
  let editingGoalId = null;

  async function updateStats() {
    const goals = await dataManager.getSavings();
    const totalTarget = goals.reduce((sum, goal) => sum + Number(goal.targetAmount), 0);
    const totalSaved = goals.reduce((sum, goal) => sum + Number(goal.savedAmount), 0);
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

    goals.forEach((goal) => {
      const container = document.createElement('div');
      container.className = 'surface-panel rounded-[1.6rem] p-6';
      const progress = (goal.savedAmount / goal.targetAmount) * 100;
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
            <span>${getCurrencySymbol()}${formatAmount(goal.savedAmount)}</span>
            <span>${getCurrencySymbol()}${formatAmount(goal.targetAmount)}</span>
          </div>
        </div>
        ${
          isCompleted
            ? '<div class="text-center bg-green-50 border border-green-200 p-3 rounded-2xl text-green-700 font-medium">Goal Completed!</div>'
            : `<div class="flex gap-2">
                <input type="number" placeholder="Add amount" class="update-input form-input flex-1" />
                <button class="add-btn primary-button px-4 py-3">Add</button>
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
        document.getElementById('savedAmount').value = goal.savedAmount;
        editingGoalId = goal.id;
        form.querySelector("button[type='submit']").textContent = 'Update Goal';
      });

      const addBtn = container.querySelector('.add-btn');
      const input = container.querySelector('.update-input');
      if (addBtn && input) {
        addBtn.addEventListener('click', async () => {
          const addAmount = parseFloat(input.value || '0');
          if (!isNaN(addAmount) && addAmount > 0) {
            await dataManager.updateSavingsGoal(
              goal.id,
              goal.goalName,
              goal.targetAmount,
              Math.min(Number(goal.savedAmount) + addAmount, goal.targetAmount)
            );
            await renderGoals();
            await updateStats();
          }
        });
      }

      goalsList.appendChild(container);
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('goalName').value.trim();
    const target = parseFloat(document.getElementById('targetAmount').value);
    const saved = parseFloat(document.getElementById('savedAmount').value);

    if (!name || isNaN(target) || isNaN(saved)) {
      await window.appUI.alert('Please fill in all fields correctly.', { title: 'Missing details' });
      return;
    }

    if (editingGoalId) {
      await dataManager.updateSavingsGoal(editingGoalId, name, target, saved);
      editingGoalId = null;
      form.querySelector("button[type='submit']").textContent = 'Create Goal';
    } else {
      await dataManager.addSavingsGoal(name, target, saved);
    }

    form.reset();
    form.querySelector("button[type='submit']").textContent = 'Create Goal';
    await renderGoals();
    await updateStats();
  });

  await renderGoals();
  await updateStats();

  window.addEventListener('currencyChanged', async () => {
    await renderGoals();
    await updateStats();
  });
});

function getCurrencySymbol() {
  const appSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');
  const currency = appSettings.currency || 'USD';
  const map = { USD: '$', EUR: '\u20AC', GBP: '\u00A3', CAD: 'C$', AUD: 'A$', JPY: '\u00A5', PHP: '\u20B1', SGD: 'S$', CNY: '\u00A5', KRW: '\u20A9', INR: '\u20B9' };
  return map[currency] || '$';
}

function formatAmount(amount) {
    return Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
