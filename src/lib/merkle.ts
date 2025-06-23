import { ethers } from 'ethers';

export interface MerkleNode {
  hash: string;
  left?: MerkleNode;
  right?: MerkleNode;
}

export interface MerkleProof {
  root: string;
  proof: string[];
  leaf: string;
  index: number;
}

export const hashPair = (left: string, right: string): string => {
  const concatenated = ethers.concat([
    ethers.getBytes(left),
    ethers.getBytes(right),
  ]);
  return ethers.keccak256(concatenated);
};

export const createMerkleTree = (leaves: string[]): MerkleNode => {
  if (leaves.length === 0) {
    throw new Error('No leaves provided');
  }

  // Hash all leaves first
  let nodes = leaves.map((leaf) => ({
    hash: ethers.keccak256(ethers.toUtf8Bytes(leaf)),
  }));

  // Build tree bottom-up
  while (nodes.length > 1) {
    const level: MerkleNode[] = [];
    for (let i = 0; i < nodes.length; i += 2) {
      const left = nodes[i];
      const right = i + 1 < nodes.length ? nodes[i + 1] : nodes[i];
      level.push({
        hash: hashPair(left.hash, right.hash),
        left,
        right,
      });
    }
    nodes = level;
  }

  return nodes[0];
};

export const getMerkleProof = (
  tree: MerkleNode,
  leaf: string,
  index: number
): MerkleProof => {
  const proof: string[] = [];
  let currentIndex = index;
  let current = tree;

  while (current.left && current.right) {
    const isLeft = currentIndex % 2 === 0;
    const sibling = isLeft ? current.right : current.left;
    proof.push(sibling.hash);
    current = isLeft ? current.left : current.right;
    currentIndex = Math.floor(currentIndex / 2);
  }

  return {
    root: tree.hash,
    proof,
    leaf: ethers.keccak256(ethers.toUtf8Bytes(leaf)),
    index,
  };
};

export const verifyMerkleProof = (
  proof: MerkleProof
): boolean => {
  let computedHash = proof.leaf;
  let currentIndex = proof.index;

  for (const proofElement of proof.proof) {
    if (currentIndex % 2 === 0) {
      computedHash = hashPair(computedHash, proofElement);
    } else {
      computedHash = hashPair(proofElement, computedHash);
    }
    currentIndex = Math.floor(currentIndex / 2);
  }

  return computedHash === proof.root;
}; 