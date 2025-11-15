import { useSuiClient } from '@mysten/dapp-kit';
import { useMentionUserInSuit, useMentionUserInComment } from './useContract';
import { extractMentions } from '../utils/mentions';
import { useQuery } from '@tanstack/react-query';

const PACKAGE_ID = import.meta.env.VITE_PACKAGE_ID || '0x2039f72d58be7166b210e54145ecff010ea50ddca6043db743ea8a25e7542d39';

/**
 * Hook to process mentions in content and create mention transactions
 * This should be called after a suit or comment is successfully created
 */
export function useProcessMentions() {
  const suiClient = useSuiClient();
  const mentionUserInSuit = useMentionUserInSuit();
  const mentionUserInComment = useMentionUserInComment();

  /**
   * Process mentions in suit content and create mention transactions
   */
  const processSuitMentions = async (suitId: string, content: string) => {
    const mentions = extractMentions(content);
    if (mentions.length === 0) return;

    // Resolve usernames to addresses
    const mentionPromises = mentions.map(async (mention) => {
      // If it's already an address, use it
      if (mention.startsWith('0x') && mention.length >= 10) {
        return mention;
      }

      // Try to resolve username to address via ProfileCreated events
      try {
        const events = await suiClient.queryEvents({
          query: {
            MoveEventType: `${PACKAGE_ID}::suitter::ProfileCreated`,
          },
          limit: 1000,
          order: 'descending',
        });

        const profileEvent = events.data.find((event: any) => {
          const parsedJson = event.parsedJson as any;
          return parsedJson?.username?.toLowerCase() === mention.toLowerCase();
        });

        if (profileEvent) {
          const parsedJson = profileEvent.parsedJson as any;
          return parsedJson?.owner || null;
        }
      } catch (error) {
        console.error(`Error resolving mention ${mention}:`, error);
      }

      return null;
    });

    const resolvedAddresses = await Promise.all(mentionPromises);
    
    // Create mention transactions for each resolved address
    const mentionTxPromises = resolvedAddresses
      .filter((address): address is string => address !== null)
      .map((address) => {
        return mentionUserInSuit.mutateAsync({
          suitId,
          mentionedUserAddress: address,
        }).catch((error) => {
          console.error(`Failed to mention user ${address}:`, error);
          // Don't throw - continue with other mentions
        });
      });

    await Promise.all(mentionTxPromises);
  };

  /**
   * Process mentions in comment content and create mention transactions
   */
  const processCommentMentions = async (commentId: string, content: string) => {
    const mentions = extractMentions(content);
    if (mentions.length === 0) return;

    // Resolve usernames to addresses
    const mentionPromises = mentions.map(async (mention) => {
      // If it's already an address, use it
      if (mention.startsWith('0x') && mention.length >= 10) {
        return mention;
      }

      // Try to resolve username to address via ProfileCreated events
      try {
        const events = await suiClient.queryEvents({
          query: {
            MoveEventType: `${PACKAGE_ID}::suitter::ProfileCreated`,
          },
          limit: 1000,
          order: 'descending',
        });

        const profileEvent = events.data.find((event: any) => {
          const parsedJson = event.parsedJson as any;
          return parsedJson?.username?.toLowerCase() === mention.toLowerCase();
        });

        if (profileEvent) {
          const parsedJson = profileEvent.parsedJson as any;
          return parsedJson?.owner || null;
        }
      } catch (error) {
        console.error(`Error resolving mention ${mention}:`, error);
      }

      return null;
    });

    const resolvedAddresses = await Promise.all(mentionPromises);
    
    // Create mention transactions for each resolved address
    const mentionTxPromises = resolvedAddresses
      .filter((address): address is string => address !== null)
      .map((address) => {
        return mentionUserInComment.mutateAsync({
          commentId,
          mentionedUserAddress: address,
        }).catch((error) => {
          console.error(`Failed to mention user ${address}:`, error);
          // Don't throw - continue with other mentions
        });
      });

    await Promise.all(mentionTxPromises);
  };

  return {
    processSuitMentions,
    processCommentMentions,
    isProcessing: mentionUserInSuit.isPending || mentionUserInComment.isPending,
  };
}

/**
 * Hook to get all profiles for username resolution
 */
export function useAllProfilesForMentions() {
  const suiClient = useSuiClient();

  return useQuery({
    queryKey: ['all-profiles-for-mentions'],
    queryFn: async () => {
      try {
        const events = await suiClient.queryEvents({
          query: {
            MoveEventType: `${PACKAGE_ID}::suitter::ProfileCreated`,
          },
          limit: 1000,
          order: 'descending',
        });

        const profileMap = new Map<string, string>(); // username -> address

        events.data.forEach((event: any) => {
          const parsedJson = event.parsedJson as any;
          if (parsedJson?.username && parsedJson?.owner) {
            profileMap.set(parsedJson.username.toLowerCase(), parsedJson.owner);
          }
        });

        return profileMap;
      } catch (error) {
        console.error('Error fetching profiles for mentions:', error);
        return new Map<string, string>();
      }
    },
    refetchInterval: 60000, // Refetch every minute
  });
}

