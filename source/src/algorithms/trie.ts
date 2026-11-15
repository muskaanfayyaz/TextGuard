export interface TrieSnapshotNode {
  character: string;
  terminal: boolean;
  children: TrieSnapshotNode[];
}

interface TrieNode {
  children: Map<string, TrieNode>;
  isWord: boolean;
  documentIds: Set<string>;
  positions: Map<string, number[]>;
}

function createNode(): TrieNode {
  return { children: new Map(), isWord: false, documentIds: new Set(), positions: new Map() };
}

export interface TrieWordOccurrence {
  word: string;
  documentIds: string[];
  positions: Record<string, number[]>;
}

/** Insert/search O(L); prefix search O(P + K) for prefix length P and K results. */
export class Trie {
  private readonly root = createNode();

  insert(word: string, documentId?: string, position?: number): void {
    const normalized = word.toLocaleLowerCase();
    if (!normalized) return;
    let node = this.root;
    for (const character of normalized) {
      let child = node.children.get(character);
      if (!child) {
        child = createNode();
        node.children.set(character, child);
      }
      node = child;
    }
    node.isWord = true;
    if (documentId) {
      node.documentIds.add(documentId);
      if (position !== undefined) {
        const list = node.positions.get(documentId) ?? [];
        list.push(position);
        node.positions.set(documentId, list);
      }
    }
  }

  private findNode(value: string): TrieNode | null {
    let node = this.root;
    for (const character of value.toLocaleLowerCase()) {
      const child = node.children.get(character);
      if (!child) return null;
      node = child;
    }
    return node;
  }

  search(word: string): boolean {
    return this.findNode(word)?.isWord ?? false;
  }

  getDocumentIds(word: string): string[] {
    return [...(this.findNode(word)?.documentIds ?? [])];
  }

  getOccurrences(word: string): TrieWordOccurrence | null {
    const node = this.findNode(word);
    if (!node?.isWord) return null;
    const positions: Record<string, number[]> = {};
    for (const [id, indexes] of node.positions) positions[id] = [...indexes];
    return { word: word.toLocaleLowerCase(), documentIds: [...node.documentIds], positions };
  }

  prefixSearch(prefix: string, limit = 50): string[] {
    const normalized = prefix.toLocaleLowerCase();
    const start = this.findNode(normalized);
    if (!start || limit <= 0) return [];
    const results: string[] = [];
    const visit = (node: TrieNode, current: string) => {
      if (results.length >= limit) return;
      if (node.isWord) results.push(current);
      for (const [character, child] of node.children) {
        if (results.length >= limit) break;
        visit(child, current + character);
      }
    };
    visit(start, normalized);
    return results;
  }

  /** Read-only tree snapshot for the educational visualization. */
  snapshot(): TrieSnapshotNode {
    const build = (node: TrieNode, character: string): TrieSnapshotNode => ({
      character,
      terminal: node.isWord,
      children: [...node.children.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([nextCharacter, child]) => build(child, nextCharacter)),
    });
    return build(this.root, 'ROOT');
  }

  wordsSharedBy(documentA: string, documentB: string): string[] {
    const shared: string[] = [];
    const visit = (node: TrieNode, current: string) => {
      if (node.isWord && node.documentIds.has(documentA) && node.documentIds.has(documentB)) shared.push(current);
      for (const [character, child] of node.children) visit(child, current + character);
    };
    visit(this.root, '');
    return shared.sort();
  }
}
