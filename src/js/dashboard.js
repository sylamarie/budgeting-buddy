// dashboard.js
// Shows user name and totals for income, expenses, savings

// Simulated storage keys:
// currentUser: { name, email, password }
// incomeRecords: [{email, amount, category, date}]
// expenseRecords: [{email, amount, category, date}]
// savingsGoals: [{email, goalName, targetAmount, currentAmount, deadline}]

// dashboard.js
// Shows totals and charts on the dashboard page

import { preparePieChart, prepareBarChart } from './chart.js';
import { convert } from './currency.js';

const totalIncomeEl = document.getElementById('totalIncome');
const totalExpensesEl = document.getElementById('totalExpenses');
const savingsProgressEl = document.getElementById('savingsProgress');
const logoutBtn = document.getElementById('logoutBtn');

function getCurrentUser() {
  return JSON.parse(localStorage.getItem('currentUser'));
}

function loadIncomeRecords(email) {
  const incomeRecords = JSON.parse(localStorage.getItem('incomeRecords')) || [];
  return incomeRecords.filter(r => r.email === email);
}

function loadExpenseRecords(email) {
  const expenseRecords = JSON.parse(localStorage.getItem('expenseRecords')) || [];
  return expenseRecords.filter(r => r.email === email);
}

function loadSavingsGoals(email) {
  const savingsGoals = JSON.parse(localStorage.getItem('savingsGoals')) || [];
  return savingsGoals.filter(goal => goal.email === email);
}

function sumAmounts(records) {
  return records.reduce((sum, r) => sum + Number(r.amount), 0);
}

function calculateSavingsProgress(goals) {
  if (goals.length === 0) return 0;
  const totalTarget = goals.reduce((sum, g) => sum + Number(g.goalAmount), 0);
  const totalSaved = goals.reduce((sum, g) => sum + Number(g.savedSoFar), 0);
  if (totalTarget === 0) return 0;
  return (totalSaved / totalTarget) * 100;
}

function groupExpensesByCategory(expenses) {
  const groups = {};
  expenses.forEach(e => {
    if (!groups[e.category]) groups[e.category] = 0;
    groups[e.category] += Number(e.amount);
  });
  return groups;
}

function groupIncomeByMonth(incomes) {
  const groups = {};
  incomes.forEach(i => {
    const date = new Date(i.date);
    const ym = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!groups[ym]) groups[ym] = 0;
    groups[ym] += Number(i.amount);
  });
  return groups;
}

function formatCurrency(amount) {
  return `$${amount.toFixed(2)}`;
}

function init() {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = 'login.html';
    return;
  }

  const incomeRecords = loadIncomeRecords(user.email);
  const expenseRecords = loadExpenseRecords(user.email);
  const savingsGoals = loadSavingsGoals(user.email);

  const totalIncome = sumAmounts(incomeRecords);
  const totalExpenses = sumAmounts(expenseRecords);
  const savingsProgress = calculateSavingsProgress(savingsGoals);

  totalIncomeEl.textContent = formatCurrency(totalIncome);
  totalExpensesEl.textContent = formatCurrency(totalExpenses);
  savingsProgressEl.textContent = `${savingsProgress.toFixed(0)}%`;

  const expenseGroups = groupExpensesByCategory(expenseRecords);
  const expenseLabels = Object.keys(expenseGroups);
  const expenseData = Object.values(expenseGroups);
  preparePieChart('expenseChart', expenseLabels, expenseData);

  const incomeGroups = groupIncomeByMonth(incomeRecords);
  const incomeLabels = Object.keys(incomeGroups).sort();
  const incomeData = incomeLabels.map(label => incomeGroups[label]);
  prepareBarChart('incomeChart', incomeLabels, incomeData);

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('currentUser');
      window.location.href = 'login.html';
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
}

// ✅ This must be defined outside init()
async function updateTotalsDisplay(userData, userCurrency) {
  try {
    const incomeInCurrency = await convert(userData.incomeTotal, 'USD', userCurrency);
    const expensesInCurrency = await convert(userData.expensesTotal, 'USD', userCurrency);
    const balance = incomeInCurrency - expensesInCurrency;

    document.getElementById('incomeTotal').textContent = `${userCurrency} ${incomeInCurrency.toFixed(2)}`;
    document.getElementById('expensesTotal').textContent = `${userCurrency} ${expensesInCurrency.toFixed(2)}`;
    document.getElementById('balanceTotal').textContent = `${userCurrency} ${balance.toFixed(2)}`;
  } catch (error) {
    console.error('Currency conversion error:', error);
    document.getElementById('incomeTotal').textContent = `USD ${userData.incomeTotal.toFixed(2)}`;
    document.getElementById('expensesTotal').textContent = `USD ${userData.expensesTotal.toFixed(2)}`;
    document.getElementById('balanceTotal').textContent = `USD ${(userData.incomeTotal - userData.expensesTotal).toFixed(2)}`;
  }
}

async function loadDashboard() {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = 'login.html';
    return;
  }

  const settings = JSON.parse(localStorage.getItem('settings')) || {};
  const userSettings = settings[user.email] || { currency: 'USD' };

  const userData = {
    incomeTotal: 1500,
    expensesTotal: 900,
  };

  await updateTotalsDisplay(userData, userSettings.currency);
}

window.addEventListener('DOMContentLoaded', init);
window.addEventListener('DOMContentLoaded', loadDashboard);
export { updateTotalsDisplay };