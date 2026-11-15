import { describe, expect, it } from 'vitest';
import { HashTable } from '../src/algorithms/hashTable';
import { tokenizeDocument } from '../src/algorithms/preprocessing';
import { rabinKarpWordMatches, traceRabinKarpWindows } from '../src/algorithms/rabinKarp';
import { Trie } from '../src/algorithms/trie';
import { compareAllDocuments, compareDocuments } from '../src/algorithms/engine';

describe('HashTable separate chaining', () => {
  it('retains colliding keys and supports insertion, lookup, update, and deletion', () => {
    const table = new HashTable<number>(3, () => 1);
    table.set('alpha', 1);
    table.set('beta', 2);
    table.set('gamma', 3);
    expect(table.get('alpha')).toBe(1);
    expect(table.get('beta')).toBe(2);
    expect(table.size).toBe(3);
    table.set('beta', 4);
    expect(table.get('beta')).toBe(4);
    expect(table.delete('beta')).toBe(true);
    expect(table.has('beta')).toBe(false);
    expect(table.size).toBe(2);
  });

  it('stores fragment occurrences for documents and positions', () => {
    const table = new HashTable<Array<{ documentId: string; startToken: number }>>();
    table.addOccurrence('phrase', { documentId: 'A', startToken: 2, endToken: 4, startChar: 5, endChar: 12 });
    table.addOccurrence('phrase', { documentId: 'B', startToken: 7, endToken: 9, startChar: 20, endChar: 27 });
    expect(table.get('phrase')?.map(item => item.documentId)).toEqual(['A', 'B']);
  });
});

describe('Trie', () => {
  it('supports exact search, prefixes, and document occurrences', () => {
    const trie = new Trie();
    trie.insert('plagiarism', 'doc-a', 4);
    trie.insert('plagiarism', 'doc-b', 9);
    trie.insert('platform', 'doc-a', 12);
    expect(trie.search('plagiarism')).toBe(true);
    expect(trie.search('plagi')).toBe(false);
    expect(trie.prefixSearch('pla')).toEqual(['plagiarism', 'platform']);
    expect(trie.getOccurrences('plagiarism')?.positions).toEqual({ 'doc-a': [4], 'doc-b': [9] });
    expect(trie.wordsSharedBy('doc-a', 'doc-b')).toEqual(['plagiarism']);
  });
});

describe('token arrays and source offsets', () => {
  it('normalizes words and preserves original character offsets', () => {
    const source = 'Hello,  WORLD! café—test';
    const parsed = tokenizeDocument(source);
    expect(parsed.tokens.map(token => token.value)).toEqual(['hello', 'world', 'café', 'test']);
    expect(source.slice(parsed.tokens[2].start, parsed.tokens[2].end)).toBe('café');
    expect(parsed.normalizedText).toBe('hello world café test');
  });

  it('handles empty and whitespace-only documents', () => {
    expect(tokenizeDocument('').tokens).toEqual([]);
    expect(tokenizeDocument('  \n  ').wordCount).toBe(0);
  });
});

describe('Rabin-Karp rolling hash', () => {
  it('finds repeated windows and verifies all occurrences', () => {
    const a = tokenizeDocument('one two three four two three four five').tokens;
    const b = tokenizeDocument('zero two three four end').tokens;
    expect(rabinKarpWordMatches(a, b, 3)).toEqual([
      { startA: 1, startB: 1, length: 3 },
      { startA: 4, startB: 1, length: 3 },
    ]);
  });

  it('returns no windows for empty or shorter-than-window input', () => {
    expect(rabinKarpWordMatches([], [], 3)).toEqual([]);
    expect(rabinKarpWordMatches(tokenizeDocument('one two').tokens, tokenizeDocument('one two').tokens, 3)).toEqual([]);
  });
});

describe('pairwise comparison engine', () => {
  it('deduplicates overlapping windows and calculates coverage and Dice separately', () => {
    const result = compareDocuments(
      { id: 'a', name: 'A', text: 'The quick brown fox jumps over the lazy dog.' },
      { id: 'b', name: 'B', text: 'A note: the quick brown fox jumps over the lazy dog today.' },
      { windowSize: 3 },
    );
    expect(result.passages.length).toBe(1);
    expect(result.matchingWordsA).toBe(9);
    expect(result.matchingWordsB).toBe(9);
    expect(result.similarityA).toBe(100);
    expect(result.similarityB).toBeLessThan(100);
    expect(result.diceSimilarity).toBeGreaterThan(0);
    expect(result.algorithmMetrics.deduplicatedMatchingWordsA).toBe(9);
    expect(result.passages[0].startCharA).toBe(0);
    expect(result.passages[0].endCharA).toBe('The quick brown fox jumps over the lazy dog'.length);
  });

  it('compares every unordered document pair once', () => {
    const results = compareAllDocuments([
      { id: 'a', name: 'A', text: 'same phrase appears here' },
      { id: 'b', name: 'B', text: 'same phrase appears here too' },
      { id: 'c', name: 'C', text: 'different content' },
    ], { windowSize: 2 });
    expect(results).toHaveLength(3);
    expect(new Set(results.map(item => item.documentA.id + ':' + item.documentB.id)).size).toBe(3);
  });

  it('handles empty documents and vocabulary-only similarity safely', () => {
    const empty = compareDocuments({ id: 'a', name: 'A', text: '' }, { id: 'b', name: 'B', text: 'some words' });
    expect(empty.similarityA).toBe(0);
    expect(empty.similarityB).toBe(0);
    expect(empty.diceSimilarity).toBe(0);
    const reordered = compareDocuments(
      { id: 'a', name: 'A', text: 'red green blue' },
      { id: 'b', name: 'B', text: 'blue green red' },
      { windowSize: 4 },
    );
    expect(reordered.sharedUniqueTokens).toEqual(['blue', 'green', 'red']);
    expect(reordered.diceSimilarity).toBe(100);
    expect(reordered.passages).toHaveLength(0);
  });
});


describe('deterministic release audit scenarios', () => {
  it('compares identical documents with full directional coverage and original offsets', () => {
    const text = 'Alpha beta gamma delta epsilon.\nSecond paragraph stays here.';
    const result = compareDocuments(
      { id: 'identical-a', name: 'identical-a.txt', text },
      { id: 'identical-b', name: 'identical-b.txt', text },
      { windowSize: 5 },
    );
    expect(result.similarityA).toBe(100);
    expect(result.similarityB).toBe(100);
    expect(result.passages).toHaveLength(1);
    expect(result.passages[0].startCharA).toBe(0);
    expect(result.passages[0].startCharB).toBe(0);
    expect(text.slice(result.passages[0].startCharA, result.passages[0].endCharA)).toBe('Alpha beta gamma delta epsilon');
  });

  it('finds a partial paragraph at distinct original offsets without highlighting unmatched prefixes', () => {
    const sourceA = 'Alpha beta gamma delta epsilon';
    const sourceB = 'Unique heading.\nAlpha beta gamma delta epsilon! Extra closing sentence.';
    const result = compareDocuments(
      { id: 'partial-a', name: 'partial-a.txt', text: sourceA },
      { id: 'partial-b', name: 'partial-b.txt', text: sourceB },
      { windowSize: 5 },
    );
    expect(result.passages).toHaveLength(1);
    const passage = result.passages[0];
    expect(sourceA.slice(passage.startCharA, passage.endCharA)).toBe(sourceA);
    expect(sourceB.slice(passage.startCharB, passage.endCharB)).toBe('Alpha beta gamma delta epsilon');
    expect(passage.startCharB).toBe(sourceB.indexOf('Alpha'));
    expect(result.similarityA).toBe(100);
    expect(result.similarityB).toBeLessThan(100);
  });

  it('does not report common individual words without a verified consecutive window', () => {
    const result = compareDocuments(
      { id: 'none-a', name: 'none-a.txt', text: 'red alpha blue beta green' },
      { id: 'none-b', name: 'none-b.txt', text: 'red gamma blue delta green' },
      { windowSize: 2 },
    );
    expect(result.passages).toEqual([]);
    expect(result.matchingWordsA).toBe(0);
    expect(result.matchingWordsB).toBe(0);
    expect(result.similarityA).toBe(0);
    expect(result.similarityB).toBe(0);
  });

  it('deduplicates overlapping windows but preserves genuinely repeated occurrences', () => {
    const result = compareDocuments(
      { id: 'repeat-a', name: 'repeat-a.txt', text: 'a b c a b c' },
      { id: 'repeat-b', name: 'repeat-b.txt', text: 'a b c a b c' },
      { windowSize: 2 },
    );
    expect(result.matchingWordsA).toBe(6);
    expect(result.matchingWordsB).toBe(6);
    expect(result.matchingWordPositionsA).toEqual([0, 1, 2, 3, 4, 5]);
    expect(result.matchingWordPositionsB).toEqual([0, 1, 2, 3, 4, 5]);
    expect(result.passages).toHaveLength(2);
    expect(result.passages.map(passage => passage.matchingWords)).toEqual([3, 3]);
    expect(result.repeatedFragments.some(fragment => fragment.occurrencesA > 1 && fragment.occurrencesB > 1)).toBe(true);
  });

  it('rejects a deterministic rolling-hash collision after exact token verification', () => {
    // hashToken('a') and hashToken('aotp') both equal 97 with this implementation.
    const text = tokenizeDocument('a').tokens;
    const pattern = tokenizeDocument('aotp').tokens;
    const trace = traceRabinKarpWindows(text, pattern);
    expect(trace).toHaveLength(1);
    expect(trace[0].hashMatch).toBe(true);
    expect(trace[0].verified).toBe(false);
    expect(rabinKarpWordMatches(text, pattern, 1)).toEqual([]);
  });

  it('keeps character offsets correct for Unicode, punctuation, and line breaks', () => {
    const sourceA = 'Intro — café, naïve fox jumps over rocks.';
    const sourceB = 'Heading!\nIntro — café, naïve fox jumps over rocks?';
    const result = compareDocuments(
      { id: 'unicode-a', name: 'unicode-a.txt', text: sourceA },
      { id: 'unicode-b', name: 'unicode-b.txt', text: sourceB },
      { windowSize: 5 },
    );
    expect(result.passages.length).toBeGreaterThan(0);
    for (const passage of result.passages) {
      expect(sourceA.slice(passage.startCharA, passage.endCharA)).toBeTruthy();
      expect(sourceB.slice(passage.startCharB, passage.endCharB)).toBeTruthy();
      expect(passage.startCharA).toBeGreaterThanOrEqual(0);
      expect(passage.endCharA).toBeLessThanOrEqual(sourceA.length);
      expect(passage.startCharB).toBeGreaterThanOrEqual(0);
      expect(passage.endCharB).toBeLessThanOrEqual(sourceB.length);
    }
  });

  it('handles invalid window sizes deterministically', () => {
    const a = { id: 'a', name: 'A', text: 'one two three four five' };
    const b = { id: 'b', name: 'B', text: 'one two three four five' };
    expect(compareDocuments(a, b, { windowSize: Number.NaN }).windowSize).toBe(5);
    expect(compareDocuments(a, b, { windowSize: Number.POSITIVE_INFINITY }).windowSize).toBe(5);
    expect(rabinKarpWordMatches(tokenizeDocument('one two').tokens, tokenizeDocument('one two').tokens, Number.NaN)).toEqual([]);
  });

  it('supports negative hash values and undefined values in hash-table membership checks', () => {
    const table = new HashTable<number | undefined>(3, () => -1);
    table.set('present', undefined);
    table.set('another', 2);
    expect(table.has('present')).toBe(true);
    expect(table.get('present')).toBeUndefined();
    expect(table.has('missing')).toBe(false);
    expect(table.get('another')).toBe(2);
  });
});
