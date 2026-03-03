// src/supabase.js
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://kejmjzkegmdhjaduozgw.supabase.co";
const SUPABASE_KEY = "sb_publishable_X0QukhHY4N_w1GTWY9r50g_Q1QTTnCN";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
