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

  for (const [index, r] of records.entries()) {
    const convertedAmount = await convert(r.amountUSD, 'USD', currentSettings.currency);
    const currencySymbol = getCurrencySymbol(currentSettings.currency);

    const li = document.createElement('li');
    li.innerHTML = `
      <span>${new Date(r.date).toLocaleDateString()}</span>
      <span>${r.category}</span>
      <span class="amount">${formatCurrency(convertedAmount, currencySymbol)}</span>
      <button class="edit-btn" data-index="${index}">Edit</button>
      <button class="delete-btn" data-index="${index}">Delete</button>
    `;
    incomeList.appendChild(li);
  }

  document.querySelectorAll('.edit-btn').forEach(button => {
    button.addEventListener('click', handleEdit);
  });

  document.querySelectorAll('.delete-btn').forEach(button => {
    button.addEventListener('click', handleDelete);
  });
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

// Edit handler
function handleEdit(event) {
  const index = parseInt(event.target.dataset.index);
  const records = loadIncomeRecords(currentUser.email);
  const record = records[index];

  convert(record.amountUSD, 'USD', currentSettings.currency).then(userAmount => {
    incomeForm.incomeAmount.value = userAmount.toFixed(2);
    incomeForm.incomeCategory.value = record.category;
    incomeForm.incomeDate.value = record.date;

    records.splice(index, 1);
    localStorage.setItem('incomeRecords', JSON.stringify(records));
    renderIncomeList(records);
  });
}

// Delete handler
function handleDelete(event) {
  const index = parseInt(event.target.dataset.index);
  const records = loadIncomeRecords(currentUser.email);
  records.splice(index, 1);
  localStorage.setItem('incomeRecords', JSON.stringify(records));
  renderIncomeList(records);
}

async function init() {
  currentUser = getCurrentUser();
  if (!currentUser) {
    window.location.href = 'login.html';
    return;
  }

  currentSettings = loadSettings(currentUser.email);

  const dateInput = incomeForm.incomeDate;
  const todayStr = new Date().toISOString().split('T')[0];
  dateInput.max = todayStr;
  dateInput.value = todayStr;

  const amountLabel = incomeForm.querySelector('label[for="incomeAmount"]');
  amountLabel.textContent = `Amount (${currentSettings.currency})`;

  const records = loadIncomeRecords(currentUser.email);
  await renderIncomeList(records);

  incomeForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const amountUserCurrency = parseFloat(incomeForm.incomeAmount.value);
    const category = incomeForm.incomeCategory.value;
    const date = incomeForm.incomeDate.value;

    if (!validateFormData(amountUserCurrency, category, date)) return;

    const amountUSD = await convert(amountUserCurrency, currentSettings.currency, 'USD');

    const newRecord = {
      email: currentUser.email,
      amountUSD,
      category,
      date,
    };

    saveIncomeRecord(newRecord);

    const updatedRecords = loadIncomeRecords(currentUser.email);
    await renderIncomeList(updatedRecords);

    resetForm();
  });
}

window.addEventListener('DOMContentLoaded', init);