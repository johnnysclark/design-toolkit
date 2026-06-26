// Validate a post-auth redirect target. Only same-origin relative paths are
// allowed — a single leading "/" that is NOT "//" or "/\" (the classic
// protocol-relative / backslash open-redirect bypasses). Anything else
// (absolute URLs, "//evil.example", empty) falls back to "/".
export function safeNext(raw: string | null | undefined): string {
  if (!raw) return "/";
  return /^\/(?![/\\])/.test(raw) ? raw : "/";
}
