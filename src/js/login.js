document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("login-form");
  const errorMessage = document.getElementById("error-message");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!email || !password) {
      showError("Please fill in all fields.");
      return;
    }

    try {
      // Use the auth system to login
      const auth = new Auth();
      const user = await auth.loginUser(email, password);
      
      if (user) {
        // Store user data and redirect
        localStorage.setItem('authToken', 'dummy-token-' + Date.now());
        localStorage.setItem('userData', JSON.stringify(user));
        window.location.href = '/src/html/dashboard.html';
      } else {
        showError('Invalid email or password. Please try again.');
      }
    } catch (error) {
      showError('Login failed. Please check your credentials.');
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