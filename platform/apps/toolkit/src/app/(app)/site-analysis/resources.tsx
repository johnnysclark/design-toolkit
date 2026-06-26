"use client";

import { Card } from "./ui";

// A static, curated map of the tools architecture / landscape / planning students
// most often reach for to gather site information — the wider toolbox this analyzer
// sits inside. No AI, no account: just a vetted starting list to go deeper than what
// we measure here. Grouped by what you're trying to learn about a site.

type Resource = { name: string; url: string; what: string };
type Group = { title: string; blurb: string; items: Resource[] };

const GROUPS: Group[] = [
  {
    title: "Maps, imagery & GIS",
    blurb: "See the site, measure it, and build your own layered base map.",
    items: [
      {
        name: "Google Earth Pro",
        url: "https://www.google.com/earth/about/versions/",
        what: "Free desktop app — historical imagery, elevation profiles, measure, 3D context."
      },
      {
        name: "USGS EarthExplorer",
        url: "https://earthexplorer.usgs.gov/",
        what: "Download satellite & aerial imagery, Landsat, and elevation data, free."
      },
      {
        name: "QGIS",
        url: "https://qgis.org/",
        what: "Free, open-source desktop GIS — the standard for assembling site data layers."
      },
      {
        name: "ArcGIS Online + Living Atlas",
        url: "https://www.arcgis.com/",
        what: "Esri's web GIS and its huge ready-made data library (often free via your school)."
      },
      {
        name: "OpenStreetMap",
        url: "https://www.openstreetmap.org/",
        what: "Open, editable world map — roads, buildings, land use you can export."
      }
    ]
  },
  {
    title: "Terrain, elevation & LiDAR",
    blurb: "Get the ground itself — contours, slope, and high-resolution point clouds.",
    items: [
      {
        name: "USGS The National Map / 3DEP",
        url: "https://apps.nationalmap.gov/downloader/",
        what: "Authoritative US elevation (DEMs), hydrography, and contours to download."
      },
      {
        name: "OpenTopography",
        url: "https://opentopography.org/",
        what: "High-resolution LiDAR point clouds and derived DEMs for detailed terrain."
      },
      {
        name: "USGS topoView",
        url: "https://ngmdb.usgs.gov/topoview/",
        what: "Every historical USGS topographic map — how the land was drawn over time."
      }
    ]
  },
  {
    title: "Climate, sun & energy",
    blurb: "Read the sky — sun path, wind, comfort, and solar potential for design.",
    items: [
      {
        name: "Climate Consultant (UCLA)",
        url: "http://www.energy-design-tools.aud.ucla.edu/",
        what: "Free tool that turns a weather file into design guidance (psychrometrics, strategies)."
      },
      {
        name: "EPW weather files — onebuilding.org",
        url: "https://climate.onebuilding.org/",
        what: "The go-to source for the hourly EPW weather files energy/comfort tools need."
      },
      {
        name: "Ladybug Tools",
        url: "https://www.ladybug.tools/",
        what: "Free Grasshopper/Rhino plugins for sun, daylight, wind, and energy analysis."
      },
      {
        name: "PVWatts (NREL)",
        url: "https://pvwatts.nrel.gov/",
        what: "Estimate solar PV output for a location and roof — quick renewable feasibility."
      },
      {
        name: "Andrew Marsh web apps",
        url: "https://drajmarsh.bitbucket.io/",
        what: "Browser sun-path, shadow, and psychrometric calculators — fast, no install."
      }
    ]
  },
  {
    title: "Water, soils & hazards",
    blurb: "What the ground holds and the risks it carries — flood, soil, drainage, contamination.",
    items: [
      {
        name: "FEMA Flood Map Service Center",
        url: "https://msc.fema.gov/portal/home",
        what: "Official US flood zones (FIRMs) and base flood elevations for a site."
      },
      {
        name: "USDA Web Soil Survey",
        url: "https://websoilsurvey.nrcs.usda.gov/app/",
        what: "Soil type, drainage, and bearing characteristics — essential for landscape & foundations."
      },
      {
        name: "USGS StreamStats",
        url: "https://streamstats.usgs.gov/ss/",
        what: "Delineate watersheds and get streamflow/drainage statistics for a point."
      },
      {
        name: "NOAA Sea Level Rise Viewer",
        url: "https://coast.noaa.gov/slr/",
        what: "Map coastal inundation and sea-level-rise scenarios for resilience planning."
      },
      {
        name: "EPA EnviroAtlas",
        url: "https://www.epa.gov/enviroatlas",
        what: "Ecosystem, land-cover, and environmental-justice data layers for a place."
      }
    ]
  },
  {
    title: "Parcels, zoning & demographics",
    blurb: "The legal and human ground — who owns it, what's allowed, who lives nearby.",
    items: [
      {
        name: "Your county / city GIS & assessor",
        url: "https://www.google.com/search?q=county+GIS+parcel+viewer",
        what: "The real source for parcels, zoning, easements & ownership — search your locality."
      },
      {
        name: "Regrid",
        url: "https://regrid.com/",
        what: "Nationwide parcel boundaries and ownership data in one searchable map."
      },
      {
        name: "U.S. Census — data.census.gov",
        url: "https://data.census.gov/",
        what: "Population, housing, income, commute data (ACS) for the surrounding area."
      },
      {
        name: "PolicyMap",
        url: "https://www.policymap.com/",
        what: "Maps demographic, economic & housing indicators (often free via your school)."
      },
      {
        name: "Walk Score",
        url: "https://www.walkscore.com/",
        what: "Quick walkability, transit, and bike scores for a site's context."
      }
    ]
  },
  {
    title: "History & change over time",
    blurb: "How the site got here — past uses, prior structures, and disturbance.",
    items: [
      {
        name: "Historic Aerials",
        url: "https://www.historicaerials.com/",
        what: "Aerial photos and topo maps going back decades — see what was there before."
      },
      {
        name: "Library of Congress — Sanborn Maps",
        url: "https://www.loc.gov/collections/sanborn-maps/",
        what: "Fire-insurance maps showing historical building footprints, uses & materials."
      },
      {
        name: "NETR Online",
        url: "https://publicrecords.netronline.com/",
        what: "Gateway to county property records, deeds, and historical land data by location."
      }
    ]
  }
];

export default function FurtherResources() {
  return (
    <Card title="Further resources — the wider site-research toolbox">
      <p className="-mt-1 mb-4 max-w-3xl text-sm text-neutral-600">
        This tool measures climate, terrain, and water. To go further, these are the resources
        architecture, landscape, and planning students most often use to gather information and data
        about a site. Most are free; many US datasets are nationwide.
      </p>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {GROUPS.map((g) => (
          <section key={g.title}>
            <h3 className="display-font text-sm uppercase tracking-tight text-neutral-900">
              {g.title}
            </h3>
            <p className="mt-0.5 text-xs text-neutral-500">{g.blurb}</p>
            <ul className="mt-2 space-y-2">
              {g.items.map((r) => (
                <li key={r.url}>
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-neutral-900 underline decoration-neutral-300 decoration-dotted underline-offset-2 hover:decoration-neutral-900"
                  >
                    {r.name} ↗
                  </a>
                  <p className="text-xs leading-snug text-neutral-600">{r.what}</p>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <p className="mt-5 border-t border-neutral-100 pt-3 text-xs text-neutral-400">
        Links open external sites we don't control. For parcels, zoning, and codes, your local
        city/county GIS is almost always the authoritative source — start there.
      </p>
    </Card>
  );
}
