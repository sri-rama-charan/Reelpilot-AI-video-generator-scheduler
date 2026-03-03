import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Checking if status column exists on series table...");
  const { data, error } = await supabaseAdmin
    .from("series")
    .select("status")
    .limit(1);

  if (error && error.code === "42703") {
    // 42703 is undefined_column in Postgres
    console.log(
      "Status column doesn't exist. You need to run this SQL in Supabase SQL editor:",
    );
    console.log(`
      ALTER TABLE public.series 
      ADD COLUMN status text NOT NULL DEFAULT 'active';
    `);
  } else if (error) {
    console.error("Unknown error checking schema:", error);
  } else {
    console.log("Status column already exists!");
  }
}

main();
