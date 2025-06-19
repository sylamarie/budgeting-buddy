document.addEventListener("DOMContentLoaded", () => {
  let currency = "USD";
  let categories = [
    "Food", "Transportation", "Rent", "Utilities", "Entertainment", "Healthcare", "Shopping"
  ];

  const currencySelect = document.getElementById("currency");
  const currentCurrencyDisplay = document.getElementById("current-currency");

  const categoryForm = document.getElementById("category-form");
  const newCategoryInput = document.getElementById("newCategory");
  const categoryList = document.getElementById("category-list");

  const currencyNames = {
    USD: "US Dollar", EUR: "Euro", GBP: "British Pound",
    CAD: "Canadian Dollar", AUD: "Australian Dollar", JPY: "Japanese Yen"
  };

  function updateCurrencyDisplay() {
    currentCurrencyDisplay.textContent = `${currencyNames[currency]} (${currency})`;
  }

  function renderCategories() {
    categoryList.innerHTML = "";
    categories.forEach(cat => {
      const row = document.createElement("div");
      row.className = "flex items-center justify-between p-3 bg-white rounded-lg border";

      const name = document.createElement("span");
      name.textContent = cat;
      name.className = "font-medium";

      const delBtn = document.createElement("button");
      delBtn.textContent = "Delete";
      delBtn.className = "text-red-600 text-sm border border-red-600 px-3 py-1 rounded hover:bg-red-50";
      delBtn.onclick = () => {
        categories = categories.filter(c => c !== cat);
        renderCategories();
        alert("Category deleted");
      };

      row.appendChild(name);
      row.appendChild(delBtn);
      categoryList.appendChild(row);
    });
  }

  currencySelect.addEventListener("change", (e) => {
    currency = e.target.value;
    updateCurrencyDisplay();
    alert(`Currency updated to ${currency}`);
  });

  categoryForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const newCat = newCategoryInput.value.trim();
    if (!newCat) {
      alert("Please enter a category name.");
      return;
    }
    if (categories.includes(newCat)) {
      alert("Category already exists.");
      return;
    }
    categories.push(newCat);
    newCategoryInput.value = "";
    renderCategories();
    alert("Category added successfully!");
  });

  updateCurrencyDisplay();
  renderCategories();
});