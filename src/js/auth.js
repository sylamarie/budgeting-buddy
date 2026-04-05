function getStoredUser() {
    try {
        return JSON.parse(localStorage.getItem('userData') || 'null');
    } catch (error) {
        return null;
    }
}

async function apiRequest(url, options = {}) {
    const response = await fetch(url, {
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        },
        ...options
    });

    if (response.status === 204) {
        return null;
    }

    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json') ? await response.json() : await response.text();

    if (!response.ok) {
        const message = typeof payload === 'object' && payload?.error ? payload.error : 'Request failed.';
        const error = new Error(message);
        error.status = response.status;
        throw error;
    }

    return payload;
}

window.apiRequest = apiRequest;

const appUI = (() => {
    let toastStack;

    function ensureToastStack() {
        if (toastStack) return toastStack;

        toastStack = document.createElement('div');
        toastStack.className = 'toast-stack';
        document.body.appendChild(toastStack);
        return toastStack;
    }

    function getCurrencyCode() {
        try {
            const appSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');
            return appSettings.currency || 'USD';
        } catch (error) {
            return 'USD';
        }
    }

    function formatCurrency(amount) {
        const currency = getCurrencyCode();

        try {
            return new Intl.NumberFormat(undefined, {
                style: 'currency',
                currency,
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(Number(amount) || 0);
        } catch (error) {
            const fallbackSymbols = {
                USD: '$',
                EUR: '\u20AC',
                GBP: '\u00A3',
                CAD: 'C$',
                AUD: 'A$',
                JPY: '\u00A5',
                PHP: '\u20B1',
                SGD: 'S$',
                CNY: '\u00A5',
                KRW: '\u20A9',
                INR: '\u20B9'
            };
            return `${fallbackSymbols[currency] || '$'}${Number(amount || 0).toFixed(2)}`;
        }
    }

    function toast(message, type = 'info', timeout = 3200) {
        const stack = ensureToastStack();
        const toastElement = document.createElement('div');
        toastElement.className = `toast-card toast-card--${type}`;
        toastElement.textContent = message;
        stack.appendChild(toastElement);

        setTimeout(() => {
            toastElement.remove();
        }, timeout);
    }

    function openModal({ title, message, confirmLabel = 'OK', cancelLabel, tone = 'primary' }) {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'popup-overlay';

            const confirmClass = tone === 'danger' ? 'danger-button' : 'primary-button';

            overlay.innerHTML = `
                <div class="popup-card">
                    <h2 class="popup-title">${title}</h2>
                    <div class="popup-body">${message}</div>
                    <div class="popup-actions">
                        ${cancelLabel ? `<button class="secondary-button px-5 py-3" data-role="cancel">${cancelLabel}</button>` : ''}
                        <button class="${confirmClass} px-5 py-3" data-role="confirm">${confirmLabel}</button>
                    </div>
                </div>
            `;

            const close = (value) => {
                overlay.remove();
                resolve(value);
            };

            overlay.addEventListener('click', (event) => {
                if (event.target === overlay && cancelLabel) {
                    close(false);
                }
            });

            overlay.querySelector('[data-role="confirm"]').addEventListener('click', () => close(true));

            if (cancelLabel) {
                overlay.querySelector('[data-role="cancel"]').addEventListener('click', () => close(false));
            }

            document.body.appendChild(overlay);
        });
    }

    async function alertModal(message, options = {}) {
        await openModal({
            title: options.title || 'Notice',
            message,
            confirmLabel: options.confirmLabel || 'OK',
            tone: options.tone || 'primary'
        });
    }

    async function confirmModal(message, options = {}) {
        return openModal({
            title: options.title || 'Please confirm',
            message,
            confirmLabel: options.confirmLabel || 'Confirm',
            cancelLabel: options.cancelLabel || 'Cancel',
            tone: options.tone || 'primary'
        });
    }

    return {
        alert: alertModal,
        confirm: confirmModal,
        toast,
        formatCurrency,
        getCurrencyCode
    };
})();

window.appUI = appUI;

class Auth {
    constructor() {
        this.currentUser = getStoredUser();
        this.isAuthenticated = Boolean(this.currentUser?.id);
        this.ready = this.init();
    }

    async init() {
        this.setupAuthListeners();
        await this.checkAuthStatus();
    }

    async checkAuthStatus() {
        try {
            const payload = await apiRequest('/api/auth/session');
            this.persistSession(payload.user);
            this.redirectAuthenticatedUser();
        } catch (error) {
            this.clearLocalSession();

            if (error.status !== 401) {
                console.error('Session check failed:', error);
            }

            this.redirectToLogin();
        }
    }

    setupAuthListeners() {
        const loginForm = document.getElementById('login-form');
        if (loginForm && !loginForm.dataset.authBound) {
            loginForm.dataset.authBound = 'true';
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        const registerForm = document.getElementById('register-form');
        if (registerForm && !registerForm.dataset.authBound) {
            registerForm.dataset.authBound = 'true';
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }

        document.addEventListener('click', (event) => {
            if (event.target.classList.contains('logout-btn')) {
                event.preventDefault();
                this.logout();
            }
        });
    }

    async handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const user = await this.loginUser(email, password);
            this.persistSession(user);
            window.location.href = '/dashboard';
        } catch (error) {
            this.showError(error.message || 'Login failed. Please check your credentials.');
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (password !== confirmPassword) {
            this.showError('Passwords do not match.');
            return;
        }

        try {
            const user = await this.registerUser(name, email, password);
            this.persistSession(user);
            window.location.href = '/dashboard';
        } catch (error) {
            this.showError(error.message || 'Registration failed. Please try again.');
        }
    }

    async loginUser(email, password) {
        const payload = await apiRequest('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });

        return payload.user;
    }

    async registerUser(name, email, password) {
        const payload = await apiRequest('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({ name, email, password })
        });

        return payload.user;
    }

    persistSession(user) {
        this.currentUser = user;
        this.isAuthenticated = true;
        localStorage.setItem('userData', JSON.stringify(user));
        this.updateUI();
    }

    clearLocalSession() {
        this.currentUser = null;
        this.isAuthenticated = false;
        localStorage.removeItem('userData');
        localStorage.removeItem('appSettings');
        localStorage.removeItem('cachedSettings');
    }

    updateStoredUser(user) {
        this.persistSession(user);
    }

    async logout() {
        const confirmed = await window.appUI.confirm('Are you sure you want to log out?', {
            title: 'Log out',
            confirmLabel: 'Log out',
            cancelLabel: 'Stay signed in',
            tone: 'danger'
        });

        if (!confirmed) return;

        try {
            await apiRequest('/api/auth/logout', {
                method: 'POST'
            });
        } catch (error) {
            console.error('Logout failed:', error);
        }

        this.clearLocalSession();
        window.location.href = '/';
    }

    redirectToLogin() {
        const protectedPages = ['dashboard', 'income', 'expenses', 'savings', 'settings'];
        const currentPage = window.location.pathname.split('/').pop().replace('.html', '');

        if (protectedPages.includes(currentPage)) {
            window.location.href = '/login';
        }
    }

    redirectAuthenticatedUser() {
        const authPages = ['login', 'register'];
        const currentPage = window.location.pathname.split('/').pop().replace('.html', '');

        if (authPages.includes(currentPage)) {
            window.location.href = '/dashboard';
        }
    }

    updateUI() {
        const user = this.currentUser;
        if (!user) return;

        const userInfo = document.getElementById('user-info');
        if (userInfo) {
            userInfo.innerHTML = `
                <div class="flex items-center space-x-2">
                    <span class="text-sm text-gray-700">Welcome, ${user.name}</span>
                    <button class="logout-btn text-sm text-red-600 hover:text-red-800">Logout</button>
                </div>
            `;
        }

        const protectedContent = document.querySelectorAll('.protected-content');
        protectedContent.forEach((element) => {
            element.style.display = this.isAuthenticated ? 'block' : 'none';
        });

        const authForms = document.querySelectorAll('.auth-form');
        authForms.forEach((element) => {
            element.style.display = this.isAuthenticated ? 'none' : 'block';
        });
    }

    showError(message) {
        const errorDiv = document.getElementById('error-message');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
            setTimeout(() => {
                errorDiv.style.display = 'none';
            }, 3000);
        }
    }

    getCurrentUser() {
        return this.currentUser;
    }

    isUserLoggedIn() {
        return this.isAuthenticated;
    }
}

const auth = new Auth();
window.auth = auth;
