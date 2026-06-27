import EmbeddedTool from "@/components/EmbeddedTool";

export const metadata = {
  title: "Sun & Shadow Study · Design Toolkit",
  description:
    "Pick a place and a date + time and see where the sun is and how shadows fall on a massing — real solar geometry (NOAA), real cast shadows, a sun-path arc, and a one-click day animation. Client-side."
};

export default function SunStudyPage() {
  return (
    <EmbeddedTool
      title="Sun & Shadow Study"
      subtitle="Solar geometry & cast shadows"
      blurb="Pick a place (latitude / longitude) and a date and time, and watch where the sun sits and how shadows fall across a massing. Real solar geometry (the NOAA solar-position algorithm) drives real cast shadows; a sun-path arc shows the whole day, and one click animates sunrise → sunset. Switch massings, set the main height, read altitude / azimuth / sunrise / sunset, and export a PNG."
      src="/tools/sun-study/index.html"
      backHref="/tools-3d"
      backLabel="3D Tooling"
      note="Runs entirely in your browser — nothing is uploaded. Solar positions use the NOAA algorithm (accurate to about a minute); shadows are a real-time shadow map on a study massing, not a certified daylight simulation."
    />
  );
}
