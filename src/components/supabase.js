// src/supabase.js
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://kejmjzkegmdhjaduozgw.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtlam1qemtlZ21kaGphZHVvemd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1MzAyMDQsImV4cCI6MjA4ODEwNjIwNH0.ek0aIQd5j7Wtn8Lvu1xBsb2TTLWXdCEt-Kjdkm8yS6Q";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
