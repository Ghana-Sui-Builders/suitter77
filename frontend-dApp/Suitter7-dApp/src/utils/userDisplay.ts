import { Profile } from '../hooks/useContract';
import { WalrusService } from '../services/walrus';

const STORAGE_KEY_PREFIX = 'profile_metadata_';

/**
 * Get display name for a user address
 * Priority: displayName (from localStorage) > username (from profile) > address-based fallback
 */
export function getUserDisplayName(
  address: string | null | undefined,
  profile?: Profile | null
): string {
  if (!address) return 'Unknown User';

  // Try to get display name from localStorage
  try {
    const storageKey = `${STORAGE_KEY_PREFIX}${address}`;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const metadata = JSON.parse(stored) as { displayName?: string };
      if (metadata.displayName && metadata.displayName.trim()) {
        return metadata.displayName;
      }
    }
  } catch (error) {
    // Ignore localStorage errors
  }

  // Fallback to username from profile
  if (profile?.username) {
    return profile.username;
  }

  // Final fallback to address-based name
  return `User${address.slice(2, 6)}`;
}

/**
 * Get user handle (@username or @address)
 */
export function getUserHandle(
  address: string | null | undefined,
  profile?: Profile | null
): string {
  if (!address) return '@unknown';

  // Use username if available
  if (profile?.username) {
    return `@${profile.username}`;
  }

  // Fallback to address
  return `@${address.slice(0, 4)}...${address.slice(-4)}`;
}

/**
 * Get user avatar initial (first letter of display name or username)
 */
export function getUserAvatarInitial(
  address: string | null | undefined,
  profile?: Profile | null
): string {
  const displayName = getUserDisplayName(address, profile);
  return displayName[0]?.toUpperCase() || address?.[2]?.toUpperCase() || 'U';
}

/**
 * Get user profile image URL from profile
 * Returns the Walrus blob URL if profile_image_blob_id exists, otherwise null
 */
export function getUserProfileImageUrl(
  profile?: Profile | null
): string | null {
  if (!profile?.profile_image_blob_id) {
    return null;
  }
  return WalrusService.getBlobUrl(profile.profile_image_blob_id);
}

