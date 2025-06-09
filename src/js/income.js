// income.js
// Handles adding income records and displaying the list with currency conversion

import { convert } from './currency.js';

const incomeForm = document.getElementById('incomeForm');
const incomeList = document.getElementById('incomeList');

let currentUser = null;
let currentSettings = null;

// Get logged-in user from localStorage
function getCurrentUser() {
  return JSON.parse(localStorage.getItem('currentUser'));
}

// Get settings (including preferred currency) for user
function loadSettings(email) {
  const settings = JSON.parse(localStorage.getItem('settings')) || {};
  return settings[email] || { currency: 'USD' };
}

// Format amount with currency symbol
function formatCurrency(amount, currencySymbol = '$') {
  return `${currencySymbol}${Number(amount).toFixed(2)}`;
}

// Save income record to localStorage (store amount in USD)
function saveIncomeRecord(record) {
  const incomeRecords = JSON.parse(localStorage.getItem('incomeRecords')) || [];
  incomeRecords.push(record);
  localStorage.setItem('incomeRecords', JSON.stringify(incomeRecords));
}

// Load income records for current user
function loadIncomeRecords(email) {
  const incomeRecords = JSON.parse(localStorage.getItem('incomeRecords')) || [];
  return incomeRecords.filter(r => r.email === email);
}

// Render income list with amounts converted to user's currency
async function renderIncomeList(records) {
  incomeList.innerHTML = '';
  if (records.length === 0) {
    incomeList.innerHTML = '<li>No income records yet.</li>';
    return;
  }

  for (const r of records) {
    // Convert USD amount to user's currency
    const convertedAmount = await convert(r.amountUSD, 'USD', currentSettings.currency);

    // Get currency symbol from currency module or fallback
    const currencySymbol = getCurrencySymbol(currentSettings.currency);

    const li = document.createElement('li');
    li.innerHTML = `
      <span>${new Date(r.date).toLocaleDateString()}</span>
      <span>${r.category}</span>
      <span class="amount">${formatCurrency(convertedAmount, currencySymbol)}</span>
    `;
    incomeList.appendChild(li);
  }
}

// Get currency symbol (basic mapping)
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

// Reset form fields
function resetForm() {
  incomeForm.reset();
  // Reset date input to today
  incomeForm.incomeDate.value = new Date().toISOString().split('T')[0];
}

// Validate form data
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

  // Set max date to today for date input and default value
  const dateInput = incomeForm.incomeDate;
  const todayStr = new Date().toISOString().split('T')[0];
  dateInput.max = todayStr;
  dateInput.value = todayStr;

  // Update amount label with currency code
  const amountLabel = incomeForm.querySelector('label[for="incomeAmount"]');
  amountLabel.textContent = `Amount (${currentSettings.currency})`;

  // Load and render existing income records
  const records = loadIncomeRecords(currentUser.email);
  await renderIncomeList(records);

  incomeForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const amountUserCurrency = parseFloat(incomeForm.incomeAmount.value);
    const category = incomeForm.incomeCategory.value;
    const date = incomeForm.incomeDate.value;

    if (!validateFormData(amountUserCurrency, category, date)) return;

    // Convert entered amount to USD for consistent storage
    const amountUSD = await convert(amountUserCurrency, currentSettings.currency, 'USD');

    const newRecord = {
      email: currentUser.email,
      amountUSD,
      category,
      date,
    };

    saveIncomeRecord(newRecord);

    // Update UI with new record
    const updatedRecords = loadIncomeRecords(currentUser.email);
    await renderIncomeList(updatedRecords);

    resetForm();
  });
}

window.addEventListener('DOMContentLoaded', init);