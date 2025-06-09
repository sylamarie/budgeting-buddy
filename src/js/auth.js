// Simple client-side authentication demo (no backend yet)

// Using localStorage for demo purposes only
// Passwords should NEVER be stored like this in production!

const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');

function saveUser(user) {
  const users = JSON.parse(localStorage.getItem('users')) || [];
  users.push(user);
  localStorage.setItem('users', JSON.stringify(users));
}

function findUserByEmail(email) {
  const users = JSON.parse(localStorage.getItem('users')) || [];
  return users.find(u => u.email === email);
}

function validateEmail(email) {
  return /\S+@\S+\.\S+/.test(email);
}

if (loginForm) {
  loginForm.addEventListener('submit', e => {
    e.preventDefault();
    const email = loginForm.email.value.trim();
    const password = loginForm.password.value.trim();

    if (!validateEmail(email)) {
      alert('Please enter a valid email.');
      return;
    }
    const user = findUserByEmail(email);
    if (!user) {
      alert('No account found with this email.');
      return;
    }
    if (user.password !== password) {
      alert('Incorrect password.');
      return;
    }

    localStorage.setItem('currentUser', JSON.stringify(user));
    alert('Login successful! Redirecting to dashboard...');
    window.location.href = '../html/dashboard.html';
  });
}

if (registerForm) {
  registerForm.addEventListener('submit', e => {
    e.preventDefault();
    const name = registerForm.name.value.trim();
    const email = registerForm.email.value.trim();
    const password = registerForm.password.value.trim();
    const confirmPassword = registerForm.confirmPassword.value.trim();

    if (!name) {
      alert('Please enter your name.');
      return;
    }
    if (!validateEmail(email)) {
      alert('Please enter a valid email.');
      return;
    }
    if (password.length < 6) {
      alert('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      alert('Passwords do not match.');
      return;
    }
    if (findUserByEmail(email)) {
      alert('Email is already registered.');
      return;
    }

    saveUser({ name, email, password });
    alert('Registration successful! Please log in.');
    window.location.href = 'login.html';
  });
}