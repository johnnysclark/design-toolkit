import { createClient } from "@/lib/supabase/server";
import SiteAnalysisTool from "./site-analysis-tool";

// PUBLIC page. The hard-data layers, map, charts and every export are open to
// anyone (the equity floor). Only the two AI passes gate — enforced in their API
// routes (401 for anon) and reflected here by passing `signedIn` to the tool.
export default async function SiteAnalysisPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return <SiteAnalysisTool signedIn={!!user} />;
}
