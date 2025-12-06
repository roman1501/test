import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ewjvqlvzbiighbajjusg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV3anZxbHZ6YmlpZ2hiYWpqdXNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMTQ2ODYsImV4cCI6MjA4MDU5MDY4Nn0.eWM1cw2VXPUnlce477vmleIr6A_2RAayk9m9ZlaPbxQ';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
