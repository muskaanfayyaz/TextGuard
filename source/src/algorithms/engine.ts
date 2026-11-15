import { HashTable, type FragmentOccurrence } from './hashTable';
import { tokenizeDocument } from './preprocessing';
import { rabinKarpWordMatches, type WindowMatch } from './rabinKarp';
import { Trie } from './trie';

export interface SourceDocument { id: string; name: string; text: string }
export interface MatchingPassage {
  text: string;
  startTokenA: number; endTokenA: number;
  startTokenB: number; endTokenB: number;
  startCharA: number; endCharA: number;
  startCharB: number; endCharB: number;
  matchingWords: number;
}
export interface DocumentComparisonResult {
  documentA: { id: string; name: string };
  documentB: { id: string; name: string };
  windowSize: number;
  wordCountA: number; wordCountB: number;
  matchingWordPositionsA: number[]; matchingWordPositionsB: number[];
  matchingWordsA: number; matchingWordsB: number;
  similarityA: number; similarityB: number;
  sharedUniqueTokens: string[];
  diceSimilarity: number;
  passages: MatchingPassage[];
  repeatedFragments: Array<{ phrase: string; occurrencesA: number; occurrencesB: number }>;
  algorithmMetrics: {
    hashTableUniqueFragments: number; sharedHashFragments: number;
    trieSharedVocabulary: number; rabinKarpWindowMatches: number;
    deduplicatedMatchingWordsA: number; deduplicatedMatchingWordsB: number;
  };
}
export interface CompareOptions { windowSize?: number }

function percentage(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : numerator / denominator * 100;
}

function addFragment(
  table: HashTable<FragmentOccurrence[]>,
  tokens: ReturnType<typeof tokenizeDocument>['tokens'],
  documentId: string,
  start: number,
  length: number,
): void {
  const first = tokens[start];
  const last = tokens[start + length - 1];
  const phrase = tokens.slice(start, start + length).map(token => token.value).join(' ');
  table.addOccurrence(phrase, {
    documentId, startToken: start, endToken: start + length,
    startChar: first.start, endChar: last.end,
  });
}

/** Merge overlapping windows only when they lie on the same A/B alignment diagonal. */
function mergeWindows(
  windows: WindowMatch[],
  tokensA: ReturnType<typeof tokenizeDocument>['tokens'],
  tokensB: ReturnType<typeof tokenizeDocument>['tokens'],
): MatchingPassage[] {
  const sorted = [...windows].sort((left, right) => left.startA - right.startA || left.startB - right.startB);
  const groups: WindowMatch[][] = [];
  for (const match of sorted) {
    const group = groups[groups.length - 1];
    const previous = group?.[group.length - 1];
    const aligned = previous && match.startA - match.startB === previous.startA - previous.startB;
    const overlaps = previous && match.startA <= previous.startA + previous.length &&
      match.startB <= previous.startB + previous.length;
    if (group && aligned && overlaps) group.push(match);
    else groups.push([match]);
  }

  return groups.map(group => {
    const first = group[0];
    const startA = first.startA;
    const startB = first.startB;
    const endA = Math.max(...group.map(match => match.startA + match.length));
    const endB = Math.max(...group.map(match => match.startB + match.length));
    return {
      text: tokensA.slice(startA, endA).map(token => token.value).join(' '),
      startTokenA: startA, endTokenA: endA,
      startTokenB: startB, endTokenB: endB,
      startCharA: tokensA[startA].start, endCharA: tokensA[endA - 1].end,
      startCharB: tokensB[startB].start, endCharB: tokensB[endB - 1].end,
      matchingWords: endA - startA,
    };
  });
}

/**
 * Compares token sequences with Rabin-Karp. Coverage uses the union of matched
 * token positions (not window count), so overlaps are not double-counted.
 * Dice is unique-vocabulary similarity only; it is not a plagiarism score.
 */
export function compareDocuments(
  documentA: SourceDocument,
  documentB: SourceDocument,
  options: CompareOptions = {},
): DocumentComparisonResult {
  const a = tokenizeDocument(documentA.text);
  const b = tokenizeDocument(documentB.text);
  const requested = options.windowSize ?? 5;
  const windowSize = Number.isFinite(requested) ? Math.max(1, Math.floor(requested)) : 5;

  const fragments = new HashTable<FragmentOccurrence[]>();
  const trie = new Trie();
  a.tokens.forEach(token => trie.insert(token.value, documentA.id, token.index));
  b.tokens.forEach(token => trie.insert(token.value, documentB.id, token.index));

  if (a.tokens.length >= windowSize && b.tokens.length >= windowSize) {
    for (let index = 0; index <= a.tokens.length - windowSize; index += 1) {
      addFragment(fragments, a.tokens, documentA.id, index, windowSize);
    }
    for (let index = 0; index <= b.tokens.length - windowSize; index += 1) {
      addFragment(fragments, b.tokens, documentB.id, index, windowSize);
    }
  }

  const windows = a.tokens.length >= windowSize && b.tokens.length >= windowSize
    ? rabinKarpWordMatches(a.tokens, b.tokens, windowSize)
    : [];
  const positionsA = new Set<number>();
  const positionsB = new Set<number>();
  for (const match of windows) {
    for (let offset = 0; offset < match.length; offset += 1) {
      positionsA.add(match.startA + offset);
      positionsB.add(match.startB + offset);
    }
  }

  const sharedFragments = fragments.entries()
    .filter(([, occurrences]) =>
      occurrences.some(item => item.documentId === documentA.id) &&
      occurrences.some(item => item.documentId === documentB.id))
    .map(([phrase, occurrences]) => ({
      phrase,
      occurrencesA: occurrences.filter(item => item.documentId === documentA.id).length,
      occurrencesB: occurrences.filter(item => item.documentId === documentB.id).length,
    }))
    .sort((left, right) => right.phrase.length - left.phrase.length);

  const sharedUniqueTokens = trie.wordsSharedBy(documentA.id, documentB.id);
  const uniqueA = new Set(a.tokens.map(token => token.value));
  const uniqueB = new Set(b.tokens.map(token => token.value));
  const diceDenominator = uniqueA.size + uniqueB.size;
  const diceSimilarity = diceDenominator === 0 ? 0 : 2 * sharedUniqueTokens.length / diceDenominator * 100;

  return {
    documentA: { id: documentA.id, name: documentA.name },
    documentB: { id: documentB.id, name: documentB.name },
    windowSize,
    wordCountA: a.wordCount, wordCountB: b.wordCount,
    matchingWordPositionsA: [...positionsA].sort((x, y) => x - y),
    matchingWordPositionsB: [...positionsB].sort((x, y) => x - y),
    matchingWordsA: positionsA.size, matchingWordsB: positionsB.size,
    similarityA: percentage(positionsA.size, a.wordCount),
    similarityB: percentage(positionsB.size, b.wordCount),
    sharedUniqueTokens, diceSimilarity,
    passages: mergeWindows(windows, a.tokens, b.tokens),
    repeatedFragments: sharedFragments,
    algorithmMetrics: {
      hashTableUniqueFragments: fragments.size,
      sharedHashFragments: sharedFragments.length,
      trieSharedVocabulary: sharedUniqueTokens.length,
      rabinKarpWindowMatches: windows.length,
      deduplicatedMatchingWordsA: positionsA.size,
      deduplicatedMatchingWordsB: positionsB.size,
    },
  };
}

/** Compare each unordered pair once; O(d²) comparisons for d documents. */
export function compareAllDocuments(documents: SourceDocument[], options: CompareOptions = {}): DocumentComparisonResult[] {
  const results: DocumentComparisonResult[] = [];
  for (let left = 0; left < documents.length; left += 1) {
    for (let right = left + 1; right < documents.length; right += 1) {
      results.push(compareDocuments(documents[left], documents[right], options));
    }
  }
  return results;
}
