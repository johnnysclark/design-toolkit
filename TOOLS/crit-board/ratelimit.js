// crit-board — tiny dependency-free fixed-window rate limiter (in-memory).
//
// Keyed by the signed-in name when available, else by IP. This is single-process:
// a multi-instance deploy would need a shared store. A studio board runs one
// instance on one persistent disk, so in-memory is the right, lightest choice.
export function rateLimit({ windowMs, max, message = "Too many requests — slow down." }) {
  const hits = new Map(); // key -> { count, reset }
  return (req, res, next) => {
    const key = (req.session && req.session.name) || req.ip || "anon";
    const now = Date.now();
    let e = hits.get(key);
    if (!e || now > e.reset) { e = { count: 0, reset: now + windowMs }; hits.set(key, e); }
    e.count++;
    if (e.count > max) {
      res.set("Retry-After", String(Math.ceil((e.reset - now) / 1000)));
      return res.status(429).json({ error: message });
    }
    // Opportunistic sweep so the map can't grow without bound.
    if (hits.size > 5000) for (const [k, v] of hits) if (now > v.reset) hits.delete(k);
    next();
  };
}
