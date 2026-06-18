// ============================================
// FitForge - Main Application Module
// ============================================

import { supabase, isSupabaseConfigured } from './supabase.js';

// ── Toast Notification System ────────────────────────────────────────

/**
 * Show a toast notification
 * @param {string} message - The message to display
 * @param {'success'|'error'|'warning'|'info'} type - Toast type
 * @param {number} duration - Auto-dismiss time in ms (default 3000)
 */
function showToast(message, type = 'info', duration = 3000) {
  // Create container if it doesn't exist
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-atomic', 'true');
    document.body.appendChild(container);
  }

  // Icon map for toast types
  const iconMap = {
    success: 'check-circle',
    error: 'x-circle',
    warning: 'alert-triangle',
    info: 'info',
  };

  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `
    <div class="toast__icon">
      <i data-lucide="${iconMap[type] || 'info'}"></i>
    </div>
    <p class="toast__message">${message}</p>
    <button class="toast__close" aria-label="Close notification">
      <i data-lucide="x"></i>
    </button>
  `;

  // Close button handler
  const closeBtn = toast.querySelector('.toast__close');
  closeBtn.addEventListener('click', () => dismissToast(toast));

  // Append and animate in
  container.appendChild(toast);

  // Initialize lucide icons inside the toast
  if (window.lucide) {
    window.lucide.createIcons({ nodes: [toast] });
  }

  // Trigger entrance animation
  requestAnimationFrame(() => {
    toast.classList.add('toast--visible');
  });

  // Auto-dismiss
  if (duration > 0) {
    setTimeout(() => dismissToast(toast), duration);
  }

  return toast;
}

/**
 * Dismiss a toast with exit animation
 * @param {HTMLElement} toast
 */
function dismissToast(toast) {
  if (!toast || toast.classList.contains('toast--exiting')) return;

  toast.classList.add('toast--exiting');
  toast.classList.remove('toast--visible');

  toast.addEventListener('animationend', () => {
    toast.remove();
  });

  // Fallback removal
  setTimeout(() => {
    if (toast.parentNode) toast.remove();
  }, 500);
}

// ── Navigation ───────────────────────────────────────────────────────

/**
 * Navigate to a page
 * @param {string} page - The page path (e.g., 'dashboard.html', 'workouts.html')
 */
function navigateTo(page) {
  window.location.href = page;
}

/**
 * Highlight the active nav link based on current page
 */
function highlightActiveNav() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const navLinks = document.querySelectorAll('.nav__link, .sidebar__link');

  navLinks.forEach((link) => {
    const href = link.getAttribute('href');
    if (!href) return;

    const linkPage = href.split('/').pop();

    if (linkPage === currentPage) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

// ── Mobile Menu ──────────────────────────────────────────────────────

/**
 * Initialize the mobile menu toggle
 */
function initMobileMenu() {
  const menuToggle = document.querySelector('.nav__mobile-toggle');
  const mobileMenu = document.querySelector('.nav__menu');
  const body = document.body;

  if (!menuToggle || !mobileMenu) return;

  menuToggle.addEventListener('click', () => {
    const isOpen = mobileMenu.classList.toggle('nav__menu--open');
    menuToggle.classList.toggle('nav__mobile-toggle--active', isOpen);
    body.classList.toggle('menu-open', isOpen);

    // Update aria attributes
    menuToggle.setAttribute('aria-expanded', isOpen);

    // Update icon
    const icon = menuToggle.querySelector('i, svg');
    if (icon) {
      icon.setAttribute('data-lucide', isOpen ? 'x' : 'menu');
      if (window.lucide) window.lucide.createIcons({ nodes: [menuToggle] });
    }
  });

  // Close menu when clicking a nav link (mobile)
  const navLinks = mobileMenu.querySelectorAll('.nav__link');
  navLinks.forEach((link) => {
    link.addEventListener('click', () => {
      mobileMenu.classList.remove('nav__menu--open');
      menuToggle.classList.remove('nav__mobile-toggle--active');
      body.classList.remove('menu-open');
      menuToggle.setAttribute('aria-expanded', 'false');

      const icon = menuToggle.querySelector('i, svg');
      if (icon) {
        icon.setAttribute('data-lucide', 'menu');
        if (window.lucide) window.lucide.createIcons({ nodes: [menuToggle] });
      }
    });
  });

  // Close menu on clicking outside
  document.addEventListener('click', (e) => {
    if (
      mobileMenu.classList.contains('nav__menu--open') &&
      !mobileMenu.contains(e.target) &&
      !menuToggle.contains(e.target)
    ) {
      mobileMenu.classList.remove('nav__menu--open');
      menuToggle.classList.remove('nav__mobile-toggle--active');
      body.classList.remove('menu-open');
      menuToggle.setAttribute('aria-expanded', 'false');

      const icon = menuToggle.querySelector('i, svg');
      if (icon) {
        icon.setAttribute('data-lucide', 'menu');
        if (window.lucide) window.lucide.createIcons({ nodes: [menuToggle] });
      }
    }
  });
}

// ── Smooth Scroll ────────────────────────────────────────────────────

/**
 * Initialize smooth scrolling for anchor links
 */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const targetId = anchor.getAttribute('href');
      if (targetId === '#' || targetId.length <= 1) return;

      const targetEl = document.querySelector(targetId);
      if (targetEl) {
        e.preventDefault();
        targetEl.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });

        // Update URL without jumping
        history.pushState(null, null, targetId);
      }
    });
  });
}

// ── Auth State UI Management ─────────────────────────────────────────

/**
 * Update UI elements based on authentication state
 * @param {object|null} user - The current user object or null
 */
function updateAuthUI(user) {
  // Elements shown only when logged in
  const authElements = document.querySelectorAll('[data-auth="logged-in"]');
  // Elements shown only when logged out
  const guestElements = document.querySelectorAll('[data-auth="logged-out"]');

  authElements.forEach((el) => {
    el.style.display = user ? '' : 'none';
  });

  guestElements.forEach((el) => {
    el.style.display = user ? 'none' : '';
  });

  // Update user display name/avatar if present
  if (user) {
    const nameEl = document.querySelector('[data-auth-name]');
    const avatarEl = document.querySelector('[data-auth-avatar]');
    const emailEl = document.querySelector('[data-auth-email]');

    const displayName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split('@')[0] ||
      'User';

    if (nameEl) nameEl.textContent = displayName;
    if (emailEl) emailEl.textContent = user.email;
    if (avatarEl && user.user_metadata?.avatar_url) {
      avatarEl.src = user.user_metadata.avatar_url;
      avatarEl.alt = displayName;
    }
  }
}

/**
 * Check auth state and handle redirects
 */
async function checkAuthState() {
  if (!isSupabaseConfigured()) return null;

  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.error('Auth session error:', error.message);
      return null;
    }

    const user = session?.user || null;

    // Update UI for auth state
    updateAuthUI(user);

    // Redirect logic: if user is on the landing page and logged in → dashboard
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const landingPages = ['index.html', ''];

    if (user && landingPages.includes(currentPage)) {
      navigateTo('dashboard.html');
      return user;
    }

    // If user is on a protected page and NOT logged in → redirect to login
    const protectedPages = [
      'dashboard.html',
      'workouts.html',
      'nutrition.html',
      'progress.html',
      'profile.html',
      'bmi-onboarding.html',
    ];

    if (!user && protectedPages.includes(currentPage)) {
      navigateTo('login.html');
      return null;
    }

    return user;
  } catch (err) {
    console.error('Auth check failed:', err);
    return null;
  }
}

/**
 * Listen for real-time auth state changes
 */
function initAuthListener() {
  if (!isSupabaseConfigured()) return;

  supabase.auth.onAuthStateChange((event, session) => {
    const user = session?.user || null;
    updateAuthUI(user);

    if (event === 'SIGNED_IN') {
      console.log('User signed in:', user?.email);
    } else if (event === 'SIGNED_OUT') {
      console.log('User signed out');
      const currentPage = window.location.pathname.split('/').pop() || 'index.html';
      const protectedPages = [
        'dashboard.html',
        'workouts.html',
        'nutrition.html',
        'progress.html',
        'profile.html',
        'bmi-onboarding.html',
      ];
      if (protectedPages.includes(currentPage)) {
        navigateTo('login.html');
      }
    }
  });
}

// ── Scroll Animations ────────────────────────────────────────────────

/**
 * Initialize scroll-based reveal animations using IntersectionObserver
 */
function initScrollAnimations() {
  const revealElements = document.querySelectorAll('[data-reveal]');
  if (revealElements.length === 0) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px',
    }
  );

  revealElements.forEach((el) => observer.observe(el));
}

// ── Initialize App ───────────────────────────────────────────────────

/**
 * Main initialization - runs on DOMContentLoaded
 */
function initApp() {
  // Initialize Lucide icons
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // Ensure dark theme is always applied
  document.documentElement.setAttribute('data-theme', 'dark');

  // Initialize all modules
  highlightActiveNav();
  initMobileMenu();
  initSmoothScroll();
  initScrollAnimations();
  initAuthListener();

  // Check auth state (async, handles redirects)
  checkAuthState();
}

// Run initialization when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  // DOM already loaded (e.g., module loaded after DOMContentLoaded)
  initApp();
}

// ── Exports ──────────────────────────────────────────────────────────

export {
  showToast,
  navigateTo,
  highlightActiveNav,
  initMobileMenu,
  initSmoothScroll,
  initScrollAnimations,
  updateAuthUI,
  checkAuthState,
  initApp,
};
