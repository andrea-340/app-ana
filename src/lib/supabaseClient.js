import { createClient } from '@supabase/supabase-js'

// Queste devono essere IDENTICHE a quelle scritte su Vercel
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Attenzione: Chiavi Supabase mancanti nelle variabili d'ambiente!");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
