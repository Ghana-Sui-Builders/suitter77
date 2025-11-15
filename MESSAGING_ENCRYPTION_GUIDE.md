# Messaging with Encryption Guide

This guide explains how to use the encrypted messaging system with Seal SDK and Walrus storage.

## Overview

The messaging system stores encrypted messages on Walrus as blob IDs. Messages are encrypted using Seal SDK before being uploaded, and decrypted when retrieved.

## Smart Contract Structure

### Message Structure
```move
public struct Message has store {
    sender: address,
    encrypted_content_blob_id: String,  // Walrus blob ID containing encrypted message
    content_hash: vector<u8>,           // SHA-256 hash of original content for verification
    timestamp_ms: u64,
    is_read: bool,
    media_blob_id: Option<String>,       // Optional encrypted media attachment
}
```

### Key Functions

1. **`start_conversation()`** - Creates a new conversation between two users
2. **`send_message()`** - Sends an encrypted message (requires encrypted content blob ID)
3. **`send_message_with_media()`** - Sends an encrypted message with media attachment
4. **`mark_messages_as_read()`** - Marks messages as read
5. **`get_conversation_id()`** - Gets conversation ID for two users

## Frontend Integration

### 1. Install Dependencies

```bash
npm install @mysten/seal @mysten/sui
```

### 2. Setup Seal Client

```typescript
import { SealClient } from '@mysten/seal';
import { SuiClient } from '@mysten/sui/client';

// Initialize Seal client with key servers
const sealClient = new SealClient({
  serverConfigs: [
    {
      objectId: "0x...", // Key server object ID
      weight: 1,
    },
    // Add more key servers as needed
  ],
});
```

### 3. Sending an Encrypted Message

```typescript
import { encryptAndUploadMessage } from './utils/messageEncryption';
import { useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';

async function sendEncryptedMessage(
  messageContent: string,
  recipientAddress: string,
  conversationId: string
) {
  // Step 1: Encrypt and upload message to Walrus
  const { blobId, contentHash } = await encryptAndUploadMessage(
    messageContent,
    sealClient,
    suiClient,
    recipientAddress
  );

  // Step 2: Convert content hash to vector<u8> format for Move
  const contentHashVector = Array.from(contentHash);

  // Step 3: Call smart contract to store message
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::messaging::send_message`,
    arguments: [
      tx.object(CONVERSATION_REGISTRY_ID),
      tx.object(GLOBAL_REGISTRY_ID),
      tx.object(conversationId),
      tx.pure.string(blobId),
      tx.pure.vector('u8', contentHashVector),
      tx.object('0x6'), // Clock
    ],
  });

  await signAndExecuteTransaction({ transaction: tx });
}
```

### 4. Receiving and Decrypting Messages

```typescript
import { decryptMessage, verifyMessageHash } from './utils/messageEncryption';

async function receiveAndDecryptMessage(
  message: {
    encrypted_content_blob_id: string;
    content_hash: Uint8Array;
    sender: string;
    timestamp_ms: number;
  }
) {
  // Step 1: Download and decrypt message from Walrus
  const decryptedContent = await decryptMessage(
    message.encrypted_content_blob_id,
    sealClient,
    suiClient
  );

  // Step 2: Verify content hash
  const isValid = await verifyMessageHash(
    decryptedContent,
    new Uint8Array(message.content_hash)
  );

  if (!isValid) {
    console.error('Message hash verification failed!');
    return null;
  }

  return decryptedContent;
}
```

### 5. Sending Message with Media

```typescript
import { encryptAndUploadMessage, encryptAndUploadMedia } from './utils/messageEncryption';

async function sendMessageWithMedia(
  messageContent: string,
  mediaFile: File,
  recipientAddress: string,
  conversationId: string
) {
  // Step 1: Encrypt and upload message content
  const { blobId, contentHash } = await encryptAndUploadMessage(
    messageContent,
    sealClient,
    suiClient,
    recipientAddress
  );

  // Step 2: Encrypt and upload media
  const mediaBlobId = await encryptAndUploadMedia(
    mediaFile,
    sealClient,
    recipientAddress
  );

  // Step 3: Call smart contract
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::messaging::send_message_with_media`,
    arguments: [
      tx.object(CONVERSATION_REGISTRY_ID),
      tx.object(GLOBAL_REGISTRY_ID),
      tx.object(conversationId),
      tx.pure.string(blobId),
      tx.pure.vector('u8', Array.from(contentHash)),
      tx.pure.string(mediaBlobId),
      tx.object('0x6'), // Clock
    ],
  });

  await signAndExecuteTransaction({ transaction: tx });
}
```

## Security Features

1. **End-to-End Encryption**: Messages are encrypted using Seal SDK before storage
2. **Content Verification**: SHA-256 hash ensures message integrity
3. **Walrus Storage**: Encrypted content stored on decentralized Walrus network
4. **Access Control**: Only conversation participants can send/receive messages

## Workflow

### Sending a Message:
1. User types message in frontend
2. Frontend encrypts message using Seal SDK
3. Encrypted message uploaded to Walrus → get blob ID
4. Generate SHA-256 hash of original message
5. Call `send_message()` with blob ID and hash
6. Smart contract stores blob ID and hash on-chain

### Receiving a Message:
1. Frontend queries conversation messages from blockchain
2. For each message, get `encrypted_content_blob_id`
3. Download encrypted content from Walrus
4. Decrypt using Seal SDK
5. Verify content hash matches stored hash
6. Display decrypted message to user

## Error Handling

- Always verify content hash after decryption
- Handle Walrus download failures gracefully
- Check Seal encryption/decryption errors
- Validate conversation participants before sending

## Notes

- The smart contract only stores blob IDs and hashes, never plain text
- Encryption/decryption happens entirely on the client side
- Seal SDK handles key management and encryption protocols
- Media attachments are also encrypted before storage

