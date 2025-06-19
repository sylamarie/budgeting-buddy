document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("goal-form");
  const goalsList = document.getElementById("goals-list");
  const emptyMessage = document.getElementById("empty-message");
  let editingGoalId = null;

  const updateStats = () => {
    const goals = dataManager.getSavings();
    const totalTarget = goals.reduce((sum, g) => sum + Number(g.targetAmount), 0);
    const totalSaved = goals.reduce((sum, g) => sum + Number(g.savedAmount), 0);
    const progress = totalTarget ? (totalSaved / totalTarget) * 100 : 0;
    document.getElementById("total-progress-percent").textContent = `${progress.toFixed(1)}%`;
    document.getElementById("overall-bar").style.width = `${progress}%`;
    document.getElementById("total-progress-text").textContent = `${getCurrencySymbol()}${formatAmount(totalSaved)} of ${getCurrencySymbol()}${formatAmount(totalTarget)}`;
    document.getElementById("total-saved").textContent = `${getCurrencySymbol()}${formatAmount(totalSaved)}`;
    document.getElementById("active-goals").textContent = goals.length;
    if (goals.length === 0) {
      emptyMessage.classList.remove("hidden");
    } else {
      emptyMessage.classList.add("hidden");
    }
  };

  const renderGoals = () => {
    const goals = dataManager.getSavings();
    goalsList.innerHTML = "";
    goals.forEach(goal => {
      const container = document.createElement("div");
      container.className = "p-6 bg-white rounded-lg border shadow-sm";
      const progress = (goal.savedAmount / goal.targetAmount) * 100;
      const isCompleted = progress >= 100;
      const createdDate = goal.createdDate || goal.createdAt || new Date().toISOString().split("T")[0];
      container.innerHTML = `
        <div class="flex justify-between mb-4">
          <div>
            <h3 class="text-lg font-semibold">${goal.goalName}</h3>
            <p class="text-sm text-gray-500">Created on ${new Date(createdDate).toLocaleDateString()}</p>
          </div>
          <div class="flex gap-2">
            <button class="edit-btn text-sm border px-3 py-1 rounded hover:bg-gray-100">Edit</button>
            <button class="delete-btn text-sm text-red-600 border border-red-600 px-3 py-1 rounded hover:bg-red-50">Delete</button>
          </div>
        </div>
        <div class="mb-4">
          <div class="flex justify-between text-sm mb-1">
            <span>Progress</span>
            <span class="${isCompleted ? 'text-green-600' : 'text-blue-600'} font-bold">${progress.toFixed(1)}%</span>
          </div>
          <div class="w-full bg-gray-200 rounded h-2 mb-1">
            <div class="bg-blue-500 h-2 rounded" style="width: ${Math.min(progress, 100)}%;"></div>
          </div>
          <div class="flex justify-between text-sm text-gray-600">
            <span>${getCurrencySymbol()}${formatAmount(goal.savedAmount)}</span>
            <span>${getCurrencySymbol()}${formatAmount(goal.targetAmount)}</span>
          </div>
        </div>
        ${
          isCompleted
            ? `<div class="text-center bg-green-50 border border-green-200 p-2 rounded text-green-700 font-medium">🎉 Goal Completed!</div>`
            : `<div class="flex gap-2">
                <input type="number" placeholder="Add amount" class="update-input flex-1 border px-2 py-1 rounded" />
                <button class="add-btn px-3 py-1 border rounded hover:bg-gray-100">Add</button>
              </div>`
        }
      `;
      container.querySelector(".delete-btn").addEventListener("click", async () => {
        await dataManager.deleteSavingsGoal(goal.id);
        renderGoals();
        updateStats();
      });
      container.querySelector(".edit-btn").addEventListener("click", () => {
        document.getElementById("goalName").value = goal.goalName;
        document.getElementById("targetAmount").value = goal.targetAmount;
        document.getElementById("savedAmount").value = goal.savedAmount;
        editingGoalId = goal.id;
        form.querySelector("button[type='submit']").textContent = "Update Goal";
      });
      const addBtn = container.querySelector(".add-btn");
      const input = container.querySelector(".update-input");
      if (addBtn && input) {
        addBtn.addEventListener("click", async () => {
          const addAmount = parseFloat(input.value || "0");
          if (!isNaN(addAmount) && addAmount > 0) {
            await dataManager.updateSavingsGoal(goal.id, goal.goalName, goal.targetAmount, Math.min(Number(goal.savedAmount) + addAmount, goal.targetAmount));
            renderGoals();
            updateStats();
          }
        });
      }
      goalsList.appendChild(container);
    });
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("goalName").value.trim();
    const target = parseFloat(document.getElementById("targetAmount").value);
    const saved = parseFloat(document.getElementById("savedAmount").value);
    if (!name || isNaN(target) || isNaN(saved)) {
      alert("Please fill in all fields correctly.");
      return;
    }
    if (editingGoalId) {
      await dataManager.updateSavingsGoal(editingGoalId, name, target, saved);
      editingGoalId = null;
      form.querySelector("button[type='submit']").textContent = "Create Goal";
    } else {
      const newGoal = await dataManager.addSavingsGoal(name, target, saved);
      if (newGoal) {
        const allGoals = dataManager.getSavings();
        const idx = allGoals.findIndex(g => g.id === newGoal.id);
        if (idx !== -1) {
          allGoals[idx].createdDate = new Date().toISOString().split("T")[0];
          dataManager.saveData('savings', allGoals);
        }
      }
    }
    form.reset();
    form.querySelector("button[type='submit']").textContent = "Create Goal";
    renderGoals();
    updateStats();
  });

  renderGoals();
  updateStats();

  window.addEventListener('currencyChanged', () => {
    renderGoals();
    updateStats();
  });
});

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