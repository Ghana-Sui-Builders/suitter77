import { useSuiClient } from '@mysten/dapp-kit';
import { useQuery } from '@tanstack/react-query';
import { Comment } from './useContract';

// Helper function to extract Option<String> from Sui object (same as in useContract.ts)
function extractOptionString(optionField: any): string | undefined {
  if (!optionField) return undefined;
  if (typeof optionField === 'string') return optionField || undefined;
  if (optionField.fields?.vec && Array.isArray(optionField.fields.vec) && optionField.fields.vec.length > 0) {
    return optionField.fields.vec[0] || undefined;
  }
  if (optionField.fields && Array.isArray(optionField.fields) && optionField.fields.length > 0) {
    return optionField.fields[0] || undefined;
  }
  if (optionField.vec && Array.isArray(optionField.vec) && optionField.vec.length > 0) {
    return optionField.vec[0] || undefined;
  }
  if (optionField.fields?.[0]) return optionField.fields[0] || undefined;
  return undefined;
}

const PACKAGE_ID = import.meta.env.VITE_PACKAGE_ID || '0x2039f72d58be7166b210e54145ecff010ea50ddca6043db743ea8a25e7542d39';

// Hook to get comments for a specific Suit
export function useComments(suitId: string | null) {
  const suiClient = useSuiClient();

  return useQuery({
    queryKey: ['comments', suitId],
    queryFn: async () => {
      if (!suitId) return [];

      try {
        // Query CommentAdded events for this suit
        // Note: We query all CommentAdded events and filter by suit_id in the response
        let events;
        try {
          // Try querying by MoveEventType first (more specific)
          events = await suiClient.queryEvents({
            query: {
              MoveEventType: `${PACKAGE_ID}::suitter::CommentAdded`,
            },
            limit: 100,
            order: 'descending',
          });
        } catch (eventTypeError) {
          // Fallback to MoveModule query
          console.warn('Query by MoveEventType failed, trying MoveModule:', eventTypeError);
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
          // Filter for CommentAdded events only
          if (events.data.length > 0) {
            const commentEvents = events.data.filter((e: any) => 
              e.type?.includes('CommentAdded') || 
              e.type?.includes('suitter::CommentAdded')
            );
            events.data = commentEvents;
          }
        }

        // Filter events by suit_id
        const filteredEvents = events.data.filter((event) => {
          const parsedJson = event.parsedJson as any;
          return parsedJson?.suit_id === suitId;
        });

        // Extract comment IDs from filtered events
        const commentIds = filteredEvents
          .map((event) => {
            const parsedJson = event.parsedJson as any;
            return parsedJson?.comment_id;
          })
          .filter((id): id is string => !!id);

        if (commentIds.length === 0) return [];

        // Batch fetch all Comment objects
        const objects = await suiClient.multiGetObjects({
          ids: commentIds,
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
              suit_id: content.fields.suit_id || suitId,
              author: content.fields.author || '',
              content: content.fields.content || '',
              timestamp_ms: Number(content.fields.timestamp_ms || 0),
              walrus_blob_id: extractOptionString(content.fields.walrus_blob_id),
            } as Comment;
          })
          .filter((comment): comment is Comment => comment !== null)
          .sort((a, b) => a.timestamp_ms - b.timestamp_ms); // Sort by oldest first
      } catch (error) {
        console.error('Error fetching comments:', error);
        return [];
      }
    },
    enabled: !!suitId,
    refetchInterval: 10000,
  });
}

