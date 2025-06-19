// Data Management System
class DataManager {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        // Get current user from auth
        const userData = localStorage.getItem('userData');
        if (userData) {
            this.currentUser = JSON.parse(userData);
        }
    }

    // Generic data operations
    getData(type) {
        if (!this.currentUser) return [];
        const key = `${this.currentUser.id}_${type}`;
        return JSON.parse(localStorage.getItem(key) || '[]');
    }

    saveData(type, data) {
        if (!this.currentUser) return false;
        const key = `${this.currentUser.id}_${type}`;
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    }

    addItem(type, item) {
        const data = this.getData(type);
        const newItem = {
            id: Date.now().toString(),
            ...item,
            createdAt: new Date().toISOString(),
            userId: this.currentUser.id
        };
        data.push(newItem);
        this.saveData(type, data);
        return newItem;
    }

    updateItem(type, id, updates) {
        const data = this.getData(type);
        const index = data.findIndex(item => item.id === id);
        if (index !== -1) {
            data[index] = { ...data[index], ...updates, updatedAt: new Date().toISOString() };
            this.saveData(type, data);
            return data[index];
        }
        return null;
    }

    deleteItem(type, id) {
        return new Promise((resolve) => {
            const data = this.getData(type);
            const item = data.find(item => item.id === id);
            
            if (!item) {
                resolve(false);
                return;
            }

            // Show confirmation dialog
            const confirmed = confirm(`Are you sure you want to delete this ${type.slice(0, -1)}?\n\n${this.getItemDescription(type, item)}`);
            
            if (confirmed) {
                const filteredData = data.filter(item => item.id !== id);
                this.saveData(type, filteredData);
                resolve(true);
            } else {
                resolve(false);
            }
        });
    }

    getItemDescription(type, item) {
        switch (type) {
            case 'income':
                return `Amount: $${item.amount} | Category: ${item.category} | Date: ${new Date(item.date).toLocaleDateString()}`;
            case 'expenses':
                return `Amount: $${item.amount} | Category: ${item.category} | Date: ${new Date(item.date).toLocaleDateString()}`;
            case 'savings':
                return `Goal: ${item.goalName} | Target: $${item.targetAmount} | Saved: $${item.savedAmount}`;
            case 'settings':
                return `Setting: ${item.settingName}`;
            default:
                return 'Item';
        }
    }

    // Income specific methods
    getIncome() {
        return this.getData('income');
    }

    addIncome(amount, category, date) {
        return this.addItem('income', { amount, category, date });
    }

    updateIncome(id, amount, category, date) {
        return this.updateItem('income', id, { amount, category, date });
    }

    deleteIncome(id) {
        return this.deleteItem('income', id);
    }

    // Expenses specific methods
    getExpenses() {
        return this.getData('expenses');
    }

    addExpense(amount, category, date) {
        return this.addItem('expenses', { amount, category, date });
    }

    updateExpense(id, amount, category, date) {
        return this.updateItem('expenses', id, { amount, category, date });
    }

    deleteExpense(id) {
        return this.deleteItem('expenses', id);
    }

    // Savings specific methods
    getSavings() {
        return this.getData('savings');
    }

    addSavingsGoal(goalName, targetAmount, savedAmount = 0) {
        return this.addItem('savings', { goalName, targetAmount, savedAmount });
    }

    updateSavingsGoal(id, goalName, targetAmount, savedAmount) {
        return this.updateItem('savings', id, { goalName, targetAmount, savedAmount });
    }

    deleteSavingsGoal(id) {
        return this.deleteItem('savings', id);
    }

    // Settings specific methods
    getSettings() {
        return this.getData('settings');
    }

    saveSetting(settingName, value) {
        const settings = this.getSettings();
        const existingIndex = settings.findIndex(s => s.settingName === settingName);
        
        if (existingIndex !== -1) {
            settings[existingIndex].value = value;
        } else {
            settings.push({ settingName, value });
        }
        
        this.saveData('settings', settings);
        return true;
    }

    getSetting(settingName, defaultValue = null) {
        const settings = this.getSettings();
        const setting = settings.find(s => s.settingName === settingName);
        return setting ? setting.value : defaultValue;
    }

    // Dashboard calculations
    getDashboardStats() {
        const income = this.getIncome();
        const expenses = this.getExpenses();
        const savings = this.getSavings();

        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        const monthlyIncome = income
            .filter(item => {
                const itemDate = new Date(item.date);
                return itemDate.getMonth() === currentMonth && itemDate.getFullYear() === currentYear;
            })
            .reduce((sum, item) => sum + parseFloat(item.amount), 0);

        const monthlyExpenses = expenses
            .filter(item => {
                const itemDate = new Date(item.date);
                return itemDate.getMonth() === currentMonth && itemDate.getFullYear() === currentYear;
            })
            .reduce((sum, item) => sum + parseFloat(item.amount), 0);

        const totalSavings = savings.reduce((sum, goal) => sum + parseFloat(goal.savedAmount), 0);
        const totalTarget = savings.reduce((sum, goal) => sum + parseFloat(goal.targetAmount), 0);
        const savingsProgress = totalTarget > 0 ? (totalSavings / totalTarget) * 100 : 0;

        return {
            monthlyIncome,
            monthlyExpenses,
            balance: monthlyIncome - monthlyExpenses,
            totalSavings,
            totalTarget,
            savingsProgress
        };
    }

    // Export/Import functionality
    exportData() {
        const data = {
            income: this.getIncome(),
            expenses: this.getExpenses(),
            savings: this.getSavings(),
            settings: this.getSettings(),
            exportDate: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `budgeting-data-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    importData(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            if (data.income) this.saveData('income', data.income);
            if (data.expenses) this.saveData('expenses', data.expenses);
            if (data.savings) this.saveData('savings', data.savings);
            if (data.settings) this.saveData('settings', data.settings);
            return true;
        } catch (error) {
            console.error('Import failed:', error);
            return false;
        }
    }

    // Clear all data
    clearAllData() {
        return new Promise((resolve) => {
            const confirmed = confirm('Are you sure you want to clear ALL your data? This action cannot be undone.');
            
            if (confirmed) {
                const keys = ['income', 'expenses', 'savings', 'settings'];
                keys.forEach(key => {
                    const dataKey = `${this.currentUser.id}_${key}`;
                    localStorage.removeItem(dataKey);
                });
                resolve(true);
            } else {
                resolve(false);
            }
        });
    }
}

// Initialize data manager
const dataManager = new DataManager(); 