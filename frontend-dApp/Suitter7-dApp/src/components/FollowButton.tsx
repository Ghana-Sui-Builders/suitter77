import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import { useProfile, useFollowUser, useUnfollowUser, useIsFollowing, Profile, PACKAGE_ID } from '../hooks/useContract';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import { useState } from 'react';

interface FollowButtonProps {
  profile: Profile;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function FollowButton({ profile, variant = 'default', size = 'sm', className }: FollowButtonProps) {
  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  const currentUserProfile = useProfile(account?.address || null);
  const { data: isFollowing, isLoading: isLoadingFollowing } = useIsFollowing(
    account?.address || null,
    profile.owner
  );
  const followUser = useFollowUser();
  const unfollowUser = useUnfollowUser();
  const [isProcessing, setIsProcessing] = useState(false);

  // Don't show button if user is viewing their own profile
  if (!account?.address || account.address.toLowerCase() === profile.owner.toLowerCase()) {
    return null;
  }

  // Don't show button if current user doesn't have a profile
  if (!currentUserProfile.data) {
    return null;
  }

  const handleFollowToggle = async () => {
    if (!account?.address || !currentUserProfile.data) {
      toast.error('Please connect your wallet and create a profile first');
      return;
    }

    if (isProcessing || followUser.isPending || unfollowUser.isPending) {
      return;
    }

    setIsProcessing(true);
    const toastId = toast.loading(isFollowing ? 'Unfollowing user...' : 'Following user...');

    try {
      // Fetch the followee's profile to ensure we have the correct object ID
      // The profile.id we have might not be the actual owned object ID
      let followeeProfileId = profile.id;
      
      try {
        const followeeObjects = await suiClient.getOwnedObjects({
          owner: profile.owner,
          filter: {
            StructType: `${PACKAGE_ID}::profile::Profile`,
          },
          options: {
            showContent: false,
          },
        });

        if (followeeObjects.data.length > 0) {
          followeeProfileId = followeeObjects.data[0].data?.objectId || profile.id;
        }
      } catch (error) {
        console.warn('Could not fetch followee profile, using provided ID:', error);
      }

      if (isFollowing) {
        // Unfollow
        await new Promise((resolve, reject) => {
          if (!currentUserProfile.data) {
            reject(new Error('Profile not found'));
            return;
          }
          unfollowUser.mutate(
            {
              unfollowerProfileId: currentUserProfile.data.id,
              unfolloweeProfileId: followeeProfileId,
            },
            {
              onSuccess: resolve,
              onError: reject,
            }
          );
        });
        toast.dismiss(toastId);
        toast.success('Unfollowed successfully!');
      } else {
        // Follow
        await new Promise((resolve, reject) => {
          if (!currentUserProfile.data) {
            reject(new Error('Profile not found'));
            return;
          }
          followUser.mutate(
            {
              followerProfileId: currentUserProfile.data.id,
              followeeProfileId: followeeProfileId,
            },
            {
              onSuccess: resolve,
              onError: reject,
            }
          );
        });
        toast.dismiss(toastId);
        toast.success('Followed successfully!');
      }
    } catch (error: any) {
      toast.dismiss(toastId);
      const errorMessage = error?.message || error?.toString() || 'Failed to update follow status. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const isLoading = isLoadingFollowing || isProcessing || followUser.isPending || unfollowUser.isPending;
  const buttonText = isLoading
    ? isFollowing
      ? 'Unfollowing...'
      : 'Following...'
    : isFollowing
    ? 'Unfollow'
    : 'Follow';

  return (
    <Button
      variant={isFollowing ? 'outline' : variant}
      size={size}
      onClick={handleFollowToggle}
      disabled={isLoading}
      className={className}
    >
      {buttonText}
    </Button>
  );
}

