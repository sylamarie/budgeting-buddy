document.addEventListener("DOMContentLoaded", () => {
  const totalIncome = 4500;
  const totalExpenses = 3200;
  const balance = totalIncome - totalExpenses;
  const savingsGoal = 10000;
  const currentSavings = 2400;
  const savingsProgress = (currentSavings / savingsGoal) * 100;

  document.getElementById("totalIncome").textContent = `$${totalIncome.toLocaleString()}`;
  document.getElementById("totalExpenses").textContent = `$${totalExpenses.toLocaleString()}`;
  document.getElementById("balance").textContent = `$${balance.toLocaleString()}`;
  document.getElementById("savingsProgress").textContent = `${savingsProgress.toFixed(1)}%`;
  document.getElementById("savingsBar").style.width = `${savingsProgress}%`;
  document.getElementById("savingsDetails").textContent = `$${currentSavings.toLocaleString()} of $${savingsGoal.toLocaleString()}`;

  document.getElementById("incomeStat").textContent = `$${totalIncome.toLocaleString()}`;
  document.getElementById("expenseStat").textContent = `$${totalExpenses.toLocaleString()}`;
  document.getElementById("balanceStat").textContent = `$${balance.toLocaleString()}`;

  const pieCtx = document.getElementById("pieChart").getContext("2d");
  new Chart(pieCtx, {
    type: "pie",
    data: {
      labels: ["Food", "Transportation", "Rent", "Utilities", "Entertainment"],
      datasets: [{
        data: [800, 600, 1200, 400, 200],
        backgroundColor: ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6"]
      }]
    }
  });

  const barCtx = document.getElementById("barChart").getContext("2d");
  new Chart(barCtx, {
    type: "bar",
    data: {
      labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
      datasets: [
        {
          label: "Income",
          data: [4200, 4300, 4100, 4500, 4400, 4500],
          backgroundColor: "#22c55e"
        },
        {
          label: "Expenses",
          data: [3100, 3300, 2900, 3200, 3000, 3200],
          backgroundColor: "#ef4444"
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
});