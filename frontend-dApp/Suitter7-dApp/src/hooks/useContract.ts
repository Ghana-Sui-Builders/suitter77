import { useSuiClient, useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// Contract package ID - should be set after deployment
const PACKAGE_ID = import.meta.env.VITE_PACKAGE_ID || '0x4d105e317fae9c83ea97d317b02a8e29d3bffe563a4c5ef76584c15a2cfc26ea';
const GLOBAL_REGISTRY_ID = import.meta.env.VITE_GLOBAL_REGISTRY_ID || '0x3f9d688b242a46547d3eb6ebfc2e8d5d5384c4bb0cce858bd235a113d08df8af';
const PROFILE_REGISTRY_ID = import.meta.env.VITE_PROFILE_REGISTRY_ID || '0xce633d2dd87c92dbe9060d33783c3ba2ffce4a571f6294cd793b5b40e7817e35';
const LIKE_REGISTRY_ID = import.meta.env.VITE_LIKE_REGISTRY_ID || '0xfc0f46c69176082eb217266462133517927e252b2e5e39db80ab4d7e39e0b95c';
const REPOST_REGISTRY_ID = import.meta.env.VITE_REPOST_REGISTRY_ID || '0x07cf02f7758dcbc87ceb7cb65742406a15fd6c3426e83e5a59f78ac977cf4bd3';
const MENTION_REGISTRY_ID = import.meta.env.VITE_MENTION_REGISTRY_ID || '0xe6ee869f196d50db424ad5df60a5eacfe4af376b92335a1840b65405c19c5f87';
const FOLLOW_REGISTRY_ID = import.meta.env.VITE_FOLLOW_REGISTRY_ID || '0xe6ff988467c7232a43352e21c0f993ba485efbb06d26e40fe52d52253d675fcf';
const CONVERSATION_REGISTRY_ID = import.meta.env.VITE_CONVERSATION_REGISTRY_ID || '0x95efd718dd46ec7e4f38475d0d64a911034b303e5ded5c37e72bd6fae066abd1';
const COMMUNITY_REGISTRY_ID = import.meta.env.VITE_COMMUNITY_REGISTRY_ID || '0x3b9c1325bca405b447a88e83b9bcc9603e3a2f1b0d7d70dcc1b93043522c989d';

// Helper function to extract Option<String> from Sui object
// Option<String> can be stored in various formats:
// - { fields: { vec: ["value"] } } (standard Option with vector)
// - { fields: [0: "value"] } (array-like structure)
// - { vec: ["value"] } (direct vector)
// - null/undefined for None
function extractOptionString(optionField: any, fieldName: string = 'unknown'): string | undefined {
  if (!optionField) {
    console.debug(`extractOptionString(${fieldName}): field is null/undefined`);
    return undefined;
  }
  
  // Try direct access (if it's already a string or empty)
  if (typeof optionField === 'string') {
    console.debug(`extractOptionString(${fieldName}): found string value:`, optionField);
    return optionField || undefined;
  }
  
  // Try fields.vec (standard Option format)
  if (optionField.fields?.vec && Array.isArray(optionField.fields.vec) && optionField.fields.vec.length > 0) {
    const value = optionField.fields.vec[0];
    console.debug(`extractOptionString(${fieldName}): found in fields.vec:`, value);
    return value || undefined;
  }
  
  // Try fields array (array-like structure)
  if (optionField.fields && Array.isArray(optionField.fields) && optionField.fields.length > 0) {
    const value = optionField.fields[0];
    console.debug(`extractOptionString(${fieldName}): found in fields array:`, value);
    return value || undefined;
  }
  
  // Try direct vec access
  if (optionField.vec && Array.isArray(optionField.vec) && optionField.vec.length > 0) {
    const value = optionField.vec[0];
    console.debug(`extractOptionString(${fieldName}): found in vec:`, value);
    return value || undefined;
  }
  
  // Fallback to old method
  if (optionField.fields?.[0]) {
    const value = optionField.fields[0];
    console.debug(`extractOptionString(${fieldName}): found in fields[0]:`, value);
    return value || undefined;
  }
  
  console.debug(`extractOptionString(${fieldName}): no value found, field structure:`, JSON.stringify(optionField, null, 2));
  return undefined;
}

// Types
export interface Suit {
  id: string;
  author: string;
  content: string;
  timestamp_ms: number;
  likes_count: number;
  comments_count: number;
  reposts_count: number;
  walrus_blob_id?: string;
}

export interface Profile {
  id: string;
  owner: string;
  username: string;
  bio: string;
  profile_image_blob_id?: string;
  suits_count: number;
  followers_count: number;
  following_count: number;
  created_at_ms: number;
}

export interface Comment {
  id: string;
  suit_id: string;
  author: string;
  content: string;
  timestamp_ms: number;
  walrus_blob_id?: string;
}

export interface Repost {
  id: string;
  suit_id: string;
  reposter: string;
  original_author: string;
  timestamp_ms: number;
}

export interface Mention {
  id: string;
  content_id: string;
  content_type: number; // 0 = suit, 1 = comment
  mentioned_user: string;
  mentioner: string;
  timestamp_ms: number;
}

export interface Community {
  id: string;
  name: string;
  handle: string;
  description: string;
  creator: string;
  privacy: 'public' | 'members';
  members_count: number;
  thumbnail_blob_id?: string;
  cover_blob_id?: string;
  created_at_ms: number;
}

// Hook to get all Suits
export function useSuits() {
  const suiClient = useSuiClient();

  return useQuery({
    queryKey: ['suits'],
    queryFn: async () => {
      try {
        console.log('Fetching suits with PACKAGE_ID:', PACKAGE_ID);
        console.log('GLOBAL_REGISTRY_ID:', GLOBAL_REGISTRY_ID);
        
        // First, try to verify the GlobalRegistry exists and check total_suits
        try {
          const registry = await suiClient.getObject({
            id: GLOBAL_REGISTRY_ID,
            options: {
              showContent: true,
            },
          });
          
          if (registry.data?.content && 'fields' in registry.data.content) {
            const fields = (registry.data.content as any).fields;
            const totalSuits = Number(fields?.total_suits || 0);
            console.log('GlobalRegistry found! Total suits in registry:', totalSuits);
            
            if (totalSuits === 0) {
              console.warn('Registry shows 0 total suits - no Suits have been created yet');
              return [];
            }
          }
        } catch (registryError) {
          console.warn('Could not fetch GlobalRegistry:', registryError);
          console.warn('This might mean GLOBAL_REGISTRY_ID is incorrect or you are on the wrong network');
        }
        
        // Try querying by MoveEventType first (more specific)
        let events;
        try {
          events = await suiClient.queryEvents({
            query: {
              MoveEventType: `${PACKAGE_ID}::suitter::SuitCreated`,
            },
            limit: 100,
            order: 'descending',
          });
          console.log('Events found by MoveEventType (suitter::SuitCreated):', events.data.length);
        } catch (eventError) {
          console.warn('Query by MoveEventType (suitter) failed, trying alternatives:', eventError);
          // Try alternative event type with different module name
          try {
            events = await suiClient.queryEvents({
              query: {
                MoveEventType: `${PACKAGE_ID}::suit::SuitCreated`,
              },
              limit: 100,
              order: 'descending',
            });
            console.log('Events found by MoveEventType (suit::SuitCreated):', events.data.length);
          } catch (altError) {
            console.warn('Query by MoveEventType (suit) failed, trying MoveModule:', altError);
            // Fallback: Try querying by MoveModule (broader query)
            try {
              events = await suiClient.queryEvents({
                query: {
                  MoveModule: {
                    package: PACKAGE_ID,
                    module: 'suitter',
                  },
                },
                limit: 100,
                order: 'descending',
              });
              console.log('Events found by MoveModule (suitter):', events.data.length);
              // Filter for SuitCreated events only
              if (events.data.length > 0) {
                const suitCreatedEvents = events.data.filter((e: any) => 
                  e.type?.includes('SuitCreated') || 
                  e.type?.includes('suitter::SuitCreated') ||
                  e.type?.includes('suit::SuitCreated')
                );
                console.log('Filtered SuitCreated events from module query:', suitCreatedEvents.length);
                events.data = suitCreatedEvents;
              }
            } catch (moduleError) {
              // Try with 'suit' module
              try {
                events = await suiClient.queryEvents({
                  query: {
                    MoveModule: {
                      package: PACKAGE_ID,
                      module: 'suit',
                    },
                  },
                  limit: 100,
                  order: 'descending',
                });
                console.log('Events found by MoveModule (suit):', events.data.length);
                // Filter for SuitCreated events only
                if (events.data.length > 0) {
                  const suitCreatedEvents = events.data.filter((e: any) => 
                    e.type?.includes('SuitCreated')
                  );
                  console.log('Filtered SuitCreated events from suit module:', suitCreatedEvents.length);
                  events.data = suitCreatedEvents;
                }
              } catch (suitModuleError) {
                console.error('All query methods failed:', { eventError, altError, moduleError, suitModuleError });
                console.log('PACKAGE_ID being used:', PACKAGE_ID);
                console.log('Tried event types:');
                console.log(`  - ${PACKAGE_ID}::suitter::SuitCreated`);
                console.log(`  - ${PACKAGE_ID}::suit::SuitCreated`);
                console.log('Make sure:');
                console.log('  1. PACKAGE_ID is correct');
                console.log('  2. You are on the correct network (testnet/mainnet)');
                console.log('  3. Suits were actually created (transactions succeeded)');
                return [];
              }
            }
          }
        }

        if (!events || events.data.length === 0) {
          console.log('No events found');
          return [];
        }

        console.log('Raw events:', events.data);

        // Extract suit IDs from events - try multiple possible field names
        const suitIds = events.data
          .map((event) => {
            const parsedJson = event.parsedJson as any;
            // The event structure is SuitCreated { suit_id: ID, author: address, timestamp: u64 }
            // Try different possible field names and formats
            let suitId = parsedJson?.suit_id || 
                        parsedJson?.suitId || 
                        parsedJson?.suit_id?.substring(2) || // Remove 0x prefix if present
                        parsedJson?.id || 
                        parsedJson?.suit;
            
            // If suitId is an object with fields, try to extract the ID
            if (typeof suitId === 'object' && suitId !== null) {
              suitId = suitId.id || suitId.value || suitId;
            }
            
            // Convert to string if needed
            if (suitId && typeof suitId !== 'string') {
              suitId = String(suitId);
            }
            
            return suitId;
          })
          .filter((id): id is string => !!id && typeof id === 'string' && id.length > 0);

        console.log('Extracted suit IDs:', suitIds);

        if (suitIds.length === 0) {
          console.log('No suit IDs extracted from events');
          // Log the structure of events to help debug
          if (events.data.length > 0) {
            console.log('Sample event structure:', JSON.stringify(events.data[0], null, 2));
          }
          return [];
        }

        // Batch fetch all Suit objects
        const objects = await suiClient.multiGetObjects({
          ids: suitIds,
          options: {
            showContent: true,
            showType: true,
          },
        });

        console.log('Fetched objects:', objects.length);

        const suits = objects
          .map((obj, index) => {
            if (!obj.data) {
              console.warn(`Object ${suitIds[index]} has no data`);
              return null;
            }
            const content = obj.data.content as any;
            if (!content || !content.fields) {
              console.warn(`Object ${suitIds[index]} has no content fields:`, content);
              return null;
            }

            const suit = {
              id: obj.data.objectId,
              author: content.fields.author || '',
              content: content.fields.content || '',
              timestamp_ms: Number(content.fields.timestamp_ms || 0),
              likes_count: Number(content.fields.likes_count || 0),
              comments_count: Number(content.fields.comments_count || 0),
              reposts_count: Number(content.fields.reposts_count || 0),
              walrus_blob_id: extractOptionString(content.fields.walrus_blob_id),
            } as Suit;
            
            console.log('Parsed suit:', suit);
            return suit;
          })
          .filter((suit): suit is Suit => suit !== null)
          .sort((a, b) => b.timestamp_ms - a.timestamp_ms); // Sort by newest first

        console.log('Final suits array:', suits);
        return suits;
      } catch (error) {
        console.error('Error fetching suits:', error);
        return [];
      }
    },
    refetchInterval: 10000, // Refetch every 10 seconds
    retry: 3, // Retry failed requests
  });
}

// Hook to get a specific Suit
export function useSuit(suitId: string | null) {
  const suiClient = useSuiClient();

  return useQuery({
    queryKey: ['suit', suitId],
    queryFn: async () => {
      if (!suitId) return null;

      const object = await suiClient.getObject({
        id: suitId,
        options: {
          showContent: true,
          showType: true,
        },
      });

      if (!object.data) return null;
      const content = object.data.content as any;
      if (!content || !content.fields) return null;

      return {
        id: object.data.objectId,
        author: content.fields.author || '',
        content: content.fields.content || '',
        timestamp_ms: Number(content.fields.timestamp_ms || 0),
        likes_count: Number(content.fields.likes_count || 0),
        comments_count: Number(content.fields.comments_count || 0),
        reposts_count: Number(content.fields.reposts_count || 0),
        walrus_blob_id: content.fields.walrus_blob_id?.fields?.[0] || undefined,
      } as Suit;
    },
    enabled: !!suitId,
  });
}

// Hook to get user profile  
export function useProfile(address: string | null) {
  const suiClient = useSuiClient();

  return useQuery({
    queryKey: ['profile', address],
    queryFn: async () => {
      if (!address) return null;

      try {
        const objects = await suiClient.getOwnedObjects({
          owner: address,
          filter: {
            StructType: `${PACKAGE_ID}::profile::Profile`,
          },
          options: {
            showContent: true,
            showType: true,
          },
        });

        if (objects.data.length === 0) return null;

        const profileObj = objects.data[0];
        if (!profileObj.data) return null;
        const content = profileObj.data.content as any;
        if (!content || !content.fields) return null;

        return {
          id: profileObj.data.objectId,
          owner: content.fields.owner || '',
          username: content.fields.username || '',
          bio: content.fields.bio || '',
          profile_image_blob_id: extractOptionString(content.fields.profile_image_blob_id, 'profile_image_blob_id'),
          suits_count: Number(content.fields.suits_count || 0),
          followers_count: Number(content.fields.followers_count || 0),
          following_count: Number(content.fields.following_count || 0),
          created_at_ms: Number(content.fields.created_at_ms || 0),
        } as Profile;
      } catch (error) {
        console.error('Error fetching profile:', error);
        return null;
      }
    },
    enabled: !!address,
  });
}

// Hook to create a Suit
export function useCreateSuit() {
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ content, walrusBlobId }: { content: string; walrusBlobId?: string }) => {
      return new Promise((resolve, reject) => {
        const tx = new Transaction();

        if (walrusBlobId) {
          tx.moveCall({
            target: `${PACKAGE_ID}::suit::create_suit_with_media`,
            arguments: [
              tx.object(GLOBAL_REGISTRY_ID),
              tx.pure.string(content),
              tx.pure.string(walrusBlobId),
              tx.object('0x6'), // Clock object
            ],
          });
        } else {
          tx.moveCall({
            target: `${PACKAGE_ID}::suit::create_suit`,
            arguments: [
              tx.object(GLOBAL_REGISTRY_ID),
              tx.pure.string(content),
              tx.object('0x6'), // Clock object
            ],
          });
        }

        signAndExecute(
          { transaction: tx },
          {
            onSuccess: (result) => {
              resolve(result);
            },
            onError: (error) => {
              reject(error);
            },
          }
        );
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suits'] });
    },
  });
}

// Hook to like a Suit
export function useLikeSuit() {
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (suitId: string) => {
      return new Promise((resolve, reject) => {
        const tx = new Transaction();
        tx.moveCall({
          target: `${PACKAGE_ID}::interactions::like_suit`,
          arguments: [
            tx.object(GLOBAL_REGISTRY_ID),
            tx.object(LIKE_REGISTRY_ID),
            tx.object(suitId),
            tx.object('0x6'), // Clock object
          ],
        });

        signAndExecute(
          { transaction: tx },
          {
            onSuccess: resolve,
            onError: reject,
          }
        );
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suits'] });
      queryClient.invalidateQueries({ queryKey: ['suit'] });
      queryClient.invalidateQueries({ queryKey: ['like-added-events'] });
    },
  });
}

// Hook to comment on a Suit
export function useCommentOnSuit() {
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ suitId, content }: { suitId: string; content: string }) => {
      return new Promise((resolve, reject) => {
        const tx = new Transaction();
        tx.moveCall({
          target: `${PACKAGE_ID}::interactions::comment_on_suit`,
          arguments: [
            tx.object(GLOBAL_REGISTRY_ID),
            tx.object(suitId),
            tx.pure.string(content),
            tx.object('0x6'), // Clock object
          ],
        });

        signAndExecute(
          { transaction: tx },
          {
            onSuccess: resolve,
            onError: reject,
          }
        );
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suits'] });
      queryClient.invalidateQueries({ queryKey: ['suit'] });
      queryClient.invalidateQueries({ queryKey: ['comments'] });
    },
  });
}

// Hook to comment on a Suit with media
export function useCommentOnSuitWithMedia() {
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ suitId, content, walrusBlobId }: { suitId: string; content: string; walrusBlobId: string }) => {
      return new Promise((resolve, reject) => {
        const tx = new Transaction();
        tx.moveCall({
          target: `${PACKAGE_ID}::interactions::comment_on_suit_with_media`,
          arguments: [
            tx.object(GLOBAL_REGISTRY_ID),
            tx.object(suitId),
            tx.pure.string(content),
            tx.pure.string(walrusBlobId),
            tx.object('0x6'), // Clock object
          ],
        });

        signAndExecute(
          { transaction: tx },
          {
            onSuccess: resolve,
            onError: reject,
          }
        );
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suits'] });
      queryClient.invalidateQueries({ queryKey: ['suit'] });
      queryClient.invalidateQueries({ queryKey: ['comments'] });
    },
  });
}

// Hook to repost a Suit
export function useRepostSuit() {
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (suitId: string) => {
      return new Promise((resolve, reject) => {
        const tx = new Transaction();
        tx.moveCall({
          target: `${PACKAGE_ID}::interactions::repost_suit`,
          arguments: [
            tx.object(GLOBAL_REGISTRY_ID),
            tx.object(REPOST_REGISTRY_ID),
            tx.object(suitId),
            tx.object('0x6'), // Clock object
          ],
        });

        signAndExecute(
          { transaction: tx },
          {
            onSuccess: resolve,
            onError: reject,
          }
        );
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suits'] });
      queryClient.invalidateQueries({ queryKey: ['suit'] });
    },
  });
}

// Hook to mention a user in a suit
export function useMentionUserInSuit() {
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ suitId, mentionedUserAddress }: { suitId: string; mentionedUserAddress: string }) => {
      return new Promise((resolve, reject) => {
        const tx = new Transaction();
        tx.moveCall({
          target: `${PACKAGE_ID}::interactions::mention_user_in_suit`,
          arguments: [
            tx.object(GLOBAL_REGISTRY_ID),
            tx.object(MENTION_REGISTRY_ID),
            tx.object(suitId),
            tx.pure.address(mentionedUserAddress),
            tx.object('0x6'), // Clock object
          ],
        });

        signAndExecute(
          { transaction: tx },
          {
            onSuccess: resolve,
            onError: reject,
          }
        );
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mentions'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

// Hook to mention a user in a comment
export function useMentionUserInComment() {
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, mentionedUserAddress }: { commentId: string; mentionedUserAddress: string }) => {
      return new Promise((resolve, reject) => {
        const tx = new Transaction();
        tx.moveCall({
          target: `${PACKAGE_ID}::interactions::mention_user_in_comment`,
          arguments: [
            tx.object(GLOBAL_REGISTRY_ID),
            tx.object(MENTION_REGISTRY_ID),
            tx.object(commentId),
            tx.pure.address(mentionedUserAddress),
            tx.object('0x6'), // Clock object
          ],
        });

        signAndExecute(
          { transaction: tx },
          {
            onSuccess: resolve,
            onError: reject,
          }
        );
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mentions'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

// Hook to create a profile
export function useCreateProfile() {
  const account = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ username, bio }: { username: string; bio: string }) => {
      return new Promise((resolve, reject) => {
        try {
          const tx = new Transaction();
          
          // Use inline arguments (same pattern as create_community which works)
          // This matches the exact pattern used in create_community
          tx.moveCall({
            target: `${PACKAGE_ID}::profile::create_profile`,
            arguments: [
              tx.object(GLOBAL_REGISTRY_ID),
              tx.object(PROFILE_REGISTRY_ID),
              tx.pure.string(username),
              tx.pure.string(bio),
              tx.object('0x6'), // Clock object
            ],
          });

          signAndExecute(
            { transaction: tx },
            {
              onSuccess: (result) => {
                resolve(result);
              },
              onError: (error: any) => {
                console.error('Profile creation error:', error);
                console.error('Error details:', JSON.stringify(error, null, 2));
                console.error('PACKAGE_ID:', PACKAGE_ID);
                console.error('GLOBAL_REGISTRY_ID:', GLOBAL_REGISTRY_ID);
                console.error('PROFILE_REGISTRY_ID:', PROFILE_REGISTRY_ID);
                console.error('Username:', username);
                console.error('Bio:', bio);
                
                // Check if it's the specific InvalidValueUsage error
                const errorStr = JSON.stringify(error);
                if (errorStr.includes('InvalidValueUsage') || errorStr.includes('arg_idx: 1')) {
                  console.error('This appears to be a Transaction API issue with multiple mutable shared objects in SDK 1.45.0');
                  console.error('The CLI dry run succeeded, so the function signature is correct.');
                  console.error('This might be a known issue with Sui SDK 1.45.0 Transaction API.');
                }
                
                reject(error);
              },
            }
          );
        } catch (error) {
          console.error('Transaction construction error:', error);
          reject(error);
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', account?.address] });
    },
  });
}

// Hook to update profile bio
export function useUpdateProfile() {
  const account = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ profileId, bio }: { profileId: string; bio: string }) => {
      return new Promise((resolve, reject) => {
        const tx = new Transaction();
        tx.moveCall({
          target: `${PACKAGE_ID}::profile::update_bio`,
          arguments: [
            tx.object(profileId),
            tx.pure.string(bio),
          ],
        });

        signAndExecute(
          { transaction: tx },
          {
            onSuccess: resolve,
            onError: reject,
          }
        );
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', account?.address] });
      queryClient.invalidateQueries({ queryKey: ['all-profiles'] });
    },
  });
}

// Hook to update profile image
export function useUpdateProfileImage() {
  const account = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ profileId, walrusBlobId }: { profileId: string; walrusBlobId: string }) => {
      return new Promise((resolve, reject) => {
        const tx = new Transaction();
        tx.moveCall({
          target: `${PACKAGE_ID}::profile::update_profile_image`,
          arguments: [
            tx.object(profileId),
            tx.pure.string(walrusBlobId),
          ],
        });

        signAndExecute(
          { transaction: tx },
          {
            onSuccess: resolve,
            onError: reject,
          }
        );
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', account?.address] });
      queryClient.invalidateQueries({ queryKey: ['all-profiles'] });
    },
  });
}

// Hook to follow a user
export function useFollowUser() {
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ followerProfileId, followeeProfileId }: { followerProfileId: string; followeeProfileId: string }) => {
      return new Promise((resolve, reject) => {
        const tx = new Transaction();
        tx.moveCall({
          target: `${PACKAGE_ID}::profile::follow_user`,
          arguments: [
            tx.object(FOLLOW_REGISTRY_ID),
            tx.object(followerProfileId),
            tx.object(followeeProfileId),
          ],
        });

        signAndExecute(
          { transaction: tx },
          {
            onSuccess: resolve,
            onError: reject,
          }
        );
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['is-following'] });
      queryClient.invalidateQueries({ queryKey: ['all-profiles'] });
    },
  });
}

// Hook to unfollow a user
export function useUnfollowUser() {
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ unfollowerProfileId, unfolloweeProfileId }: { unfollowerProfileId: string; unfolloweeProfileId: string }) => {
      return new Promise((resolve, reject) => {
        const tx = new Transaction();
        tx.moveCall({
          target: `${PACKAGE_ID}::profile::unfollow_user`,
          arguments: [
            tx.object(FOLLOW_REGISTRY_ID),
            tx.object(unfollowerProfileId),
            tx.object(unfolloweeProfileId),
          ],
        });

        signAndExecute(
          { transaction: tx },
          {
            onSuccess: resolve,
            onError: reject,
          }
        );
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['is-following'] });
      queryClient.invalidateQueries({ queryKey: ['all-profiles'] });
    },
  });
}

// Hook to check if a user is following another user
export function useIsFollowing(followerAddress: string | null, followeeAddress: string | null) {
  const suiClient = useSuiClient();

  return useQuery({
    queryKey: ['is-following', followerAddress, followeeAddress],
    queryFn: async () => {
      if (!followerAddress || !followeeAddress || followerAddress === followeeAddress) {
        return false;
      }

      try {
        // Query both follow and unfollow events
        const [followEvents, unfollowEvents] = await Promise.all([
          suiClient.queryEvents({
            query: {
              MoveEventType: `${PACKAGE_ID}::suitter::UserFollowed`,
            },
            limit: 1000,
            order: 'descending',
          }),
          suiClient.queryEvents({
            query: {
              MoveEventType: `${PACKAGE_ID}::suitter::UserUnfollowed`,
            },
            limit: 1000,
            order: 'descending',
          }),
        ]);

        // Filter events for this specific follower-followee pair
        const relevantFollowEvents = followEvents.data
          .filter((event) => {
            const parsedJson = event.parsedJson as any;
            return (
              parsedJson?.follower?.toLowerCase() === followerAddress.toLowerCase() &&
              parsedJson?.followee?.toLowerCase() === followeeAddress.toLowerCase()
            );
          })
          .map((event) => ({
            txDigest: event.id.txDigest,
            timestamp: event.timestampMs || 0,
          }));

        const relevantUnfollowEvents = unfollowEvents.data
          .filter((event) => {
            const parsedJson = event.parsedJson as any;
            return (
              parsedJson?.unfollower?.toLowerCase() === followerAddress.toLowerCase() &&
              parsedJson?.unfollowee?.toLowerCase() === followeeAddress.toLowerCase()
            );
          })
          .map((event) => ({
            txDigest: event.id.txDigest,
            timestamp: event.timestampMs || 0,
          }));

        // If no follow events, user is not following
        if (relevantFollowEvents.length === 0) {
          return false;
        }

        // If no unfollow events, user is following
        if (relevantUnfollowEvents.length === 0) {
          return true;
        }

        // Get the most recent follow and unfollow events
        const latestFollow = relevantFollowEvents[0]; // Already sorted descending
        const latestUnfollow = relevantUnfollowEvents[0]; // Already sorted descending

        // Compare timestamps to determine the most recent action
        // If unfollow is more recent, user is not following
        if (latestUnfollow.timestamp > latestFollow.timestamp) {
          return false;
        }

        // If follow is more recent or equal, user is following
        return true;
      } catch (error) {
        console.error('Error checking if user is following:', error);
        return false;
      }
    },
    enabled: !!followerAddress && !!followeeAddress && followerAddress !== followeeAddress,
    refetchInterval: 10000, // Refetch every 10 seconds
  });
}

// Hook to get all profiles
export function useAllProfiles() {
  const suiClient = useSuiClient();

  return useQuery({
    queryKey: ['all-profiles'],
    queryFn: async () => {
      try {
        // Query ProfileCreated events
        const events = await suiClient.queryEvents({
          query: {
            MoveEventType: `${PACKAGE_ID}::suitter::ProfileCreated`,
          },
          limit: 100,
          order: 'descending',
        });

        if (!events || events.data.length === 0) {
          return [];
        }

        // Extract profile owner addresses from events
        const profileOwners = events.data
          .map((event) => {
            const parsedJson = event.parsedJson as any;
            return parsedJson?.owner || parsedJson?.profile_owner;
          })
          .filter((owner): owner is string => !!owner);

        // Remove duplicates
        const uniqueOwners = Array.from(new Set(profileOwners));

        // Fetch all profile objects for these owners
        const profilePromises = uniqueOwners.map(async (owner) => {
          try {
            const objects = await suiClient.getOwnedObjects({
              owner,
              filter: {
                StructType: `${PACKAGE_ID}::profile::Profile`,
              },
              options: {
                showContent: true,
                showType: true,
              },
            });

            if (objects.data.length === 0) return null;

            const profileObj = objects.data[0];
            if (!profileObj.data) return null;
            const content = profileObj.data.content as any;
            if (!content || !content.fields) return null;

            return {
              id: profileObj.data.objectId,
              owner: content.fields.owner || owner,
              username: content.fields.username || '',
              bio: content.fields.bio || '',
              profile_image_blob_id: extractOptionString(content.fields.profile_image_blob_id, 'profile_image_blob_id'),
              suits_count: Number(content.fields.suits_count || 0),
              followers_count: Number(content.fields.followers_count || 0),
              following_count: Number(content.fields.following_count || 0),
              created_at_ms: Number(content.fields.created_at_ms || 0),
            } as Profile;
          } catch (error) {
            console.error(`Error fetching profile for ${owner}:`, error);
            return null;
          }
        });

        const profiles = await Promise.all(profilePromises);
        return profiles.filter((profile): profile is Profile => profile !== null);
      } catch (error) {
        console.error('Error fetching all profiles:', error);
        return [];
      }
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

// Hook to get topic/hashtag statistics from suits
export function useTopicStats(suits: Suit[] | undefined) {
  return useQuery({
    queryKey: ['topic-stats', suits?.length],
    queryFn: async () => {
      if (!suits || suits.length === 0) {
        return [];
      }

      // Extract all hashtags from suits and count them
      const hashtagCounts: Record<string, { count: number; activeToday: number }> = {};
      const now = Date.now();
      const oneDayAgo = now - 24 * 60 * 60 * 1000;

      suits.forEach((suit) => {
        // Extract hashtags from content (match #hashtag pattern)
        const hashtags = suit.content.match(/#\w+/g) || [];
        const isRecent = suit.timestamp_ms >= oneDayAgo;

        hashtags.forEach((hashtag) => {
          const tag = hashtag.toLowerCase();
          if (!hashtagCounts[tag]) {
            hashtagCounts[tag] = { count: 0, activeToday: 0 };
          }
          hashtagCounts[tag].count++;
          if (isRecent) {
            hashtagCounts[tag].activeToday++;
          }
        });
      });

      // Convert to array and sort by count
      return Object.entries(hashtagCounts)
        .map(([hashtag, stats]) => ({
          hashtag: hashtag.replace('#', ''),
          fullHashtag: hashtag,
          count: stats.count,
          activeToday: stats.activeToday,
        }))
        .sort((a, b) => b.count - a.count);
    },
    enabled: !!suits && suits.length > 0,
  });
}

// Hook to get notifications for the current user
export function useNotifications(userAddress: string | null) {
  const suiClient = useSuiClient();
  const { data: suits } = useSuits();

  return useQuery({
    queryKey: ['notifications', userAddress],
    queryFn: async () => {
      if (!userAddress) return [];

      try {
        const notifications: Array<{
          type: 'like' | 'comment' | 'repost' | 'follow' | 'mention';
          user: string;
          userAddress: string;
          action: string;
          time: string;
          timestamp_ms: number;
          suit_id?: string;
          content?: string;
          comment_id?: string;
        }> = [];

        // Get user's suits to find interactions on them
        const userSuits = suits?.filter((suit) => suit.author.toLowerCase() === userAddress.toLowerCase()) || [];

        // Fetch LikeAdded events for user's suits
        if (userSuits.length > 0) {
          const likeEvents = await suiClient.queryEvents({
            query: {
              MoveEventType: `${PACKAGE_ID}::suitter::LikeAdded`,
            },
            limit: 100,
            order: 'descending',
          });

          const userSuitIds = new Set(userSuits.map((s) => s.id.toLowerCase()));
          likeEvents.data.forEach((event) => {
            const parsedJson = event.parsedJson as any;
            if (parsedJson?.suit_id && userSuitIds.has(parsedJson.suit_id.toLowerCase())) {
              const suit = userSuits.find((s) => s.id.toLowerCase() === parsedJson.suit_id.toLowerCase());
              if (parsedJson.liker?.toLowerCase() !== userAddress.toLowerCase()) {
                // Use suit timestamp as base, or current time if not available
                const timestamp = suit?.timestamp_ms || Date.now();
                notifications.push({
                  type: 'like',
                  user: `User${parsedJson.liker?.slice(2, 6) || ''}`,
                  userAddress: parsedJson.liker || '',
                  action: 'liked your Suit',
                  time: formatNotificationTime(timestamp),
                  timestamp_ms: timestamp,
                  suit_id: parsedJson.suit_id,
                  content: suit?.content || '',
                });
              }
            }
          });
        }

        // Fetch CommentAdded events for user's suits
        if (userSuits.length > 0) {
          const commentEvents = await suiClient.queryEvents({
            query: {
              MoveEventType: `${PACKAGE_ID}::suitter::CommentAdded`,
            },
            limit: 100,
            order: 'descending',
          });

          const userSuitIds = new Set(userSuits.map((s) => s.id.toLowerCase()));
          commentEvents.data.forEach((event) => {
            const parsedJson = event.parsedJson as any;
            if (parsedJson?.suit_id && userSuitIds.has(parsedJson.suit_id.toLowerCase())) {
              const suit = userSuits.find((s) => s.id.toLowerCase() === parsedJson.suit_id.toLowerCase());
              if (parsedJson.author?.toLowerCase() !== userAddress.toLowerCase()) {
                // Use suit timestamp as base, or current time if not available
                const timestamp = suit?.timestamp_ms || Date.now();
                notifications.push({
                  type: 'comment',
                  user: `User${parsedJson.author?.slice(2, 6) || ''}`,
                  userAddress: parsedJson.author || '',
                  action: 'commented on your Suit',
                  time: formatNotificationTime(timestamp),
                  timestamp_ms: timestamp,
                  suit_id: parsedJson.suit_id,
                  comment_id: parsedJson.comment_id,
                  content: suit?.content || '',
                });
              }
            }
          });
        }

        // Fetch RepostAdded events for user's suits
        if (userSuits.length > 0) {
          const repostEvents = await suiClient.queryEvents({
            query: {
              MoveEventType: `${PACKAGE_ID}::suitter::RepostAdded`,
            },
            limit: 100,
            order: 'descending',
          });

          repostEvents.data.forEach((event) => {
            const parsedJson = event.parsedJson as any;
            if (
              parsedJson?.original_author?.toLowerCase() === userAddress.toLowerCase() &&
              parsedJson.reposter?.toLowerCase() !== userAddress.toLowerCase()
            ) {
              const suit = userSuits.find((s) => s.id.toLowerCase() === parsedJson.suit_id?.toLowerCase());
              // Use suit timestamp as base, or current time if not available
              const timestamp = suit?.timestamp_ms || Date.now();
              notifications.push({
                type: 'repost',
                user: `User${parsedJson.reposter?.slice(2, 6) || ''}`,
                userAddress: parsedJson.reposter || '',
                action: 'reposted your Suit',
                time: formatNotificationTime(timestamp),
                timestamp_ms: timestamp,
                suit_id: parsedJson.suit_id,
                content: suit?.content || '',
              });
            }
          });
        }

        // Fetch UserFollowed events where someone followed the current user
        const followEvents = await suiClient.queryEvents({
          query: {
            MoveEventType: `${PACKAGE_ID}::suitter::UserFollowed`,
          },
          limit: 100,
          order: 'descending',
        });

        // Process follow events with transaction timestamps
        await Promise.all(
          followEvents.data.map(async (event) => {
            const parsedJson = event.parsedJson as any;
            if (parsedJson?.followee?.toLowerCase() === userAddress.toLowerCase()) {
              // Try to get transaction timestamp
              let timestamp = Date.now();
              try {
                const tx = await suiClient.getTransactionBlock({
                  digest: event.id.txDigest,
                  options: { showEffects: true },
                });
                if (tx.timestampMs) {
                  timestamp = Number(tx.timestampMs);
                }
              } catch (error) {
                // Use current time as fallback
                console.warn('Could not fetch transaction timestamp:', error);
              }
              notifications.push({
                type: 'follow',
                user: `User${parsedJson.follower?.slice(2, 6) || ''}`,
                userAddress: parsedJson.follower || '',
                action: 'started following you',
                time: formatNotificationTime(timestamp),
                timestamp_ms: timestamp,
              });
            }
          })
        );

        // Fetch MentionAdded events where the current user was mentioned
        const mentionEvents = await suiClient.queryEvents({
          query: {
            MoveEventType: `${PACKAGE_ID}::suitter::MentionAdded`,
          },
          limit: 100,
          order: 'descending',
        });

        mentionEvents.data.forEach((event) => {
          const parsedJson = event.parsedJson as any;
          if (parsedJson?.mentioned_user?.toLowerCase() === userAddress.toLowerCase()) {
            // Get timestamp from transaction
            let timestamp = Date.now();
            try {
              // Try to get timestamp from event or use current time
              timestamp = Date.now();
            } catch (error) {
              console.error('Error getting mention timestamp:', error);
            }

            const contentType = parsedJson?.content_type || 0; // 0 = suit, 1 = comment
            const contentId = parsedJson?.content_id;
            
            // Find the suit or comment content
            let content = '';
            if (contentType === 0) {
              // It's a suit mention
              const suit = suits?.find((s) => s.id.toLowerCase() === contentId?.toLowerCase());
              content = suit?.content || '';
            } else {
              // It's a comment mention - we'd need to fetch the comment
              content = 'a comment';
            }

            notifications.push({
              type: 'mention',
              user: `User${parsedJson.mentioner?.slice(2, 6) || ''}`,
              userAddress: parsedJson.mentioner || '',
              action: contentType === 0 ? 'mentioned you in a Suit' : 'mentioned you in a comment',
              time: formatNotificationTime(timestamp),
              timestamp_ms: timestamp,
              suit_id: contentType === 0 ? contentId : undefined,
              comment_id: contentType === 1 ? contentId : undefined,
              content: content,
            });
          }
        });

        // Sort notifications by timestamp (newest first)
        return notifications.sort((a, b) => b.timestamp_ms - a.timestamp_ms);
      } catch (error) {
        console.error('Error fetching notifications:', error);
        return [];
      }
    },
    enabled: !!userAddress && !!suits,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

// Helper function to format notification time
function formatNotificationTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  if (days === 1) return '1d';
  return `${days}d`;
}

// Hook to get reposts by a specific user
export function useRepostsByUser(userAddress: string | null) {
  const suiClient = useSuiClient();

  return useQuery({
    queryKey: ['reposts', userAddress],
    queryFn: async () => {
      if (!userAddress) return [];

      try {
        // Query RepostAdded events filtered by reposter
        const events = await suiClient.queryEvents({
          query: {
            MoveEventType: `${PACKAGE_ID}::suitter::RepostAdded`,
          },
          limit: 100,
          order: 'descending',
        });

        // Filter events by reposter address
        const userRepostEvents = events.data.filter((event) => {
          const parsedJson = event.parsedJson as any;
          return parsedJson?.reposter === userAddress;
        });

        // Extract repost IDs and suit IDs
        // Events are already sorted by descending order, so earlier indices are newer
        const repostData = userRepostEvents.map((event, index) => {
          const parsedJson = event.parsedJson as any;
          // Use index to determine order (0 = newest) since events are already sorted
          // We'll use Date.now() - index as a proxy for timestamp (newer events have lower indices)
          return {
            repost_id: parsedJson?.repost_id,
            suit_id: parsedJson?.suit_id,
            original_author: parsedJson?.original_author,
            timestamp_ms: Date.now() - index * 1000, // Use index to maintain order
            txDigest: event.id?.txDigest || '',
          };
        });

        // Fetch all reposted suits
        const suitIds = repostData.map((r) => r.suit_id).filter((id): id is string => !!id);
        
        if (suitIds.length === 0) return [];

        const objects = await suiClient.multiGetObjects({
          ids: suitIds,
          options: {
            showContent: true,
            showType: true,
          },
        });

        // Map suits with repost metadata
        return objects
          .map((obj, index) => {
            if (!obj.data) return null;
            const content = obj.data.content as any;
            if (!content || !content.fields) return null;

            const repostInfo = repostData[index];
            return {
              suit: {
                id: obj.data.objectId,
                author: content.fields.author || '',
                content: content.fields.content || '',
                timestamp_ms: Number(content.fields.timestamp_ms || 0),
                likes_count: Number(content.fields.likes_count || 0),
                comments_count: Number(content.fields.comments_count || 0),
                reposts_count: Number(content.fields.reposts_count || 0),
                walrus_blob_id: extractOptionString(content.fields.walrus_blob_id),
              } as Suit,
              repost_id: repostInfo?.repost_id || '',
              repost_timestamp_ms: repostInfo?.timestamp_ms || Date.now(),
              original_author: repostInfo?.original_author || '',
              txDigest: repostInfo?.txDigest || '',
            };
          })
          .filter((item): item is { suit: Suit; repost_id: string; repost_timestamp_ms: number; original_author: string; txDigest: string } => item !== null)
          .sort((a, b) => b.repost_timestamp_ms - a.repost_timestamp_ms); // Sort by repost time (newest first)
      } catch (error) {
        console.error('Error fetching reposts by user:', error);
        return [];
      }
    },
    enabled: !!userAddress,
    refetchInterval: 10000,
  });
}

// Hook to create a Community
export function useCreateCommunity() {
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      name, 
      handle, 
      description, 
      privacy, 
      thumbnailBlobId, 
      coverBlobId 
    }: { 
      name: string; 
      handle: string; 
      description: string; 
      privacy: 'public' | 'members';
      thumbnailBlobId?: string;
      coverBlobId?: string;
    }) => {
      return new Promise((resolve, reject) => {
        const tx = new Transaction();
        
        // Convert privacy to u8: 0 = public, 1 = members
        const privacyValue = privacy === 'public' ? 0 : 1;

        // Try to call create_community function
        // If the function doesn't exist, it will fail gracefully
        try {
          if (thumbnailBlobId || coverBlobId) {
            // Create community with media
            tx.moveCall({
              target: `${PACKAGE_ID}::community::create_community_with_media`,
              arguments: [
                tx.object(GLOBAL_REGISTRY_ID),
                tx.object(COMMUNITY_REGISTRY_ID),
                tx.pure.string(name),
                tx.pure.string(handle),
                tx.pure.string(description),
                tx.pure.u8(privacyValue),
                tx.pure.string(thumbnailBlobId || ''),
                tx.pure.string(coverBlobId || ''),
                tx.object('0x6'), // Clock object
              ],
            });
          } else {
            // Create community without media
            tx.moveCall({
              target: `${PACKAGE_ID}::community::create_community`,
              arguments: [
                tx.object(GLOBAL_REGISTRY_ID),
                tx.object(COMMUNITY_REGISTRY_ID),
                tx.pure.string(name),
                tx.pure.string(handle),
                tx.pure.string(description),
                tx.pure.u8(privacyValue),
                tx.object('0x6'), // Clock object
              ],
            });
          }
        } catch (error) {
          // If the module doesn't exist, provide a helpful error
          reject(new Error('Community module not found. Please ensure the community contract is deployed.'));
          return;
        }

        signAndExecute(
          { transaction: tx },
          {
            onSuccess: (result) => {
              resolve(result);
            },
            onError: (error) => {
              reject(error);
            },
          }
        );
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communities'] });
    },
  });
}

// Hook to get all Communities
export function useCommunities() {
  const suiClient = useSuiClient();

  return useQuery({
    queryKey: ['communities'],
    queryFn: async () => {
      try {
        console.log('Fetching communities with PACKAGE_ID:', PACKAGE_ID);
        
        // Query for CommunityCreated events to find all communities

        // Fallback: Try querying for CommunityCreated events
        // The event is emitted from suitter module, not community module
        let events;
        try {
          events = await suiClient.queryEvents({
            query: {
              MoveEventType: `${PACKAGE_ID}::suitter::CommunityCreated`,
            },
            limit: 100,
            order: 'descending',
          });
          console.log('Events found by MoveEventType (suitter::CommunityCreated):', events.data.length);
        } catch (eventError) {
          console.warn('Query by MoveEventType (suitter::CommunityCreated) failed, trying MoveModule:', eventError);
          // Fallback: Try querying by MoveModule
          try {
            events = await suiClient.queryEvents({
              query: {
                MoveModule: {
                  package: PACKAGE_ID,
                  module: 'suitter',
                },
              },
              limit: 100,
              order: 'descending',
            });
            console.log('Events found by MoveModule (suitter):', events.data.length);
            // Filter for CommunityCreated events only
            if (events.data.length > 0) {
              const communityCreatedEvents = events.data.filter((e: any) => 
                e.type?.includes('CommunityCreated')
              );
              console.log('Filtered CommunityCreated events from module query:', communityCreatedEvents.length);
              events.data = communityCreatedEvents;
            }
          } catch (moduleError) {
            console.warn('Query by MoveModule (suitter) failed:', moduleError);
            return [];
          }
        }

        // If we got events, extract community IDs and fetch objects
        if (events && events.data.length > 0) {
          console.log('Raw events:', events.data);

          // Extract community IDs from events
          const communityIds = events.data
            .map((event) => {
              const parsedJson = event.parsedJson as any;
              let communityId = parsedJson?.community_id || 
                              parsedJson?.communityId || 
                              parsedJson?.id;
              
              if (typeof communityId === 'object' && communityId !== null) {
                communityId = communityId.id || communityId.value || communityId;
              }
              
              if (communityId && typeof communityId !== 'string') {
                communityId = String(communityId);
              }
              
              return communityId;
            })
            .filter((id): id is string => !!id && typeof id === 'string' && id.length > 0);

          console.log('Extracted community IDs from events:', communityIds);

          if (communityIds.length === 0) {
            console.log('No community IDs extracted from events');
            return [];
          }

          // Batch fetch all Community objects
          const objects = await suiClient.multiGetObjects({
            ids: communityIds,
            options: {
              showContent: true,
              showType: true,
            },
          });

          console.log('Fetched community objects from events:', objects.length);

          const communities = objects
            .map((obj: any, index: number) => {
              if (!obj.data) {
                console.warn(`Community object ${communityIds[index]} has no data`);
                return null;
              }
              const content = obj.data.content as any;
              if (!content || !content.fields) {
                console.warn(`Community object ${communityIds[index]} has no content fields`);
                return null;
              }

              return {
                id: obj.data.objectId,
                name: content.fields.name || '',
                handle: content.fields.handle || '',
                description: content.fields.description || '',
                creator: content.fields.creator || '',
                privacy: (content.fields.privacy === 0 || content.fields.privacy === 'public') ? 'public' : 'members',
                members_count: Number(content.fields.members_count || 0),
                thumbnail_blob_id: extractOptionString(content.fields.thumbnail_blob_id, 'thumbnail_blob_id'),
                cover_blob_id: extractOptionString(content.fields.cover_blob_id, 'cover_blob_id'),
                created_at_ms: Number(content.fields.created_at_ms || 0),
              } as Community;
            })
              .filter((community: any): community is Community => community !== null)
              .sort((a: Community, b: Community) => b.created_at_ms - a.created_at_ms);

          console.log('Final communities array from events:', communities);
          return communities;
        }

        console.log('No communities found');
        return [];
      } catch (error) {
        console.error('Error fetching communities:', error);
        return [];
      }
    },
    refetchInterval: 10000, // Refetch every 10 seconds
    retry: 3, // Retry failed requests
  });
}

// Hook to join a community
export function useJoinCommunity() {
  const suiClient = useSuiClient();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ communityId }: { communityId: string; membersId?: string }) => {
      // Find the CommunityMembers object for this community
      // We'll query for CommunityCreated events to find the transaction that created this community
      // Then we'll look for CommunityMembers objects created in that transaction
      let membersId: string | null = null;
      
      try {
        // First, try to find the transaction that created this community
        const events = await suiClient.queryEvents({
          query: {
            MoveEventType: `${PACKAGE_ID}::suitter::CommunityCreated`,
          },
          limit: 100,
          order: 'descending',
        });

        // Find the event for this specific community
        const communityEvent = events.data.find((event: any) => {
          const parsedJson = event.parsedJson as any;
          return parsedJson?.community_id === communityId;
        });

        if (communityEvent) {
          // Get the transaction that created the community
          const tx = await suiClient.getTransactionBlock({
            digest: communityEvent.id.txDigest,
            options: {
              showEffects: true,
              showObjectChanges: true,
            },
          });

          // Find the CommunityMembers object created in this transaction
          if (tx.objectChanges) {
            const membersObject = tx.objectChanges.find((change: any) => {
              return change.type === 'created' && 
                     change.objectType === `${PACKAGE_ID}::community::CommunityMembers`;
            }) as any;
            
            if (membersObject && 'objectId' in membersObject) {
              membersId = membersObject.objectId;
            }
          }
        }

        // Fallback: Try to find CommunityMembers via events if we couldn't find it via transaction
        if (!membersId) {
          // Try to get the community object and find related members
          try {
            await suiClient.getObject({
              id: communityId,
              options: {
                showContent: true,
                showType: true,
              },
            });
            // Note: In a real implementation, you might need to store the members ID in the community
            // For now, we'll rely on finding it via transaction history
          } catch (err) {
            console.warn('Could not fetch community object:', err);
          }
        }
      } catch (error) {
        console.warn('Could not find CommunityMembers object:', error);
      }

      return new Promise((resolve, reject) => {
        const tx = new Transaction();
        
        if (!membersId) {
          reject(new Error('Could not find community members object. The community may need to be recreated with the latest contract version.'));
          return;
        }

        tx.moveCall({
          target: `${PACKAGE_ID}::community::join_community`,
          arguments: [
            tx.object(communityId),
            tx.object(membersId),
            tx.object('0x6'), // Clock object
          ],
        });

        signAndExecute(
          { transaction: tx },
          {
            onSuccess: (result) => {
              resolve(result);
            },
            onError: (error) => {
              reject(error);
            },
          }
        );
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communities'] });
      queryClient.invalidateQueries({ queryKey: ['community'] });
      queryClient.invalidateQueries({ queryKey: ['is-community-member'] });
    },
  });
}

// Hook to get a specific community
export function useCommunity(communityId: string | null) {
  const suiClient = useSuiClient();

  return useQuery({
    queryKey: ['community', communityId],
    queryFn: async () => {
      if (!communityId) return null;

      try {
        const object = await suiClient.getObject({
          id: communityId,
          options: {
            showContent: true,
            showType: true,
          },
        });

        if (!object.data) return null;
        const content = object.data.content as any;
        if (!content || !content.fields) return null;

        return {
          id: object.data.objectId,
          name: content.fields.name || '',
          handle: content.fields.handle || '',
          description: content.fields.description || '',
          creator: content.fields.creator || '',
          privacy: (content.fields.privacy === 0 || content.fields.privacy === 'public') ? 'public' : 'members',
          members_count: Number(content.fields.members_count || 0),
          thumbnail_blob_id: extractOptionString(content.fields.thumbnail_blob_id, 'thumbnail_blob_id'),
          cover_blob_id: extractOptionString(content.fields.cover_blob_id, 'cover_blob_id'),
          created_at_ms: Number(content.fields.created_at_ms || 0),
        } as Community;
      } catch (error) {
        console.error('Error fetching community:', error);
        return null;
      }
    },
    enabled: !!communityId,
  });
}

// Hook to check if user is a member of a community
export function useIsCommunityMember(communityId: string | null, userAddress: string | null) {
  const suiClient = useSuiClient();

  return useQuery({
    queryKey: ['is-community-member', communityId, userAddress],
    queryFn: async () => {
      if (!communityId || !userAddress) return false;

      try {
        // Query for CommunityMembership objects owned by the user
        const objects = await suiClient.getOwnedObjects({
          owner: userAddress,
          filter: {
            StructType: `${PACKAGE_ID}::community::CommunityMembership`,
          },
          options: {
            showContent: true,
            showType: true,
          },
        });

        // Check if any membership is for this community
        return objects.data.some((obj) => {
          if (!obj.data) return false;
          const content = obj.data.content as any;
          if (!content || !content.fields) return false;
          return content.fields.community_id === communityId;
        });
      } catch (error) {
        console.error('Error checking community membership:', error);
        return false;
      }
    },
    enabled: !!communityId && !!userAddress,
    refetchInterval: 10000,
  });
}

// Hook to create a post in a community
export function useCreateCommunityPost() {
  const suiClient = useSuiClient();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      communityId, 
      membersId, 
      content, 
      walrusBlobId 
    }: { 
      communityId: string; 
      membersId?: string; 
      content: string; 
      walrusBlobId?: string;
    }) => {
      // Find the CommunityMembers object
      let finalMembersId: string | null = membersId || null;
      
      if (!finalMembersId) {
        try {
          const events = await suiClient.queryEvents({
            query: {
              MoveEventType: `${PACKAGE_ID}::suitter::CommunityCreated`,
            },
            limit: 100,
            order: 'descending',
          });

          const communityEvent = events.data.find((event: any) => {
            const parsedJson = event.parsedJson as any;
            return parsedJson?.community_id === communityId;
          });

          if (communityEvent) {
            const tx = await suiClient.getTransactionBlock({
              digest: communityEvent.id.txDigest,
              options: {
                showEffects: true,
                showObjectChanges: true,
              },
            });

            if (tx.objectChanges) {
              const membersObject = tx.objectChanges.find((change: any) => {
                return change.type === 'created' && 
                       change.objectType === `${PACKAGE_ID}::community::CommunityMembers`;
              }) as any;
              
              if (membersObject && 'objectId' in membersObject) {
                finalMembersId = membersObject.objectId;
              }
            }
          }

          if (!finalMembersId) {
            // Try to get the community object and find related members
            try {
              await suiClient.getObject({
                id: communityId,
                options: {
                  showContent: true,
                  showType: true,
                },
              });
              // Note: In a real implementation, you might need to store the members ID in the community
              // For now, we'll rely on finding it via transaction history
            } catch (err) {
              console.warn('Could not fetch community object:', err);
            }
          }
        } catch (error) {
          console.warn('Could not find CommunityMembers object:', error);
        }
      }

      return new Promise((resolve, reject) => {
        if (!finalMembersId) {
          reject(new Error('Could not find community members object. Please ensure you are a member of this community.'));
          return;
        }

        const tx = new Transaction();

        if (walrusBlobId) {
          tx.moveCall({
            target: `${PACKAGE_ID}::community::create_community_post_with_media`,
            arguments: [
              tx.object(GLOBAL_REGISTRY_ID),
              tx.object(communityId),
              tx.object(finalMembersId),
              tx.pure.string(content),
              tx.pure.string(walrusBlobId),
              tx.object('0x6'), // Clock object
            ],
          });
        } else {
          tx.moveCall({
            target: `${PACKAGE_ID}::community::create_community_post`,
            arguments: [
              tx.object(GLOBAL_REGISTRY_ID),
              tx.object(communityId),
              tx.object(finalMembersId),
              tx.pure.string(content),
              tx.object('0x6'), // Clock object
            ],
          });
        }

        signAndExecute(
          { transaction: tx },
          {
            onSuccess: (result) => {
              resolve(result);
            },
            onError: (error) => {
              reject(error);
            },
          }
        );
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-posts'] });
      queryClient.invalidateQueries({ queryKey: ['suits'] });
    },
  });
}

// Hook to fetch posts for a specific community
export function useCommunityPosts(communityId: string | null) {
  const suiClient = useSuiClient();

  return useQuery({
    queryKey: ['community-posts', communityId],
    queryFn: async () => {
      if (!communityId) return [];

      try {
        // Query for CommunityPostCreated events for this community
        const events = await suiClient.queryEvents({
          query: {
            MoveEventType: `${PACKAGE_ID}::suitter::CommunityPostCreated`,
          },
          limit: 100,
          order: 'descending',
        });

        // Filter events for this community
        const communityPostEvents = events.data.filter((event: any) => {
          const parsedJson = event.parsedJson as any;
          return parsedJson?.community_id === communityId;
        });

        // Extract suit IDs from events
        const suitIds = communityPostEvents
          .map((event) => {
            const parsedJson = event.parsedJson as any;
            return parsedJson?.suit_id || parsedJson?.suitId;
          })
          .filter((id): id is string => !!id && typeof id === 'string');

        if (suitIds.length === 0) return [];

        // Fetch all suits
        const objects = await suiClient.multiGetObjects({
          ids: suitIds,
          options: {
            showContent: true,
            showType: true,
          },
        });

        return objects
          .map((obj) => {
            if (!obj.data) return null;
            const content = obj.data.content as any;
            if (!content || !content.fields) return null;

            return {
              id: obj.data.objectId,
              author: content.fields.author || '',
              content: content.fields.content || '',
              timestamp_ms: Number(content.fields.timestamp_ms || 0),
              likes_count: Number(content.fields.likes_count || 0),
              comments_count: Number(content.fields.comments_count || 0),
              reposts_count: Number(content.fields.reposts_count || 0),
              walrus_blob_id: extractOptionString(content.fields.walrus_blob_id, 'walrus_blob_id'),
            } as Suit;
          })
          .filter((suit): suit is Suit => suit !== null)
          .sort((a, b) => b.timestamp_ms - a.timestamp_ms); // Sort by newest first
      } catch (error) {
        console.error('Error fetching community posts:', error);
        return [];
      }
    },
    enabled: !!communityId,
    refetchInterval: 10000,
  });
}

// Export constants for use in other files
export {
  PACKAGE_ID,
  GLOBAL_REGISTRY_ID,
  PROFILE_REGISTRY_ID,
  LIKE_REGISTRY_ID,
  REPOST_REGISTRY_ID,
  MENTION_REGISTRY_ID,
  FOLLOW_REGISTRY_ID,
  CONVERSATION_REGISTRY_ID,
  COMMUNITY_REGISTRY_ID,
};

