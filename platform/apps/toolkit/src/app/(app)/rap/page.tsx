import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "RAP — accessible architecture research",
  description:
    "RAP: a non-visual / tactile CAD workflow, and the studio research making architecture education accessible to blind and low-vision students.",
};

const ARTICLE_URL =
  "https://news.illinois.edu/illinois-architecture-professors-project-aims-to-make-architecture-education-accessible-to-blind-students/";

export default function Page() {
  return (
    <article className="max-w-3xl">
      <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800">
        Research · tool in development
      </span>

      <h1 className="mt-4 text-4xl sm:text-5xl tracking-tight">RAP</h1>
      <p className="mt-3 text-lg text-neutral-700">
        A non-visual, tactile CAD workflow — and the studio research behind it.
        Architecture is oculo-centric; RAP is about rebalancing it so blind and
        low-vision students can design independently, with a studio experience
        comparable to their sighted peers.
      </p>

      {/* Source article */}
      <a
        href={ARTICLE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 block rounded-xl border border-neutral-200 bg-white p-5 transition hover:border-neutral-400 hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="display-font text-xs uppercase tracking-tight text-neutral-500">
              Illinois News Bureau · Jan 22, 2026
            </div>
            <div className="mt-1 font-semibold leading-snug">
              Illinois architecture professors’ project aims to make
              architecture education accessible to blind students
            </div>
          </div>
          <span aria-hidden="true" className="shrink-0 text-2xl">
            ↗
          </span>
        </div>
        <span className="sr-only">(opens in a new tab)</span>
      </a>

      {/* Why */}
      <section className="mt-10">
        <h2 className="display-font text-lg uppercase tracking-tight">
          Why it matters
        </h2>
        <p className="mt-2 text-neutral-700">
          Architecture’s tools and curriculum assume sight — part of why so few
          blind and low-vision students enter the field. RAP builds a non-visual
          feedback loop so a student can model, test, and revise on their own,
          and speeds the design-iteration process from drawing to tactile output.
        </p>
        <blockquote className="mt-4 border-l-4 border-neutral-900 pl-4 text-neutral-800">
          “Architecture itself is a fundamentally multisensory art form. It’s
          just the way we communicate architecture before a building goes up
          that’s visual.”
          <footer className="mt-1 text-sm text-neutral-500">
            — Daniel Bein, architecture student &amp; lead collaborator
          </footer>
        </blockquote>
      </section>

      {/* Approach */}
      <section className="mt-10">
        <h2 className="display-font text-lg uppercase tracking-tight">
          The approach
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-neutral-200 bg-white p-5">
            <h3 className="font-semibold">Tactile representation</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-700">
              <li>Swell paper — raised lines from printed drawings</li>
              <li>3D printers and 3D-printing pens</li>
              <li>
                Physical models — Styrofoam, cardboard, wire, chipboard, tracing
                paper
              </li>
              <li>
                A developing set of tactile graphic standards: lineweights and
                textures that stand in for different design aspects
              </li>
            </ul>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-5">
            <h3 className="font-semibold">Digital &amp; AI</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-700">
              <li>OpenSCAD and Python-scripted parametric models</li>
              <li>PowerPoint as an accessible modeling surface</li>
              <li>AI language models for image and drawing description</li>
              <li>Cameras that turn hand drawings into data</li>
            </ul>
          </div>
        </div>
        <p className="mt-3 text-sm text-neutral-600">
          Together, the scripted models, 3D printing, swell paper, and tactile
          techniques sharply shortened the revision loop compared with earlier
          methods — and apply beyond design studio to history, structures, and
          other visually-oriented courses.
        </p>
      </section>

      {/* Team */}
      <section className="mt-10">
        <h2 className="display-font text-lg uppercase tracking-tight">
          The team
        </h2>
        <ul className="mt-2 space-y-1 text-neutral-700">
          <li>
            <strong>John Clark</strong> &amp; <strong>Hugh Swiatek</strong> —
            design studio faculty, UIUC College of Architecture (project leads)
          </li>
          <li>
            <strong>Daniel Bein</strong> — architecture student and primary
            collaborator
          </li>
          <li>
            <strong>Ethan Anderson</strong> — project partner ·{" "}
            <strong>Isaac Tu</strong> — student assistant
          </li>
        </ul>
        <p className="mt-3 text-sm text-neutral-500">
          Supported by the College of Fine and Applied Arts and the Office of the
          Chief Information Officer.
        </p>
      </section>

      {/* The tool */}
      <section className="mt-10 rounded-lg border border-dashed border-neutral-300 bg-white p-4 text-sm text-neutral-600">
        The RAP tool in this toolkit will bring that workflow online — a
        non-visual / tactile CAD pipeline. It’s in active development; this page
        is its research home.{" "}
        <a
          href={ARTICLE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-blue-700 underline underline-offset-2"
        >
          Read the full story
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
        .
      </section>
    </article>
  );
}
