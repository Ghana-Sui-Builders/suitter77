import { useSuiClient, useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// Contract package ID - should be set after deployment
const PACKAGE_ID = import.meta.env.VITE_PACKAGE_ID || '0xc9b9f6d8d275a0860d4433bef712cb3ec28f0b014064e56b13931071661ff99c';
const GLOBAL_REGISTRY_ID = import.meta.env.VITE_GLOBAL_REGISTRY_ID || '0x4b016278d762407abd1fa5bfd767bd54ce570ab45493a37500d2578bd82952ae';
const PROFILE_REGISTRY_ID = import.meta.env.VITE_PROFILE_REGISTRY_ID || '0x296158c332bef3f992f3e35421fcce972bd8b86bd04c14d98f2389b5b46678f0';
const LIKE_REGISTRY_ID = import.meta.env.VITE_LIKE_REGISTRY_ID || '0xa85e6acefe0667788969e315d4d277fa109f623d5c0fa149e64563f4fd4a14e3';
const REPOST_REGISTRY_ID = import.meta.env.VITE_REPOST_REGISTRY_ID || '0x2400c5dc5cf79d303cbe727b2dc767591d029366f1a39718dee0c3244f5e068e';
const FOLLOW_REGISTRY_ID = import.meta.env.VITE_FOLLOW_REGISTRY_ID || '0xb9aa873b8541586c98d7a853db9503e995e4d6dce358b9031faf651381856345';

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
              walrus_blob_id: content.fields.walrus_blob_id?.fields?.[0] || undefined,
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
          profile_image_blob_id: content.fields.profile_image_blob_id?.fields?.[0] || undefined,
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

// Hook to create a profile
export function useCreateProfile() {
  const account = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ username, bio }: { username: string; bio: string }) => {
      return new Promise((resolve, reject) => {
        const tx = new Transaction();
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
            onSuccess: resolve,
            onError: reject,
          }
        );
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
    },
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
              profile_image_blob_id: content.fields.profile_image_blob_id?.fields?.[0] || undefined,
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

        // Find mentions in all suits
        if (suits && suits.length > 0) {
          const userAddressShort = userAddress.slice(0, 6);
          suits.forEach((suit) => {
            // Check if suit content mentions the user (simple check for now)
            // In a real implementation, you'd parse @mentions properly
            if (
              suit.content.toLowerCase().includes(`@${userAddressShort.toLowerCase()}`) ||
              suit.content.toLowerCase().includes(userAddress.slice(-6).toLowerCase())
            ) {
              if (suit.author.toLowerCase() !== userAddress.toLowerCase()) {
                notifications.push({
                  type: 'mention',
                  user: `User${suit.author?.slice(2, 6) || ''}`,
                  userAddress: suit.author || '',
                  action: 'mentioned you',
                  time: formatNotificationTime(suit.timestamp_ms),
                  timestamp_ms: suit.timestamp_ms,
                  suit_id: suit.id,
                  content: suit.content,
                });
              }
            }
          });
        }

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
                walrus_blob_id: content.fields.walrus_blob_id?.fields?.[0] || undefined,
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

