# Suitter7 - Decentralized Social Media on Sui

A fully decentralized Twitter-like social platform built on the Sui blockchain with end-to-end encryption for direct messaging.

## Core Features

### Smart Contracts (Move)
- **Profile Management** - Create profiles with usernames, bios, and profile images stored on Walrus
- **Suits (Posts)** - Create posts with up to 280 characters, support for media attachments via Walrus storage
- **Social Interactions** - Like, comment, repost, and mention users in suits
- **Follow System** - Follow/unfollow users with follower/following counts
- **Encrypted Messaging** - Private conversations with end-to-end encryption, content stored on Walrus
- **Global Registry** - Track platform-wide stats (total suits, profiles, interactions)

### Frontend Integration
- **zkLogin via Enoki** - Passwordless authentication using Google OAuth with zero-knowledge proofs
- **Sponsored Transactions** - Gas-free experience for users through Enoki's transaction sponsorship
- **Walrus Storage** - Decentralized storage for profile images, media attachments, and encrypted messages
- **Real-time Updates** - Event-based UI updates using Sui's event system
- **Responsive Design** - Built with React, Vite, and Tailwind CSS

## Technology Stack

**Blockchain**
- Sui Move smart contracts
- Sui dApp Kit for wallet integration
- Event emission for real-time updates

**Authentication**
- Mysten Labs Enoki SDK for zkLogin
- Google OAuth integration
- Sponsored transactions for seamless UX

**Storage**
- Walrus for decentralized media storage
- On-chain metadata and relationships
- Encrypted blob storage for private messages

**Frontend**
- React 18 + TypeScript
- Vite 7 for fast builds
- Tailwind CSS 4 for styling
- TanStack Query for state management
- React Router for navigation

## Architecture Highlights

- **Modular Design** - Separate modules for profiles, suits, interactions, and messaging
- **Package Visibility** - Strategic use of `public`, `public(package)`, and `entry` functions
- **Event-Driven** - Emit events for all major actions to enable off-chain indexing
- **Privacy-First** - E2E encrypted messaging with content stored off-chain
- **Gas Optimized** - Efficient table structures and minimal on-chain storage

## Contract Modules

- `suitter.move` - Global registry and event emissions
- `profile.move` - User profiles and follow system
- `suit.move` - Post creation and management
- `interactions.move` - Likes, comments, reposts, mentions
- `messaging.move` - Encrypted direct messaging

## Deployment

- **Network**: Sui Testnet
- **Frontend**: Deployed on Render
- **Storage**: Walrus decentralized storage network
