// Timeouts for the AI routes.
//
// Vercel Pro lifts the old Hobby 60s function cap, so answers now run to
// completion instead of getting cut off mid-thought (the "times out / doesn't
// complete" reports). Each AI route still declares `export const maxDuration =
// 300` directly — Next reads it as a static literal, so it can't be a referenced
// constant; keep those literals in sync with AI_MAX_DURATION here.
//
// The soft-timeouts abort the model a few seconds early and return a CLEAN
// message instead of letting Vercel hard-kill the function (which would ship a
// non-JSON error page → the "Unexpected token 'A'" crash). They're a safety net
// for a genuinely stuck request, not a target — streaming shows tokens as they
// arrive, and streamed routes still flush whatever they have on abort.

export const AI_MAX_DURATION = 300; // seconds — mirror in each route's `maxDuration` literal
export const SOFT_TIMEOUT_MS = 285_000; // buffered (JSON) passes — comfortably under 300s
export const STREAM_SOFT_TIMEOUT_MS = 290_000; // streamed routes — they still commit partials on abort
