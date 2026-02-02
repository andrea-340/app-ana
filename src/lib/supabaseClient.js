import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xgcduogwzqkzkcvdgcjw.supabase.co';
const supabaseKey = 'sb_publishable_zM00ZLLGf28o3TLz_gqgjA_WQcloSY8'; 

export const supabase = createClient(supabaseUrl, supabaseKey);