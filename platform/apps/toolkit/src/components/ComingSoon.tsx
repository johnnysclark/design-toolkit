export default function ComingSoon({
  title,
  blurb,
  subtitle
}: {
  title: string;
  blurb: string;
  subtitle?: string;
}) {
  return (
    <div className="max-w-2xl">
      <span className="inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
        Coming soon
      </span>
      <h1 className="mt-4 display-font text-3xl uppercase tracking-tight">
        {title}
        {subtitle && (
          <span className="font-sans text-lg font-normal normal-case text-neutral-900">
            {" "}
            — {subtitle}
          </span>
        )}
      </h1>
      <p className="mt-2 text-lg text-neutral-900">{blurb}</p>
      <p className="mt-6 rounded-lg border border-dashed border-neutral-300 bg-white p-4 text-sm text-neutral-900">
        In development for the Summer workshop. Here&rsquo;s the plan for what it
        will do — check back soon, or sign in and explore the tools that are
        already live.
      </p>
    </div>
  );
}
