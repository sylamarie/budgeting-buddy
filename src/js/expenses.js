// expenses.js
// Handles adding expense records and displaying the list with currency conversion

import { convert } from './currency.js';

const expenseForm = document.getElementById('expenseForm');
const expenseList = document.getElementById('expenseList');

let currentUser = null;
let currentSettings = null;

function getCurrentUser() {
  return JSON.parse(localStorage.getItem('currentUser'));
}

function loadSettings(email) {
  const settings = JSON.parse(localStorage.getItem('settings')) || {};
  return settings[email] || { currency: 'USD' };
}

function formatCurrency(amount, currencySymbol = '$') {
  return `${currencySymbol}${Number(amount).toFixed(2)}`;
}

function saveExpenseRecord(record) {
  const expenseRecords = JSON.parse(localStorage.getItem('expenseRecords')) || [];
  expenseRecords.push(record);
  localStorage.setItem('expenseRecords', JSON.stringify(expenseRecords));
}

function loadExpenseRecords(email) {
  const expenseRecords = JSON.parse(localStorage.getItem('expenseRecords')) || [];
  return expenseRecords.filter(r => r.email === email);
}

async function renderExpenseList(records) {
  expenseList.innerHTML = '';
  if (records.length === 0) {
    expenseList.innerHTML = '<li>No expense records yet.</li>';
    return;
  }

  for (const r of records) {
    const convertedAmount = await convert(r.amountUSD, 'USD', currentSettings.currency);
    const currencySymbol = getCurrencySymbol(currentSettings.currency);

    const li = document.createElement('li');
    li.innerHTML = `
      <span>${new Date(r.date).toLocaleDateString()}</span>
      <span>${r.category}</span>
      <span class="amount">${formatCurrency(convertedAmount, currencySymbol)}</span>
    `;
    expenseList.appendChild(li);
  }
}

  // ✅ Hamburger menu logic
  const hamburger = document.getElementById("hamburger");
  const navMenu = document.getElementById("navMenu");

  if (hamburger && navMenu) {
    hamburger.addEventListener("click", () => {
      navMenu.classList.toggle("show");
    });
  }

function getCurrencySymbol(currencyCode) {
  const symbols = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    AUD: 'A$',
    CAD: 'C$',
    CHF: 'CHF',
    CNY: '¥',
    SEK: 'kr',
    NZD: 'NZ$',
  };
  return symbols[currencyCode] || currencyCode + ' ';
}

function resetForm() {
  expenseForm.reset();
  expenseForm.expenseDate.value = new Date().toISOString().split('T')[0];
}

function validateFormData(amount, category, date) {
  if (amount <= 0) {
    alert('Amount must be greater than zero.');
    return false;
  }
  if (!category) {
    alert('Please select a category.');
    return false;
  }
  if (!date) {
    alert('Please select a date.');
    return false;
  }
  return true;
}

async function init() {
  currentUser = getCurrentUser();
  if (!currentUser) {
    window.location.href = 'login.html';
    return;
  }

  currentSettings = loadSettings(currentUser.email);

  const dateInput = expenseForm.expenseDate;
  const todayStr = new Date().toISOString().split('T')[0];
  dateInput.max = todayStr;
  dateInput.value = todayStr;

  const amountLabel = expenseForm.querySelector('label[for="expenseAmount"]');
  amountLabel.textContent = `Amount (${currentSettings.currency})`;

  const records = loadExpenseRecords(currentUser.email);
  await renderExpenseList(records);

  expenseForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const amountUserCurrency = parseFloat(expenseForm.expenseAmount.value);
    const category = expenseForm.expenseCategory.value;
    const date = expenseForm.expenseDate.value;

    if (!validateFormData(amountUserCurrency, category, date)) return;

    const amountUSD = await convert(amountUserCurrency, currentSettings.currency, 'USD');

    const newRecord = {
      email: currentUser.email,
      amountUSD,
      category,
      date,
    };

    saveExpenseRecord(newRecord);

    const updatedRecords = loadExpenseRecords(currentUser.email);
    await renderExpenseList(updatedRecords);

    resetForm();
  });
}

window.addEventListener('DOMContentLoaded', init);