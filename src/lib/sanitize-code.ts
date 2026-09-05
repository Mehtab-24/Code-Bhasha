// ─── Generated-code sanitation guard ──────────────────────────────────────────
// Runs on the frontend before AI output reaches the editor buffer. The Bedrock
// response occasionally carries verbose prose, markdown fences, or labeled
// sections ('---EXPLANATION---') inside the code stream — this strips the
// stream back to pure executable Python (single-line # comments allowed).
//
// NEWLINE CONTRACT (do not regress): newline characters are structural in
// Python — a `# comment` followed by a statement needs the `\n` between them
// or the statement is swallowed into the comment. This module therefore NEVER
// collapses whitespace runs to a single space, and never replaces `\n`/`\r\n`
// with a space. The only whitespace operations permitted here are: per-line
// trailing-space strips, blank-line collapsing, and end-trimming. Callers
// that sanitize a token stream chunk-by-chunk must accumulate the RAW text
// and re-sanitize from scratch each chunk — feeding a trimmed result back in
// would eat the newline at every chunk boundary (see voiceSlice).

/** Markers that begin a verbose, non-code section. Code is truncated at the first one. */
const SECTION_MARKER = /-{3,}\s*(EXPLANATION|EXPLANATIONS|NOTE|NOTES|DESCRIPTION|STEPS|OUTPUT)\s*-{3,}/i;

/** Opening fence of a markdown code block, on its own line. */
const FENCE_LINE = /^\s*```[a-zA-Z0-9]*\s*$/gm;

/** Triple-quoted blocks that are commentary rather than a real docstring. */
const COMMENTARY_HINT = /EXPLANATION|NOTE\s*:|This code|Yeh code|Yeh program/i;

export interface SanitizeResult {
  /** pure executable code */
  code: string;
  /** true when a section marker was found and everything after it was cut */
  truncated: boolean;
  /** text that followed the marker (routed to the explanation stream by the caller) */
  remainder: string;
}

const EMPTY_RESULT: SanitizeResult = { code: '', truncated: false, remainder: '' };

export function sanitizeGeneratedCode(raw: string): SanitizeResult {
  if (!raw) return EMPTY_RESULT;

  // Normalize line endings first; every later step works on '\n' only and
  // preserves the line structure it finds.
  let code = raw.replace(/\r\n?/g, '\n');
  let remainder = '';
  let truncated = false;

  // 1. Truncate at the first verbose section marker
  const markerMatch = code.match(SECTION_MARKER);
  if (markerMatch && markerMatch.index !== undefined) {
    remainder = code.slice(markerMatch.index + markerMatch[0].length);
    code = code.slice(0, markerMatch.index);
    truncated = true;
  }

  // 2. Strip markdown code fences. Nova splits fences across stream chunks
  //    ("```" then "python\n…"), so handle every residue shape:
  //    a) opening fence + optional language tag at the very start
  code = code.replace(/^\s*```[a-zA-Z0-9]*[ \t]*\n?/, '');
  //    b) standalone fence lines (mid-stream chunk boundaries). Replacing the
  //       line CONTENT with '' keeps the surrounding newlines intact, so the
  //       statements before and after the fence stay on separate lines.
  code = code.replace(FENCE_LINE, '');
  //    c) stray bare language-tag line left behind when (a) and (b) split
  code = code.replace(/^(python3?|py)\n/i, '');
  //    d) trailing fence run — backticks are invalid Python syntax anyway,
  //       so any 3+ backtick run at the end is residue (even glued to code)
  code = code.replace(/`{3,}[ \t]*$/, '');

  // 3. Remove triple-quoted blocks that are commentary, not docstrings
  code = code.replace(/('''|""")[\s\S]*?\1/g, (block) =>
    COMMENTARY_HINT.test(block) ? '' : block
  );

  // 4. Tidy: strip trailing whitespace per line (newlines kept), collapse
  //    3+ blank lines, trim the outer ends. No step may merge two lines.
  code = code
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return { code, truncated, remainder };
}

// ─── Light cleanup for whole-file payloads ────────────────────────────────────
// Used for model-provided COMPLETE scripts (e.g. the Desi Debugger's full
// fixed code) that arrive in one shot. Unlike sanitizeGeneratedCode it never
// truncates at section markers and keeps docstrings — it only normalizes line
// endings, strips markdown fences, and trims per-line trailing whitespace,
// while preserving every newline between statements.
export function stripMarkdownFences(raw: string): string {
  if (!raw) return '';

  let clean = raw.replace(/\r\n?/g, '\n');
  // a) opening fence + optional language tag at the very start
  clean = clean.replace(/^\s*```[a-zA-Z0-9]*[ \t]*\n?/, '');
  // b) standalone fence lines (keep the newlines around them)
  clean = clean.replace(FENCE_LINE, '');
  // c) trailing fence run
  clean = clean.replace(/`{3,}[ \t]*$/, '');

  return clean
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/, ''))
    .join('\n')
    .trim();
}
