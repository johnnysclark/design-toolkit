"use client";

import { useActionState } from "react";
import { signIn, type LoginState } from "./actions";

const initialState: LoginState = {};

export default function LoginPage() {
  const [state, action, pending] = useActionState(signIn, initialState);

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Design Toolkit</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Sign in with your email — we&rsquo;ll send you a one-time magic link.
        </p>

        {state.sent ? (
          <p className="mt-6 rounded-lg bg-green-50 p-4 text-sm text-green-800">
            Check your inbox for a sign-in link. You can close this tab.
          </p>
        ) : (
          <form action={action} className="mt-6 space-y-3">
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@illinois.edu"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
            />
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
            >
              {pending ? "Sending…" : "Send magic link"}
            </button>
            {state.error && (
              <p className="text-sm text-red-600">{state.error}</p>
            )}
          </form>
        )}

        <p className="mt-6 text-xs text-neutral-400">
          Access is by invitation — your email must be enabled in Supabase Auth.
        </p>
      </div>
    </main>
  );
}
