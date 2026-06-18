// ============================================
// FitForge - Supabase Configuration
// ============================================
// Replace these with your actual Supabase project credentials
// Found in: Supabase Dashboard → Settings → API

const SUPABASE_URL = 'https://higaguhjikdvugpcbcri.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpZ2FndWhqaWtkdnVncGNiY3JpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3OTM0MzcsImV4cCI6MjA5NzM2OTQzN30.Fn_TS12apPEPG_nkv-VWMLuANJlO2KY2eov-PBPCJrw';

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
