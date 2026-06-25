import Link from "next/link";

// Shown in place of a tool when an anonymous visitor opens one that needs a
// signed-in user (it spends the API key, or needs a user session for RLS).
// The Toolkit shell is public; only these tools gate to /login.
export default function AuthGate({ tool }: { tool: string }) {
  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">{tool}</h1>
      <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-8 text-center">
        <p className="font-medium text-neutral-800">Sign in to use {tool}.</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-neutral-500">
          This tool is for signed-in studio members. Everything else in the Toolkit is
          open to browse.
        </p>
        <Link
          href="/login"
          className="mt-5 inline-block rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
