import { generateRandomKeys, PublicKey, PrivateKey } from 'paillier-bigint';

export interface KeyPair {
  publicKey: PublicKey;
  privateKey: PrivateKey;
}

export const generateKey = async (): Promise<KeyPair> => {
  // 3072 bits is secure and matches your docs
  const { publicKey, privateKey } = await generateRandomKeys(3072);
  return { publicKey, privateKey };
};

export const createPublicKey = (n: bigint, g: bigint): PublicKey => {
  const publicKey = new PublicKey(n, g);
  return publicKey;
};

export const encryptVote = async (
  vote: bigint,
  publicKey: PublicKey
): Promise<string> => {
  // paillier-bigint expects BigInt
  const ciphertext = await publicKey.encrypt(vote);
  return ciphertext.toString(); // store as string
};

export const decryptVote = async (
  ciphertext: string,
  privateKey: PrivateKey
): Promise<bigint> => {
  // Convert string back to BigInt
  return await privateKey.decrypt(BigInt(ciphertext));
};

export const addEncryptedVotes = async (
  ciphertexts: string[],
  publicKey: PublicKey
): Promise<string> => {
  if (ciphertexts.length === 0) throw new Error('No votes to add');
  
  // Convert first ciphertext to BigInt
  let sum = BigInt(ciphertexts[0]);
  
  // Add remaining ciphertexts using homomorphic addition
  for (let i = 1; i < ciphertexts.length; i++) {
    sum = publicKey.addition(sum, BigInt(ciphertexts[i]));
  }
  
  return sum.toString();
}; 