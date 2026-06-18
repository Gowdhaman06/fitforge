// ============================================
// FitForge - Authentication Module
// ============================================

import { supabase, isSupabaseConfigured } from './supabase.js';
import { showToast, navigateTo } from './app.js';

// ── Helpers ──────────────────────────────────────────────────────────

/**
 * Guard: ensure Supabase is configured before any auth operation
 * @returns {boolean} true if configured, false otherwise (shows toast)
 */
function requireSupabase() {
  if (!isSupabaseConfigured()) {
    showToast(
      'Supabase is not configured. Update your credentials in js/supabase.js',
      'error',
      5000
    );
    console.warn(
      '[FitForge Auth] Supabase not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY in js/supabase.js'
    );
    return false;
  }
  return true;
}

/**
 * Convert Supabase error messages to user-friendly messages
 * @param {Error|object} error - The error from Supabase
 * @returns {string} User-friendly error message
 */
function getFriendlyErrorMessage(error) {
  const message = error?.message || error?.error_description || String(error);

  const errorMap = {
    'Invalid login credentials': 'Incorrect email or password. Please try again.',
    'Email not confirmed': 'Please verify your email address before signing in.',
    'User already registered': 'An account with this email already exists. Try signing in.',
    'Password should be at least 6 characters':
      'Password must be at least 6 characters long.',
    'Signup requires a valid password':
      'Please enter a valid password (at least 6 characters).',
    'Email rate limit exceeded':
      'Too many attempts. Please wait a few minutes before trying again.',
    'For security purposes, you can only request this after':
      'Too many requests. Please wait a moment before trying again.',
    'Invalid email': 'Please enter a valid email address.',
    'new row violates row-level security policy':
      'Permission denied. Please contact support if this persists.',
  };

  // Check for matching known error patterns
  for (const [pattern, friendly] of Object.entries(errorMap)) {
    if (message.toLowerCase().includes(pattern.toLowerCase())) {
      return friendly;
    }
  }

  // Return the original message if no match
  return message;
}

// ── Auth Functions ───────────────────────────────────────────────────

/**
 * Sign up a new user with email and password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{user: object|null, error: string|null}>}
 */
async function signUp(email, password) {
  if (!requireSupabase()) {
    return { user: null, error: 'Supabase not configured' };
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/bmi-onboarding.html`,
      },
    });

    if (error) {
      const friendlyMsg = getFriendlyErrorMessage(error);
      showToast(friendlyMsg, 'error');
      return { user: null, error: friendlyMsg };
    }

    // Check if email confirmation is required
    if (data?.user?.identities?.length === 0) {
      showToast('An account with this email already exists.', 'warning');
      return { user: null, error: 'User already registered' };
    }

    if (data?.user && !data.session) {
      // Email confirmation required
      showToast(
        'Account created! Please check your email to verify your account.',
        'success',
        5000
      );
    } else if (data?.user && data.session) {
      // Auto-confirmed (e.g., email confirmation disabled in Supabase)
      showToast('Account created successfully! Welcome to FitForge! 💪', 'success');
      navigateTo('bmi-onboarding.html');
    }

    return { user: data?.user || null, error: null };
  } catch (err) {
    console.error('[FitForge Auth] Sign up error:', err);
    const message = 'Something went wrong during sign up. Please try again.';
    showToast(message, 'error');
    return { user: null, error: message };
  }
}

/**
 * Sign in with email and password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{user: object|null, error: string|null}>}
 */
async function signIn(email, password) {
  if (!requireSupabase()) {
    return { user: null, error: 'Supabase not configured' };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      const friendlyMsg = getFriendlyErrorMessage(error);
      showToast(friendlyMsg, 'error');
      return { user: null, error: friendlyMsg };
    }

    showToast('Welcome back! 💪', 'success');

    // Check if profile/BMI onboarding is complete
    const profileComplete = await isProfileComplete(data.user.id);

    if (!profileComplete) {
      navigateTo('bmi-onboarding.html');
    } else {
      navigateTo('dashboard.html');
    }

    return { user: data.user, error: null };
  } catch (err) {
    console.error('[FitForge Auth] Sign in error:', err);
    const message = 'Something went wrong during sign in. Please try again.';
    showToast(message, 'error');
    return { user: null, error: message };
  }
}

/**
 * Sign in with Google OAuth
 * @returns {Promise<{error: string|null}>}
 */
async function signInWithGoogle() {
  if (!requireSupabase()) {
    return { error: 'Supabase not configured' };
  }

  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/bmi-onboarding.html`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      const friendlyMsg = getFriendlyErrorMessage(error);
      showToast(friendlyMsg, 'error');
      return { error: friendlyMsg };
    }

    // The browser will redirect to Google — no further action needed here
    return { error: null };
  } catch (err) {
    console.error('[FitForge Auth] Google sign in error:', err);
    const message = 'Google sign in failed. Please try again.';
    showToast(message, 'error');
    return { error: message };
  }
}

/**
 * Sign out the current user
 * @returns {Promise<{error: string|null}>}
 */
async function signOut() {
  if (!requireSupabase()) {
    return { error: 'Supabase not configured' };
  }

  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      const friendlyMsg = getFriendlyErrorMessage(error);
      showToast(friendlyMsg, 'error');
      return { error: friendlyMsg };
    }

    showToast('You have been signed out. See you soon! 👋', 'success');
    navigateTo('index.html');
    return { error: null };
  } catch (err) {
    console.error('[FitForge Auth] Sign out error:', err);
    const message = 'Sign out failed. Please try again.';
    showToast(message, 'error');
    return { error: message };
  }
}

/**
 * Get the current authenticated user
 * @returns {Promise<object|null>} The user object or null
 */
async function getCurrentUser() {
  if (!isSupabaseConfigured()) return null;

  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.error('[FitForge Auth] Get session error:', error.message);
      return null;
    }

    return session?.user || null;
  } catch (err) {
    console.error('[FitForge Auth] Get current user error:', err);
    return null;
  }
}

/**
 * Listen for authentication state changes
 * @param {function} callback - Called with (event, session) on auth change
 * @returns {object|null} The subscription object (call .unsubscribe() to stop)
 */
function onAuthStateChange(callback) {
  if (!isSupabaseConfigured()) {
    console.warn('[FitForge Auth] Supabase not configured, auth listener not attached.');
    return null;
  }

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });

  return subscription;
}

/**
 * Check if a user has completed their BMI/profile onboarding
 * @param {string} userId - The user's UUID
 * @returns {Promise<boolean>} true if profile is complete
 */
async function isProfileComplete(userId) {
  if (!isSupabaseConfigured() || !userId) return false;

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('height, weight, age, gender')
      .eq('id', userId)
      .single();

    if (error) {
      // If no row exists, profile is not complete
      if (error.code === 'PGRST116') return false;
      console.error('[FitForge Auth] Profile check error:', error.message);
      return false;
    }

    // Profile is complete if all required fields are filled
    return !!(data && data.height && data.weight && data.age && data.gender);
  } catch (err) {
    console.error('[FitForge Auth] Profile completeness check failed:', err);
    return false;
  }
}

/**
 * Reset password - sends a password reset email
 * @param {string} email
 * @returns {Promise<{error: string|null}>}
 */
async function resetPassword(email) {
  if (!requireSupabase()) {
    return { error: 'Supabase not configured' };
  }

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password.html`,
    });

    if (error) {
      const friendlyMsg = getFriendlyErrorMessage(error);
      showToast(friendlyMsg, 'error');
      return { error: friendlyMsg };
    }

    showToast(
      'Password reset email sent! Check your inbox.',
      'success',
      5000
    );
    return { error: null };
  } catch (err) {
    console.error('[FitForge Auth] Password reset error:', err);
    const message = 'Failed to send password reset email. Please try again.';
    showToast(message, 'error');
    return { error: message };
  }
}

/**
 * Update user password (when user has a valid session, e.g., from reset link)
 * @param {string} newPassword
 * @returns {Promise<{error: string|null}>}
 */
async function updatePassword(newPassword) {
  if (!requireSupabase()) {
    return { error: 'Supabase not configured' };
  }

  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      const friendlyMsg = getFriendlyErrorMessage(error);
      showToast(friendlyMsg, 'error');
      return { error: friendlyMsg };
    }

    showToast('Password updated successfully!', 'success');
    return { error: null };
  } catch (err) {
    console.error('[FitForge Auth] Password update error:', err);
    const message = 'Failed to update password. Please try again.';
    showToast(message, 'error');
    return { error: message };
  }
}

// ── Exports ──────────────────────────────────────────────────────────

export {
  signUp,
  signIn,
  signInWithGoogle,
  signOut,
  getCurrentUser,
  onAuthStateChange,
  isProfileComplete,
  resetPassword,
  updatePassword,
};
