import { useEffect, useRef } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useProfile, useCreateProfile } from './useContract';
import toast from 'react-hot-toast';

/**
 * Hook that automatically creates a profile when a wallet connects and no profile exists
 */
export function useAutoCreateProfile() {
  const account = useCurrentAccount();
  const { data: profile, isLoading: isLoadingProfile } = useProfile(account?.address || null);
  const createProfile = useCreateProfile();
  const hasAttemptedCreation = useRef(false);

  useEffect(() => {
    // Only run if wallet is connected, profile is loaded, and no profile exists
    if (
      account?.address &&
      !isLoadingProfile &&
      !profile &&
      !hasAttemptedCreation.current &&
      !createProfile.isPending
    ) {
      hasAttemptedCreation.current = true;
      
      // Generate a default username from the address
      const addressPrefix = account.address.slice(2, 8); // First 6 hex chars after 0x
      const defaultUsername = `user${addressPrefix}`;
      const defaultBio = 'Welcome to Suitter! Join the decentralized social network on Sui.';

      const toastId = toast.loading('Creating your profile...');

      createProfile.mutate(
        { username: defaultUsername, bio: defaultBio },
        {
          onSuccess: () => {
            toast.dismiss(toastId);
            toast.success('Profile created successfully! 🎉 You can edit it anytime.');
            // Reset the flag after a delay to allow retry if needed
            setTimeout(() => {
              hasAttemptedCreation.current = false;
            }, 5000);
          },
          onError: (error: any) => {
            toast.dismiss(toastId);
            const errorMessage = error?.message || error?.toString() || '';
            
            // Check if it's a username already exists error
            if (errorMessage.includes('username') || errorMessage.includes('exists')) {
              // Try with a different username
              const uniqueUsername = `user${addressPrefix}${Date.now().toString().slice(-4)}`;
              toast.loading('Creating profile with a unique username...');
              createProfile.mutate(
                { username: uniqueUsername, bio: defaultBio },
                {
                  onSuccess: () => {
                    toast.dismiss(toastId);
                    toast.success('Profile created successfully! 🎉');
                    setTimeout(() => {
                      hasAttemptedCreation.current = false;
                    }, 5000);
                  },
                  onError: (retryError: any) => {
                    toast.dismiss(toastId);
                    const retryErrorMessage = retryError?.message || retryError?.toString() || 'Failed to create profile. Please try creating it manually from the profile page.';
                    toast.error(retryErrorMessage);
                    // Reset flag to allow manual creation
                    setTimeout(() => {
                      hasAttemptedCreation.current = false;
                    }, 5000);
                  },
                }
              );
            } else {
              toast.error('Failed to create profile. You can create it manually from the profile page.');
              // Reset flag to allow manual creation
              setTimeout(() => {
                hasAttemptedCreation.current = false;
              }, 5000);
            }
          },
        }
      );
    }
  }, [account?.address, profile, isLoadingProfile, createProfile]);

  // Reset flag when account changes
  useEffect(() => {
    if (!account?.address) {
      hasAttemptedCreation.current = false;
    }
  }, [account?.address]);

  return { profile, isLoading: isLoadingProfile || createProfile.isPending };
}

