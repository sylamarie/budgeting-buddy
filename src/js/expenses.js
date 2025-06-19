document.addEventListener("DOMContentLoaded", () => {
  const expenseForm = document.getElementById("expense-form");
  const totalDisplay = document.getElementById("total-expenses");
  const recentContainer = document.getElementById("recent-expenses");
  const allContainer = document.getElementById("all-expenses");

  let expenses = [
    { id: 1, amount: 1200, category: "Rent", date: "2025-06-01" },
    { id: 2, amount: 350, category: "Food", date: "2025-06-02" },
    { id: 3, amount: 80, category: "Transportation", date: "2025-06-03" },
  ];

  const categoryColors = {
    Food: "bg-red-100 text-red-700",
    Transportation: "bg-orange-100 text-orange-700",
    Rent: "bg-yellow-100 text-yellow-700",
    Utilities: "bg-green-100 text-green-700",
    Entertainment: "bg-blue-100 text-blue-700",
    Other: "bg-gray-100 text-gray-700",
    Shopping: "bg-purple-100 text-purple-700",
    Healthcare: "bg-pink-100 text-pink-700"
  };

  const renderExpenses = () => {
    // Total
    const total = expenses.reduce((sum, e) => sum + e.amount, 0);
    totalDisplay.textContent = `$${total.toLocaleString()}`;

    // Recent
    const recent = expenses.slice(-3).reverse();
    recentContainer.innerHTML = recent.map(renderEntry).join("");

    // All
    allContainer.innerHTML = expenses.map((entry) => {
      return `
        <div class="flex items-center justify-between p-4 bg-white rounded-lg border hover:shadow-md transition-shadow">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="px-2 py-1 rounded-full text-xs font-medium ${categoryColors[entry.category] || 'bg-gray-100 text-gray-700'}">
                ${entry.category}
              </span>
            </div>
            <p class="text-sm text-gray-500">${new Date(entry.date).toLocaleDateString()}</p>
          </div>
          <div class="text-right">
            <p class="text-xl font-bold text-red-600">$${entry.amount.toLocaleString()}</p>
            <button class="mt-1 text-sm text-red-500 underline" onclick="deleteExpense(${entry.id})">Delete</button>
          </div>
        </div>
      `;
    }).join("");
  };

  const renderEntry = (entry) => `
    <div class="flex items-center justify-between p-3 bg-white rounded-lg border">
      <div>
        <span class="px-2 py-1 rounded-full text-xs font-medium ${categoryColors[entry.category] || 'bg-gray-100 text-gray-700'}">
          ${entry.category}
        </span>
        <p class="text-sm text-gray-500 mt-1">${entry.date}</p>
      </div>
      <div class="text-right">
        <p class="font-bold text-red-600">$${entry.amount.toLocaleString()}</p>
      </div>
    </div>
  `;

  window.deleteExpense = (id) => {
    expenses = expenses.filter(e => e.id !== id);
    renderExpenses();
  };

  expenseForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const amount = parseFloat(document.getElementById("amount").value);
    const category = document.getElementById("category").value;
    const date = document.getElementById("date").value;

    if (!amount || !category || !date) {
      alert("Please fill in all fields.");
      return;
    }

    const newExpense = {
      id: Date.now(),
      amount,
      category,
      date,
    };

    expenses.push(newExpense);
    expenseForm.reset();
    renderExpenses();
  });

  renderExpenses();
});