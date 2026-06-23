// The canned archive for the lite demo: six real precedents (+ one un-cataloged image).
// Each entry carries real metadata and a real source link. Each image references:
//   - `illustration`  : the offline SVG stand-in (see illustrations.mjs)
//   - `commonsFile` / `commonsQuery` : what build.mjs fetches to swap in a real photo
//   - `alt` + `altSource` : pre-baked AI/human alt (a static page can't call the model)
//   - `cannedAlt` : the string the demo's "generate" action fills when alt starts empty
//
// Alt text is written in the tool's house style: lead with what it is and the spatial
// organization, name visible materials and light, no "an image of," dense but for the ear.

export const ARCHIVE = {
  types: ["precedent", "project", "detail", "material", "diagram", "reference", "screenshot", "inspiration"],

  entries: [
    {
      id: "salk",
      title: "Salk Institute for Biological Studies",
      type: "precedent",
      tags: ["court", "axis", "concrete", "symmetry", "light"],
      notes: "Louis Kahn, 1965 — La Jolla, California. Two mirrored laboratory blocks frame an open travertine court; a single channel of water runs down its centre to the Pacific horizon. A touchstone for monumental symmetry and the choreography of light and distance.",
      sources: [{ url: "https://en.wikipedia.org/wiki/Salk_Institute", label: "Wikipedia — Salk Institute" }],
      related: ["kimbell", "exeter"],
      updated: "2026-06-21T09:00:00Z",
      images: [{
        illustration: "salkCourt",
        commonsFile: "File:Salk Institute.jpg",
        commonsQuery: "Salk Institute courtyard water",
        primary: true,
        alt: "Wide eye-level view down the Salk Institute's open court: a flat travertine plaza split by a single thin channel of water running dead-centre to the sea horizon, flanked by symmetrical board-formed concrete laboratory blocks whose angled study towers step toward the axis.",
        altSource: "ai",
        caption: "Central court, water channel on the axis to the Pacific"
      }]
    },

    {
      id: "kimbell",
      title: "Kimbell Art Museum",
      type: "project",
      tags: ["vault", "daylight", "gallery", "concrete", "museum"],
      notes: "Louis Kahn, 1972 — Fort Worth, Texas. Parallel cycloid concrete vaults, each slit along its crown so daylight is thrown up onto the curved soffit by a perforated reflector. The canonical demonstration of controlled top-light in a gallery.",
      sources: [{ url: "https://en.wikipedia.org/wiki/Kimbell_Art_Museum", label: "Wikipedia — Kimbell Art Museum" }],
      related: ["salk", "exeter"],
      updated: "2026-06-21T09:12:00Z",
      images: [
        {
          illustration: "kimbellExterior",
          commonsFile: "File:Kimbell Art Museum 06.jpg",
          commonsQuery: "Kimbell Art Museum exterior vaults",
          primary: true,
          alt: "Frontal elevation of a row of low cycloid barrel vaults in pale concrete, repeated five bays wide above a flat travertine base; the open portico bays in front read as deep shadowed recesses.",
          altSource: "ai",
          caption: "Repeated cycloid vaults along the entry front"
        },
        {
          illustration: "kimbellInterior",
          commonsFile: "File:Kimbell Art Museum interior.jpg",
          commonsQuery: "Kimbell Art Museum interior gallery light",
          alt: "Gallery interior seen in section under one cycloid vault; a narrow glazed slot at the crown washes silver daylight down the curved concrete soffit through a metal reflector, with a single painting on the wall below.",
          altSource: "human",
          caption: "Top-lit vault, light reflected onto the soffit"
        }
      ]
    },

    {
      id: "exeter",
      title: "Phillips Exeter Academy Library",
      type: "precedent",
      tags: ["library", "atrium", "brick", "concrete", "light"],
      notes: "Louis Kahn, 1971 — Exeter, New Hampshire. A brick outer doughnut of reading carrels wraps a concrete inner core; four enormous circular openings let you see the book stacks across the full-height atrium. Light from above, books in the middle, reader at the edge.",
      sources: [{ url: "https://en.wikipedia.org/wiki/Class_of_1945_Library", label: "Wikipedia — Class of 1945 Library" }],
      related: ["salk", "kimbell"],
      updated: "2026-06-21T09:20:00Z",
      images: [{
        illustration: "exeterLibrary",
        commonsFile: "File:Phillips Exeter Academy Library, Exeter, NH.jpg",
        commonsQuery: "Phillips Exeter Library atrium circles",
        primary: true,
        alt: "The library's central atrium wall: a massive concrete plane pierced by four giant circular openings, each revealing crossed diagonal book stacks behind, the whole composition rigidly symmetrical about a vertical centre line.",
        altSource: "ai",
        caption: "Atrium core — the four circular openings to the stacks"
      }]
    },

    {
      id: "farnsworth",
      title: "Farnsworth House",
      type: "precedent",
      tags: ["glass", "pavilion", "steel", "landscape", "minimal"],
      notes: "Ludwig Mies van der Rohe, 1951 — Plano, Illinois. A single glass room suspended between two white steel planes, lifted above a river floodplain on slender columns. The limit case of the open, weightless pavilion.",
      sources: [{ url: "https://en.wikipedia.org/wiki/Farnsworth_House", label: "Wikipedia — Farnsworth House" }],
      related: ["barcelona"],
      updated: "2026-06-21T09:28:00Z",
      images: [{
        illustration: "farnsworth",
        commonsFile: "File:Farnsworth House by Mies Van Der Rohe - exterior-8.jpg",
        commonsQuery: "Farnsworth House Mies exterior",
        primary: true,
        alt: "A single-storey glass pavilion floating above a green floodplain: two thin white steel slabs, floor and roof, span between five slender exposed columns, fully glazed between them, with a lower travertine terrace stepping toward the approach.",
        altSource: "ai",
        caption: "Glass volume suspended between two white steel planes"
      }]
    },

    {
      id: "barcelona",
      title: "Barcelona Pavilion",
      type: "precedent",
      tags: ["free-plan", "marble", "reflecting-pool", "flowing-space"],
      notes: "Mies van der Rohe, 1929 (reconstructed 1986) — Barcelona. Free-standing planar walls of marble and onyx slide past a regular grid of cruciform columns; flat roofs and reflecting pools turn the plan into continuous, directionless space.",
      sources: [{ url: "https://en.wikipedia.org/wiki/Barcelona_Pavilion", label: "Wikipedia — Barcelona Pavilion" }],
      related: ["farnsworth"],
      updated: "2026-06-21T09:34:00Z",
      images: [{
        illustration: "barcelonaPavilion",
        commonsFile: "File:Barcelona mies v.d. rohe pavillon weltausstellung1999 03.jpg",
        commonsQuery: "Barcelona Pavilion Mies plan interior",
        primary: true,
        alt: "Near-plan reading of the pavilion on its travertine podium: free-standing marble walls set at offsets slide past a regular eight-point grid of slim cruciform columns, with a dark reflecting pool and a single standing sculpture held to one side.",
        altSource: "ai",
        caption: "Free plan — sliding planes against a column grid"
      }]
    },

    {
      id: "pantheon",
      title: "Pantheon, Rome",
      type: "precedent",
      tags: ["dome", "oculus", "concrete", "top-light", "ancient"],
      notes: "Rome, c. 113–125 AD (Hadrianic). A perfect hemisphere of coffered concrete on a cylindrical drum, open at the crown: a single nine-metre oculus is the only light, sweeping the interior as the sun moves. The ancestor of every top-lit room here.",
      sources: [{ url: "https://en.wikipedia.org/wiki/Pantheon,_Rome", label: "Wikipedia — Pantheon, Rome" }],
      related: [],
      updated: "2026-06-21T09:40:00Z",
      images: [{
        illustration: "pantheon",
        commonsFile: "File:Pantheon dome.jpg",
        commonsQuery: "Pantheon Rome dome oculus interior",
        primary: true,
        alt: "",
        altSource: "empty",
        caption: "Coffered dome and oculus (alt text not written yet)",
        cannedAlt: "Section through a hemispherical coffered concrete dome on a cylindrical drum; a single round oculus at the crown is the only opening, casting a hard diagonal shaft of daylight down across the recessed coffers to the floor."
      }]
    }
  ],

  orphans: [
    {
      id: "salk-detail",
      illustration: "salkDetail",
      commonsFile: "File:Salk Institute (cropped).jpg",
      commonsQuery: "Salk Institute travertine channel detail",
      name: "salk-court-detail.jpg",
      cannedAlt: "Close detail of the Salk court paving: jointed travertine slabs in a regular grid run to a narrow central water channel with a small square fountain head, a teak-clad study bay at the right edge."
    }
  ]
};
