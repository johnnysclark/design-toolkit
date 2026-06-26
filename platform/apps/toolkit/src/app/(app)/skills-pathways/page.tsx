import TrailBoard from "./TrailBoard";

// Skills Pathways is a public, no-cost tool (static content + embeds, no API
// key) — so it needs no sign-in, like Site Analysis. It's the map + video
// library that complements the interactive Skills Coach: browse a trail from
// beginner to advanced across 2D and 3D software, and watch the tutorial behind
// each step.
export const metadata = {
  title: "Cartographer · Design Toolkit",
  description:
    "A beginner-to-advanced map of 2D and 3D digital skills, with a tutorial video behind every step."
};

export default function SkillsPathwaysPage() {
  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">Cartographer</h1>
      <p className="mt-2 max-w-2xl text-neutral-900">
        A trail map for digital skills — how to climb from beginner to advanced in
        both 2D and 3D software, aimed at studio work: modeling, representation,
        and portfolio, not construction documents. Click any step for a short,
        plain-English guide to the basics (with video walkthroughs added over
        time) and the key concepts behind it. Pick a track and a tool to begin.
      </p>
      <TrailBoard />
    </div>
  );
}
