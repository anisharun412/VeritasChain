/**
 * Merkle Tree implementation for document verification (browser-compatible)
 * Uses SubtleCrypto (Web Crypto API) instead of Node.js crypto
 */

async function sha256Hex(data: string): Promise<string> {
  const encoded = new TextEncoder().encode(data);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export class MerkleTree {
  private leaves: string[] = [];
  private tree: string[][] = [];
  private built = false;

  constructor(leaves: string[]) {
    // Store raw leaves; tree is built lazily/async via build()
    this.leaves = leaves;
  }

  /** Must be called before getRoot() / getProof() */
  async build(): Promise<void> {
    const hashed = await Promise.all(this.leaves.map(l => sha256Hex(l)));
    let currentLevel = hashed.length > 0 ? hashed : [''];
    this.tree = [currentLevel];

    while (currentLevel.length > 1) {
      const nextLevel: string[] = [];
      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = currentLevel[i + 1] ?? left;
        nextLevel.push(await sha256Hex(left + right));
      }
      this.tree.push(nextLevel);
      currentLevel = nextLevel;
    }
    this.built = true;
  }

  getRoot(): string {
    if (!this.built) return '';
    return this.tree[this.tree.length - 1][0] ?? '';
  }

  getProof(index: number): string[] {
    if (!this.built) return [];
    const proof: string[] = [];
    let currentIndex = index;
    for (let level = 0; level < this.tree.length - 1; level++) {
      const sibling = currentIndex % 2 === 0 ? currentIndex + 1 : currentIndex - 1;
      if (sibling < this.tree[level].length) {
        proof.push(this.tree[level][sibling]);
      }
      currentIndex = Math.floor(currentIndex / 2);
    }
    return proof;
  }

  static async verify(root: string, leaf: string, proof: string[], index: number): Promise<boolean> {
    let current = await sha256Hex(leaf);
    let currentIndex = index;
    for (const sibling of proof) {
      if (currentIndex % 2 === 0) {
        current = await sha256Hex(current + sibling);
      } else {
        current = await sha256Hex(sibling + current);
      }
      currentIndex = Math.floor(currentIndex / 2);
    }
    return current === root;
  }
}

/** Convenience: build a MerkleTree and return the root in one call */
export async function computeMerkleRoot(leaves: string[]): Promise<string> {
  if (leaves.length === 0) return await sha256Hex('');
  const tree = new MerkleTree(leaves);
  await tree.build();
  return tree.getRoot();
}
