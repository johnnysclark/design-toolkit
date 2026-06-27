import EmbeddedTool from "@/components/EmbeddedTool";

export const metadata = {
  title: "Solar Envelope · Design Toolkit",
  description:
    "The largest buildable volume on a site whose shadows stay within the site during a chosen sun window — Knowles' solar envelope, simplified. Real solar geometry, orbitable, OBJ export for Rhino. Client-side."
};

export default function SolarEnvelopePage() {
  return (
    <EmbeddedTool
      title="Solar Envelope"
      subtitle="Zoning by sunlight"
      blurb="Carve the largest volume you could build on a site without throwing shadows onto the neighbours — the 'solar envelope' (after Ralph Knowles). Set the site size and latitude, pick the sun window to protect (e.g. winter 9–3), and the tool limits the height at every point so its shadow stays within the site during that window — tallest in the interior, sloping down to the edges. Orbit it, switch stepped/smooth, and export an OBJ straight into Rhino."
      src="/tools/solar-envelope/index.html"
      backHref="/tools-3d"
      backLabel="3D Tooling"
      note="Runs entirely in your browser — nothing is uploaded. A teaching model: it uses ground-shadow containment within the site (the classic simplified solar envelope), real NOAA sun positions, and an OBJ export — not a code-compliant zoning study."
    />
  );
}
