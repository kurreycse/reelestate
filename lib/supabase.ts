import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

// Remove tokens created by older releases that persisted Supabase sessions in
// localStorage. Analytics visitor identifiers are deliberately unaffected.
if (typeof window !== "undefined") {
  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const item = localStorage.key(index);
    if (item?.startsWith("sb-") && item.endsWith("-auth-token")) localStorage.removeItem(item);
  }
}

export const isSupabaseConfigured = Boolean(url && key);
export const supabase = createClient(url || "https://placeholder.supabase.co", key || "placeholder", {
  // Keep access and refresh tokens in memory only. Reloading or closing the tab
  // requires a fresh OTP, preventing JavaScript-accessible persistent tokens.
  auth: { persistSession: false, autoRefreshToken: true, detectSessionInUrl: false },
});
