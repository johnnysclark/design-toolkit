// Prompts + JSON Schemas for the Site Analysis model passes.
// Ported from TOOLS/site-analyzer/web/prompts.js, same conventions as the
// Librarian's prompts.ts.
//
// "Grain of the machine" philosophy:
//   - Hard data (EPA boundary, USGS terrain, FEMA flood, Open-Meteo climate) is
//     fetched, sourced, and shown as-is. The model never overrides it.
//   - Where the model adds knowledge the APIs don't carry — contaminants of
//     concern, plume behaviour, design implications — every atomic claim is
//     tagged (verified / plausible-unverified / likely-hallucination) and, when
//     grounded, carries a real citation URL. The student verifies the rest.
//
// Structured-output constraints: every object needs additionalProperties:false;
// enums for status; no numeric/length limits.

// Sonnet 4.6 — faster + cheaper than Opus, which keeps the grounded passes under
// Vercel's 60s function cap. Used by contamination, synthesis, and the follow-up chat.
export { MODEL } from "./models";

// Reusable atomic-claim shape — the load-bearing honesty primitive (matches the
// Librarian's claim tags so the UI chips are shared).
const CLAIM = {
  type: "object",
  additionalProperties: false,
  properties: {
    claim: {
      type: "string",
      description: "A single, atomic, independently checkable assertion."
    },
    status: {
      type: "string",
      enum: ["verified", "plausible-unverified", "likely-hallucination"],
      description:
        "verified = backed by a real source cited here; plausible-unverified = consistent with what you know but unsourced; likely-hallucination = invented specifics (precise numbers, quotes, dates) you cannot stand behind."
    },
    reason: {
      type: "string",
      description: "One line: why this status. For likely-hallucination, name the tell."
    },
    source: {
      type: "string",
      description: "A real citation URL/reference, or empty string. Never invent one."
    }
  },
  required: ["claim", "status", "reason", "source"]
} as const;

// ---------------------------------------------------------------------------
// Pass 1 — Contamination (grounded, cited)
// ---------------------------------------------------------------------------

export const CONTAMINATION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: {
      type: "string",
      description:
        "2-4 sentences: what was contaminated here, by whom/what use, and the current cleanup posture."
    },
    contaminants_of_concern: {
      type: "array",
      description:
        "The principal contaminants. Prefer fewer, well-sourced entries over a padded list.",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: {
            type: "string",
            description:
              "Contaminant or contaminant class (e.g. 'PCBs', 'coal tar / PAHs', 'lead')."
          },
          media: {
            type: "string",
            description:
              "Where it lives: soil, groundwater, sediment, surface water, soil vapor, etc."
          },
          health_or_design_note: {
            type: "string",
            description:
              "Why a designer should care — exposure pathway, depth, mobility, what it forecloses on site."
          },
          claim: CLAIM
        },
        required: ["name", "media", "health_or_design_note", "claim"]
      }
    },
    plume_and_extent: {
      type: "string",
      description:
        "What's known about spatial extent / plume behaviour / depth. Say plainly if unknown."
    },
    institutional_controls: {
      type: "array",
      description:
        "Legal/physical use restrictions on the remediated land (deed restrictions, caps, no-dig zones, vapor barriers, groundwater-use bans).",
      items: CLAIM
    },
    remediation_status: {
      type: "string",
      description:
        "Remedy selected/under way (ROD highlights), and what it means for building on or near the site."
    },
    sources: {
      type: "array",
      description:
        "Real source URLs you actually used (EPA ROD/site pages, news, agency docs).",
      items: { type: "string" }
    }
  },
  required: [
    "summary",
    "contaminants_of_concern",
    "plume_and_extent",
    "institutional_controls",
    "remediation_status",
    "sources"
  ]
} as const;

export function contaminationSystem(grounded: boolean): string {
  return [
    "You are an environmental site researcher briefing an architecture design studio on a Superfund site.",
    "This studio treats AI as a material to interrogate, never as an authority. Be honest about what you do and do not know so students can verify the rest. Contamination drives what can be built, where, and how deep — getting it wrong is not a stylistic error.",
    "",
    "Rules:",
    "- Break specifics into ATOMIC claims and tag each one. Use 'likely-hallucination' for any suspiciously precise figure, date, or quote you cannot source.",
    "- Do NOT invent contaminants to seem thorough. A short, sourced list beats a long, guessed one.",
    "- Institutional controls are high-stakes: only state a restriction you can source, else mark it plausible-unverified and say it must be confirmed against the deed/ROD.",
    grounded
      ? "- You have a web_search tool. Search EPA's site page, the Record of Decision (ROD), and reputable reporting. Attach REAL URLs; mark a claim 'verified' only when a source you actually found supports it."
      : "- You have NO search tool, so NOTHING may be 'verified'. Use 'plausible-unverified' or 'likely-hallucination' only, and leave source fields empty.",
    "",
    "Return only the structured object."
  ].join("\n");
}

export function contaminationUser(site: any): string {
  return [
    `Superfund site: ${site.name}`,
    `EPA ID: ${site.epaId}  ·  SEMS ID: ${site.semsId ?? "n/a"}  ·  NPL status: ${site.status}`,
    `Location: ${[site.city, site.county, site.state].filter(Boolean).join(", ")}  ·  EPA Region ${
      site.region ?? "?"
    }`,
    site.dates?.listed ? `Listed on the NPL: ${site.dates.listed}` : "",
    site.documents?.progressProfile?.url
      ? `EPA site profile: ${site.documents.progressProfile.url}`
      : "",
    site.documents?.listingNarrative?.url
      ? `EPA listing narrative (PDF): ${site.documents.listingNarrative.url}`
      : "",
    "",
    "Brief the studio on the contamination: what's here, in what media, the plume/extent, institutional controls, and the remediation status. Anchor to the EPA ROD/site pages where you can."
  ]
    .filter(Boolean)
    .join("\n");
}

// ---------------------------------------------------------------------------
// Pass 2 — Site synthesis (reasons over the hard data we already collected)
// ---------------------------------------------------------------------------

export const SYNTHESIS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    site_in_a_sentence: {
      type: "string",
      description:
        "One sentence: what this place physically IS, for a designer who has never been."
    },
    climate_read: {
      type: "string",
      description:
        "Design-relevant read of sun/wind/humidity/temperature FROM THE PROVIDED DATA — orientation, prevailing wind, comfort, passive strategies. Cite the numbers given; don't invent new ones."
    },
    topography_read: {
      type: "string",
      description:
        "What the elevation range/slope (as provided) means for grading, drainage, access, and where mass wants to go. If terrain wasn't sampled, say so."
    },
    water_and_flood_read: {
      type: "string",
      description:
        "What the FEMA flood finding (as provided) implies — first-floor elevation, ground-floor program, resilience. State plainly if unmapped."
    },
    contamination_implications: {
      type: "string",
      description:
        "How the contamination picture constrains design: foundations, excavation, landscape/soil contact, vapor intrusion, what's foreclosed."
    },
    design_opportunities: {
      type: "array",
      description:
        "Concrete, site-specific design moves the physical realities suggest. Tag any that rest on an assumption.",
      items: CLAIM
    },
    key_tensions: {
      type: "string",
      description:
        "The hardest contradictions a studio must resolve here (e.g. flood wants elevation, contamination wants no excavation)."
    },
    what_this_analysis_cannot_tell_you: {
      type: "string",
      description:
        "Honest limits: resolution of the data, what a site visit / geotech / survey would reveal that this cannot. The student must not treat this as ground truth."
    },
    field_checklist: {
      type: "array",
      description: "Things to confirm in person or with a real survey before designing.",
      items: { type: "string" }
    }
  },
  required: [
    "site_in_a_sentence",
    "climate_read",
    "topography_read",
    "water_and_flood_read",
    "contamination_implications",
    "design_opportunities",
    "key_tensions",
    "what_this_analysis_cannot_tell_you",
    "field_checklist"
  ]
} as const;

// `hasContamination` is true only in Superfund mode (Place mode has no EPA
// contamination brief), so the prompt doesn't ask the model to invent one.
export function synthesisSystem(hasContamination: boolean): string {
  return [
    `You are a site analyst for an architecture design studio. You have been handed HARD DATA already gathered for a physical place: its location, a climate summary (sun/wind/humidity from reanalysis), a terrain summary (USGS elevation, where available), a FEMA flood finding (where mapped)${
      hasContamination ? ", and a contamination brief (this is a Superfund site)" : ""
    }.`,
    "Your job is to turn that data into a design-relevant reading of the place — NOT to add new facts. Reason over the numbers you were given.",
    "Rules:",
    "- Ground every quantitative statement in a value from the provided data. Do not introduce new figures; if you need one you weren't given, say it must be measured.",
    "- The climate read is the priority: be specific about orientation, prevailing wind, and humidity/comfort using the wind rose and monthly profile provided.",
    "- Tag design opportunities that rest on an assumption rather than the data.",
    hasContamination
      ? "- Use the contamination brief for the contamination_implications field."
      : "- No contamination data was gathered for this place. For contamination_implications, say plainly that none was assessed and that a Phase I ESA / records check would be needed; do NOT invent contaminants.",
    "- Some layers may be missing (terrain and flood are US-only; outside the US they come back empty). Where a layer is absent, say so in the matching read instead of guessing.",
    "- Be candid in 'what this analysis cannot tell you'. Reanalysis climate is ~25km; terrain is a coarse grid; flood is a single point. The studio must verify.",
    "Return only the structured object."
  ].join("\n");
}

export function synthesisUser(bundle: any): string {
  return [
    "Here is the hard data gathered for the site. Read it for design.",
    "",
    "```json",
    JSON.stringify(bundle, null, 2),
    "```"
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Auto first pass — sources (grounded, streamed, runs without a button press)
// ---------------------------------------------------------------------------

// As soon as a place is analyzed we quietly run ONE quick grounded pass to surface
// the authoritative links/documents a studio would want — so students start with a
// trail to follow, not a blank chat. Kept deliberately small (few searches, short
// output) so it always finishes well inside the function budget.
export function sourcesSystem(context: string): string {
  return [
    "You are a research assistant for an architecture design studio. A place has just been analyzed and you are doing a fast FIRST PASS to find the most useful, authoritative sources about it on the web.",
    "This studio treats AI as a material to interrogate, never an authority — so your job here is mostly to point at good primary sources, not to assert facts.",
    "",
    "Do this:",
    "- Run a few targeted web searches for THIS specific place (not a generic topic).",
    "- Prefer primary/official sources: city/county/regional GIS & planning, EPA/USGS/FEMA, the site's own pages, news of record, reputable history/archives.",
    "- Then write a SHORT orientation: 2-4 sentences on what kind of place this is and what the best sources cover. Name the sources in plain language.",
    "- Do NOT invent specifics (dates, figures, names) you can't see in a source. If you're unsure, say so.",
    "",
    "Keep it brief — this is a starting point the student will dig into. The links you actually open are captured automatically and shown beside your note.",
    "",
    "What we already measured for this place (don't repeat it — go beyond it):",
    "```json",
    context,
    "```"
  ].join("\n");
}

export function sourcesUser(place: any): string {
  const where = [place?.city, place?.county, place?.state, place?.country]
    .filter(Boolean)
    .join(", ");
  return [
    `Place: ${place?.name ?? "(unnamed)"}`,
    where ? `Where: ${where}` : "",
    place?.coordinates
      ? `Coordinates: ${place.coordinates.lat}, ${place.coordinates.lon}`
      : "",
    place?.epaId ? `EPA Superfund ID: ${place.epaId}` : "",
    "",
    "Find the best sources for understanding this exact place, then give the short orientation."
  ]
    .filter(Boolean)
    .join("\n");
}

// ---------------------------------------------------------------------------
// Follow-up chat (grounded — Sonnet + web search, streamed)
// ---------------------------------------------------------------------------

// The student asks free-form questions about the place after the structured read.
// `context` is the JSON of what we already know (hard data + any AI passes) so the
// model answers from it first and only searches the web for what's missing.
export function chatSystem(context: string): string {
  return [
    "You are a research assistant helping an architecture design studio understand a real, physical place. You can search the web.",
    "This studio treats AI as a material to interrogate, never an authority — be honest about what you do and don't know so students can verify the rest.",
    "",
    "You already have a dossier of hard data and (sometimes) an AI reading for this place. It is given below. Ground your answers in it first; only search the web for things it doesn't cover (history, current proposals, ownership, news, codes, nearby context, precedents).",
    "",
    "Rules:",
    "- When you use the web, prefer primary/official sources (city/county GIS, EPA, USGS, news of record, the site's own pages). Name what you found.",
    "- Flag any precise figure, date, name, or quote you can't source as unverified — say so plainly. Never invent a citation.",
    "- Be concise and design-relevant. A student is deciding what to draw, where to dig, how to orient. Answer that.",
    "- If asked something the data can't support and the web can't settle, say what a site visit, survey, or records request would be needed to confirm.",
    "",
    "The dossier for this place:",
    "```json",
    context,
    "```"
  ].join("\n");
}
