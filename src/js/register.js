document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("register-form");
  
    form.addEventListener("submit", (e) => {
      e.preventDefault();
  
      const name = document.getElementById("name").value.trim();
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;
      const confirmPassword = document.getElementById("confirmPassword").value;
  
      if (!name || !email || !password || !confirmPassword) {
        alert("Please fill in all fields.");
        return;
      }
  
      if (password !== confirmPassword) {
        alert("Passwords do not match.");
        return;
      }
  
      alert("Registration successful! Welcome to Budgeting Buddy!");
      window.location.href = "/dashboard.html";
    });
  });  