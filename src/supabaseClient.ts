import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wklwuyckchstbgjkzxid.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrbHd1eWNrY2hzdGJnamt6eGlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4MzM0NjQsImV4cCI6MjA2NTQwOTQ2NH0.DeRRaVZNOzK-eDO8-_ZfwHxruNR6vY76kRq61EpNas4';


if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Anon Key must be provided in environment variables.');
}



export const supabase = createClient(supabaseUrl, supabaseAnonKey);