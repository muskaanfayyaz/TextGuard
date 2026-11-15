export interface Token {
  value: string;
  index: number;
  start: number;
  end: number;
}

export interface TokenizedDocument {
  normalizedText: string;
  tokens: Token[];
  wordCount: number;
  characterCount: number;
}

/** O(n) time over source characters; O(t) space for t tokens. */
export function tokenizeDocument(source: string): TokenizedDocument {
  const tokens: Token[] = [];
  const pattern = /[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu;
  for (const match of source.matchAll(pattern)) {
    const start = match.index ?? 0;
    tokens.push({ value: match[0].toLocaleLowerCase(), index: tokens.length, start, end: start + match[0].length });
  }
  return {
    normalizedText: tokens.map(token => token.value).join(' '),
    tokens,
    wordCount: tokens.length,
    characterCount: source.length,
  };
}
