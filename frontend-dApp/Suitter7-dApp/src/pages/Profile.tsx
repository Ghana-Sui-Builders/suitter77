import { useCurrentAccount } from '@mysten/dapp-kit';
import { useSuits, useCreateSuit, useCreateProfile, useRepostsByUser } from '../hooks/useContract';
import { useAutoCreateProfile } from '../hooks/useAutoCreateProfile';
import { useProfileMetadata } from '../hooks/useProfileMetadata';
import { SuitCard } from '../components/SuitCard';
import { EditProfileModal } from '../components/EditProfileModal';
import { WalrusService } from '../services/walrus';
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  Copy, 
  Edit, 
  Hash, 
  Send,
  Calendar
} from 'lucide-react';
import toast from 'react-hot-toast';

export function Profile() {
  const account = useCurrentAccount();
  // Auto-create profile when wallet connects
  const { profile, isLoading: isLoadingProfile } = useAutoCreateProfile();
  const { metadata } = useProfileMetadata(account?.address);
  const { data: suits } = useSuits();
  const { data: reposts } = useRepostsByUser(account?.address || null);
  const createSuit = useCreateSuit();
  const createProfile = useCreateProfile();
  const [activeTab, setActiveTab] = useState<'suits' | 'replies' | 'media' | 'likes'>('suits');
  const [content, setContent] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Combine original suits and reposted suits
  const userSuits = useMemo(() => {
    const originalSuits = suits?.filter((suit) => suit.author === account?.address) || [];
    const repostedSuits = reposts?.map((repost) => ({
      ...repost.suit,
      // Use repost timestamp for sorting reposts (so they appear when reposted, not when originally created)
      displayTimestamp: repost.repost_timestamp_ms,
      isRepost: true,
    })) || [];
    
    // Mark original suits
    const markedOriginalSuits = originalSuits.map(suit => ({
      ...suit,
      displayTimestamp: suit.timestamp_ms,
      isRepost: false,
    }));
    
    // Combine and sort by display timestamp (newest first)
    const allSuits = [...markedOriginalSuits, ...repostedSuits];
    return allSuits.sort((a, b) => b.displayTimestamp - a.displayTimestamp);
  }, [suits, reposts, account?.address]);
  
  // For replies, we'd need to query comments by user - for now showing placeholder
  const userReplies = useMemo(() => {
    // TODO: Implement fetching comments by user
    return [];
  }, []);

  // Media suits (suits with walrus_blob_id)
  const mediaSuits = useMemo(() => {
    return userSuits.filter(suit => suit.walrus_blob_id);
  }, [userSuits]);

  // Liked suits - would need to query likes by user
  const likedSuits = useMemo(() => {
    // TODO: Implement fetching liked suits by user
    return [];
  }, []);

  const handleCreateSuit = () => {
    if (!account) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (content.trim() && content.length <= 280) {
      const toastId = toast.loading('Posting your Suit...');
      createSuit.mutate(
        { content: content.trim() },
        {
          onSuccess: () => {
            setContent('');
            toast.dismiss(toastId);
            toast.success('Suit posted successfully! 🎉');
          },
          onError: (error: any) => {
            toast.dismiss(toastId);
            const errorMessage = error?.message || error?.toString() || 'Failed to post Suit. Please try again.';
            toast.error(errorMessage);
          },
        }
      );
    } else if (content.length > 280) {
      toast.error('Suit content is too long. Maximum 280 characters.');
    } else {
      toast.error('Please enter some content before posting.');
    }
  };

  const handleCopyProfileLink = () => {
    if (account?.address) {
      const profileLink = `${window.location.origin}/profile`;
      navigator.clipboard.writeText(profileLink);
      toast.success('Profile link copied to clipboard!');
    }
  };

  const handleCreateProfile = () => {
    if (!account?.address) {
      toast.error('Please connect your wallet first');
      return;
    }

    const addressPrefix = account.address.slice(2, 8);
    const defaultUsername = `user${addressPrefix}${Date.now().toString().slice(-4)}`;
    const defaultBio = 'Welcome to Suitter! Join the decentralized social network on Sui.';

    const toastId = toast.loading('Creating your profile...');
    createProfile.mutate(
      { username: defaultUsername, bio: defaultBio },
      {
        onSuccess: () => {
          toast.dismiss(toastId);
          toast.success('Profile created successfully! 🎉');
        },
        onError: (error: any) => {
          toast.dismiss(toastId);
          const errorMessage = error?.message || error?.toString() || 'Failed to create profile. Please try again.';
          toast.error(errorMessage);
        },
      }
    );
  };


  // Format address with @ prefix for handle display
  const displayHandle = profile?.username 
    ? `@${profile.username}` 
    : account?.address 
      ? `@${account.address.slice(0, 8)}...${account.address.slice(-4)}`
      : '@unknown';

  // Show loading state while profile is being created
  if (isLoadingProfile || createProfile.isPending) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-primary mb-4"></div>
          <p className="text-muted-foreground">Creating your profile...</p>
        </div>
      </div>
    );
  }

  // Show create profile prompt if no profile exists
  if (!account?.address) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold text-foreground mb-2">Connect Your Wallet</h2>
          <p className="text-muted-foreground mb-6">
            Please connect your wallet to view or create your profile.
          </p>
        </div>
      </div>
    );
  }

  // Show profile creation prompt if profile doesn't exist
  if (!profile && !createProfile.isPending) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md bg-card rounded-2xl border border-border p-8">
          <h2 className="text-2xl font-bold text-foreground mb-2">Create Your Profile</h2>
          <p className="text-muted-foreground mb-6">
            You need to create a profile to start using Suitter. This will only take a moment!
          </p>
          <Button 
            onClick={handleCreateProfile} 
            disabled={createProfile.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {createProfile.isPending ? 'Creating Profile...' : 'Create Profile'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-6">
      {/* Main Content */}
      <div className="flex-1 min-w-0">
        {/* Profile Header */}
        <div className="bg-card rounded-2xl border border-border p-6 mb-6">
          <div className="flex gap-4">
            {profile?.profile_image_blob_id ? (
              <div className="w-24 h-24 rounded-full overflow-hidden bg-muted shrink-0">
                <img
                  src={WalrusService.getBlobUrl(profile.profile_image_blob_id)}
                  alt={metadata.displayName || profile.username}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback to initial if image fails to load
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.nextElementSibling?.classList.remove('hidden');
                  }}
                />
                <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center text-2xl font-semibold text-muted-foreground hidden">
                  {(metadata.displayName || profile?.username)?.[0]?.toUpperCase() || account?.address?.[0]?.toUpperCase() || 'U'}
                </div>
              </div>
            ) : (
              <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center text-2xl font-semibold text-muted-foreground shrink-0">
                {(metadata.displayName || profile?.username)?.[0]?.toUpperCase() || account?.address?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h1 className="text-2xl font-bold text-foreground mb-1">
                    {metadata.displayName || profile?.username || 'Unknown User'}
                  </h1>
                  <p className="text-sm text-muted-foreground">{displayHandle}</p>
                  {(metadata.website || metadata.location) && (
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      {metadata.location && <span>{metadata.location}</span>}
                      {metadata.website && (
                        <a
                          href={metadata.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {metadata.website.replace(/^https?:\/\//, '')}
                        </a>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyProfileLink}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Profile Link
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setIsEditModalOpen(true)}
                    disabled={!profile}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Profile
                  </Button>
                </div>
              </div>

              <p className="text-foreground mb-4 leading-relaxed">
                {profile?.bio || 'No bio yet'}
              </p>

              <div className="flex gap-6 text-sm">
                <div>
                  <span className="font-semibold text-foreground">{profile?.following_count || 0}</span>
                  <span className="text-muted-foreground ml-1">Following</span>
                </div>
                <div>
                  <span className="font-semibold text-foreground">{profile?.followers_count || 0}</span>
                  <span className="text-muted-foreground ml-1">Followers</span>
                </div>
                <div>
                  <span className="font-semibold text-foreground">{profile?.suits_count || 0}</span>
                  <span className="text-muted-foreground ml-1">Suits</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="mb-6">
          <TabsList className="bg-muted">
            <TabsTrigger value="suits" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600">
              Suits
            </TabsTrigger>
            <TabsTrigger value="replies" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600">
              Replies
            </TabsTrigger>
            <TabsTrigger value="media" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600">
              Media
            </TabsTrigger>
            <TabsTrigger value="likes" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600">
              Likes
            </TabsTrigger>
          </TabsList>

          {/* Write a Suit */}
          <div className="bg-card rounded-2xl border border-border p-4 mb-6 mt-4">
            <div className="flex gap-3">
              {profile?.profile_image_blob_id ? (
                <div className="w-10 h-10 rounded-full overflow-hidden bg-muted shrink-0">
                  <img
                    src={WalrusService.getBlobUrl(profile.profile_image_blob_id)}
                    alt={metadata.displayName || profile.username}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      target.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground hidden">
                    {(metadata.displayName || profile?.username)?.[0]?.toUpperCase() || account?.address?.[0]?.toUpperCase() || 'U'}
                  </div>
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground shrink-0">
                  {(metadata.displayName || profile?.username)?.[0]?.toUpperCase() || account?.address?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write a Suit..."
                  className="w-full min-h-[80px] resize-none border-none outline-none bg-transparent text-foreground placeholder:text-muted-foreground text-sm leading-relaxed"
                  style={{ fontFamily: 'inherit' }}
                />
                <div className="flex items-center justify-end mt-2">
                  <Button
                    size="sm"
                    onClick={handleCreateSuit}
                    disabled={!content.trim() || content.length > 280 || createSuit.isPending}
                    className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Post
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <TabsContent value="suits" className="space-y-4">
            {userSuits.length > 0 ? (
              userSuits.map((suit) => (
                <SuitCard 
                  key={suit.id} 
                  suit={suit} 
                  authorUsername={profile?.username}
                  isRepost={(suit as any).isRepost}
                />
              ))
            ) : (
              <div className="text-center py-16 text-muted-foreground">
                No suits yet
              </div>
            )}
          </TabsContent>

          <TabsContent value="replies" className="space-y-4">
            {userReplies.length > 0 ? (
              userReplies.map((reply: any) => (
                <SuitCard 
                  key={reply.id} 
                  suit={reply.suit} 
                  authorUsername={profile?.username}
                />
              ))
            ) : (
              <div className="text-center py-16 text-muted-foreground">
                No replies yet
              </div>
            )}
          </TabsContent>

          <TabsContent value="media" className="space-y-4">
            {mediaSuits.length > 0 ? (
              mediaSuits.map((suit) => (
                <SuitCard 
                  key={suit.id} 
                  suit={suit} 
                  authorUsername={profile?.username}
                  isRepost={(suit as any).isRepost}
                />
              ))
            ) : (
              <div className="text-center py-16 text-muted-foreground">
                No media suits yet
              </div>
            )}
          </TabsContent>

          <TabsContent value="likes" className="space-y-4">
            {likedSuits.length > 0 ? (
              likedSuits.map((suit: any) => (
                <SuitCard 
                  key={suit.id} 
                  suit={suit} 
                  authorUsername={profile?.username}
                />
              ))
            ) : (
              <div className="text-center py-16 text-muted-foreground">
                No liked suits yet
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Right Sidebar */}
      <aside className="w-80 shrink-0 space-y-6">
        {/* On-chain Identity */}
        <div className="bg-card rounded-2xl border border-border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">On-chain Identity</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium text-foreground">Connected: zkLogin</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Hash className="w-5 h-5 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium text-foreground">
                  Sui Address: {account?.address ? `${account.address.slice(0, 4)}...${account.address.slice(-4)}` : 'Not connected'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Edit Profile Modal */}
      <EditProfileModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        profile={profile || undefined}
      />
    </div>
  );
}
