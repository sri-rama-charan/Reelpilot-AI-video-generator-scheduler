import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function main() {
  const email = "src11335577@gmail.com";
  // We don't know the exact user_id, let's just find by email to see ALL rows.
  const { data: allRows } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("email", email);

  console.log(
    "All rows for email (count: " + (allRows?.length || 0) + "):",
    allRows,
  );

  // We should also look up if there are any other rows with a given user_id if we knew it.
  // Instead, let's see why maybeSingle would fail if there's only 1 row.
  const { data: singleRow, error: singleError } = await supabaseAdmin
    .from("users")
    .select("id")
    .or(`email.eq.${email}`)
    .maybeSingle();

  console.log("\nMaybeSingle data:", singleRow);
  console.log("MaybeSingle error:", singleError);
}

main();
