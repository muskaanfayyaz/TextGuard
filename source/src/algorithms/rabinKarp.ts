import type { Token } from './preprocessing';

export interface WindowMatch {
  startA: number;
  startB: number;
  length: number;
}

const BASE = 257;
// Small modulus keeps modular products within JavaScript's safe integer range.
const MOD = 1_000_003;

function hashToken(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % MOD;
  }
  return hash;
}

function initialHash(tokens: Token[], start: number, size: number): number {
  let hash = 0;
  for (let offset = 0; offset < size; offset += 1) {
    hash = (hash * BASE + hashToken(tokens[start + offset].value)) % MOD;
  }
  return hash;
}

function basePower(exponent: number): number {
  let result = 1;
  for (let index = 0; index < exponent; index += 1) result = (result * BASE) % MOD;
  return result;
}

function sameTokens(a: Token[], startA: number, b: Token[], startB: number, size: number): boolean {
  for (let offset = 0; offset < size; offset += 1) {
    if (a[startA + offset].value !== b[startB + offset].value) return false;
  }
  return true;
}

/**
 * Word-level Rabin-Karp. Rolling a window is O(1). Expected O(n + m + c*w)
 * where c is the number of equal-hash candidates; worst case O(n*m*w).
 * The index uses O(m) auxiliary space. Hash matches are always verified.
 */
export function rabinKarpWordMatches(a: Token[], b: Token[], requestedWindow = 5): WindowMatch[] {
  const size = Number.isFinite(requestedWindow) ? Math.max(1, Math.floor(requestedWindow)) : 5;
  if (a.length < size || b.length < size) return [];

  const highPower = basePower(size - 1);
  const byHash = new Map<number, number[]>();
  let hashB = initialHash(b, 0, size);
  byHash.set(hashB, [0]);

  for (let start = 1; start <= b.length - size; start += 1) {
    const outgoing = hashToken(b[start - 1].value);
    const incoming = hashToken(b[start + size - 1].value);
    hashB = (((hashB - (outgoing * highPower) % MOD + MOD) * BASE) + incoming) % MOD;
    const positions = byHash.get(hashB) ?? [];
    positions.push(start);
    byHash.set(hashB, positions);
  }

  const matches: WindowMatch[] = [];
  let hashA = initialHash(a, 0, size);
  for (let startA = 0; startA <= a.length - size; startA += 1) {
    if (startA > 0) {
      const outgoing = hashToken(a[startA - 1].value);
      const incoming = hashToken(a[startA + size - 1].value);
      hashA = (((hashA - (outgoing * highPower) % MOD + MOD) * BASE) + incoming) % MOD;
    }
    for (const startB of byHash.get(hashA) ?? []) {
      if (sameTokens(a, startA, b, startB, size)) matches.push({ startA, startB, length: size });
    }
  }
  return matches;
}

/** Trace the exact rolling-hash and verification steps used by Rabin-Karp. */
export interface RabinKarpWindowTrace {
  start: number;
  windowHash: number;
  patternHash: number;
  hashMatch: boolean;
  verified: boolean;
}

export function traceRabinKarpWindows(text: Token[], pattern: Token[]): RabinKarpWindowTrace[] {
  const size = pattern.length;
  if (size === 0 || text.length < size) return [];

  const patternHash = initialHash(pattern, 0, size);
  const highPower = basePower(size - 1);
  let windowHash = initialHash(text, 0, size);
  const trace: RabinKarpWindowTrace[] = [];

  for (let start = 0; start <= text.length - size; start += 1) {
    if (start > 0) {
      const outgoing = hashToken(text[start - 1].value);
      const incoming = hashToken(text[start + size - 1].value);
      windowHash = (((windowHash - (outgoing * highPower) % MOD + MOD) * BASE) + incoming) % MOD;
    }
    const hashMatch = windowHash === patternHash;
    trace.push({
      start,
      windowHash,
      patternHash,
      hashMatch,
      verified: hashMatch && sameTokens(text, start, pattern, 0, size),
    });
  }
  return trace;
}
