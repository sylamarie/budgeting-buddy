// Authentication System
class Auth {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.init();
    }

    init() {
        // Check if user is logged in on page load
        this.checkAuthStatus();
        this.setupAuthListeners();
    }

    checkAuthStatus() {
        const token = localStorage.getItem('authToken');
        const userData = localStorage.getItem('userData');
        
        if (token && userData) {
            try {
                this.currentUser = JSON.parse(userData);
                this.isAuthenticated = true;
                this.updateUI();
            } catch (error) {
                this.logout();
            }
        } else {
            this.redirectToLogin();
        }
    }

    setupAuthListeners() {
        // Login form listener
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Register form listener
        const registerForm = document.getElementById('register-form');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }

        // Logout button listener
        const logoutBtn = document.querySelector('.logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            // Simulate API call
            const user = await this.loginUser(email, password);
            if (user) {
                this.currentUser = user;
                this.isAuthenticated = true;
                localStorage.setItem('authToken', 'dummy-token-' + Date.now());
                localStorage.setItem('userData', JSON.stringify(user));
                this.updateUI();
                window.location.href = '/src/html/dashboard.html';
            } else {
                this.showError('Invalid email or password. Please try again.');
            }
        } catch (error) {
            this.showError('Login failed. Please check your credentials.');
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
            if (user) {
                this.currentUser = user;
                this.isAuthenticated = true;
                localStorage.setItem('authToken', 'dummy-token-' + Date.now());
                localStorage.setItem('userData', JSON.stringify(user));
                this.updateUI();
                window.location.href = '/src/html/dashboard.html';
            } else {
                this.showError('Registration failed. Email might already be in use.');
            }
        } catch (error) {
            this.showError('Registration failed. Please try again.');
        }
    }

    async loginUser(email, password) {
        // Simulate API call - in real app, this would be a server request
        return new Promise((resolve) => {
            setTimeout(() => {
                // Check if user exists in localStorage
                const users = JSON.parse(localStorage.getItem('users') || '[]');
                const user = users.find(u => u.email === email && u.password === password);
                
                if (user) {
                    resolve({
                        id: user.id,
                        name: user.name,
                        email: user.email
                    });
                } else {
                    resolve(null);
                }
            }, 500);
        });
    }

    async registerUser(name, email, password) {
        // Simulate API call - in real app, this would be a server request
        return new Promise((resolve) => {
            setTimeout(() => {
                const users = JSON.parse(localStorage.getItem('users') || '[]');
                
                // Check if user already exists
                if (users.find(u => u.email === email)) {
                    resolve(null);
                    return;
                }

                const newUser = {
                    id: Date.now().toString(),
                    name,
                    email,
                    password
                };

                users.push(newUser);
                localStorage.setItem('users', JSON.stringify(users));

                resolve({
                    id: newUser.id,
                    name: newUser.name,
                    email: newUser.email
                });
            }, 500);
        });
    }

    logout() {
        if (!confirm('Are you sure you want to log out?')) return;
        this.currentUser = null;
        this.isAuthenticated = false;
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        // Optionally clear other user-specific data
        window.location.href = '/index.html';
    }

    redirectToLogin() {
        const protectedPages = ['dashboard', 'income', 'expenses', 'savings', 'settings'];
        const currentPage = window.location.pathname.split('/').pop().replace('.html', '');
        
        if (protectedPages.includes(currentPage)) {
            window.location.href = '/src/html/login.html';
        }
    }

    updateUI() {
        // Update navbar with user info
        const userInfo = document.getElementById('user-info');
        if (userInfo && this.currentUser) {
            userInfo.innerHTML = `
                <div class="flex items-center space-x-2">
                    <span class="text-sm text-gray-700">Welcome, ${this.currentUser.name}</span>
                    <button class="logout-btn text-sm text-red-600 hover:text-red-800">Logout</button>
                </div>
            `;
        }

        // Show/hide protected content
        const protectedContent = document.querySelectorAll('.protected-content');
        protectedContent.forEach(element => {
            element.style.display = this.isAuthenticated ? 'block' : 'none';
        });

        // Show/hide auth forms
        const authForms = document.querySelectorAll('.auth-form');
        authForms.forEach(element => {
            element.style.display = this.isAuthenticated ? 'none' : 'block';
        });

        // Re-setup logout button listener after navbar reload
        const logoutBtn = document.querySelector('.logout-btn');
        if (logoutBtn) {
            logoutBtn.onclick = () => this.logout();
        }
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

// Initialize authentication
const auth = new Auth(); 