import { useSuiClient } from '@mysten/dapp-kit';
import { useQuery } from '@tanstack/react-query';

const PACKAGE_ID = import.meta.env.VITE_PACKAGE_ID || '0x2039f72d58be7166b210e54145ecff010ea50ddca6043db743ea8a25e7542d39';
const PROFILE_REGISTRY_ID = import.meta.env.VITE_PROFILE_REGISTRY_ID || '0x5e34d722ad42643d57384069050e3520546b7dbb14f9fe3c458dec1d2fd02405';

/**
 * Extract mentions from text (e.g., "@username" or "@0x1234...")
 * Returns an array of unique mentions found in the text
 */
export function extractMentions(text: string): string[] {
  if (!text) return [];
  
  // Match @username or @address patterns
  const mentionRegex = /@([a-zA-Z0-9_]+|0x[a-fA-F0-9]+)/g;
  const matches = text.match(mentionRegex);
  
  if (!matches) return [];
  
  // Extract unique mentions (remove @ symbol)
  const mentions = matches.map(match => match.substring(1));
  return [...new Set(mentions)]; // Remove duplicates
}

/**
 * Resolve a username to an address using the ProfileRegistry
 */
export async function resolveUsernameToAddress(
  suiClient: any,
  username: string
): Promise<string | null> {
  try {
    // Remove @ if present
    const cleanUsername = username.startsWith('@') ? username.substring(1) : username;
    
    // Check if it's already an address
    if (cleanUsername.startsWith('0x') && cleanUsername.length >= 10) {
      return cleanUsername;
    }
    
    // Try to resolve username to address via ProfileRegistry
    const registry = await suiClient.getObject({
      id: PROFILE_REGISTRY_ID,
      options: {
        showContent: true,
      },
    });
    
    if (!registry.data?.content) return null;
    
    const content = registry.data.content as any;
    if (!content.fields) return null;
    
    // The ProfileRegistry has a username_to_profile table
    // We need to call the get_profile_by_username function
    // Since we can't call view functions directly, we'll need to query profiles differently
    // For now, return null and handle this in the component
    return null;
  } catch (error) {
    console.error('Error resolving username to address:', error);
    return null;
  }
}

/**
 * Resolve multiple usernames to addresses
 */
export async function resolveMentionsToAddresses(
  suiClient: any,
  mentions: string[]
): Promise<Map<string, string>> {
  const addressMap = new Map<string, string>();
  
  for (const mention of mentions) {
    // If it's already an address, use it directly
    if (mention.startsWith('0x') && mention.length >= 10) {
      addressMap.set(mention, mention);
      continue;
    }
    
    // Try to resolve username
    const address = await resolveUsernameToAddress(suiClient, mention);
    if (address) {
      addressMap.set(mention, address);
    }
  }
  
  return addressMap;
}

/**
 * Hook to get profile address by username
 */
export function useProfileByUsername(username: string | null) {
  const suiClient = useSuiClient();
  
  return useQuery({
    queryKey: ['profile-by-username', username],
    queryFn: async () => {
      if (!username) return null;
      
      const cleanUsername = username.startsWith('@') ? username.substring(1) : username;
      
      // Query all profiles and find by username
      // This is a workaround since we can't directly query the registry table
      try {
        const events = await suiClient.queryEvents({
          query: {
            MoveEventType: `${PACKAGE_ID}::suitter::ProfileCreated`,
          },
          limit: 1000,
          order: 'descending',
        });
        
        // Find profile with matching username
        const profileEvent = events.data.find((event: any) => {
          const parsedJson = event.parsedJson as any;
          return parsedJson?.username?.toLowerCase() === cleanUsername.toLowerCase();
        });
        
        if (profileEvent) {
          const parsedJson = profileEvent.parsedJson as any;
          return parsedJson?.owner || null;
        }
        
        return null;
      } catch (error) {
        console.error('Error fetching profile by username:', error);
        return null;
      }
    },
    enabled: !!username,
  });
}

