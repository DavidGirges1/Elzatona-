import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
// Call only after verified user + record authorization. Never import into Client Components.
export function storageAdmin() {
  if (!process.env.SUPABASE_SECRET_KEY)
    throw new Error("Private PDF integration is not configured");
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
