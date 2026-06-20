// ============================================
// FitForge — Dashboard Logic (ES Module)
// ============================================

import { supabase } from './supabase.js';
import { showToast } from './app.js';

// ---- DOM Ready ----
document.addEventListener('DOMContentLoaded', () => {
  initDashboard();
  loadProfileFromLocal();
});

// Also run immediately if DOM is already loaded
if (document.readyState !== 'loading') {
  initDashboard();
}

let _initialized = false;

function initDashboard() {
  if (_initialized) return;
  _initialized = true;

  checkAuth();
  setGreeting();
  setCurrentDate();
  setupWeeklyChart();
  animateCounters();
  animateChartBars();
  animateCalorieBar();
  setupFAB();
  setupSidebar();
  setupNavHighlight();
  initLucide();
}

// ---- Initialize Lucide Icons ----
function initLucide() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// ---- Auth Check ----
async function checkAuth() {
  if (!supabase) {
    console.warn('[FitForge] Supabase client is null. Running in demo mode.');
    populateMockProfile();
    return;
  }

  try {
    // Check current session first
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) throw error;
    
    if (session) {
      populateUserProfile(session.user);
    } else {
      // If no session, wait a brief moment to see if onAuthStateChange catches an OAuth redirect
      supabase.auth.onAuthStateChange((event, session) => {
        if (session) {
          populateUserProfile(session.user);
        } else if (event === 'SIGNED_OUT' || !session) {
          window.location.href = 'login.html';
        }
      });
      
      // Fallback redirect if still no session after 1 second
      setTimeout(() => {
        supabase.auth.getSession().then(({data}) => {
          if (!data.session) window.location.href = 'login.html';
        });
      }, 1000);
    }
  } catch (err) {
    console.error('[FitForge] Auth check failed:', err);
    alert('Auth check failed: ' + err.message);
    populateMockProfile(); // Fallback to mock so UI doesn't break
  }
}

// ---- Profile Data ----
function populateUserProfile(user) {
  const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
  const firstName = name.split(' ')[0];
  setProfileUI(name, firstName);
  fetchUserStats(user);
}

async function fetchUserStats(user) {
  if (!supabase) {
    alert('fetchUserStats: supabase is null');
    return;
  }
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error || !data || !data.bmi) {
      // User hasn't completed onboarding, redirect them
      window.location.href = 'onboarding.html';
      return;
    }

    // ---- STREAK LOGIC ----
    const todayStr = new Date().toISOString().split('T')[0];
    let currentStreak = data.streak ? parseInt(data.streak) : 0;
    let lastLogin = data.last_login_date;

    if (!lastLogin || lastLogin !== todayStr) {
      if (lastLogin) {
        // Calculate difference in days
        const lastDate = new Date(lastLogin);
        const todayDate = new Date(todayStr);
        lastDate.setHours(0, 0, 0, 0);
        todayDate.setHours(0, 0, 0, 0);
        
        const diffTime = todayDate - lastDate;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          currentStreak += 1; // Logged in yesterday
        } else if (diffDays > 1) {
          currentStreak = 1; // Missed a day or more, reset
        }
      } else {
        currentStreak = 1; // First time logging in since tracking started
      }
      
      // Save new streak to database
      supabase.from('profiles').update({
        streak: currentStreak,
        last_login_date: todayStr
      }).eq('id', user.id).then(({error}) => {
        if (error) console.error('Failed to update streak:', error);
      });
      
      data.streak = currentStreak;
      data.last_login_date = todayStr;
    }

    // Ensure it's never 0 if they've logged in at least once
    if (currentStreak === 0) currentStreak = 1;

    // Update Dashboard UI with real data
    const streakCounter = document.getElementById('statStreak');
    if (streakCounter) {
      streakCounter.dataset.target = currentStreak;
      streakCounter.textContent = currentStreak; // Force update DOM directly
    }

    const bmiCounter = document.getElementById('statBMI');
    if (bmiCounter) {
      bmiCounter.dataset.target = data.bmi;
      bmiCounter.textContent = data.bmi; // Directly set it to ensure it shows!
      
      // Also update the badge next to it
      const bmiBadge = bmiCounter.closest('.stat-content')?.querySelector('.badge');
      if (bmiBadge) {
        bmiBadge.textContent = data.bmi_category || 'Normal';
        bmiBadge.className = 'badge'; // reset
        if (data.bmi_category === 'Underweight') bmiBadge.classList.add('badge-info');
        else if (data.bmi_category === 'Overweight') bmiBadge.classList.add('badge-warning');
        else if (data.bmi_category === 'Obese') bmiBadge.classList.add('badge-danger');
        else bmiBadge.classList.add('badge-success');
      }
    }

    // Update sidebar name from auth metadata OR profile data
    const metadataName = user.user_metadata?.full_name || data.full_name;
    if (metadataName) {
      const sidebarName = document.getElementById('sidebarProfileName');
      if (sidebarName) sidebarName.textContent = metadataName;
      
      const greetingName = document.getElementById('greetingName');
      if (greetingName) greetingName.textContent = metadataName.split(' ')[0];
    }

    // Render custom avatar if it exists in auth metadata OR profile
    const avatarUrl = user.user_metadata?.avatar_url || data.avatar_url;
    if (avatarUrl) {
      const sidebarAvatar = document.getElementById('sidebarAvatar');
      if (sidebarAvatar) {
        sidebarAvatar.style.backgroundImage = `url(${avatarUrl})`;
        sidebarAvatar.style.backgroundSize = 'cover';
        sidebarAvatar.innerHTML = '';
      }
    }

    // Re-trigger animations so the new targets are used
    animateCounters();

  } catch (err) {
    console.error('[FitForge] Failed to fetch user stats:', err);
  }
}

function populateMockProfile() {
  setProfileUI('Demo User', 'Demo');
}

function setProfileUI(fullName, firstName) {
  const greetingName = document.getElementById('greetingName');
  const sidebarName = document.getElementById('sidebarProfileName');
  const sidebarLetter = document.getElementById('sidebarAvatarLetter');

  if (greetingName) greetingName.textContent = firstName;
  if (sidebarName) sidebarName.textContent = fullName;
  if (sidebarLetter) sidebarLetter.textContent = firstName.charAt(0).toUpperCase();
}

// ---- LocalStorage Fallback ----
function loadProfileFromLocal() {
  const localName = localStorage.getItem('fitforge_username');
  const localAvatar = localStorage.getItem('fitforge_avatar');

  if (localName) {
    const firstName = localName.split(' ')[0];
    setProfileUI(localName, firstName);
  }

  if (localAvatar) {
    const sidebarAvatar = document.getElementById('sidebarAvatar');
    if (sidebarAvatar) {
      sidebarAvatar.style.backgroundImage = `url(${localAvatar})`;
      sidebarAvatar.style.backgroundSize = 'cover';
      sidebarAvatar.innerHTML = '';
    }
  }
}

// ---- Time-based Greeting ----
function setGreeting() {
  const hour = new Date().getHours();
  let greeting = 'Good Evening';
  let emoji = '🌙';

  if (hour >= 5 && hour < 12) {
    greeting = 'Good Morning';
    emoji = '☀️';
  } else if (hour >= 12 && hour < 17) {
    greeting = 'Good Afternoon';
    emoji = '🌤️';
  } else if (hour >= 17 && hour < 21) {
    greeting = 'Good Evening';
    emoji = '🌆';
  } else {
    greeting = 'Good Night';
    emoji = '🌙';
  }

  const greetingEl = document.getElementById('greeting');
  if (greetingEl) {
    const nameSpan = document.getElementById('greetingName');
    const name = nameSpan ? nameSpan.textContent : 'Alex';
    greetingEl.innerHTML = `${greeting}, <span class="text-gradient" id="greetingName">${name}</span> ${emoji}`;
  }
}

// ---- Current Date ----
function setCurrentDate() {
  const dateEl = document.getElementById('topbarDate');
  if (!dateEl) return;

  const now = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  dateEl.textContent = now.toLocaleDateString('en-US', options);
}

// ---- Setup Weekly Chart ----
function setupWeeklyChart() {
  const chartGroups = document.querySelectorAll('.chart-bar-group');
  if (chartGroups.length === 0) return;
  
  const today = new Date();
  const dayIndex = today.getDay(); // 0 (Sun) to 6 (Sat)
  // Convert to Mon=0, Sun=6
  const adjustedDayIndex = dayIndex === 0 ? 6 : dayIndex - 1;
  
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  
  chartGroups.forEach((group, index) => {
    // Reset classes
    group.classList.remove('chart-today');
    const bar = group.querySelector('.chart-bar');
    if (bar) bar.classList.remove('chart-bar-today');
    const label = group.querySelector('.chart-bar-label');
    if (label) {
      label.classList.remove('chart-label-today');
      label.textContent = days[index];
    }
    const fill = group.querySelector('.chart-bar-fill');
    if (fill) fill.className = 'chart-bar-fill'; // reset to base
    
    // Set today
    if (index === adjustedDayIndex) {
      group.classList.add('chart-today');
      if (bar) bar.classList.add('chart-bar-today');
      if (label) label.classList.add('chart-label-today');
      if (fill) fill.classList.add('chart-bar-fill'); // Just standard fill
    } else if (index > adjustedDayIndex) {
      // Future days
      if (fill) fill.classList.add('chart-bar-future');
      const valueLabel = group.querySelector('.chart-bar-value');
      if (valueLabel) valueLabel.textContent = '—';
      if (bar) {
        bar.style.setProperty('--bar-height', '3%');
        bar.dataset.value = '0';
      }
    }
  });
}

// ---- Animate Stat Counters ----
function animateCounters() {
  const counters = document.querySelectorAll('.counter[data-target]');
  const duration = 1800;

  counters.forEach((counter) => {
    const target = parseFloat(counter.dataset.target);
    const decimals = parseInt(counter.dataset.decimals || '0', 10);
    const start = 0;
    const startTime = performance.now();

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + (target - start) * eased;

      if (decimals > 0) {
        counter.textContent = current.toFixed(decimals);
      } else {
        counter.textContent = Math.round(current).toLocaleString();
      }

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        // Final value
        if (decimals > 0) {
          counter.textContent = target.toFixed(decimals);
        } else {
          counter.textContent = target.toLocaleString();
        }
      }
    }

    // Stagger start based on card delay
    const card = counter.closest('.stat-card-animated');
    const delay = card ? parseInt(card.dataset.delay || '0', 10) * 150 : 0;

    setTimeout(() => {
      requestAnimationFrame(update);
    }, delay + 400);
  });
}

// ---- Animate Chart Bars ----
function animateChartBars() {
  const chart = document.getElementById('weeklyChart');
  if (!chart) return;

  // Start with minimal height, then animate to target
  setTimeout(() => {
    chart.classList.add('chart-animated');
  }, 800);
}

// ---- Animate Calorie Progress Bar ----
function animateCalorieBar() {
  const bar = document.getElementById('calorieBar');
  if (!bar) return;

  setTimeout(() => {
    bar.style.width = '74%';
  }, 1200);
}

// ---- FAB Toggle ----
function setupFAB() {
  const fabBtn = document.getElementById('fabBtn');
  const fabContainer = document.getElementById('fabContainer');

  if (!fabBtn || !fabContainer) return;

  fabBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fabContainer.classList.toggle('open');
  });

  // Close FAB when clicking outside
  document.addEventListener('click', (e) => {
    if (!fabContainer.contains(e.target)) {
      fabContainer.classList.remove('open');
    }
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      fabContainer.classList.remove('open');
    }
  });

  // FAB action handlers
  const fabLogWorkout = document.getElementById('fabLogWorkout');
  const fabLogMeal = document.getElementById('fabLogMeal');
  const fabLogWeight = document.getElementById('fabLogWeight');

  if (fabLogWorkout) {
    fabLogWorkout.addEventListener('click', () => {
      fabContainer.classList.remove('open');
      if (showToast) showToast('Log Workout coming soon!', 'info');
      else alert('Log Workout — coming soon!');
    });
  }
  if (fabLogMeal) {
    fabLogMeal.addEventListener('click', () => {
      fabContainer.classList.remove('open');
      if (showToast) showToast('Log Meal coming soon!', 'info');
      else alert('Log Meal — coming soon!');
    });
  }
  if (fabLogWeight) {
    fabLogWeight.addEventListener('click', () => {
      fabContainer.classList.remove('open');
      if (showToast) showToast('Log Weight coming soon!', 'info');
      else alert('Log Weight — coming soon!');
    });
  }
}

// ---- Sidebar Mobile Toggle ----
function setupSidebar() {
  const hamburger = document.getElementById('hamburgerBtn');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');

  if (!hamburger || !sidebar) return;

  hamburger.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay?.classList.toggle('visible');
    document.body.style.overflow = sidebar.classList.contains('open') ? 'hidden' : '';
  });

  overlay?.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('visible');
    document.body.style.overflow = '';
  });

  // Close sidebar on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sidebar.classList.contains('open')) {
      sidebar.classList.remove('open');
      overlay?.classList.remove('visible');
      document.body.style.overflow = '';
    }
  });
}

// ---- Active Nav Highlighting ----
function setupNavHighlight() {
  const navItems = document.querySelectorAll('.nav-item');
  const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';

  navItems.forEach((item) => {
    const href = item.getAttribute('href');
    if (href === currentPage) {
      item.classList.add('active');
    } else if (item.classList.contains('active') && href !== currentPage && href !== 'dashboard.html') {
      // Only remove if it's not the default dashboard active
    }

    // Hover ripple effect
    item.addEventListener('mouseenter', () => {
      if (!item.classList.contains('active')) {
        item.style.transition = 'all 0.25s ease';
      }
    });
  });
}

// ---- Start Workout Button ----
const startBtn = document.getElementById('startWorkoutBtn');
if (startBtn) {
  startBtn.addEventListener('click', () => {
    startBtn.innerHTML = '<i data-lucide="loader-2" class="animate-pulse"></i> Loading…';
    startBtn.disabled = true;
    startBtn.style.opacity = '0.7';
    initLucide();

    setTimeout(() => {
      startBtn.innerHTML = '<i data-lucide="play"></i> Start Workout';
      startBtn.disabled = false;
      startBtn.style.opacity = '1';
      initLucide();

      if (showToast) showToast('Workout page coming soon!', 'info');
      else alert('Workout feature — coming soon!');
    }, 1500);
  });
}
