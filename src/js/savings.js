// savings.js
// Manage savings goals, add new goals, and show progress bars

const savingsForm = document.getElementById('savingsForm');
const savingsList = document.getElementById('savingsList');

function getCurrentUser() {
  return JSON.parse(localStorage.getItem('currentUser'));
}

function saveSavingsGoal(goal) {
  const savingsGoals = JSON.parse(localStorage.getItem('savingsGoals')) || [];
  savingsGoals.push(goal);
  localStorage.setItem('savingsGoals', JSON.stringify(savingsGoals));
}

function loadSavingsGoals(email) {
  const savingsGoals = JSON.parse(localStorage.getItem('savingsGoals')) || [];
  return savingsGoals.filter(goal => goal.email === email);
}

function createProgressBar(percentage) {
  const progressBar = document.createElement('div');
  progressBar.className = 'progress-bar';

  const progressFill = document.createElement('div');
  progressFill.className = 'progress-fill';
  progressFill.style.width = `${Math.min(percentage, 100)}%`;
  progressFill.textContent = `${Math.min(percentage, 100).toFixed(0)}%`;

  progressBar.appendChild(progressFill);
  return progressBar;
}

function renderSavingsList(goals) {
  savingsList.innerHTML = '';

  if (goals.length === 0) {
    savingsList.innerHTML = '<li>No savings goals yet.</li>';
    return;
  }

  goals.forEach(goal => {
    const li = document.createElement('li');

    const saved = Number(goal.savedSoFar);
    const target = Number(goal.goalAmount);
    const progressPercent = (saved / target) * 100;

    li.innerHTML = `
      <h3>${goal.goalName}</h3>
      <div class="amounts">Saved: $${saved.toFixed(2)} / Target: $${target.toFixed(2)}</div>
    `;

    const progressBar = createProgressBar(progressPercent);
    li.appendChild(progressBar);

    savingsList.appendChild(li);
  });
}

function resetForm() {
  savingsForm.reset();
}

function validateFormData(goalName, goalAmount, savedSoFar) {
  if (goalName.length < 3) {
    alert('Goal name must be at least 3 characters.');
    return false;
  }
  if (goalAmount <= 0) {
    alert('Target amount must be greater than zero.');
    return false;
  }
  if (savedSoFar < 0) {
    alert('Saved amount cannot be negative.');
    return false;
  }
  if (savedSoFar > goalAmount) {
    alert('Saved amount cannot be more than target amount.');
    return false;
  }
  return true;
}

function init() {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = 'login.html';
    return;
  }

  // Load existing savings goals for user
  const goals = loadSavingsGoals(user.email);
  renderSavingsList(goals);

  savingsForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const goalName = savingsForm.goalName.value.trim();
    const goalAmount = parseFloat(savingsForm.goalAmount.value);
    const savedSoFar = parseFloat(savingsForm.savedSoFar.value);

    if (!validateFormData(goalName, goalAmount, savedSoFar)) return;

    const newGoal = {
      email: user.email,
      goalName,
      goalAmount,
      savedSoFar,
    };

    saveSavingsGoal(newGoal);

    // Update UI
    const updatedGoals = loadSavingsGoals(user.email);
    renderSavingsList(updatedGoals);
    resetForm();
  });
}

window.addEventListener('DOMContentLoaded', init);