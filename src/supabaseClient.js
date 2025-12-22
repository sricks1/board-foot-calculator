import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://qhttbhpsqnncbpyourar.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFodHRiaHBzcW5uY2JweW91cmFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxNzM0NjYsImV4cCI6MjA4MTc0OTQ2Nn0.ruty7opAUE7z7_ZZmzybry3IfKfjc-b6JUz_5DiahNo'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
