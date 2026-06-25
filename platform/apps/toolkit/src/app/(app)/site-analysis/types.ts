// Shared client types for the Site Analysis UI. The geometry/data primitives are
// reused from the ported engine (type-only imports — erased at build, no server
// code reaches the client bundle).
import type { WindRose, SunPath, MonthStat } from "@/lib/site-analysis/geo";
import type {
  Flood,
  Topo,
  SiteCandidate,
  GeoPlace,
  ClimateRaw
} from "@/lib/site-analysis/datasources";

export type Mode = "place" | "superfund";
export type Scale = "macro" | "micro";

export type { WindRose, SunPath, MonthStat, Flood, Topo, SiteCandidate, GeoPlace, ClimateRaw };

// The unified site shape the analyze route returns for either mode.
export interface AnalyzedSite {
  mode: Mode;
  name: string;
  address?: string | null;
  epaId?: string | null;
  semsId?: string | null;
  status?: string | null;
  city?: string | null;
  county?: string | null;
  state?: string | null;
  region?: string | number | null;
  score?: number | null;
  category?: string | null;
  centroid: { lat: number; lon: number };
  bbox?: [number, number, number, number];
  areaAcres?: number | null;
  boundary?: { type: "MultiPolygon"; coordinates: number[][][][] } | null;
  documents?: Record<string, { text: string; url: string | null } | null>;
  dates?: Record<string, unknown>;
}

export interface ClimateSummary {
  source: string;
  year: number;
  tzOffsetHours: number;
  timezone: string;
  elevation: number;
  units: Record<string, string>;
  windRose: WindRose;
  prevailingWind: { dir: string; fraction: number };
  temp: MonthStat[];
  rh: MonthStat[];
  annual: {
    tempMean: number | null;
    tempMin: number | null;
    tempMax: number | null;
    rhMean: number | null;
    windMean: number | null;
  };
  sunPaths: SunPath[];
}

export interface Coverage {
  boundary: boolean;
  climate: boolean;
  terrain: boolean;
  flood: boolean;
}

export interface AnalyzeResult {
  meta: {
    mode: Mode;
    epaId: string | null;
    label: string | null;
    generatedAt: string;
    gridN: number;
    climateYear: number;
  };
  site: AnalyzedSite;
  climate: { summary: ClimateSummary; raw: ClimateRaw } | null;
  flood: Flood | null;
  topo: Topo | null;
  coverage: Coverage;
}

// --- AI pass shapes (mirror the JSON Schemas in site-analysis-prompts.ts) -----

export type ClaimStatus = "verified" | "plausible-unverified" | "likely-hallucination";
export interface Claim {
  claim: string;
  status: ClaimStatus;
  reason: string;
  source: string;
}

export interface Contamination {
  summary: string;
  contaminants_of_concern: {
    name: string;
    media: string;
    health_or_design_note: string;
    claim: Claim;
  }[];
  plume_and_extent: string;
  institutional_controls: Claim[];
  remediation_status: string;
  sources: string[];
}

export interface Synthesis {
  site_in_a_sentence: string;
  climate_read: string;
  topography_read: string;
  water_and_flood_read: string;
  contamination_implications: string;
  design_opportunities: Claim[];
  key_tensions: string;
  what_this_analysis_cannot_tell_you: string;
  field_checklist: string[];
}
