import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Use this client for operations that need to bypass RLS (e.g., seeding, admin dashboard)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
