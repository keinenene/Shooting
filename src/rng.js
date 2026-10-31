// シード付き乱数（mulberry32）。Math.random は使わない

export class Rng {
  constructor(seed = 1) {
    this.seed(seed);
  }

  seed(s) {
    this.s = s >>> 0;
  }

  // 0以上1未満
  next() {
    let t = (this.s = (this.s + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(a, b) {
    return a + (b - a) * this.next();
  }

  int(a, b) {
    return a + Math.floor((b - a + 1) * this.next());
  }
}
