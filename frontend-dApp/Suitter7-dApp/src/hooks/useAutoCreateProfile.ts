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
  const isCreatingRef = useRef(false);

  // Reset flag when account changes
  useEffect(() => {
    if (!account?.address) {
      hasAttemptedCreation.current = false;
      isCreatingRef.current = false;
    }
  }, [account?.address]);

  useEffect(() => {
    // Only run if wallet is connected, profile is loaded, and no profile exists
    if (
      account?.address &&
      !isLoadingProfile &&
      !profile &&
      !hasAttemptedCreation.current &&
      !createProfile.isPending &&
      !isCreatingRef.current
    ) {
      hasAttemptedCreation.current = true;
      isCreatingRef.current = true;
      
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
            isCreatingRef.current = false;
            // Don't reset hasAttemptedCreation on success - profile should exist now
          },
          onError: (error: any) => {
            toast.dismiss(toastId);
            isCreatingRef.current = false;
            const errorMessage = error?.message || error?.toString() || '';
            
            // Check if it's a username already exists error
            if (errorMessage.includes('username') || errorMessage.includes('exists')) {
              // Try with a different username
              const uniqueUsername = `user${addressPrefix}${Date.now().toString().slice(-4)}`;
              const retryToastId = toast.loading('Creating profile with a unique username...');
              isCreatingRef.current = true;
              
              createProfile.mutate(
                { username: uniqueUsername, bio: defaultBio },
                {
                  onSuccess: () => {
                    toast.dismiss(retryToastId);
                    toast.success('Profile created successfully! 🎉');
                    isCreatingRef.current = false;
                  },
                  onError: (retryError: any) => {
                    toast.dismiss(retryToastId);
                    isCreatingRef.current = false;
                    const retryErrorMessage = retryError?.message || retryError?.toString() || 'Failed to create profile. Please try creating it manually from the profile page.';
                    toast.error(retryErrorMessage);
                    // Reset flag to allow manual creation after a delay
                    setTimeout(() => {
                      hasAttemptedCreation.current = false;
                    }, 10000);
                  },
                }
              );
            } else {
              toast.error('Failed to create profile. You can create it manually from the profile page.');
              // Reset flag to allow manual creation after a delay
              setTimeout(() => {
                hasAttemptedCreation.current = false;
              }, 10000);
            }
          },
        }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account?.address, profile, isLoadingProfile, createProfile.isPending]);

  return { profile, isLoading: isLoadingProfile || createProfile.isPending };
}

