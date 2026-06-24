"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { error?: string; sent?: boolean };

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
