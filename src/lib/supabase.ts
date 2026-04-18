import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? 'https://kwapjfytlfmcghflojgo.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3YXBqZnl0bGZtY2doZmxvamdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3MTQwMzAsImV4cCI6MjA5MDI5MDAzMH0.AbmQe76Uld471FZMnIH7_lHWuf5Xz8wUWQnzF7smdh4'

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
