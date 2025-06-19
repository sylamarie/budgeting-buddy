const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the root directory
app.use(express.static(__dirname));

// Serve navbar.html for the navbar component
app.get('/navbar.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'html', 'navbar.html'));
});

// Test route for navbar debugging
app.get('/test', (req, res) => {
  res.sendFile(path.join(__dirname, 'test-navbar.html'));
});

// Dashboard route
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'html', 'dashboard.html'));
});

// Income route
app.get('/income', (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'html', 'income.html'));
});

// Expenses route
app.get('/expenses', (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'html', 'expenses.html'));
});

// Savings route
app.get('/savings', (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'html', 'savings.html'));
});

// Settings route
app.get('/settings', (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'html', 'settings.html'));
});

// Login route
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'html', 'login.html'));
});

// Register route
app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'html', 'register.html'));
});

// Catch-all route to serve index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(`📁 Available pages:`);
  console.log(`   - Home: http://localhost:${PORT}`);
  console.log(`   - Dashboard: http://localhost:${PORT}/dashboard`);
  console.log(`   - Income: http://localhost:${PORT}/income`);
  console.log(`   - Expenses: http://localhost:${PORT}/expenses`);
  console.log(`   - Savings: http://localhost:${PORT}/savings`);
  console.log(`   - Settings: http://localhost:${PORT}/settings`);
  console.log(`   - Login: http://localhost:${PORT}/login`);
  console.log(`   - Register: http://localhost:${PORT}/register`);
  console.log(`   - Test: http://localhost:${PORT}/test`);
});