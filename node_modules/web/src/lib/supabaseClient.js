import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('[SUPABASE] Configuration missing! Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env.local file.');
} else {
  console.log('[SUPABASE] Client initializing with URL:', supabaseUrl);
}

// Initialize with safe fallbacks to prevent hard crashes if env vars are temporarily missing
export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseKey || 'placeholder-key');