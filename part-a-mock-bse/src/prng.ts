/**
 * Tiny deterministic PRNG (mulberry32) + helpers.
 * Deterministic data matters here: the sync worker in Part B must be able to
 * re-pull and resume, and duplicate-detection is only meaningful if the source
 * returns the same rows with the same ids every time.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Rng {
  private next: () => number;
  constructor(seed: number) {
    this.next = mulberry32(seed);
  }
  float(): number {
    return this.next();
  }
  int(minInclusive: number, maxInclusive: number): number {
    return Math.floor(this.next() * (maxInclusive - minInclusive + 1)) + minInclusive;
  }
  pick<T>(arr: readonly T[]): T {
    return arr[this.int(0, arr.length - 1)];
  }
  bool(pTrue = 0.5): boolean {
    return this.next() < pTrue;
  }
}
