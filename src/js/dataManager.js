class DataManager {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        this.currentUser = window.auth?.getCurrentUser?.() || null;
    }

    requireUser() {
        this.init();
        if (!this.currentUser?.id) {
            throw new Error('You must be logged in to access data.');
        }
    }

    async getData(type) {
        this.requireUser();
        const payload = await window.apiRequest(`/api/me/${type}`);
        if (type === 'settings') {
            this.cacheSettings(payload.items || []);
        }
        return payload.items || [];
    }

    async saveData(type, data) {
        this.requireUser();
        const payload = await window.apiRequest(`/api/me/${type}`, {
            method: 'PUT',
            body: JSON.stringify({ items: data })
        });

        if (type === 'settings') {
            this.cacheSettings(payload.items || []);
        }

        return payload.items || [];
    }

    async addItem(type, item) {
        this.requireUser();
        const payload = await window.apiRequest(`/api/me/${type}`, {
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
        this.requireUser();
        const payload = await window.apiRequest(`/api/me/${type}/${id}`, {
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

        this.requireUser();
        await window.apiRequest(`/api/me/${type}/${id}`, {
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
                return `Amount: ${amount(item.amount)}\nCategory: ${item.category}\nPaid from: ${item.fundingCategory || 'Not set'}\nDate: ${new Date(item.date).toLocaleDateString()}`;
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

    async addExpense(amount, category, date, budgetMonth = null, fundingCategory = '') {
        return this.addItem('expenses', {
            amount,
            category,
            date,
            budgetMonth: budgetMonth || this.getBudgetMonthKey(date),
            fundingCategory
        });
    }

    async importTransactions(entries, options = {}) {
        if (!Array.isArray(entries) || entries.length === 0) {
            return { importedIncome: 0, importedExpenses: 0, skipped: 0 };
        }

        const sourceName = options.sourceName || 'Bank CSV Import';
        const defaultExpenseCategory = options.defaultExpenseCategory || 'Imported';
        const defaultIncomeCategory = options.defaultIncomeCategory || 'Imported';
        const [existingIncome, existingExpenses] = await Promise.all([
            this.getIncome(),
            this.getExpenses()
        ]);

        const signatures = new Set([
            ...existingIncome.map((item) => this.getTransactionSignature('income', item)),
            ...existingExpenses.map((item) => this.getTransactionSignature('expenses', item))
        ]);

        const queued = [];
        let skipped = 0;

        for (const entry of entries) {
            if (!entry || !entry.date || !Number.isFinite(entry.amount) || entry.amount === 0) {
                skipped += 1;
                continue;
            }

            const type = entry.amount > 0 ? 'income' : 'expenses';
            const normalizedAmount = Math.abs(entry.amount);
            const payload = {
                amount: normalizedAmount,
                category: entry.category || (type === 'income' ? defaultIncomeCategory : defaultExpenseCategory),
                date: entry.date,
                budgetMonth: this.getBudgetMonthKey(entry.date),
                description: entry.description || '',
                sourceType: 'csv_import',
                sourceName,
                importedAt: new Date().toISOString()
            };

            const signature = this.getTransactionSignature(type, payload);
            if (signatures.has(signature)) {
                skipped += 1;
                continue;
            }

            signatures.add(signature);
            queued.push({ type, payload });
        }

        await Promise.all(queued.map((item) => this.addItem(item.type, item.payload)));

        return {
            importedIncome: queued.filter((item) => item.type === 'income').length,
            importedExpenses: queued.filter((item) => item.type === 'expenses').length,
            skipped
        };
    }

    async updateExpense(id, amount, category, date, budgetMonth = null, fundingCategory = '') {
        return this.updateItem('expenses', id, {
            amount,
            category,
            date,
            budgetMonth: budgetMonth || this.getBudgetMonthKey(date),
            fundingCategory
        });
    }

    async deleteExpense(id) {
        return this.deleteItem('expenses', id);
    }

    async getSavings() {
        const savings = await this.getData('savings');
        return savings.map((goal) => this.normalizeSavingsGoal(goal));
    }

    async addSavingsGoal(goalName, targetAmount, savedAmount = 0, budgetMonth = null, fundingCategory = '') {
        const timestamp = new Date().toISOString();
        const normalizedSavedAmount = Number(savedAmount) || 0;
        const contributions = normalizedSavedAmount !== 0
            ? [this.createSavingsContribution(normalizedSavedAmount, timestamp, 'initial', budgetMonth || this.getBudgetMonthKey(timestamp), fundingCategory)]
            : [];

        return this.addItem('savings', {
            goalName,
            targetAmount,
            savedAmount: normalizedSavedAmount,
            contributions
        });
    }

    async updateSavingsGoal(id, goalName, targetAmount, savedAmount, budgetMonth = null, fundingCategory = '') {
        const goals = await this.getSavings();
        const existingGoal = goals.find((goal) => goal.id === id);
        const normalizedTargetAmount = Number(targetAmount) || 0;
        const normalizedSavedAmount = Number(savedAmount) || 0;

        if (!existingGoal) {
            return this.updateItem('savings', id, { goalName, targetAmount: normalizedTargetAmount, savedAmount: normalizedSavedAmount });
        }

        if (budgetMonth && fundingCategory) {
            const contributions = normalizedSavedAmount > 0
                ? [this.createSavingsContribution(
                    normalizedSavedAmount,
                    new Date().toISOString(),
                    'edited',
                    budgetMonth,
                    fundingCategory
                )]
                : [];

            return this.updateItem('savings', id, {
                goalName,
                targetAmount: normalizedTargetAmount,
                savedAmount: normalizedSavedAmount,
                contributions
            });
        }

        const currentSavedAmount = this.getSavingsGoalTotal(existingGoal);
        const delta = Number((normalizedSavedAmount - currentSavedAmount).toFixed(2));
        const contributions = [...existingGoal.contributions];

        if (delta !== 0) {
            const adjustmentMetadata = this.getSavingsAdjustmentMetadata(existingGoal, delta);
            contributions.push(this.createSavingsContribution(
                delta,
                new Date().toISOString(),
                'adjustment',
                adjustmentMetadata.budgetMonth,
                adjustmentMetadata.fundingCategory
            ));
        }

        return this.updateItem('savings', id, {
            goalName,
            targetAmount: normalizedTargetAmount,
            savedAmount: normalizedSavedAmount,
            contributions
        });
    }

    async addSavingsContribution(id, amount, date = new Date().toISOString(), budgetMonth = null, fundingCategory = '') {
        const goals = await this.getSavings();
        const goal = goals.find((item) => item.id === id);

        if (!goal) {
            throw new Error('Savings goal not found.');
        }

        const numericAmount = Number(amount) || 0;
        if (numericAmount === 0) {
            return goal;
        }

        const currentSavedAmount = this.getSavingsGoalTotal(goal);
        const targetAmount = Number(goal.targetAmount) || 0;
        const nextSavedAmount = Math.max(0, Math.min(currentSavedAmount + numericAmount, targetAmount || currentSavedAmount + numericAmount));
        const appliedAmount = Number((nextSavedAmount - currentSavedAmount).toFixed(2));

        if (appliedAmount === 0) {
            return goal;
        }

        const contributions = [
            ...goal.contributions,
            this.createSavingsContribution(appliedAmount, date, 'contribution', budgetMonth || this.getBudgetMonthKey(date), fundingCategory)
        ];

        return this.updateItem('savings', id, {
            goalName: goal.goalName,
            targetAmount,
            savedAmount: nextSavedAmount,
            contributions
        });
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
                return this.getExpenseBudgetMonth(item) === this.getBudgetMonthKeyFromParts(currentYear, currentMonth);
            })
            .reduce((sum, item) => sum + parseFloat(item.amount), 0);

        const monthlySavings = this.getSavingsTotalForMonth(savings, currentMonth, currentYear);

        const totalIncome = income.reduce((sum, item) => sum + parseFloat(item.amount), 0);
        const totalExpenses = expenses.reduce((sum, item) => sum + parseFloat(item.amount), 0);
        const totalSavings = savings.reduce((sum, goal) => sum + this.getSavingsGoalTotal(goal), 0);
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
        this.requireUser();
        const data = await window.apiRequest('/api/me/export');

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

        this.requireUser();
        await window.apiRequest('/api/me/data', {
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

    getTransactionSignature(type, item) {
        const amount = Number(item.amount || 0).toFixed(2);
        const date = item.date || '';
        const category = String(item.category || '').trim().toLowerCase();
        const description = String(item.description || '').trim().toLowerCase();
        return [type, date, amount, category, description].join('|');
    }

    normalizeSavingsGoal(goal) {
        const timestamp = goal.createdDate || goal.createdAt || goal.updatedAt || new Date().toISOString();
        let contributions = Array.isArray(goal.contributions)
            ? goal.contributions
                .map((entry) => ({
                    amount: Number(entry.amount) || 0,
                    date: entry.date || timestamp,
                    sourceType: entry.sourceType || 'manual',
                    budgetMonth: entry.budgetMonth || this.getBudgetMonthKey(entry.date || timestamp),
                    fundingCategory: entry.fundingCategory || ''
                }))
                .filter((entry) => entry.amount !== 0)
            : [];

        if (!contributions.length && Number(goal.savedAmount || 0) !== 0) {
            contributions = [this.createSavingsContribution(Number(goal.savedAmount), timestamp, 'legacy', this.getBudgetMonthKey(timestamp))];
        }

        const savedAmount = this.getSavingsGoalTotal({ contributions, savedAmount: goal.savedAmount });

        return {
            ...goal,
            targetAmount: Number(goal.targetAmount) || 0,
            savedAmount,
            contributions
        };
    }

    createSavingsContribution(amount, date, sourceType = 'manual', budgetMonth = null, fundingCategory = '') {
        return {
            amount: Number(amount) || 0,
            date: date || new Date().toISOString(),
            sourceType,
            budgetMonth: budgetMonth || this.getBudgetMonthKey(date || new Date().toISOString()),
            fundingCategory
        };
    }

    getSavingsAdjustmentMetadata(goal, delta) {
        const contributions = Array.isArray(goal.contributions) ? [...goal.contributions] : [];
        const fallbackBudgetMonth = this.getBudgetMonthKey(new Date().toISOString());
        const defaultMetadata = {
            budgetMonth: fallbackBudgetMonth,
            fundingCategory: ''
        };

        if (!contributions.length) {
            return defaultMetadata;
        }

        const normalizedContributions = contributions
            .map((entry) => ({
                amount: Number(entry.amount) || 0,
                date: entry.date || new Date().toISOString(),
                budgetMonth: entry.budgetMonth || this.getBudgetMonthKey(entry.date),
                fundingCategory: entry.fundingCategory || ''
            }))
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        const positiveContributions = normalizedContributions.filter((entry) => entry.amount > 0);
        if (!positiveContributions.length) {
            return defaultMetadata;
        }

        const latestPositiveContribution = positiveContributions[0];

        if (delta < 0) {
            const matchingContribution = positiveContributions.find((entry) => entry.fundingCategory);
            return {
                budgetMonth: (matchingContribution || latestPositiveContribution).budgetMonth || fallbackBudgetMonth,
                fundingCategory: (matchingContribution || latestPositiveContribution).fundingCategory || ''
            };
        }

        return {
            budgetMonth: latestPositiveContribution.budgetMonth || fallbackBudgetMonth,
            fundingCategory: latestPositiveContribution.fundingCategory || ''
        };
    }

    getSavingsGoalTotal(goal) {
        if (Array.isArray(goal.contributions) && goal.contributions.length) {
            return goal.contributions.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);
        }

        return Number(goal.savedAmount) || 0;
    }

    getSavingsContributionTotalForMonth(goal, month, year) {
        if (!Array.isArray(goal.contributions)) {
            return 0;
        }

        return goal.contributions
            .filter((entry) => {
                const budgetMonth = entry.budgetMonth || this.getBudgetMonthKey(entry.date);
                return budgetMonth === this.getBudgetMonthKeyFromParts(year, month);
            })
            .reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);
    }

    getSavingsTotalForMonth(goals, month, year) {
        return goals.reduce((sum, goal) => sum + this.getSavingsContributionTotalForMonth(goal, month, year), 0);
    }

    getBudgetMonthKey(value) {
        if (!value) {
            const now = new Date();
            return this.getBudgetMonthKeyFromParts(now.getFullYear(), now.getMonth());
        }

        if (typeof value === 'string' && /^\d{4}-\d{2}$/.test(value)) {
            return value;
        }

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            const now = new Date();
            return this.getBudgetMonthKeyFromParts(now.getFullYear(), now.getMonth());
        }

        return this.getBudgetMonthKeyFromParts(date.getFullYear(), date.getMonth());
    }

    getBudgetMonthKeyFromParts(year, monthIndex) {
        return `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
    }

    formatBudgetMonthLabel(key) {
        const [year, month] = String(key).split('-').map(Number);
        if (!year || !month) {
            return '';
        }

        return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
            month: 'long',
            year: 'numeric'
        });
    }

    getExpenseBudgetMonth(expense) {
        return expense.budgetMonth || this.getBudgetMonthKey(expense.date);
    }

    getBudgetMonthBreakdown(income = [], expenses = [], savings = []) {
        const monthMap = new Map();

        const ensureMonth = (key) => {
            if (!monthMap.has(key)) {
                monthMap.set(key, {
                    key,
                    label: this.formatBudgetMonthLabel(key),
                    income: 0,
                    expenses: 0,
                    savings: 0,
                    remaining: 0
                });
            }

            return monthMap.get(key);
        };

        income.forEach((item) => {
            const month = ensureMonth(this.getBudgetMonthKey(item.date));
            month.income += Number(item.amount) || 0;
        });

        expenses.forEach((item) => {
            const month = ensureMonth(this.getExpenseBudgetMonth(item));
            month.expenses += Number(item.amount) || 0;
        });

        savings.forEach((goal) => {
            (goal.contributions || []).forEach((entry) => {
                const month = ensureMonth(entry.budgetMonth || this.getBudgetMonthKey(entry.date));
                month.savings += Number(entry.amount) || 0;
            });
        });

        return [...monthMap.values()]
            .map((month) => ({
                ...month,
                remaining: month.income - month.expenses - month.savings
            }))
            .sort((a, b) => b.key.localeCompare(a.key));
    }

    async getAvailableBudgetMonths() {
        const [income, expenses, savings] = await Promise.all([
            this.getIncome(),
            this.getExpenses(),
            this.getSavings()
        ]);

        return this.getBudgetMonthBreakdown(income, expenses, savings)
            .filter((month) => month.income > 0 && month.remaining > 0);
    }
}

const dataManager = new DataManager();
