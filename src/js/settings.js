document.addEventListener('DOMContentLoaded', async () => {
  if (typeof dataManager !== 'undefined' && typeof dataManager.init === 'function') {
    dataManager.init();
  }

  let currency = await dataManager.getSetting('currency', 'USD');
  let categories = await dataManager.getSetting('categories', [
    'Food', 'Transportation', 'Rent', 'Utilities', 'Entertainment', 'Healthcare', 'Shopping'
  ]);
  if (!Array.isArray(categories)) {
    categories = ['Food', 'Transportation', 'Rent', 'Utilities', 'Entertainment', 'Healthcare', 'Shopping'];
  }

  const currencySelect = document.getElementById('currency');
  const currentCurrencyDisplay = document.getElementById('current-currency');
  const categoryForm = document.getElementById('category-form');
  const newCategoryInput = document.getElementById('newCategory');
  const categoryList = document.getElementById('category-list');
  const displayNameInput = document.getElementById('displayName');
  const emailInput = document.getElementById('email');
  const exportBtn = Array.from(document.querySelectorAll('button')).find((btn) => btn.textContent.includes('Export Data'));
  const importBtn = Array.from(document.querySelectorAll('button')).find((btn) => btn.textContent.includes('Import Data'));
  const clearBtn = Array.from(document.querySelectorAll('button')).find((btn) => btn.textContent.includes('Clear All Data'));

  const currencyNames = {
    USD: 'US Dollar', EUR: 'Euro', GBP: 'British Pound',
    CAD: 'Canadian Dollar', AUD: 'Australian Dollar', JPY: 'Japanese Yen',
    PHP: 'Philippine Peso', SGD: 'Singapore Dollar', CNY: 'Chinese Yuan', KRW: 'South Korean Won', INR: 'Indian Rupee'
  };

  function updateCurrencyDisplay() {
    currentCurrencyDisplay.textContent = `${currencyNames[currency]} (${currency})`;
    currencySelect.value = currency;
  }

  async function renderCategories() {
    categories = await dataManager.getSetting('categories', [
      'Food', 'Transportation', 'Rent', 'Utilities', 'Entertainment', 'Healthcare', 'Shopping'
    ]);
    if (!Array.isArray(categories)) {
      categories = ['Food', 'Transportation', 'Rent', 'Utilities', 'Entertainment', 'Healthcare', 'Shopping'];
    }

    categoryList.innerHTML = '';
    categories.forEach((cat) => {
      const row = document.createElement('div');
      row.className = 'flex items-center justify-between p-3 bg-white rounded-lg border';
      const name = document.createElement('span');
      name.textContent = cat;
      name.className = 'font-medium';
      const delBtn = document.createElement('button');
      delBtn.textContent = 'Delete';
      delBtn.className = 'text-red-600 text-sm border border-red-600 px-3 py-1 rounded hover:bg-red-50';
      delBtn.onclick = async () => {
        categories = categories.filter((entry) => entry !== cat);
        await dataManager.saveSetting('categories', categories);

        let expenses = await dataManager.getExpenses();
        expenses = expenses.map((expense) => expense.category === cat ? { ...expense, category: 'Uncategorized' } : expense);
        await dataManager.saveData('expenses', expenses);

        await renderCategories();
        window.appUI.toast('Category deleted.', 'success');
      };
      row.appendChild(name);
      row.appendChild(delBtn);
      categoryList.appendChild(row);
    });
  }

  currencySelect.addEventListener('change', async (e) => {
    currency = e.target.value;
    await dataManager.saveSetting('currency', currency);
    updateCurrencyDisplay();
    window.appUI.toast(`Currency updated to ${currency}.`, 'success');
    window.dispatchEvent(new Event('currencyChanged'));
  });

  categoryForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newCat = newCategoryInput.value.trim();
    if (!newCat) {
      await window.appUI.alert('Please enter a category name.', { title: 'Missing category' });
      return;
    }

    categories = await dataManager.getSetting('categories', []);
    if (categories.includes(newCat)) {
      await window.appUI.alert('Category already exists.', { title: 'Duplicate category' });
      return;
    }

    categories.push(newCat);
    await dataManager.saveSetting('categories', categories);
    newCategoryInput.value = '';
    await renderCategories();
    window.appUI.toast('Category added successfully.', 'success');
  });

  if (displayNameInput && emailInput) {
    let updateProfileBtn = null;
    const parentDiv = displayNameInput.closest('div');
    if (parentDiv) {
      updateProfileBtn = Array.from(parentDiv.parentElement.querySelectorAll('button')).find((btn) => btn.textContent.trim() === 'Update Profile');
    }

    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    displayNameInput.value = userData.name || '';
    emailInput.value = userData.email || '';

    if (updateProfileBtn) {
      updateProfileBtn.onclick = async () => {
        try {
          const payload = await window.apiRequest(`/api/users/${userData.id}/profile`, {
            method: 'PATCH',
            body: JSON.stringify({
              name: displayNameInput.value.trim(),
              email: emailInput.value.trim()
            })
          });

          localStorage.setItem('userData', JSON.stringify(payload.user));
          if (window.auth && typeof window.auth.updateStoredUser === 'function') {
            window.auth.updateStoredUser(payload.user);
          }
          if (window.updateUserProfile) window.updateUserProfile();
          window.appUI.toast('Profile updated.', 'success');
          location.reload();
        } catch (error) {
          await window.appUI.alert(error.message || 'Failed to update profile.', { title: 'Profile update failed', tone: 'danger' });
        }
      };
    }
  }

  if (exportBtn) {
    exportBtn.onclick = () => dataManager.exportData();
  }

  if (importBtn) {
    importBtn.onclick = () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (evt) => {
          if (await dataManager.importData(evt.target.result)) {
            window.appUI.toast('Data imported successfully.', 'success');
            location.reload();
          } else {
            await window.appUI.alert('Import failed.', { title: 'Import failed', tone: 'danger' });
          }
        };
        reader.readAsText(file);
      };
      input.click();
    };
  }

  if (clearBtn) {
    clearBtn.onclick = async () => {
      const cleared = await dataManager.clearAllData();
      if (cleared) {
        window.appUI.toast('All data cleared.', 'success');
        location.reload();
      }
    };
  }

  document.querySelectorAll('.show-password').forEach((btn) => {
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

  const changePasswordForm = document.getElementById('change-password-form');
  async function handlePasswordChangeSubmit(e) {
    e.preventDefault();
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmNewPassword = document.getElementById('confirmNewPassword').value;
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      await window.appUI.alert('Please fill in all password fields.', { title: 'Missing password fields' });
      return;
    }
    if (newPassword.length < 6) {
      await window.appUI.alert('New password must be at least 6 characters long.', { title: 'Invalid password' });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      await window.appUI.alert('New passwords do not match.', { title: 'Password mismatch' });
      return;
    }
    if (newPassword === currentPassword) {
      await window.appUI.alert('New password must be different from the current password.', { title: 'Invalid password' });
      return;
    }

    try {
      await window.apiRequest(`/api/users/${userData.id}/password`, {
        method: 'PATCH',
        body: JSON.stringify({ currentPassword, newPassword })
      });

      changePasswordForm.reset();
      const shouldLogout = await window.appUI.confirm('Password updated successfully.\n\nDo you want to log out now for security?', {
        title: 'Password updated',
        confirmLabel: 'Log out now',
        cancelLabel: 'Stay signed in',
        tone: 'danger'
      });
      if (shouldLogout) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        setTimeout(() => {
          window.location.href = '/index.html';
        }, 300);
      } else {
        window.appUI.toast('Password updated successfully.', 'success');
      }
    } catch (error) {
      await window.appUI.alert(error.message || 'Failed to update password.', { title: 'Password update failed', tone: 'danger' });
    }
  }

  if (changePasswordForm) {
    changePasswordForm.onsubmit = handlePasswordChangeSubmit;
  }

  updateCurrencyDisplay();
  await renderCategories();
});
