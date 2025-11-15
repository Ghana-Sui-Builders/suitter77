import { useNavigate } from 'react-router-dom';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useCommunities, useJoinCommunity } from '../hooks/useContract';
import toast from 'react-hot-toast';

// Helper function to format member count
function formatMemberCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toString();
}

// Helper function to get emoji icon based on community name or category
function getCommunityIcon(name: string): string {
  const nameLower = name.toLowerCase();
  if (nameLower.includes('build') || nameLower.includes('dev') || nameLower.includes('sdk')) return '🔧';
  if (nameLower.includes('login') || nameLower.includes('auth') || nameLower.includes('security')) return '🔐';
  if (nameLower.includes('trade') || nameLower.includes('market') || nameLower.includes('analytics')) return '📈';
  if (nameLower.includes('move') || nameLower.includes('language') || nameLower.includes('code')) return '💻';
  if (nameLower.includes('nft') || nameLower.includes('art')) return '🎨';
  if (nameLower.includes('game') || nameLower.includes('gaming')) return '🎮';
  return '👥'; // Default icon
}

export function Communities() {
  const navigate = useNavigate();
  const account = useCurrentAccount();
  const { data: communities, isLoading } = useCommunities();
  const joinCommunity = useJoinCommunity();

  const handleJoin = (communityId: string, privacy: 'public' | 'members') => {
    if (!account?.address) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (privacy === 'members') {
      toast('This is a members-only community. Request functionality coming soon.', { icon: 'ℹ️' });
      return;
    }

    joinCommunity.mutate(
      { communityId },
      {
        onSuccess: () => {
          toast.success('Successfully joined the community! 🎉');
        },
        onError: (error: any) => {
          console.error('Error joining community:', error);
          const errorMessage = error?.message || 'Failed to join community';
          if (errorMessage.includes('members')) {
            toast.error('Could not find community members object. The community may need to be updated.');
          } else if (errorMessage.includes('Already')) {
            toast.error('You are already a member of this community');
          } else {
            toast.error(errorMessage);
          }
        },
      }
    );
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Communities</h1>
        <div className="flex gap-2">
          <Button variant="ghost">Trending</Button>
          <Button variant="ghost">New</Button>
          <Button variant="secondary">All</Button>
          <Button onClick={() => navigate('/communities/create')}>
            Create Community
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading communities...</div>
        </div>
      ) : !communities || communities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <div className="text-muted-foreground text-center">
            <p className="text-lg mb-2">No communities found</p>
            <p className="text-sm">Be the first to create a community!</p>
          </div>
          <Button onClick={() => navigate('/communities/create')}>
            Create Community
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {communities.map((community: any) => (
              <Card key={community.id}>
                <CardContent className="p-6">
                  <div className="flex gap-4 items-center">
                    <div className="size-[60px] rounded-xl bg-muted flex items-center justify-center text-2xl shrink-0">
                      {getCommunityIcon(community.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold mb-1">
                        {community.name}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        {community.description || 'No description'}
                      </p>
                      <div className="flex gap-3 items-center text-sm text-muted-foreground">
                        <span>{formatMemberCount(community.members_count)} members</span>
                        <span>•</span>
                        <span>{community.privacy === 'public' ? 'Public' : 'Members only'}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => navigate(`/communities/${community.id}`)}
                      >
                        View
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => handleJoin(community.id, community.privacy)}
                        disabled={joinCommunity.isPending}
                      >
                        {joinCommunity.isPending ? 'Joining...' : community.privacy === 'public' ? 'Join' : 'Request'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {communities.length > 0 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="ghost" disabled>Previous</Button>
              <span className="text-sm text-muted-foreground px-4">
                Showing {communities.length} {communities.length === 1 ? 'community' : 'communities'}
              </span>
              <Button variant="ghost" disabled>Next Page</Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}



