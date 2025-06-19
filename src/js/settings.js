document.addEventListener("DOMContentLoaded", () => {
  // Force re-init of dataManager with current user
  if (typeof dataManager !== 'undefined' && typeof dataManager.init === 'function') {
    dataManager.init();
  }
  // Debug log
  if (typeof dataManager !== 'undefined') {
    console.log('Current user:', dataManager.currentUser);
    console.log('Loaded categories:', dataManager.getSetting("categories", []));
  }
  let currency = dataManager.getSetting("currency", "USD");
  let categories = dataManager.getSetting("categories", [
    "Food", "Transportation", "Rent", "Utilities", "Entertainment", "Healthcare", "Shopping"
  ]);
  if (!Array.isArray(categories)) categories = ["Food", "Transportation", "Rent", "Utilities", "Entertainment", "Healthcare", "Shopping"];

  const currencySelect = document.getElementById("currency");
  const currentCurrencyDisplay = document.getElementById("current-currency");
  const categoryForm = document.getElementById("category-form");
  const newCategoryInput = document.getElementById("newCategory");
  const categoryList = document.getElementById("category-list");
  const displayNameInput = document.getElementById("displayName");
  const emailInput = document.getElementById("email");
  const exportBtn = Array.from(document.querySelectorAll('button')).find(btn => btn.textContent.includes('Export Data'));
  const importBtn = Array.from(document.querySelectorAll('button')).find(btn => btn.textContent.includes('Import Data'));
  const clearBtn = Array.from(document.querySelectorAll('button')).find(btn => btn.textContent.includes('Clear All Data'));

  const currencyNames = {
    USD: "US Dollar", EUR: "Euro", GBP: "British Pound",
    CAD: "Canadian Dollar", AUD: "Australian Dollar", JPY: "Japanese Yen",
    PHP: "Philippine Peso", SGD: "Singapore Dollar", CNY: "Chinese Yuan", KRW: "South Korean Won", INR: "Indian Rupee"
  };

  function updateCurrencyDisplay() {
    currency = dataManager.getSetting("currency", "USD");
    currentCurrencyDisplay.textContent = `${currencyNames[currency]} (${currency})`;
    currencySelect.value = currency;
  }

  function renderCategories() {
    categories = dataManager.getSetting("categories", [
      "Food", "Transportation", "Rent", "Utilities", "Entertainment", "Healthcare", "Shopping"
    ]);
    if (!Array.isArray(categories)) categories = ["Food", "Transportation", "Rent", "Utilities", "Entertainment", "Healthcare", "Shopping"];
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
        dataManager.saveSetting("categories", categories);
        // Remove category from all expenses
        let expenses = dataManager.getExpenses();
        expenses = expenses.map(e => e.category === cat ? { ...e, category: "Uncategorized" } : e);
        dataManager.saveData("expenses", expenses);
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
    dataManager.saveSetting("currency", currency);
    updateCurrencyDisplay();
    alert(`Currency updated to ${currency}`);
    window.dispatchEvent(new Event('currencyChanged'));
  });

  categoryForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const newCat = newCategoryInput.value.trim();
    if (!newCat) {
      alert("Please enter a category name.");
      return;
    }
    categories = dataManager.getSetting("categories", []);
    if (categories.includes(newCat)) {
      alert("Category already exists.");
      return;
    }
    categories.push(newCat);
    dataManager.saveSetting("categories", categories);
    newCategoryInput.value = "";
    renderCategories();
    alert("Category added successfully!");
  });

  // Profile update
  if (displayNameInput && emailInput) {
    // Find the correct update profile button by traversing from displayNameInput
    let updateProfileBtn = null;
    const parentDiv = displayNameInput.closest('div');
    if (parentDiv) {
      updateProfileBtn = Array.from(parentDiv.parentElement.querySelectorAll('button')).find(btn => btn.textContent.trim() === 'Update Profile');
    }
    const userData = JSON.parse(localStorage.getItem("userData") || '{}');
    displayNameInput.value = userData.name || '';
    emailInput.value = userData.email || '';
    if (updateProfileBtn) {
      updateProfileBtn.onclick = () => {
        userData.name = displayNameInput.value;
        userData.email = emailInput.value;
        localStorage.setItem("userData", JSON.stringify(userData));
        // Also update users array
        let users = JSON.parse(localStorage.getItem("users") || '[]');
        users = users.map(u => u.id === userData.id ? { ...u, name: userData.name, email: userData.email } : u);
        localStorage.setItem("users", JSON.stringify(users));
        // Update navbar if present
        if (window.updateUserProfile) window.updateUserProfile();
        alert("Profile updated!");
        location.reload();
      };
    }
  }

  // Data management
  if (exportBtn) exportBtn.onclick = () => dataManager.exportData();
  if (importBtn) importBtn.onclick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = evt => {
        if (dataManager.importData(evt.target.result)) {
          alert('Data imported successfully!');
          location.reload();
        } else {
          alert('Import failed.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };
  if (clearBtn) clearBtn.onclick = () => {
    dataManager.clearAllData().then(cleared => {
      if (cleared) {
        alert('All data cleared!');
        location.reload();
      }
    });
  };

  // Show/hide password logic
  document.querySelectorAll('.show-password').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = 'Hide';
      } else {
        input.type = 'password';
        btn.textContent = 'Show';
      }
    });
  });

  // Change Password logic (single submit, then ask logout/stay)
  const changePasswordForm = document.getElementById('change-password-form');
  function handlePasswordChangeSubmit(e) {
    e.preventDefault();
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmNewPassword = document.getElementById('confirmNewPassword').value;
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    let users = JSON.parse(localStorage.getItem('users') || '[]');
    const userIdx = users.findIndex(u => u.id === userData.id);

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      alert('Please fill in all password fields.');
      return;
    }
    if (userIdx === -1) {
      alert('User not found.');
      return;
    }
    if (users[userIdx].password !== currentPassword) {
      alert('Current password is incorrect.');
      return;
    }
    if (newPassword.length < 6) {
      alert('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      alert('New passwords do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      alert('New password must be different from the current password.');
      return;
    }
    // Ask user if they want to log out or stay logged in
    if (confirm('Password updated!\n\nDo you want to log out now for security?\n\nPress OK to log out, or Cancel to stay logged in.')) {
      // Update password and log out
      users[userIdx].password = newPassword;
      localStorage.setItem('users', JSON.stringify(users));
      userData.password = newPassword;
      localStorage.setItem('userData', JSON.stringify(userData));
      changePasswordForm.reset();
      alert('Password updated. You will be logged out for security.');
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
      setTimeout(() => {
        window.location.href = '/index.html';
      }, 500);
    } else {
      // Update password and stay logged in
      users[userIdx].password = newPassword;
      localStorage.setItem('users', JSON.stringify(users));
      userData.password = newPassword;
      localStorage.setItem('userData', JSON.stringify(userData));
      changePasswordForm.reset();
      alert('Password updated successfully!');
    }
  }
  if (changePasswordForm) {
    changePasswordForm.onsubmit = handlePasswordChangeSubmit;
  }

  updateCurrencyDisplay();
  renderCategories();
});