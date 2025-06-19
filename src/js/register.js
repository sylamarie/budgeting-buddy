document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("register-form");
    const errorMessage = document.getElementById("error-message");

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const name = document.getElementById("name").value.trim();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        const confirmPassword = document.getElementById("confirmPassword").value;

        if (!name || !email || !password || !confirmPassword) {
            showError("Please fill in all fields.");
            return;
        }

        if (password !== confirmPassword) {
            showError("Passwords do not match.");
            return;
        }

        if (password.length < 6) {
            showError("Password must be at least 6 characters long.");
            return;
        }

        try {
            // Use the auth system to register
            const auth = new Auth();
            const user = await auth.registerUser(name, email, password);
            
            if (user) {
                // Store user data and redirect
                localStorage.setItem('authToken', 'dummy-token-' + Date.now());
                localStorage.setItem('userData', JSON.stringify(user));
                window.location.href = '/src/html/dashboard.html';
            } else {
                showError('Registration failed. Email might already be in use.');
            }
        } catch (error) {
            showError('Registration failed. Please try again.');
        }
    });

    function showError(message) {
        if (errorMessage) {
            errorMessage.textContent = message;
            errorMessage.classList.remove('hidden');
            setTimeout(() => {
                errorMessage.classList.add('hidden');
            }, 5000);
        } else {
            alert(message);
        }
    }
});  