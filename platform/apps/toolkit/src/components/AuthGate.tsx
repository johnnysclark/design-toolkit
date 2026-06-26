import Link from "next/link";
import RequestAccessButton from "@/components/RequestAccessButton";

// Shown in place of a tool when an anonymous visitor opens one that needs a
// signed-in user (it spends the API key, or needs a user session for RLS).
// The Toolkit shell is public; only these tools gate to /login.
export default function AuthGate({ tool, next }: { tool: string; next?: string }) {
  // Send the student back to this tool after they sign in (validated server-side).
  const href = next ? `/login?next=${encodeURIComponent(next)}` : "/login";
  return (
    <div>
      <h1 className="display-font text-3xl uppercase tracking-tight">{tool}</h1>
      <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-8 text-center">
        <p className="font-medium text-neutral-900">Sign in to use {tool}.</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-neutral-900">
          This tool is for signed-in studio members. Everything else in the Toolkit is
          open to browse.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={href}
            className="inline-block rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Sign in
          </Link>
          <RequestAccessButton />
        </div>
        <p className="mx-auto mt-3 max-w-md text-xs text-neutral-900">
          Not a member yet? Request access and John will authorize your email.
        </p>
      </div>
    </div>
  );
}
