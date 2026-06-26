// "Request access" — opens a prefilled email to the toolkit owner so a new
// visitor can ask to be authorized. Used on the login page and the AuthGate.
// (No backend needed; once Resend SMTP is set up this could post a form instead.)
const SUBJECT = "Design Toolkit — access request";
const BODY = [
  "Hi John,",
  "",
  "Please authorize my account for the Design Toolkit.",
  "",
  "Name:",
  "Email I'll sign in with:",
  "What I'd like to use it for:",
  ""
].join("\n");
const HREF = `mailto:jsclark2@illinois.edu?subject=${encodeURIComponent(
  SUBJECT
)}&body=${encodeURIComponent(BODY)}`;

export default function RequestAccessButton({
  className = ""
}: {
  className?: string;
}) {
  return (
    <a
      href={HREF}
      className={
        "inline-block rounded-lg border-2 border-neutral-900 px-4 py-2 text-sm font-medium text-neutral-900 transition hover:bg-neutral-900 hover:text-white " +
        className
      }
    >
      Request access →
    </a>
  );
}
