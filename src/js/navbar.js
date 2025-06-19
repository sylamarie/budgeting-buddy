document.addEventListener('DOMContentLoaded', function() {
    loadNavbar();
});

async function loadNavbar() {
    try {
        const response = await fetch('/src/html/navbar.html');
        const navbarHtml = await response.text();
        document.getElementById('navbar').innerHTML = navbarHtml;
  
        // Initialize navbar functionality after loading
        initializeNavbar();
    } catch (error) {
        console.error('Error loading navbar:', error);
    }
}

function initializeNavbar() {
    // Mobile menu toggle
    const menuToggle = document.getElementById('menu-toggle');
    const mobileMenu = document.getElementById('mobile-menu');
  
    if (menuToggle && mobileMenu) {
        menuToggle.addEventListener('click', function() {
            mobileMenu.classList.toggle('hidden');
          });
        }
  
    // Update active page
    updateActivePage();
    
    // Update user profile information
    updateUserProfile();
    setupProfileModal();
}

function updateActivePage() {
        const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-link, .nav-link-mobile');
  
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href && currentPath.includes(href.split('/').pop())) {
            // Remove active class from all buttons
            const buttons = document.querySelectorAll('.nav-button');
            buttons.forEach(btn => {
                btn.classList.remove('bg-blue-100', 'text-blue-700');
                btn.classList.add('text-gray-600', 'hover:text-gray-900', 'hover:bg-gray-100');
            });
            
            // Add active class to current button
            const button = link.querySelector('.nav-button');
            if (button) {
                button.classList.remove('text-gray-600', 'hover:text-gray-900', 'hover:bg-gray-100');
                button.classList.add('bg-blue-100', 'text-blue-700');
            }
        }
    });
}

function updateUserProfile() {
    // Get user data from localStorage
    const userData = localStorage.getItem('userData');
    if (userData) {
        try {
            const user = JSON.parse(userData);
            
            // Update user initials
            const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase();
            const userInitials = document.getElementById('user-initials');
            const mobileUserInitials = document.getElementById('mobile-user-initials');
            
            if (userInitials) userInitials.textContent = initials;
            if (mobileUserInitials) mobileUserInitials.textContent = initials;
            
            // Update user name
            const userName = document.getElementById('user-name');
            const mobileUserName = document.getElementById('mobile-user-name');
            const mobileUserEmail = document.getElementById('mobile-user-email');
            
            if (userName) userName.textContent = user.name;
            if (mobileUserName) mobileUserName.textContent = user.name;
            if (mobileUserEmail) mobileUserEmail.textContent = user.email;
            
        } catch (error) {
            console.error('Error parsing user data:', error);
        }
    }
}

function setupProfileModal() {
  const userInfoSection = document.getElementById('user-info');
  if (userInfoSection) {
    userInfoSection.style.cursor = 'pointer';
    userInfoSection.addEventListener('click', (e) => {
      // Only open modal if not clicking the logout button
      if (e.target.classList.contains('logout-btn')) return;
      // Open modal if clicking user-info, user-name, or user-initials
      if (
        e.target.id === 'user-info' ||
        e.target.id === 'user-name' ||
        e.target.id === 'user-initials' ||
        e.target.closest('#user-info')
      ) {
        const modal = document.getElementById('profile-modal');
        if (modal) {
          const userData = JSON.parse(localStorage.getItem('userData') || '{}');
          const nameDiv = document.getElementById('profile-name');
          const emailDiv = document.getElementById('profile-email');
          if (nameDiv) nameDiv.textContent = userData.name || '';
          if (emailDiv) emailDiv.textContent = userData.email || '';
          modal.classList.remove('hidden');
        }
      }
    });
    // Prevent logout button from triggering user-info click and ensure it logs out
    const logoutBtn = userInfoSection.querySelector('.logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (window.auth && typeof window.auth.logout === 'function') {
          window.auth.logout();
        } else if (typeof auth !== 'undefined' && typeof auth.logout === 'function') {
          auth.logout();
        }
      });
    }
  }
  const closeBtn = document.getElementById('close-profile-modal');
  if (closeBtn) {
    closeBtn.onclick = () => {
      document.getElementById('profile-modal').classList.add('hidden');
    };
  }
}