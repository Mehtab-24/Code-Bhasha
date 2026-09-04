// ─── Lightweight Python indentation formatter ─────────────────────────────────
// A pure, dependency-free cleanup pass for beginner snippets: normalizes each
// line's indent from bracket depth and statement-ending colons, strips stray
// trailing whitespace. Deliberately conservative — it never merges or reorders
// lines, and string contents are left untouched.

interface LineScan {
  /** net unclosed opening brackets after this line */
  openDelta: number;
  /** true when the line (outside strings/comments) ends with ':' */
  endsWithColon: boolean;
}

function scanLine(line: string): LineScan {
  let openDelta = 0;
  let quote: string | null = null;
  let endsWithColon = false;
  let codePart = line;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quote) {
      if (ch === '\\') {
        i++;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === '#') {
      codePart = line.slice(0, i);
      break;
    }
    if (ch === '(' || ch === '[' || ch === '{') openDelta++;
    else if (ch === ')' || ch === ']' || ch === '}') openDelta = Math.max(0, openDelta - 1);
  }

  if (quote === null && codePart.trimEnd().endsWith(':')) endsWithColon = true;
  return { openDelta, endsWithColon };
}

const DEDENT_START = /^(return\b|pass\b|break\b|continue\b|raise\b|elif\b|else\b|except\b|finally\b)/;

export function formatPython(code: string): string {
  const rawLines = code.replace(/\r\n?/g, '\n').split('\n');
  const out: string[] = [];
  let depth = 0;        // net unclosed brackets from previous lines
  let pendingColon = 0; // 1 when the previous line ended a block with ':'

  for (const raw of rawLines) {
    const trimmed = raw.replace(/\s+$/, '');
    if (!trimmed.trim()) {
      out.push('');
      continue;
    }

    let indent = (depth + pendingColon) * 4;
    if (depth === 0 && DEDENT_START.test(trimmed.trim())) {
      indent = Math.max(0, indent - 4);
    }
    out.push(' '.repeat(indent) + trimmed.trim());

    const scan = scanLine(trimmed);
    depth = Math.max(0, depth + scan.openDelta);
    pendingColon = scan.openDelta === 0 && scan.endsWithColon ? 1 : 0;
  }

  return out.join('\n');
}
