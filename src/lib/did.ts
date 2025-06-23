import { ethers } from 'ethers';

export interface DIDDocument {
  id: string;
  controller: string;
  created: string;
}

export const generateDID = async (address: string): Promise<string> => {
  try {
    const timestamp = new Date().toISOString();
    const did = `did:ethr:${address.toLowerCase()}`;
    
    // We only need to return the DID string, not the full document
    return did;
  } catch (error) {
    console.error('Error generating DID:', error);
    throw error;
  }
};

export const verifyDID = (did: string): boolean => {
  try {
    // Basic DID format validation
    if (!did.startsWith('did:ethr:')) {
      return false;
    }

    const address = did.split(':')[2];
    return ethers.isAddress(address);
  } catch (error) {
    console.error('Error verifying DID:', error);
    return false;
  }
};

export const createVerifiableCredential = async (
  did: DIDDocument,
  claims: Record<string, any>,
  signer: ethers.Signer
): Promise<{
  credential: any;
  proof: {
    type: string;
    created: string;
    proofPurpose: string;
    verificationMethod: string;
    signature: string;
  };
}> => {
  const timestamp = new Date().toISOString();
  const credential = {
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    type: ['VerifiableCredential', 'VoterCredential'],
    issuer: did.id,
    issuanceDate: timestamp,
    credentialSubject: {
      id: did.id,
      ...claims,
    },
  };

  // Sign the credential
  const message = JSON.stringify(credential);
  const signature = await signer.signMessage(message);

  return {
    credential,
    proof: {
      type: 'EthereumSignature2021',
      created: timestamp,
      proofPurpose: 'assertionMethod',
      verificationMethod: `${did.id}#key-1`,
      signature,
    },
  };
};

export const verifyCredential = async (
  credential: any,
  proof: any
): Promise<boolean> => {
  try {
    const message = JSON.stringify(credential);
    const did = credential.credentialSubject.id;
    const address = did.split(':')[2];
    const recoveredAddress = ethers.verifyMessage(message, proof.signature);
    return recoveredAddress.toLowerCase() === address.toLowerCase();
  } catch (error) {
    return false;
  }
}; 