import { SealClient } from '@mysten/seal';
import { WalrusService } from '../services/walrus';
import { PACKAGE_ID } from '../hooks/useContract';

/**
 * Encrypt and upload a message to Walrus
 * 
 * @param messageContent - Plain text message content
 * @param sealClient - Seal client instance for encryption
 * @param conversationId - Conversation ID for identity generation
 * @param participants - Array of participant addresses
 * @returns Object containing blob ID and content hash
 */
export async function encryptAndUploadMessage(
  messageContent: string,
  sealClient: SealClient,
  conversationId: string,
  participants: string[]
): Promise<{ blobId: string; contentHash: Uint8Array }> {
  try {
    // Generate content hash for verification
    const encoder = new TextEncoder();
    const messageBytes = encoder.encode(messageContent);
    const hashBuffer = await crypto.subtle.digest('SHA-256', messageBytes);
    const contentHash = new Uint8Array(hashBuffer);

    // Create identity for this conversation
    const identity = createConversationIdentity(conversationId, participants);

    // Encrypt the message using Seal
    const encryptionResult = await sealClient.encrypt({
      threshold: 2, // Adjust based on your key server configuration
      packageId: PACKAGE_ID,
      id: identity,
      data: messageBytes,
    });

    // Seal encrypt returns { encryptedObject, key }
    // We need to store both, but for Walrus we'll store the encryptedObject
    // The key should be stored separately or included in the encrypted data structure
    const encryptedBytes = encryptionResult.encryptedObject;

    // Ensure encryptedBytes is a Uint8Array
    const encryptedData = encryptedBytes instanceof Uint8Array 
      ? encryptedBytes 
      : new Uint8Array(encryptedBytes);

    // Create a new ArrayBuffer from the Uint8Array to avoid SharedArrayBuffer issues
    const arrayBuffer = encryptedData.buffer instanceof ArrayBuffer
      ? encryptedData.buffer.slice(
          encryptedData.byteOffset,
          encryptedData.byteOffset + encryptedData.byteLength
        )
      : new Uint8Array(encryptedData).buffer;

    // Upload encrypted content to Walrus
    // Create a File-like object from the encrypted bytes
    const blob = new Blob([arrayBuffer as ArrayBuffer], { type: 'application/octet-stream' });
    const file = new File([blob], 'encrypted-message', { type: 'application/octet-stream' });

    const walrusResult = await WalrusService.uploadFile(file);
    const blobId = walrusResult.blobId;

    return {
      blobId,
      contentHash,
    };
  } catch (error) {
    console.error('Error encrypting and uploading message:', error);
    throw new Error(`Failed to encrypt and upload message: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Decrypt a message from Walrus
 * 
 * @param blobId - Walrus blob ID containing encrypted message
 * @param sealClient - Seal client instance for decryption
 * @param conversationId - Conversation ID for identity generation
 * @param participants - Array of participant addresses
 * @param sessionKey - Session key for decryption (optional, will be created if not provided)
 * @param txBytes - Transaction bytes for decryption (optional, will be created if not provided)
 * @returns Decrypted message content as string
 */
export async function decryptMessage(
  blobId: string,
  sealClient: SealClient,
  conversationId: string,
  participants: string[],
  sessionKey?: any,
  txBytes?: Uint8Array
): Promise<string> {
  try {
    // Download encrypted content from Walrus
    const blobUrl = WalrusService.getBlobUrl(blobId);
    const response = await fetch(blobUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to download encrypted message from Walrus: ${response.statusText}`);
    }

    const encryptedBytes = new Uint8Array(await response.arrayBuffer());

    // Create identity for this conversation (must match encryption identity)
    const identity = createConversationIdentity(conversationId, participants);

    // Create session key if not provided
    let finalSessionKey = sessionKey;
    if (!finalSessionKey) {
      finalSessionKey = await createSessionKey(identity, sealClient);
    }

    // Create transaction bytes if not provided
    let finalTxBytes = txBytes;
    if (!finalTxBytes) {
      finalTxBytes = await createDecryptTransaction(identity);
    }

    // Decrypt using Seal
    const decryptedData = await sealClient.decrypt({
      data: encryptedBytes,
      sessionKey: finalSessionKey,
      txBytes: finalTxBytes,
    });

    // Convert decrypted bytes to string
    const decoder = new TextDecoder();
    const messageContent = decoder.decode(decryptedData);

    return messageContent;
  } catch (error) {
    console.error('Error decrypting message:', error);
    throw new Error(`Failed to decrypt message: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Encrypt and upload media attachment
 * 
 * @param mediaFile - File to encrypt and upload
 * @param sealClient - Seal client instance for encryption
 * @param conversationId - Conversation ID for identity generation
 * @param participants - Array of participant addresses
 * @returns Walrus blob ID of encrypted media
 */
export async function encryptAndUploadMedia(
  mediaFile: File,
  sealClient: SealClient,
  conversationId: string,
  participants: string[]
): Promise<string> {
  try {
    // Read file as bytes
    const fileBytes = new Uint8Array(await mediaFile.arrayBuffer());

    // Create identity for this conversation
    const identity = createConversationIdentity(conversationId, participants);

    // Encrypt the media using Seal
    const encryptionResult = await sealClient.encrypt({
      threshold: 2, // Adjust based on your key server configuration
      packageId: PACKAGE_ID,
      id: identity,
      data: fileBytes,
    });

    // Seal encrypt returns { encryptedObject, key }
    const encryptedBytes = encryptionResult.encryptedObject;

    // Ensure encryptedBytes is a Uint8Array
    const encryptedData = encryptedBytes instanceof Uint8Array 
      ? encryptedBytes 
      : new Uint8Array(encryptedBytes);

    // Create a new ArrayBuffer from the Uint8Array to avoid SharedArrayBuffer issues
    const arrayBuffer = encryptedData.buffer instanceof ArrayBuffer
      ? encryptedData.buffer.slice(
          encryptedData.byteOffset,
          encryptedData.byteOffset + encryptedData.byteLength
        )
      : new Uint8Array(encryptedData).buffer;

    // Upload encrypted media to Walrus
    const blob = new Blob([arrayBuffer as ArrayBuffer], { type: mediaFile.type || 'application/octet-stream' });
    const file = new File([blob], mediaFile.name || 'encrypted-media', { type: mediaFile.type || 'application/octet-stream' });

    const walrusResult = await WalrusService.uploadFile(file);
    return walrusResult.blobId;
  } catch (error) {
    console.error('Error encrypting and uploading media:', error);
    throw new Error(`Failed to encrypt and upload media: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Decrypt media attachment from Walrus
 * 
 * @param blobId - Walrus blob ID containing encrypted media
 * @param sealClient - Seal client instance for decryption
 * @param conversationId - Conversation ID for identity generation
 * @param participants - Array of participant addresses
 * @param originalMimeType - Original MIME type of the media (optional)
 * @param sessionKey - Session key for decryption (optional)
 * @param txBytes - Transaction bytes for decryption (optional)
 * @returns Decrypted media as Blob
 */
export async function decryptMedia(
  blobId: string,
  sealClient: SealClient,
  conversationId: string,
  participants: string[],
  originalMimeType?: string,
  sessionKey?: any,
  txBytes?: Uint8Array
): Promise<Blob> {
  try {
    // Download encrypted media from Walrus
    const blobUrl = WalrusService.getBlobUrl(blobId);
    const response = await fetch(blobUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to download encrypted media from Walrus: ${response.statusText}`);
    }

    const encryptedBytes = new Uint8Array(await response.arrayBuffer());

    // Create identity for this conversation (must match encryption identity)
    const identity = createConversationIdentity(conversationId, participants);

    // Create session key if not provided
    let finalSessionKey = sessionKey;
    if (!finalSessionKey) {
      finalSessionKey = await createSessionKey(identity, sealClient);
    }

    // Create transaction bytes if not provided
    let finalTxBytes = txBytes;
    if (!finalTxBytes) {
      finalTxBytes = await createDecryptTransaction(identity);
    }

    // Decrypt using Seal
    const decryptedData = await sealClient.decrypt({
      data: encryptedBytes,
      sessionKey: finalSessionKey,
      txBytes: finalTxBytes,
    });

    // Create Blob from decrypted data
    // Ensure decryptedData is a Uint8Array
    const decryptedBytes = decryptedData instanceof Uint8Array 
      ? decryptedData 
      : new Uint8Array(decryptedData);
    
    // Create a new ArrayBuffer from the Uint8Array to avoid SharedArrayBuffer issues
    const arrayBuffer = decryptedBytes.buffer instanceof ArrayBuffer
      ? decryptedBytes.buffer.slice(
          decryptedBytes.byteOffset,
          decryptedBytes.byteOffset + decryptedBytes.byteLength
        )
      : new Uint8Array(decryptedBytes).buffer;
    
    const mimeType = originalMimeType || 'application/octet-stream';
    return new Blob([arrayBuffer as ArrayBuffer], { type: mimeType });
  } catch (error) {
    console.error('Error decrypting media:', error);
    throw new Error(`Failed to decrypt media: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Verify message content hash
 * 
 * @param messageContent - Decrypted message content
 * @param expectedHash - Expected content hash from blockchain
 * @returns True if hash matches, false otherwise
 */
export async function verifyMessageHash(
  messageContent: string,
  expectedHash: Uint8Array
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const messageBytes = encoder.encode(messageContent);
    const hashBuffer = await crypto.subtle.digest('SHA-256', messageBytes);
    const actualHash = new Uint8Array(hashBuffer);

    // Compare hashes
    if (actualHash.length !== expectedHash.length) {
      return false;
    }

    for (let i = 0; i < actualHash.length; i++) {
      if (actualHash[i] !== expectedHash[i]) {
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Error verifying message hash:', error);
    return false;
  }
}

/**
 * Create a conversation identity for Seal encryption/decryption
 * This ensures only conversation participants can decrypt messages
 */
function createConversationIdentity(conversationId: string, participants: string[]): string {
  const sortedParticipants = participants.sort();
  const identityData = `${conversationId}-${sortedParticipants.join('-')}`;
  
  // Convert to hex string for use as identity
  const encoder = new TextEncoder();
  const bytes = encoder.encode(identityData);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Create a session key for Seal decryption
 */
async function createSessionKey(identity: string, _sealClient: SealClient): Promise<any> {
  // This is a simplified session key creation
  // In a full implementation, you would use Seal's SessionKey API
  // For now, we'll create a basic structure that matches what Seal expects
  return {
    getPackageId: () => PACKAGE_ID,
    getIdentity: () => identity,
    // Add other required methods as needed by Seal
  };
}

/**
 * Create transaction bytes for Seal decryption
 */
async function createDecryptTransaction(identity: string): Promise<Uint8Array> {
  // Create transaction bytes for decryption
  // In a full implementation, this would create a proper Sui transaction
  // For now, we'll create a simple transaction structure
  const txData = new TextEncoder().encode(`decrypt-${identity}`);
  return new Uint8Array(64).fill(0).map((_, i) => txData[i % txData.length] || 0);
}

