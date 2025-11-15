import { useState, useEffect } from 'react';

export interface ProfileMetadata {
  displayName: string;
  website: string;
  location: string;
}

const STORAGE_KEY_PREFIX = 'profile_metadata_';

export function useProfileMetadata(address: string | null | undefined) {
  const [metadata, setMetadata] = useState<ProfileMetadata>({
    displayName: '',
    website: '',
    location: '',
  });

  const storageKey = address ? `${STORAGE_KEY_PREFIX}${address}` : null;

  // Load metadata from localStorage when address changes
  useEffect(() => {
    if (!storageKey) {
      setMetadata({ displayName: '', website: '', location: '' });
      return;
    }

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as ProfileMetadata;
        setMetadata(parsed);
      }
    } catch (error) {
      console.error('Error loading profile metadata:', error);
    }
  }, [storageKey]);

  const updateMetadata = (updates: Partial<ProfileMetadata>) => {
    if (!storageKey) return;

    const newMetadata = { ...metadata, ...updates };
    setMetadata(newMetadata);

    try {
      localStorage.setItem(storageKey, JSON.stringify(newMetadata));
    } catch (error) {
      console.error('Error saving profile metadata:', error);
    }
  };

  const clearMetadata = () => {
    if (!storageKey) return;
    try {
      localStorage.removeItem(storageKey);
      setMetadata({ displayName: '', website: '', location: '' });
    } catch (error) {
      console.error('Error clearing profile metadata:', error);
    }
  };

  return {
    metadata,
    updateMetadata,
    clearMetadata,
  };
}

