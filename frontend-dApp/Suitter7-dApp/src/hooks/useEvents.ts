import { useSuiClient } from '@mysten/dapp-kit';
import { useQuery } from '@tanstack/react-query';

const PACKAGE_ID = import.meta.env.VITE_PACKAGE_ID || '0x2039f72d58be7166b210e54145ecff010ea50ddca6043db743ea8a25e7542d39';

// Hook to query SuitCreated events
export function useSuitCreatedEvents(limit: number = 100) {
  const suiClient = useSuiClient();

  return useQuery({
    queryKey: ['suit-created-events', limit],
    queryFn: async () => {
      const events = await suiClient.queryEvents({
        query: {
          MoveModule: {
            package: PACKAGE_ID,
            module: 'suitter',
          },
          MoveEventType: `${PACKAGE_ID}::suitter::SuitCreated`,
        },
        limit,
        order: 'descending',
      });

      return events.data.map((event) => {
        const parsedJson = event.parsedJson as any;
        return {
          suit_id: parsedJson?.suit_id,
          author: parsedJson?.author,
          timestamp: parsedJson?.timestamp,
          txDigest: event.id.txDigest,
        };
      });
    },
    refetchInterval: 10000,
  });
}

// Hook to query LikeAdded events
export function useLikeAddedEvents(suitId?: string, limit: number = 50) {
  const suiClient = useSuiClient();

  return useQuery({
    queryKey: ['like-added-events', suitId, limit],
    queryFn: async () => {
      let events;
      try {
        // Try querying by MoveEventType first (more specific)
        events = await suiClient.queryEvents({
          query: {
            MoveEventType: `${PACKAGE_ID}::suitter::LikeAdded`,
          },
          limit,
          order: 'descending',
        });
      } catch (eventTypeError) {
        // Fallback to MoveModule query
        events = await suiClient.queryEvents({
          query: {
            MoveModule: {
              package: PACKAGE_ID,
              module: 'suitter',
            },
          },
          limit,
          order: 'descending',
        });
        // Filter for LikeAdded events only
        if (events.data.length > 0) {
          const likeEvents = events.data.filter((e: any) => 
            e.type?.includes('LikeAdded') || 
            e.type?.includes('suitter::LikeAdded')
          );
          events.data = likeEvents;
        }
      }

      // Filter by suit_id if provided
      const filteredEvents = suitId
        ? events.data.filter((event) => {
            const parsedJson = event.parsedJson as any;
            return parsedJson?.suit_id === suitId;
          })
        : events.data;

      return filteredEvents.map((event) => {
        const parsedJson = event.parsedJson as any;
        return {
          suit_id: parsedJson?.suit_id,
          liker: parsedJson?.liker,
          txDigest: event.id.txDigest,
        };
      });
    },
    enabled: true,
    refetchInterval: 10000,
  });
}

// Hook to query CommentAdded events
export function useCommentAddedEvents(suitId?: string, limit: number = 50) {
  const suiClient = useSuiClient();

  return useQuery({
    queryKey: ['comment-added-events', suitId, limit],
    queryFn: async () => {
      const events = await suiClient.queryEvents({
        query: {
          MoveModule: {
            package: PACKAGE_ID,
            module: 'suitter',
          },
          MoveEventType: `${PACKAGE_ID}::suitter::CommentAdded`,
        },
        limit,
        order: 'descending',
      });

      // Filter by suit_id if provided
      const filteredEvents = suitId
        ? events.data.filter((event) => {
            const parsedJson = event.parsedJson as any;
            return parsedJson?.suit_id === suitId;
          })
        : events.data;

      return filteredEvents.map((event) => {
        const parsedJson = event.parsedJson as any;
        return {
          suit_id: parsedJson?.suit_id,
          comment_id: parsedJson?.comment_id,
          author: parsedJson?.author,
          txDigest: event.id.txDigest,
        };
      });
    },
    enabled: true,
    refetchInterval: 10000,
  });
}

// Hook to query RepostAdded events
export function useRepostAddedEvents(suitId?: string, limit: number = 50) {
  const suiClient = useSuiClient();

  return useQuery({
    queryKey: ['repost-added-events', suitId, limit],
    queryFn: async () => {
      const events = await suiClient.queryEvents({
        query: {
          MoveModule: {
            package: PACKAGE_ID,
            module: 'suitter',
          },
          MoveEventType: `${PACKAGE_ID}::suitter::RepostAdded`,
        },
        limit,
        order: 'descending',
      });

      // Filter by suit_id if provided
      const filteredEvents = suitId
        ? events.data.filter((event) => {
            const parsedJson = event.parsedJson as any;
            return parsedJson?.suit_id === suitId;
          })
        : events.data;

      return filteredEvents.map((event) => {
        const parsedJson = event.parsedJson as any;
        return {
          suit_id: parsedJson?.suit_id,
          repost_id: parsedJson?.repost_id,
          reposter: parsedJson?.reposter,
          original_author: parsedJson?.original_author,
          txDigest: event.id.txDigest,
        };
      });
    },
    enabled: true,
    refetchInterval: 10000,
  });
}

// Hook to query UserFollowed events
export function useUserFollowedEvents(follower?: string, limit: number = 50) {
  const suiClient = useSuiClient();

  return useQuery({
    queryKey: ['user-followed-events', follower, limit],
    queryFn: async () => {
      const events = await suiClient.queryEvents({
        query: {
          MoveModule: {
            package: PACKAGE_ID,
            module: 'suitter',
          },
          MoveEventType: `${PACKAGE_ID}::suitter::UserFollowed`,
        },
        limit,
        order: 'descending',
      });

      // Filter by follower if provided
      const filteredEvents = follower
        ? events.data.filter((event) => {
            const parsedJson = event.parsedJson as any;
            return parsedJson?.follower === follower;
          })
        : events.data;

      return filteredEvents.map((event) => {
        const parsedJson = event.parsedJson as any;
        return {
          follower: parsedJson?.follower,
          followee: parsedJson?.followee,
          txDigest: event.id.txDigest,
        };
      });
    },
    enabled: true,
    refetchInterval: 10000,
  });
}

// Hook to query MentionAdded events
export function useMentionAddedEvents(contentId?: string, mentionedUser?: string, limit: number = 50) {
  const suiClient = useSuiClient();

  return useQuery({
    queryKey: ['mention-added-events', contentId, mentionedUser, limit],
    queryFn: async () => {
      const events = await suiClient.queryEvents({
        query: {
          MoveModule: {
            package: PACKAGE_ID,
            module: 'suitter',
          },
          MoveEventType: `${PACKAGE_ID}::suitter::MentionAdded`,
        },
        limit,
        order: 'descending',
      });

      // Filter by contentId or mentionedUser if provided
      let filteredEvents = events.data;
      if (contentId) {
        filteredEvents = filteredEvents.filter((event) => {
          const parsedJson = event.parsedJson as any;
          return parsedJson?.content_id === contentId;
        });
      }
      if (mentionedUser) {
        filteredEvents = filteredEvents.filter((event) => {
          const parsedJson = event.parsedJson as any;
          return parsedJson?.mentioned_user?.toLowerCase() === mentionedUser.toLowerCase();
        });
      }

      return filteredEvents.map((event) => {
        const parsedJson = event.parsedJson as any;
        return {
          content_id: parsedJson?.content_id,
          mention_id: parsedJson?.mention_id,
          mentioner: parsedJson?.mentioner,
          mentioned_user: parsedJson?.mentioned_user,
          content_type: parsedJson?.content_type, // 0 = suit, 1 = comment
          txDigest: event.id.txDigest,
        };
      });
    },
    enabled: true,
    refetchInterval: 10000,
  });
}

