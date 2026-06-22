// The shared CLAIM shape + tag glyphs, reused across tools (site-analyzer and
// precedent-librarian use the same idea). Every model assertion carries a
// confidence tag and a reason so the student verifies the rest — the model is a
// material to interrogate, never an authority.
//
// Structured-output constraints (see claude-api skill): every object needs
// additionalProperties:false; status lives as a string enum; no numeric/length
// constraints.

// The three tutor statuses map to the course glyphs ✓ / ? / ⚠.
export const CLAIM_STATUS = ["stable", "version-dependent", "likely-wrong"];

export const CLAIM = {
  type: "object",
  additionalProperties: false,
  properties: {
    claim: { type: "string", description: "A single, atomic factual assertion (one fact)." },
    status: {
      type: "string",
      enum: CLAIM_STATUS,
      description:
        "stable = a mode-invariant fact you are certain of (✓); version-dependent = true for some Rhino/plugin versions, check yours (?); likely-wrong = you are not sure this component/method/name exists, verify it (⚠)."
    },
    reason: {
      type: "string",
      description: "One line: why this status. For likely-wrong, name the tell (e.g. unsure the component exists)."
    },
    source: {
      type: "string",
      description:
        "A KB id or doc URL if you have one, else empty string. Only mark 'stable' with a real, specific source — do not invent."
    }
  },
  required: ["claim", "status", "reason", "source"]
};

// Glyph map for the frontend (kept here so client + server agree).
export const TAG = {
  stable: { glyph: "✓", cls: "stable", label: "stable" },
  "version-dependent": { glyph: "?", cls: "version", label: "version-dependent" },
  "likely-wrong": { glyph: "⚠", cls: "wrong", label: "likely wrong — check this" }
};
