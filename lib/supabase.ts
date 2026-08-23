import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

// Remove tokens created by older releases that persisted Supabase sessions in
// localStorage. Authentication is now tab-scoped in sessionStorage instead.
if (typeof window !== "undefined") {
  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const item = localStorage.key(index);
    if (item?.startsWith("sb-") && item.endsWith("-auth-token")) localStorage.removeItem(item);
  }
}

export const isSupabaseConfigured = Boolean(url && key);
export const supabase = createClient(url || "https://placeholder.supabase.co", key || "placeholder", {
  // Preserve login across refreshes without retaining tokens after the tab is
  // closed. A future server-rendered auth migration can move this to HttpOnly
  // cookies; sessionStorage is the safest usable option for this client-only UI.
  auth: {
    persistSession: true,
    storage: typeof window !== "undefined" ? window.sessionStorage : undefined,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
