import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Global initialization of Supabase client (Client-side / Public)
export const supabase = createClient(supabaseUrl, supabaseKey);

// Global initialization of Supabase Admin client (Server-side ONLY)
// IMPORTANT: Never use this on the client side
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
