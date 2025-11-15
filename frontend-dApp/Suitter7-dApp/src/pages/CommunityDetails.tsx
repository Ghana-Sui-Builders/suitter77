import { useParams, useNavigate } from 'react-router-dom';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useCommunity, useJoinCommunity, useIsCommunityMember, useCreateCommunityPost, useCommunityPosts } from '../hooks/useContract';
import { SuitCard } from '../components/SuitCard';
import { ArrowLeft, Users, Calendar, Globe, Lock, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { WalrusService } from '../services/walrus';

// Helper function to format member count
function formatMemberCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toString();
}

// Helper function to format date
function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

// Helper function to get emoji icon based on community name
function getCommunityIcon(name: string): string {
  const nameLower = name.toLowerCase();
  if (nameLower.includes('build') || nameLower.includes('dev') || nameLower.includes('sdk')) return '🔧';
  if (nameLower.includes('login') || nameLower.includes('auth') || nameLower.includes('security')) return '🔐';
  if (nameLower.includes('trade') || nameLower.includes('market') || nameLower.includes('analytics')) return '📈';
  if (nameLower.includes('move') || nameLower.includes('language') || nameLower.includes('code')) return '💻';
  if (nameLower.includes('nft') || nameLower.includes('art')) return '🎨';
  if (nameLower.includes('game') || nameLower.includes('gaming')) return '🎮';
  return '👥';
}

export function CommunityDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const account = useCurrentAccount();
  const { data: community, isLoading } = useCommunity(id || null);
  const { data: isMember } = useIsCommunityMember(id || null, account?.address || null);
  const { data: posts, isLoading: isLoadingPosts } = useCommunityPosts(id || null);
  const joinCommunity = useJoinCommunity();
  const createPost = useCreateCommunityPost();
  const [postContent, setPostContent] = useState('');

  const handleJoin = () => {
    if (!account?.address) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!id) {
      toast.error('Community ID not found');
      return;
    }

    if (isMember) {
      toast.error('You are already a member of this community');
      return;
    }

    joinCommunity.mutate(
      { communityId: id },
      {
        onSuccess: () => {
          toast.success('Successfully joined the community! 🎉');
        },
        onError: (error: any) => {
          console.error('Error joining community:', error);
          const errorMessage = error?.message || 'Failed to join community';
          if (errorMessage.includes('members')) {
            toast.error('Could not find community members object. The community may need to be updated.');
          } else {
            toast.error(errorMessage);
          }
        },
      }
    );
  };

  const handleCreatePost = () => {
    if (!account?.address) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!id) {
      toast.error('Community ID not found');
      return;
    }

    if (!isMember) {
      toast.error('You must be a member to post in this community');
      return;
    }

    if (!postContent.trim() || postContent.length > 280) {
      toast.error('Post content must be between 1 and 280 characters');
      return;
    }

    createPost.mutate(
      { 
        communityId: id, 
        content: postContent.trim() 
      },
      {
        onSuccess: () => {
          setPostContent('');
          toast.success('Post created successfully! 🎉');
        },
        onError: (error: any) => {
          console.error('Error creating post:', error);
          const errorMessage = error?.message || 'Failed to create post';
          if (errorMessage.includes('member')) {
            toast.error('You must be a member to post in this community');
          } else {
            toast.error(errorMessage);
          }
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="w-full flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading community...</div>
      </div>
    );
  }

  if (!community) {
    return (
      <div className="w-full flex flex-col items-center justify-center py-12 space-y-4">
        <div className="text-muted-foreground text-center">
          <p className="text-lg mb-2">Community not found</p>
          <p className="text-sm">The community you're looking for doesn't exist.</p>
        </div>
        <Button onClick={() => navigate('/communities')}>
          <ArrowLeft className="size-4 mr-2" />
          Back to Communities
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/communities')}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-3xl font-bold">Community Details</h1>
      </div>

      {/* Cover Image */}
      {community.cover_blob_id && (
        <div className="w-full h-64 rounded-lg overflow-hidden bg-muted">
          <img
            src={WalrusService.getBlobUrl(community.cover_blob_id)}
            alt={`${community.name} cover`}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      )}

      {/* Community Info Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex gap-6 items-start">
            {/* Thumbnail */}
            <div className="size-24 rounded-xl bg-muted flex items-center justify-center text-4xl shrink-0">
              {community.thumbnail_blob_id ? (
                <img
                  src={WalrusService.getBlobUrl(community.thumbnail_blob_id)}
                  alt={community.name}
                  className="w-full h-full object-cover rounded-xl"
                  onError={(e) => {
                    (e.target as HTMLImageElement).textContent = getCommunityIcon(community.name);
                  }}
                />
              ) : (
                getCommunityIcon(community.name)
              )}
            </div>

            {/* Community Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold mb-2">{community.name}</h2>
                  <p className="text-muted-foreground">@{community.handle}</p>
                </div>
                <Button
                  onClick={handleJoin}
                  disabled={joinCommunity.isPending || isMember}
                  size="lg"
                >
                  {isMember ? 'Joined' : community.privacy === 'public' ? 'Join' : 'Request to Join'}
                </Button>
              </div>

              <p className="text-sm text-foreground mb-4">{community.description || 'No description'}</p>

              {/* Stats */}
              <div className="flex flex-wrap gap-6 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="size-4" />
                  <span>{formatMemberCount(community.members_count)} members</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  {community.privacy === 'public' ? (
                    <>
                      <Globe className="size-4" />
                      <span>Public</span>
                    </>
                  ) : (
                    <>
                      <Lock className="size-4" />
                      <span>Members only</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="size-4" />
                  <span>Created {formatDate(community.created_at_ms)}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Community Content Section */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">About</h3>
          <p className="text-sm text-muted-foreground">
            {community.description || 'No description available for this community.'}
          </p>
        </CardContent>
      </Card>

      {/* Post Form - Only show if user is a member */}
      {isMember && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Create a Post</h3>
            <div className="space-y-4">
              <Textarea
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                placeholder="Share your thoughts with the community..."
                className="min-h-[100px] resize-none"
                maxLength={280}
              />
              <div className="flex items-center justify-between">
                <span className={`text-xs ${
                  postContent.length > 280 ? 'text-destructive' : 'text-muted-foreground'
                }`}>
                  {postContent.length} / 280
                </span>
                <Button
                  onClick={handleCreatePost}
                  disabled={!postContent.trim() || postContent.length > 280 || createPost.isPending}
                  size="sm"
                >
                  <Send className="size-4 mr-2" />
                  {createPost.isPending ? 'Posting...' : 'Post'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Community Posts */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">Community Posts</h3>
          {isLoadingPosts ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading posts...
            </div>
          ) : !posts || posts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="mb-2">No posts yet</p>
              <p className="text-sm">
                {isMember 
                  ? 'Be the first to post in this community!' 
                  : 'Join this community to see and create posts.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <SuitCard 
                  key={post.id} 
                  suit={post}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

