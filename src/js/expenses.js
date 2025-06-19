document.addEventListener('DOMContentLoaded', function() {
    // Check if user is authenticated
    if (!auth.isUserLoggedIn()) {
        return; // Auth system will handle the redirect
    }

    // Initialize data manager
    dataManager.init();

    // Set default date to today
    document.getElementById('date').value = new Date().toISOString().split('T')[0];

    // Load expense data
    loadExpenseData();

    // Form submission
    document.getElementById('expense-form').addEventListener('submit', function(e) {
        e.preventDefault();
        addExpense();
    });
});

function loadExpenseData() {
    const expenses = dataManager.getExpenses();
    updateTotalExpenses(expenses);
    displayRecentExpenses(expenses);
    displayAllExpenses(expenses);
}

function updateTotalExpenses(expenses) {
    const total = expenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
    document.getElementById('total-expenses').textContent = `$${total.toFixed(2)}`;
}

function displayRecentExpenses(expenses) {
    const recentContainer = document.getElementById('recent-expenses');
    const recentExpenses = expenses.slice(-5).reverse(); // Last 5 entries

    if (recentExpenses.length === 0) {
        recentContainer.innerHTML = '<p class="text-gray-500 text-sm">No expense entries yet.</p>';
        return;
    }

    recentContainer.innerHTML = recentExpenses.map(expense => `
        <div class="flex justify-between items-center p-3 bg-gray-50 rounded">
            <div>
                <p class="font-medium text-gray-900">$${parseFloat(expense.amount).toFixed(2)}</p>
                <p class="text-sm text-gray-600">${expense.category} • ${new Date(expense.date).toLocaleDateString()}</p>
            </div>
        </div>
    `).join('');
}

function displayAllExpenses(expenses) {
    const allContainer = document.getElementById('all-expenses');

    if (expenses.length === 0) {
        allContainer.innerHTML = '<p class="text-gray-500 text-center py-8">No expense entries yet. Add your first expense above!</p>';
        return;
    }

    allContainer.innerHTML = expenses.reverse().map(expense => `
        <div class="flex justify-between items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <div class="flex-1">
                <div class="flex items-center space-x-3">
                    <div class="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                        <span class="text-red-600 font-medium">$</span>
                    </div>
                    <div>
                        <p class="font-medium text-gray-900">$${parseFloat(expense.amount).toFixed(2)}</p>
                        <p class="text-sm text-gray-600">${expense.category}</p>
                    </div>
                </div>
            </div>
            <div class="flex items-center space-x-2">
                <span class="text-sm text-gray-500">${new Date(expense.date).toLocaleDateString()}</span>
                <button onclick="editExpense('${expense.id}')" class="text-blue-600 hover:text-blue-800 p-1">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                    </svg>
                </button>
                <button onclick="deleteExpense('${expense.id}')" class="text-red-600 hover:text-red-800 p-1">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                </button>
            </div>
        </div>
    `).join('');
}

async function addExpense() {
    const amount = document.getElementById('amount').value;
    const category = document.getElementById('category').value;
    const date = document.getElementById('date').value;

    if (!amount || !category || !date) {
        alert('Please fill in all fields');
        return;
    }

    try {
        const newExpense = dataManager.addExpense(amount, category, date);
        document.getElementById('expense-form').reset();
        document.getElementById('date').value = new Date().toISOString().split('T')[0];
        loadExpenseData();
        
        // Show success message
        showMessage('Expense added successfully!', 'success');
    } catch (error) {
        showMessage('Failed to add expense. Please try again.', 'error');
    }
}

async function deleteExpense(id) {
    try {
        const deleted = await dataManager.deleteExpense(id);
        if (deleted) {
            loadExpenseData();
            showMessage('Expense deleted successfully!', 'success');
        }
    } catch (error) {
        showMessage('Failed to delete expense. Please try again.', 'error');
    }
}

function editExpense(id) {
    const expenses = dataManager.getExpenses();
    const expense = expenses.find(exp => exp.id === id);
    
    if (!expense) return;

    // Populate form with existing data
    document.getElementById('amount').value = expense.amount;
    document.getElementById('category').value = expense.category;
    document.getElementById('date').value = expense.date;

    // Change form button text
    const submitBtn = document.querySelector('#expense-form button[type="submit"]');
    submitBtn.textContent = 'Update Expense';
    submitBtn.onclick = function(e) {
        e.preventDefault();
        updateExpense(id);
    };

    // Scroll to form
    document.getElementById('expense-form').scrollIntoView({ behavior: 'smooth' });
}

function updateExpense(id) {
    const amount = document.getElementById('amount').value;
    const category = document.getElementById('category').value;
    const date = document.getElementById('date').value;

    if (!amount || !category || !date) {
        alert('Please fill in all fields');
        return;
    }

    try {
        const updatedExpense = dataManager.updateExpense(id, amount, category, date);
        if (updatedExpense) {
            document.getElementById('expense-form').reset();
            document.getElementById('date').value = new Date().toISOString().split('T')[0];
            
            // Reset form button
            const submitBtn = document.querySelector('#expense-form button[type="submit"]');
            submitBtn.textContent = 'Add Expense';
            submitBtn.onclick = function(e) {
                e.preventDefault();
                addExpense();
            };

            loadExpenseData();
            showMessage('Expense updated successfully!', 'success');
        }
    } catch (error) {
        showMessage('Failed to update expense. Please try again.', 'error');
    }
}

function showMessage(message, type) {
    // Create message element
    const messageDiv = document.createElement('div');
    messageDiv.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
        type === 'success' ? 'bg-green-100 text-green-800 border border-green-400' : 'bg-red-100 text-red-800 border border-red-400'
    }`;
    messageDiv.textContent = message;

    // Add to page
    document.body.appendChild(messageDiv);

    // Remove after 3 seconds
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.parentNode.removeChild(messageDiv);
        }
    }, 3000);
}