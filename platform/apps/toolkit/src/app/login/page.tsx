"use client";

import { useActionState, useEffect, useState } from "react";
import { signIn, signInPassword, type LoginState } from "./actions";
import RequestAccessButton from "@/components/RequestAccessButton";

const initialState: LoginState = {};

export default function LoginPage() {
  const [pwState, pwAction, pwPending] = useActionState(signInPassword, initialState);
  const [mlState, mlAction, mlPending] = useActionState(signIn, initialState);

  // Where to land after sign-in (a gated tool links here with ?next=…). Read
  // from the URL on the client to avoid a Suspense boundary for useSearchParams;
  // validated again server-side in the action.
  const [next, setNext] = useState("/");
  useEffect(() => {
    const n = new URLSearchParams(window.location.search).get("next");
    if (n && /^\/(?![/\\])/.test(n)) setNext(n);
  }, []);

  const field =
    "w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900";

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Design Toolkit</h1>
        <p className="mt-1 text-sm text-neutral-900">Sign in to use the studio tools.</p>

        {/* Email + password — works on any domain (incl. Vercel previews), no email needed. */}
        <form action={pwAction} className="mt-6 space-y-3">
          <input type="hidden" name="next" value={next} />
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@illinois.edu"
            className={field}
          />
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="Password"
            className={field}
          />
          <button
            type="submit"
            disabled={pwPending}
            className="w-full rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {pwPending ? "Signing in…" : "Sign in"}
          </button>
          {pwState.error && <p className="text-sm text-red-600">{pwState.error}</p>}
        </form>

        {/* Magic-link fallback. */}
        <details className="mt-4">
          <summary className="cursor-pointer text-xs text-neutral-900 hover:text-[#ff3b21]">
            Or email me a magic link instead
          </summary>
          {mlState.sent ? (
            <p className="mt-3 rounded-lg bg-green-50 p-3 text-sm text-green-800">
              Check your inbox for a sign-in link. You can close this tab.
            </p>
          ) : (
            <form action={mlAction} className="mt-3 space-y-2">
              <input type="hidden" name="next" value={next} />
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@illinois.edu"
                className={field}
              />
              <button
                type="submit"
                disabled={mlPending}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-100 disabled:opacity-50"
              >
                {mlPending ? "Sending…" : "Send magic link"}
              </button>
              {mlState.error && <p className="text-sm text-red-600">{mlState.error}</p>}
            </form>
          )}
        </details>

        <div className="mt-6 border-t border-neutral-200 pt-4 text-center">
          <p className="text-xs text-neutral-900">
            Access is by invitation — your email must exist in Supabase Auth.
          </p>
          <RequestAccessButton className="mt-3" />
        </div>
      </div>
    </main>
  );
}
