document.addEventListener("DOMContentLoaded", () => {
  let goals = [
    { id: 1, goalName: "Emergency Fund", targetAmount: 10000, savedAmount: 3500, createdDate: "2025-01-01" },
    { id: 2, goalName: "Vacation to Japan", targetAmount: 5000, savedAmount: 1200, createdDate: "2025-02-15" },
    { id: 3, goalName: "New Car", targetAmount: 15000, savedAmount: 8000, createdDate: "2025-03-01" },
  ];

  const form = document.getElementById("goal-form");
  const goalsList = document.getElementById("goals-list");
  const emptyMessage = document.getElementById("empty-message");

  const updateStats = () => {
    const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0);
    const totalSaved = goals.reduce((sum, g) => sum + g.savedAmount, 0);
    const progress = totalTarget ? (totalSaved / totalTarget) * 100 : 0;

    document.getElementById("total-progress-percent").textContent = `${progress.toFixed(1)}%`;
    document.getElementById("overall-bar").style.width = `${progress}%`;
    document.getElementById("total-progress-text").textContent = `$${totalSaved.toLocaleString()} of $${totalTarget.toLocaleString()}`;
    document.getElementById("total-saved").textContent = `$${totalSaved.toLocaleString()}`;
    document.getElementById("active-goals").textContent = goals.length;

    if (goals.length === 0) {
      emptyMessage.classList.remove("hidden");
    } else {
      emptyMessage.classList.add("hidden");
    }
  };

  const renderGoals = () => {
    goalsList.innerHTML = "";
    goals.forEach(goal => {
      const container = document.createElement("div");
      container.className = "p-6 bg-white rounded-lg border shadow-sm";

      const progress = (goal.savedAmount / goal.targetAmount) * 100;
      const isCompleted = progress >= 100;

      container.innerHTML = `
        <div class="flex justify-between mb-4">
          <div>
            <h3 class="text-lg font-semibold">${goal.goalName}</h3>
            <p class="text-sm text-gray-500">Created on ${new Date(goal.createdDate).toLocaleDateString()}</p>
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
            <span>$${goal.savedAmount.toLocaleString()}</span>
            <span>$${goal.targetAmount.toLocaleString()}</span>
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

      container.querySelector(".delete-btn").addEventListener("click", () => {
        goals = goals.filter(g => g.id !== goal.id);
        renderGoals();
        updateStats();
      });

      const addBtn = container.querySelector(".add-btn");
      const input = container.querySelector(".update-input");
      if (addBtn && input) {
        addBtn.addEventListener("click", () => {
          const addAmount = parseFloat(input.value || "0");
          if (!isNaN(addAmount) && addAmount > 0) {
            goal.savedAmount = Math.min(goal.savedAmount + addAmount, goal.targetAmount);
            renderGoals();
            updateStats();
          }
        });
      }

      goalsList.appendChild(container);
    });
  };

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("goalName").value.trim();
    const target = parseFloat(document.getElementById("targetAmount").value);
    const saved = parseFloat(document.getElementById("savedAmount").value);

    if (!name || isNaN(target) || isNaN(saved)) {
      alert("Please fill in all fields correctly.");
      return;
    }

    goals.push({
      id: Date.now(),
      goalName: name,
      targetAmount: target,
      savedAmount: saved,
      createdDate: new Date().toISOString().split("T")[0],
    });

    form.reset();
    renderGoals();
    updateStats();
  });

  renderGoals();
  updateStats();
});