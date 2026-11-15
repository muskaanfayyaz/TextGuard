export interface FragmentOccurrence {
  documentId: string;
  startToken: number;
  endToken: number;
  startChar: number;
  endChar: number;
}

interface Entry<V> {
  key: string;
  value: V;
  next: Entry<V> | null;
}

/** Separate chaining hash table. Average set/get/delete O(1), worst O(n); space O(capacity + entries). */
export class HashTable<V> {
  private buckets: Array<Entry<V> | null>;
  private count = 0;

  constructor(initialCapacity = 127, private readonly hashFunction: (key: string) => number = HashTable.hashString) {
    this.buckets = Array.from({ length: Math.max(3, Math.floor(initialCapacity)) }, () => null);
  }

  static hashString(key: string): number {
    let hash = 5381;
    for (let i = 0; i < key.length; i += 1) hash = (Math.imul(hash, 33) ^ key.charCodeAt(i)) >>> 0;
    return hash >>> 0;
  }

  private index(key: string): number {
    const raw = this.hashFunction(key);
    return ((raw % this.buckets.length) + this.buckets.length) % this.buckets.length;
  }

  set(key: string, value: V): void {
    const bucket = this.index(key);
    let entry = this.buckets[bucket];
    while (entry) {
      if (entry.key === key) {
        entry.value = value;
        return;
      }
      entry = entry.next;
    }
    this.buckets[bucket] = { key, value, next: this.buckets[bucket] };
    this.count += 1;
  }

  get(key: string): V | undefined {
    let entry = this.buckets[this.index(key)];
    while (entry) {
      if (entry.key === key) return entry.value;
      entry = entry.next;
    }
    return undefined;
  }

  has(key: string): boolean {
    let entry = this.buckets[this.index(key)];
    while (entry) {
      if (entry.key === key) return true;
      entry = entry.next;
    }
    return false;
  }

  delete(key: string): boolean {
    const bucket = this.index(key);
    let current = this.buckets[bucket];
    let previous: Entry<V> | null = null;
    while (current) {
      if (current.key === key) {
        if (previous) previous.next = current.next;
        else this.buckets[bucket] = current.next;
        this.count -= 1;
        return true;
      }
      previous = current;
      current = current.next;
    }
    return false;
  }

  get size(): number {
    return this.count;
  }

  entries(): Array<[string, V]> {
    const result: Array<[string, V]> = [];
    for (const bucket of this.buckets) {
      let entry = bucket;
      while (entry) {
        result.push([entry.key, entry.value]);
        entry = entry.next;
      }
    }
    return result;
  }

  addOccurrence(key: string, occurrence: FragmentOccurrence): void {
    const occurrences = this.get(key) as FragmentOccurrence[] | undefined;
    if (occurrences) occurrences.push(occurrence);
    else this.set(key, [occurrence] as unknown as V);
  }
}
