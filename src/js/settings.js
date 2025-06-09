// settings.js
// Handle currency preference and spending categories management

const currencySelect = document.getElementById('currencySelect');
const categoryForm = document.getElementById('categoryForm');
const categoryInput = document.getElementById('categoryInput');
const categoryList = document.getElementById('categoryList');
const logoutBtn = document.getElementById('logoutBtn');

const AVAILABLE_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY'];

function getCurrentUser() {
  return JSON.parse(localStorage.getItem('currentUser'));
}

function loadSettings(email) {
  const settings = JSON.parse(localStorage.getItem('settings')) || {};
  return settings[email] || { currency: 'USD', categories: ['Food', 'Bills', 'Fun', 'Rent'] };
}

function saveSettings(email, userSettings) {
  const settings = JSON.parse(localStorage.getItem('settings')) || {};
  settings[email] = userSettings;
  localStorage.setItem('settings', JSON.stringify(settings));
}

function populateCurrencySelect(selectedCurrency) {
  currencySelect.innerHTML = '';
  AVAILABLE_CURRENCIES.forEach(currency => {
    const option = document.createElement('option');
    option.value = currency;
    option.textContent = currency;
    if (currency === selectedCurrency) option.selected = true;
    currencySelect.appendChild(option);
  });
}

function renderCategories(categories) {
  categoryList.innerHTML = '';
  categories.forEach((cat, index) => {
    const li = document.createElement('li');
    li.textContent = cat;

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '✕';
    deleteBtn.setAttribute('aria-label', `Delete category ${cat}`);
    deleteBtn.addEventListener('click', () => {
      categories.splice(index, 1);
      saveSettings(currentUser.email, { currency: currentSettings.currency, categories });
      renderCategories(categories);
    });

    li.appendChild(deleteBtn);
    categoryList.appendChild(li);
  });
}

  // ✅ Hamburger menu logic
  const hamburger = document.getElementById("hamburger");
  const navMenu = document.getElementById("navMenu");

  if (hamburger && navMenu) {
    hamburger.addEventListener("click", () => {
      navMenu.classList.toggle("show");
    });
  }

let currentUser = null;
let currentSettings = null;

function init() {
  currentUser = getCurrentUser();
  if (!currentUser) {
    window.location.href = 'login.html';
    return;
  }

  currentSettings = loadSettings(currentUser.email);

  populateCurrencySelect(currentSettings.currency);
  renderCategories(currentSettings.categories);

  currencySelect.addEventListener('change', () => {
    currentSettings.currency = currencySelect.value;
    saveSettings(currentUser.email, currentSettings);
  });

  categoryForm.addEventListener('submit', e => {
    e.preventDefault();
    const newCategory = categoryInput.value.trim();
    if (newCategory && !currentSettings.categories.includes(newCategory)) {
      currentSettings.categories.push(newCategory);
      saveSettings(currentUser.email, currentSettings);
      renderCategories(currentSettings.categories);
      categoryInput.value = '';
    }
  });

  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('currentUser');
    window.location.href = 'login.html';
  });
}

window.addEventListener('DOMContentLoaded', init);