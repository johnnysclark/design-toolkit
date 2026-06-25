# Brainstorm in Claude Desktop → Build in Claude Code

A practical workflow for using the **Claude Desktop app** as your design *thinking
partner* — to explore layouts, page structures, and visual directions — and then
handing that thinking off to the **Claude Code** sessions in your terminal that
actually build the website.

> The short version: **Desktop decides *what* to build. Code builds it.** The thing
> that travels between them is a short written **brief** you save into this repo.

---

## Why two tools at all?

They're good at opposite halves of the job. Don't make either one do the other's work.

| | **Claude Desktop** (the chat app) | **Claude Code** (the terminal) |
|---|---|---|
| **Best at** | Thinking, options, critique, words & pictures | Doing — editing files, running the site, git |
| **Can it touch your files?** | ❌ No. It only talks. | ✅ Yes. It reads and writes the actual code. |
| **You give it** | Ideas, screenshots, reference sites | A clear brief + "go build this" |
| **You get back** | Directions, wireframes, a written spec, sometimes a quick HTML mockup | Working pages in your repo |
| **Mindset** | "Let's explore. Show me 3 ways." | "Here's the decided plan. Implement it." |

The mistake to avoid: open-ended *vibing* inside Claude Code. Code is happiest when it's
handed a decided plan. The deciding happens in Desktop.

---

## The loop, at a glance

```
   ┌─────────────────────────────────────────────────────────┐
   │                                                         │
   │   1. BRAINSTORM        2. WRITE A BRIEF      3. BUILD    │
   │   (Claude Desktop)  →  (save .md in repo) →  (Claude Code)│
   │        ▲                                         │       │
   │        │            4. SCREENSHOT THE RESULT     │       │
   │        └─────────────  paste back into Desktop ◄─┘       │
   │                        for critique, repeat             │
   └─────────────────────────────────────────────────────────┘
```

You'll go around this loop many times. Each lap, the brief gets a little more decided
and the page gets a little more real.

---

## Part 1 — Brainstorm in Claude Desktop

Open the Claude Desktop app (not the terminal). This is pure exploration. A few moves
that work well:

**Give it the context first.** Paste in a paragraph about the project — or just paste
the relevant part of [`WEBSITE-PLAN.md`](WEBSITE-PLAN.md). The more it knows about the
two-property setup (Toolkit app vs. Portfolio site) and the studio's voice, the better
its suggestions.

**Paste in references.** Drag screenshots of sites you like, or your own rough sketches,
straight into the Desktop chat. Claude can see images. Say what you like about each one
("I like how calm this is," "the type is doing the work here").

**Ask for *distinct* options, not one answer.** The magic prompt:

> "Give me **three genuinely different** layout directions for the Toolkit homepage —
> not three variations of the same idea. For each: a name, who it's for, the page
> structure top-to-bottom, and the one risk."

**Pressure-test before you commit.** Once one direction feels right:

> "Play critic. What's weak about Direction 2? Where will it fall apart on mobile, or
> with real content instead of placeholder text?"

**Optional — get a quick visual.** Desktop can write a single self-contained HTML file
that mocks up the layout. Ask: *"Make a one-file HTML/CSS mockup of this so I can see
it."* You can open that in a browser to react to it. (It's a sketch to *look at*, not
the real site — the real one gets built in Code, in your actual stack.)

> ✅ **You're done with Part 1 when** you can say in a sentence or two what the page is,
> who it's for, and roughly how it's laid out — and you don't hate it.

---

## Part 2 — Turn the brainstorm into a brief

This is the **handoff artifact** — the one thing that crosses from Desktop to Code. A
brief is just a short Markdown file. It beats pasting a long chat log because it's
*decided*, *skimmable*, and lives in the repo where Code can read it and git can track
it.

Ask Desktop to write it for you:

> "Turn everything we just decided into a build brief in Markdown, using this template."
> *(paste the template below)*

Then **save it into the repo** as a `.md` file. A good home is a `briefs/` folder next
to your tools, e.g. `design-toolkit/briefs/homepage.md`. (You can create the folder just
by saving a file into it.)

### Brief template

```markdown
# Brief: [Page or component name]

## What this is
One or two sentences. What page/component, and what it's for.

## Audience & goal
Who lands here, and the single thing we want them to do or feel.

## Tech (so Code matches the rest of the site)
- Framework: [e.g. Next.js / Astro — see WEBSITE-PLAN.md]
- Styling: [e.g. Tailwind]
- Anything to reuse: [existing components, colors, fonts]

## Layout, top to bottom
1. [Section] — what's in it, why
2. [Section] — ...
3. ...
(An ASCII sketch here is great if you have one.)

## Content / copy
Real-ish text for headings and buttons. Mark placeholders as TODO.

## Look & feel
- Mood in 3 words: [e.g. calm, rigorous, warm]
- Color / type direction: [or "match existing site"]

## Responsive behavior
What changes on mobile vs. desktop.

## States & edge cases
Empty, loading, error, logged-out — whatever applies.

## Out of scope (for now)
Things we are deliberately NOT building yet.
```

> ✅ **You're done with Part 2 when** the brief is saved in the repo and a stranger could
> read it and know what to build.

---

## Part 3 — Hand the brief to Claude Code

Now switch to your terminal where Claude Code is running **in this repo** (the same way
you run your build sessions today).

Because the brief is a file in the repo, you just point Code at it:

```
Read design-toolkit/briefs/homepage.md and build it. Match the existing stack and
styles. Ask me before installing anything new. Start the dev server when it's ready
so I can see it.
```

That's the whole bridge. Code reads the brief, builds the page, and runs the site.

**Three things worth saying to Code every time:**
- **"Match the existing stack/styles."** Keeps it from inventing a new design system.
- **"Ask before adding dependencies."** Avoids surprise installs.
- **"Show me — run the dev server."** So you can actually look at the result.

**Two bonuses you already have set up:**
- You installed the **frontend-design** skill — Code can lean on it for typography and
  visual polish. You can nudge it: *"use the frontend-design guidance for the type and
  spacing."*
- If you saved a **mockup image** from Desktop into the repo (say `briefs/homepage.png`),
  tell Code to look at it: *"Match the layout in briefs/homepage.png."* Code can read
  images.

> ✅ **You're done with Part 3 when** the dev server is up and you're looking at a real
> first version in your browser.

---

## Part 4 — The iteration loop (this is where it gets good)

The first build is never the last. Close the loop:

1. **Screenshot** the page from your browser.
2. **Paste it into Claude Desktop** and react: *"The hero feels cramped and the type is
   timid. Here's a screenshot — what would you change?"*
3. Desktop gives you specific changes. **Update the brief** (or just collect a short
   change list).
4. Back in the terminal, tell Code the changes: *"Update the homepage: bigger hero,
   stronger headline type, more whitespace between sections."*
5. Repeat until it's right.

Why bounce screenshots back to *Desktop* for critique instead of just asking Code? Same
reason as before — Desktop is the better *eye and editor*; Code is the better *hands*.
Desktop also won't get distracted by the code while it's judging the look.

---

## Tips & traps

- **Don't paste whole chat logs into Code.** Distill to a brief first. Long transcripts
  bury the decision and waste Code's attention.
- **One brief per page or component.** A homepage brief, a tool-card brief, a nav brief.
  Small briefs are easier to build and re-do.
- **Keep briefs in the repo, not just in chat.** Then they're versioned, Code can read
  them directly, and you have a record of *why* the page is the way it is.
- **Decide the stack once, in the brief.** "Next.js + Tailwind" up top means Code won't
  guess wrong. (See [`WEBSITE-PLAN.md`](WEBSITE-PLAN.md) for the two-property stack.)
- **Building two parts at once?** Give each its own terminal/agent and its own folder —
  see [`RUNNING-MULTIPLE-AGENTS.md`](RUNNING-MULTIPLE-AGENTS.md). E.g. one agent on the
  Toolkit homepage, one on a tool page, each driven by its own brief.
- **Desktop can't see your repo; Code can't brainstorm well.** That split *is* the
  workflow. Lean into it.

---

## Copy-paste starters

**In Claude Desktop — start a brainstorm:**
> I'm designing the [PAGE] for my site. Context: [paste a few lines, or part of
> WEBSITE-PLAN.md]. Give me three genuinely different layout directions — for each, a
> name, the audience, the top-to-bottom structure, and the main risk. Then ask me which
> to develop.

**In Claude Desktop — write the brief:**
> We've settled on Direction [X]. Write it up as a build brief in Markdown using this
> template: [paste template]. Keep copy realistic and mark anything unsettled as TODO.

**In Claude Code — build from the brief:**
> Read design-toolkit/briefs/[NAME].md and build it. Match the existing stack and
> styles, use the frontend-design guidance for type and spacing, ask before installing
> anything, and run the dev server when it's ready.

**In Claude Code — iterate:**
> Update [PAGE] per these changes from review: [paste your short change list]. Keep
> everything else as-is and reload the dev server.

---

### A 60-second worked example

1. **Desktop:** "Three directions for the Toolkit homepage." → you pick the calm,
   editorial one.
2. **Desktop:** "Write the brief." → you save it as `design-toolkit/briefs/homepage.md`.
3. **Code:** "Read design-toolkit/briefs/homepage.md and build it… run the dev server."
   → first version is live locally.
4. **Browser → screenshot → Desktop:** "Hero's too quiet, fix the rhythm." → change list.
5. **Code:** "Update the homepage: louder hero, tighten section spacing." → done.

That's one full lap. The website gets built one brief, one lap, at a time.
