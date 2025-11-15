# Suitter7 dApp

A decentralized social media application built on Sui blockchain.

## Features

- ✅ Create and view Suits (posts)
- ✅ Like, comment, and repost Suits
- ✅ User profiles with bio and avatar
- ✅ Follow/unfollow users
- ✅ Explore trending content, people, and topics
- ✅ Notifications
- ✅ Communities

## Setup

1. Install dependencies:
   ```bash
   npm install
   # or
   pnpm install
   ```

2. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   Then update `.env` with your deployed contract addresses.

3. (Optional) Set up gRPC proto files:
   See `PROTO_SETUP.md` for instructions. The app will work with JSON-RPC by default.

4. Run the development server:
   ```bash
   npm run dev
   # or
   pnpm dev
   ```

## Deployment

After deploying your smart contracts:

1. Get the package ID from the deployment output
2. Get the registry object IDs (GlobalRegistry, ProfileRegistry, etc.)
3. Update `.env` with these values

## Project Structure

- `src/pages/` - Page components (Home, Explore, Profile, etc.)
- `src/components/` - Reusable components (Layout, SuitCard, etc.)
- `src/hooks/useContract.ts` - React hooks for contract interactions
- `src/lib/suiClient.ts` - gRPC client setup (optional)

## Smart Contract Integration

The app uses React hooks to interact with the Sui smart contracts:

- `useSuits()` - Fetch all Suits
- `useCreateSuit()` - Create a new Suit
- `useLikeSuit()` - Like a Suit
- `useCommentOnSuit()` - Comment on a Suit
- `useRepostSuit()` - Repost a Suit
- `useProfile()` - Get user profile
- `useCreateProfile()` - Create a profile
- `useFollowUser()` - Follow a user
- `useUnfollowUser()` - Unfollow a user

## Technologies

- React + TypeScript
- Vite
- @mysten/dapp-kit - Sui wallet integration
- @mysten/sui - Sui SDK
- @radix-ui/themes - UI components
- React Router - Routing
- TanStack Query - Data fetching
- gRPC (optional) - For direct blockchain queries
