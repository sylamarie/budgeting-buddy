class DataManager {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        const userData = localStorage.getItem('userData');
        if (userData) {
            this.currentUser = JSON.parse(userData);
        }
    }

    requireUser() {
        this.init();
        if (!this.currentUser?.id) {
            throw new Error('You must be logged in to access data.');
        }

        return this.currentUser.id;
    }

    async getData(type) {
        const userId = this.requireUser();
        const payload = await window.apiRequest(`/api/users/${userId}/${type}`);
        if (type === 'settings') {
            this.cacheSettings(payload.items || []);
        }
        return payload.items || [];
    }

    async saveData(type, data) {
        const userId = this.requireUser();
        const payload = await window.apiRequest(`/api/users/${userId}/${type}`, {
            method: 'PUT',
            body: JSON.stringify({ items: data })
        });

        if (type === 'settings') {
            this.cacheSettings(payload.items || []);
        }

        return payload.items || [];
    }

    async addItem(type, item) {
        const userId = this.requireUser();
        const payload = await window.apiRequest(`/api/users/${userId}/${type}`, {
            method: 'POST',
            body: JSON.stringify(item)
        });

        if (type === 'settings') {
            const settings = [...this.getCachedSettings(), payload.item];
            this.cacheSettings(settings);
        }

        return payload.item;
    }

    async updateItem(type, id, updates) {
        const userId = this.requireUser();
        const payload = await window.apiRequest(`/api/users/${userId}/${type}/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(updates)
        });

        if (type === 'settings') {
            const settings = this.getCachedSettings().map((item) => item.id === id ? payload.item : item);
            this.cacheSettings(settings);
        }

        return payload.item;
    }

    async deleteItem(type, id) {
        const data = await this.getData(type);
        const item = data.find((entry) => entry.id === id);

        if (!item) {
            return false;
        }

        const confirmed = await window.appUI.confirm(this.getItemDescription(type, item), {
            title: `Delete ${this.getSingularTypeLabel(type)}`,
            confirmLabel: 'Delete',
            cancelLabel: 'Cancel',
            tone: 'danger'
        });
        if (!confirmed) {
            return false;
        }

        const userId = this.requireUser();
        await window.apiRequest(`/api/users/${userId}/${type}/${id}`, {
            method: 'DELETE'
        });
        return true;
    }

    getItemDescription(type, item) {
        const amount = (value) => window.appUI.formatCurrency(value);

        switch (type) {
            case 'income':
                return `Amount: ${amount(item.amount)}\nCategory: ${item.category}\nDate: ${new Date(item.date).toLocaleDateString()}`;
            case 'expenses':
                return `Amount: ${amount(item.amount)}\nCategory: ${item.category}\nDate: ${new Date(item.date).toLocaleDateString()}`;
            case 'savings':
                return `Goal: ${item.goalName}\nTarget: ${amount(item.targetAmount)}\nSaved: ${amount(item.savedAmount)}`;
            case 'settings':
                return `Setting: ${item.settingName}`;
            default:
                return 'Item';
        }
    }

    getSingularTypeLabel(type) {
        const labels = {
            income: 'income entry',
            expenses: 'expense entry',
            savings: 'savings goal',
            settings: 'setting'
        };

        return labels[type] || 'item';
    }

    async getIncome() {
        return this.getData('income');
    }

    async addIncome(amount, category, date) {
        return this.addItem('income', { amount, category, date });
    }

    async updateIncome(id, amount, category, date) {
        return this.updateItem('income', id, { amount, category, date });
    }

    async deleteIncome(id) {
        return this.deleteItem('income', id);
    }

    async getExpenses() {
        return this.getData('expenses');
    }

    async addExpense(amount, category, date) {
        return this.addItem('expenses', { amount, category, date });
    }

    async updateExpense(id, amount, category, date) {
        return this.updateItem('expenses', id, { amount, category, date });
    }

    async deleteExpense(id) {
        return this.deleteItem('expenses', id);
    }

    async getSavings() {
        return this.getData('savings');
    }

    async addSavingsGoal(goalName, targetAmount, savedAmount = 0) {
        return this.addItem('savings', { goalName, targetAmount, savedAmount });
    }

    async updateSavingsGoal(id, goalName, targetAmount, savedAmount) {
        return this.updateItem('savings', id, { goalName, targetAmount, savedAmount });
    }

    async deleteSavingsGoal(id) {
        return this.deleteItem('savings', id);
    }

    async getSettings() {
        return this.getData('settings');
    }

    async saveSetting(settingName, value) {
        const settings = await this.getSettings();
        const existing = settings.find((entry) => entry.settingName === settingName);

        if (existing) {
            await this.updateItem('settings', existing.id, { settingName, value });
        } else {
            await this.addItem('settings', { settingName, value });
        }

        return true;
    }

    async getSetting(settingName, defaultValue = null) {
        let settings = this.getCachedSettings();
        if (settings.length === 0) {
            settings = await this.getSettings();
        }
        const setting = settings.find((entry) => entry.settingName === settingName);
        return setting ? setting.value : defaultValue;
    }

    async getDashboardStats() {
        const income = await this.getIncome();
        const expenses = await this.getExpenses();
        const savings = await this.getSavings();

        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        const monthlyIncome = income
            .filter((item) => {
                const itemDate = new Date(item.date);
                return itemDate.getMonth() === currentMonth && itemDate.getFullYear() === currentYear;
            })
            .reduce((sum, item) => sum + parseFloat(item.amount), 0);

        const monthlyExpenses = expenses
            .filter((item) => {
                const itemDate = new Date(item.date);
                return itemDate.getMonth() === currentMonth && itemDate.getFullYear() === currentYear;
            })
            .reduce((sum, item) => sum + parseFloat(item.amount), 0);

        const monthlySavings = savings
            .filter((goal) => {
                const itemDate = new Date(goal.updatedAt || goal.createdAt || new Date());
                return itemDate.getMonth() === currentMonth && itemDate.getFullYear() === currentYear;
            })
            .reduce((sum, goal) => sum + parseFloat(goal.savedAmount), 0);

        const totalIncome = income.reduce((sum, item) => sum + parseFloat(item.amount), 0);
        const totalExpenses = expenses.reduce((sum, item) => sum + parseFloat(item.amount), 0);
        const totalSavings = savings.reduce((sum, goal) => sum + parseFloat(goal.savedAmount), 0);
        const totalTarget = savings.reduce((sum, goal) => sum + parseFloat(goal.targetAmount), 0);
        const savingsProgress = totalTarget > 0 ? (totalSavings / totalTarget) * 100 : 0;
        const spendableBalance = totalIncome - totalExpenses - totalSavings;
        const monthlySpendableBalance = monthlyIncome - monthlyExpenses - monthlySavings;

        return {
            totalIncome,
            totalExpenses,
            monthlyIncome,
            monthlyExpenses,
            monthlySavings,
            totalSavings,
            totalTarget,
            savingsProgress,
            spendableBalance,
            monthlySpendableBalance
        };
    }

    async exportData() {
        const userId = this.requireUser();
        const data = await window.apiRequest(`/api/users/${userId}/export`);

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `budgeting-data-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    async importData(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            await Promise.all([
                this.saveData('income', data.income || []),
                this.saveData('expenses', data.expenses || []),
                this.saveData('savings', data.savings || []),
                this.saveData('settings', data.settings || [])
            ]);
            return true;
        } catch (error) {
            console.error('Import failed:', error);
            return false;
        }
    }

    async clearAllData() {
        const confirmed = await window.appUI.confirm('Are you sure you want to clear all your data? This action cannot be undone.', {
            title: 'Clear all data',
            confirmLabel: 'Clear data',
            cancelLabel: 'Cancel',
            tone: 'danger'
        });
        if (!confirmed) {
            return false;
        }

        const userId = this.requireUser();
        await window.apiRequest(`/api/users/${userId}/data`, {
            method: 'DELETE'
        });
        localStorage.removeItem('appSettings');
        localStorage.removeItem('cachedSettings');
        return true;
    }

    getCachedSettings() {
        try {
            return JSON.parse(localStorage.getItem('cachedSettings') || '[]');
        } catch (error) {
            return [];
        }
    }

    cacheSettings(settings) {
        localStorage.setItem('cachedSettings', JSON.stringify(settings));
        const settingMap = settings.reduce((acc, setting) => {
            acc[setting.settingName] = setting.value;
            return acc;
        }, {});
        localStorage.setItem('appSettings', JSON.stringify(settingMap));
    }
}

const dataManager = new DataManager();
