import { createClient } from "@supabase/supabase-js";

// IMPORTANT: These should be environment variables in a real production app.
// For this environment, they are hardcoded as per user's provision.
const supabaseUrl = "https://kezqwaibstyhvxpdhdts.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtlenF3YWlic3R5aHZ4cGRoZHRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2ODU0NTEsImV4cCI6MjA1OTI2MTQ1MX0.f8lcr89hUJLsQYdHWE6tFlijL7PtHKI3w7KtG-PGgb8";

const isDevelopment = window.location.hostname === 'localhost';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL and Anon Key are required.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    redirectTo: isDevelopment 
      ? window.location.origin 
      : 'https://thiago3005.github.io/'
  }
});
