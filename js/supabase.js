import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://cmdfppbvtnvrivymopsv.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtZGZwcGJ2dG52cml2eW1vcHN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1Mjc0NjgsImV4cCI6MjEwMzEwMzQ2OH0.USQuiKTgD53PF1OJ4LZHtSNNkjyy6a1pDm0teEwjfvI";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function requireSession() {
  const session = await getSession();
  if (!session) {
    window.location.replace("login.html");
    return null;
  }
  return session;
}

export async function touchActivity() {
  const { error } = await supabase.rpc("update_activity");
  if (error) console.warn("Could not update activity:", error.message);
}
