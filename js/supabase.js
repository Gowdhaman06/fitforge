// ============================================
// FitForge - Supabase Configuration
// ============================================
// Replace these with your actual Supabase project credentials
// Found in: Supabase Dashboard → Settings → API

const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

// Initialize Supabase client
// The Supabase JS library is loaded via CDN in HTML (<script src="...supabase-js@2...">)
const supabase = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// Check if Supabase is properly configured
const isSupabaseConfigured = () => {
  return (
    supabase !== null &&
    SUPABASE_URL !== 'YOUR_SUPABASE_URL' &&
    SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY'
  );
};

export { supabase, SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured };
export default supabase;
