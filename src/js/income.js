document.addEventListener('DOMContentLoaded', function() {
    // Check if user is authenticated
    if (!auth.isUserLoggedIn()) {
        return; // Auth system will handle the redirect
    }

    // Initialize data manager
    dataManager.init();

    // Set default date to today
    document.getElementById('date').value = new Date().toISOString().split('T')[0];

    // Load income data
    loadIncomeData();

    // Form submission
    document.getElementById('income-form').addEventListener('submit', function(e) {
        e.preventDefault();
        addIncome();
    });
});

function loadIncomeData() {
    const incomes = dataManager.getIncome();
    updateTotalIncome(incomes);
    displayRecentIncomes(incomes);
    displayAllIncomes(incomes);
}

function updateTotalIncome(incomes) {
    const total = incomes.reduce((sum, income) => sum + parseFloat(income.amount), 0);
    document.getElementById('total-income').textContent = `$${total.toFixed(2)}`;
}

function displayRecentIncomes(incomes) {
    const recentContainer = document.getElementById('recent-incomes');
    const recentIncomes = incomes.slice(-5).reverse(); // Last 5 entries

    if (recentIncomes.length === 0) {
        recentContainer.innerHTML = '<p class="text-gray-500 text-sm">No income entries yet.</p>';
        return;
    }

    recentContainer.innerHTML = recentIncomes.map(income => `
        <div class="flex justify-between items-center p-3 bg-gray-50 rounded">
            <div>
                <p class="font-medium text-gray-900">$${parseFloat(income.amount).toFixed(2)}</p>
                <p class="text-sm text-gray-600">${income.category} • ${new Date(income.date).toLocaleDateString()}</p>
            </div>
        </div>
    `).join('');
}

function displayAllIncomes(incomes) {
    const allContainer = document.getElementById('all-incomes');

    if (incomes.length === 0) {
        allContainer.innerHTML = '<p class="text-gray-500 text-center py-8">No income entries yet. Add your first income above!</p>';
        return;
    }

    allContainer.innerHTML = incomes.reverse().map(income => `
        <div class="flex justify-between items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <div class="flex-1">
                <div class="flex items-center space-x-3">
                    <div class="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <span class="text-green-600 font-medium">$$</span>
                    </div>
                    <div>
                        <p class="font-medium text-gray-900">$${parseFloat(income.amount).toFixed(2)}</p>
                        <p class="text-sm text-gray-600">${income.category}</p>
                    </div>
                </div>
            </div>
            <div class="flex items-center space-x-2">
                <span class="text-sm text-gray-500">${new Date(income.date).toLocaleDateString()}</span>
                <button onclick="editIncome('${income.id}')" class="text-blue-600 hover:text-blue-800 p-1">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                    </svg>
                </button>
                <button onclick="deleteIncome('${income.id}')" class="text-red-600 hover:text-red-800 p-1">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                </button>
            </div>
        </div>
    `).join('');
}

async function addIncome() {
    const amount = document.getElementById('amount').value;
    const category = document.getElementById('category').value;
    const date = document.getElementById('date').value;

    if (!amount || !category || !date) {
        alert('Please fill in all fields');
        return;
    }

    try {
        const newIncome = dataManager.addIncome(amount, category, date);
        document.getElementById('income-form').reset();
        document.getElementById('date').value = new Date().toISOString().split('T')[0];
        loadIncomeData();
        
        // Show success message
        showMessage('Income added successfully!', 'success');
    } catch (error) {
        showMessage('Failed to add income. Please try again.', 'error');
    }
}

async function deleteIncome(id) {
    try {
        const deleted = await dataManager.deleteIncome(id);
        if (deleted) {
            loadIncomeData();
            showMessage('Income deleted successfully!', 'success');
        }
    } catch (error) {
        showMessage('Failed to delete income. Please try again.', 'error');
    }
}

function editIncome(id) {
    const incomes = dataManager.getIncome();
    const income = incomes.find(inc => inc.id === id);
    
    if (!income) return;

    // Populate form with existing data
    document.getElementById('amount').value = income.amount;
    document.getElementById('category').value = income.category;
    document.getElementById('date').value = income.date;

    // Change form button text
    const submitBtn = document.querySelector('#income-form button[type="submit"]');
    submitBtn.textContent = 'Update Income';
    submitBtn.onclick = function(e) {
        e.preventDefault();
        updateIncome(id);
    };

    // Scroll to form
    document.getElementById('income-form').scrollIntoView({ behavior: 'smooth' });
}

function updateIncome(id) {
    const amount = document.getElementById('amount').value;
    const category = document.getElementById('category').value;
    const date = document.getElementById('date').value;

    if (!amount || !category || !date) {
        alert('Please fill in all fields');
        return;
    }

    try {
        const updatedIncome = dataManager.updateIncome(id, amount, category, date);
        if (updatedIncome) {
            document.getElementById('income-form').reset();
            document.getElementById('date').value = new Date().toISOString().split('T')[0];
            
            // Reset form button
            const submitBtn = document.querySelector('#income-form button[type="submit"]');
            submitBtn.textContent = 'Add Income';
            submitBtn.onclick = function(e) {
                e.preventDefault();
                addIncome();
            };

            loadIncomeData();
            showMessage('Income updated successfully!', 'success');
        }
    } catch (error) {
        showMessage('Failed to update income. Please try again.', 'error');
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