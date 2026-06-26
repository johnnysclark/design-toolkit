// ─────────────────────────────────────────────────────────────────────────────
// Grade-1 (uncontracted) Unicode Braille — a direct port of the RAP repo's
// stdlib-only `braille.py`. BANA-style indicators for capitals and numbers.
// Output is Unicode Braille (U+2800–U+28FF), renderable in any Braille font and
// emboss-ready. (Grade-2 contraction needs liblouis; out of scope for the web
// preview — labels are short, so Grade-1 reads cleanly.)
// ─────────────────────────────────────────────────────────────────────────────

const LETTERS: Record<string, string> = {
  a: "⠁", b: "⠃", c: "⠉", d: "⠙", e: "⠑",
  f: "⠋", g: "⠛", h: "⠓", i: "⠊", j: "⠚",
  k: "⠅", l: "⠇", m: "⠍", n: "⠝", o: "⠕",
  p: "⠏", q: "⠟", r: "⠗", s: "⠎", t: "⠞",
  u: "⠥", v: "⠧", w: "⠺", x: "⠭", y: "⠽",
  z: "⠵"
};

// Digits reuse the letter cells a–j, prefixed by the number sign.
const DIGITS: Record<string, string> = {
  "1": LETTERS.a, "2": LETTERS.b, "3": LETTERS.c, "4": LETTERS.d, "5": LETTERS.e,
  "6": LETTERS.f, "7": LETTERS.g, "8": LETTERS.h, "9": LETTERS.i, "0": LETTERS.j
};

const PUNCT: Record<string, string> = {
  " ": " ",
  ".": "⠲",
  ",": "⠂",
  ";": "⠆",
  ":": "⠒",
  "?": "⠦",
  "!": "⠖",
  "'": "⠄",
  "-": "⠤",
  "(": "⠷",
  ")": "⠾",
  "/": "⠌"
};

const CAPITAL = "⠠"; // dots 6
const NUMBER = "⠼"; // dots 3456

/** Convert ASCII text to Unicode Grade-1 Braille. */
export function toBraille(text: string): string {
  let out = "";
  let inNumber = false;
  for (const ch of text) {
    const lower = ch.toLowerCase();
    if (ch >= "0" && ch <= "9") {
      if (!inNumber) {
        out += NUMBER;
        inNumber = true;
      }
      out += DIGITS[ch];
      continue;
    }
    inNumber = false;
    if (lower >= "a" && lower <= "z") {
      if (ch !== lower) out += CAPITAL; // a capital
      out += LETTERS[lower];
    } else if (ch in PUNCT) {
      out += PUNCT[ch];
    } else {
      out += ch; // pass through anything we don't map
    }
  }
  return out;
}
