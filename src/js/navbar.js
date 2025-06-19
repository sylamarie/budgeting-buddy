document.addEventListener("DOMContentLoaded", () => {
    // ✅ Step 1: Load the navbar HTML
    fetch("navbar.html") // Adjust this path if needed
      .then((res) => res.text())
      .then((data) => {
        document.getElementById("navbar").innerHTML = data;
  
        // ✅ Step 2: Now that navbar is in the DOM, run your original code
        const toggleBtn = document.getElementById("menu-toggle");
        const mobileMenu = document.getElementById("mobile-menu");
  
        if (toggleBtn && mobileMenu) {
          toggleBtn.addEventListener("click", () => {
            mobileMenu.classList.toggle("hidden");
          });
        }
  
        const currentPath = window.location.pathname;
        const links = document.querySelectorAll(".nav-link, .nav-link-mobile");
  
        links.forEach(link => {
          const btn = link.querySelector("button");
          if (link.getAttribute("href") === currentPath) {
            btn?.classList.add("bg-blue-50", "text-blue-600");
          } else {
            btn?.classList.add("text-gray-600", "hover:text-gray-900", "hover:bg-gray-100");
          }
        });
      })
      .catch((err) => console.error("Failed to load navbar:", err));
  });
  

  document.addEventListener("DOMContentLoaded", () => {
    fetch("navbar.html") // adjust if needed
      .then((res) => res.text())
      .then((data) => {
        document.getElementById("navbar").innerHTML = data;
  
        // Now handle mobile nav toggle, highlighting active page, etc.
      })
      .catch((err) => console.error("Failed to load navbar:", err));
  });
  