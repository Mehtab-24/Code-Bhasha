// ─── Mini Python tokenizer shared by the landing demo and the studio ──────────
// Just enough highlighting for beginner snippets: keywords, calls, strings,
// numbers, `def` names, punctuation, comments.

export type TokenType =
  | 'kw'
  | 'fn'
  | 'str'
  | 'num'
  | 'defname'
  | 'punct'
  | 'plain'
  | 'comment';

export const TOKEN_COLORS: Record<TokenType, string> = {
  kw: '#c4b5fd',
  fn: '#22d3ee',
  str: '#00ffa3',
  num: '#fbbf24',
  defname: '#f0abfc',
  punct: 'rgba(255,255,255,0.45)',
  plain: 'rgba(228,233,244,0.9)',
  comment: 'rgba(255,255,255,0.32)',
};

const KEYWORDS = new Set([
  'for', 'in', 'def', 'return', 'if', 'elif', 'else', 'while',
  'import', 'from', 'as', 'not', 'and', 'or', 'break', 'continue',
]);

export interface Token {
  text: string;
  type: TokenType;
}

export function tokenizePython(line: string): Token[] {
  const tokens: Token[] = [];
  const re = /(#.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(\d+(?:\.\d+)?)|([A-Za-z_]\w*)|(\s+)|(.)/g;
  let prev = ''; // previous significant token, used for `def <name>`
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    const full = m[0];
    if (m[1]) {
      tokens.push({ text: full, type: 'comment' });
    } else if (m[2]) {
      tokens.push({ text: full, type: 'str' });
    } else if (m[3]) {
      tokens.push({ text: full, type: 'num' });
    } else if (m[4]) {
      let type: TokenType = 'plain';
      if (KEYWORDS.has(full)) {
        type = 'kw';
      } else if (prev === 'def') {
        type = 'defname';
      } else if (/^\s*\(/.test(line.slice(re.lastIndex))) {
        type = 'fn'; // any call: print, range, upper, user functions
      }
      tokens.push({ text: full, type });
      prev = full;
      continue;
    } else if (m[5]) {
      tokens.push({ text: full, type: 'plain' });
      continue; // whitespace doesn't reset `prev`
    } else {
      tokens.push({ text: full, type: 'punct' });
    }
    prev = full;
  }
  return tokens;
}

// Deterministic pseudo-random in [0, 1) — stable across SSR and hydration.
export function hashRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}
