document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("income-form");
  const totalDisplay = document.getElementById("total-income");
  const recentContainer = document.getElementById("recent-incomes");
  const allContainer = document.getElementById("all-incomes");

  let incomes = [
    { id: 1, amount: 3000, category: "Salary", date: "2025-06-01" },
    { id: 2, amount: 500, category: "Bonus", date: "2025-06-15" },
  ];

  const render = () => {
    // Total
    const total = incomes.reduce((sum, i) => sum + i.amount, 0);
    totalDisplay.textContent = `$${total.toLocaleString()}`;

    // Recent
    const recent = incomes.slice(-3).reverse();
    recentContainer.innerHTML = recent.map(renderCard).join("");

    // All
    allContainer.innerHTML = incomes.map((i) => `
      <div class="flex items-center justify-between p-4 bg-white rounded-lg border hover:shadow-md transition-shadow">
        <div>
          <p class="font-medium text-gray-900">${i.category}</p>
          <p class="text-sm text-gray-500">${new Date(i.date).toLocaleDateString()}</p>
        </div>
        <div class="text-right">
          <p class="text-xl font-bold text-green-600">$${i.amount.toLocaleString()}</p>
          <button class="mt-1 text-sm text-red-500 underline" onclick="deleteIncome(${i.id})">Delete</button>
        </div>
      </div>
    `).join("");

    if (incomes.length === 0) {
      allContainer.innerHTML = `<div class="text-center py-8 text-gray-500">
        No income entries yet. Add your first income above!
      </div>`;
    }
  };

  const renderCard = (entry) => `
    <div class="flex items-center justify-between p-3 bg-white rounded-lg border">
      <div>
        <p class="font-medium">${entry.category}</p>
        <p class="text-sm text-gray-500">${entry.date}</p>
      </div>
      <div class="text-right">
        <p class="font-bold text-green-600">$${entry.amount.toLocaleString()}</p>
      </div>
    </div>
  `;

  window.deleteIncome = (id) => {
    incomes = incomes.filter(i => i.id !== id);
    render();
  };

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const amount = parseFloat(document.getElementById("amount").value);
    const category = document.getElementById("category").value;
    const date = document.getElementById("date").value;

    if (!amount || !category || !date) {
      alert("Please fill in all fields.");
      return;
    }

    const newEntry = {
      id: Date.now(),
      amount,
      category,
      date,
    };

    incomes.push(newEntry);
    form.reset();
    render();
  });

  render();
});