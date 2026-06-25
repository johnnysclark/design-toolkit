"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { error?: string; sent?: boolean };

// Email + password sign-in. Unlike the magic link, this establishes a session
// directly on the current domain (works on Vercel preview URLs, no email round
// trip), so it's the reliable way to sign in while magic-link delivery/redirects
// are being sorted out. Create the user in Supabase: Authentication → Users →
// Add user (set a password, tick "Auto Confirm User").
export async function signInPassword(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  if (!email || !password) return { error: "Enter your email and password." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };

  redirect("/skills-coach");
}

// Email magic-link sign-in. Supabase emails a link back to /auth/callback.
export async function signIn(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") || "").trim();
  if (!email) return { error: "Enter your email address." };

  const supabase = await createClient();
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (await headers()).get("origin") ||
    "";

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/callback` }
  });

  if (error) return { error: error.message };
  return { sent: true };
}
