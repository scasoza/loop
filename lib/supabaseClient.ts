import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables are not set. The app will run in demo mode.');
}

export const supabase = createClient(supabaseUrl ?? 'https://example.supabase.co', supabaseAnonKey ?? 'public-anon-key', {
  auth: {
    persistSession: false
  }
});
