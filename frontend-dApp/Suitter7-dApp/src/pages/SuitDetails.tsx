import { useParams, useNavigate } from 'react-router-dom';
import { useSuit, useLikeSuit, useCommentOnSuit, useRepostSuit } from '../hooks/useContract';
import { useComments } from '../hooks/useComments';
import { useLikeAddedEvents, useRepostAddedEvents } from '../hooks/useEvents';
import { useProfile } from '../hooks/useContract';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { HeartIcon, ChatBubbleIcon } from '@radix-ui/react-icons';
import toast from 'react-hot-toast';
import { getUserDisplayName, getUserHandle, getUserAvatarInitial, getUserProfileImageUrl } from '../utils/userDisplay';

export function SuitDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const account = useCurrentAccount();
  const { data: suit, isLoading: isLoadingSuit } = useSuit(id || null);
  const { data: comments, isLoading: isLoadingComments } = useComments(id || null);
  const { data: likeEvents } = useLikeAddedEvents(id, 100);
  const { data: repostEvents } = useRepostAddedEvents(id, 100);
  const { data: authorProfile } = useProfile(suit?.author || null);
  
  const likeSuit = useLikeSuit();
  const repostSuit = useRepostSuit();
  const commentSuit = useCommentOnSuit();
  
  const [commentContent, setCommentContent] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const [isReposted, setIsReposted] = useState(false);

  // Check if current user has liked/reposted this suit
  useEffect(() => {
    if (likeEvents && account?.address) {
      const userHasLiked = likeEvents.some(
        (event) => event.liker?.toLowerCase() === account.address?.toLowerCase()
      );
      setIsLiked(userHasLiked);
    } else {
      setIsLiked(false);
    }
  }, [likeEvents, account?.address]);

  useEffect(() => {
    if (repostEvents && account?.address) {
      const userHasReposted = repostEvents.some(
        (event) => event.reposter?.toLowerCase() === account.address?.toLowerCase()
      );
      setIsReposted(userHasReposted);
    } else {
      setIsReposted(false);
    }
  }, [repostEvents, account?.address]);

  const formatTime = (timestamp: number) => {
    if (!timestamp) return 'Just now';
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
  };

  const handleLike = () => {
    if (!account) {
      toast.error('Please connect your wallet first');
      return;
    }
    if (!suit) return;

    const toastId = toast.loading('Liking suit...');
    likeSuit.mutate(
      suit.id,
      {
        onSuccess: () => {
          toast.dismiss(toastId);
          toast.success('Suit liked! ❤️');
        },
        onError: (error: any) => {
          toast.dismiss(toastId);
          const errorMessage = error?.message || error?.toString() || 'Failed to like suit. Please try again.';
          toast.error(errorMessage);
        },
      }
    );
  };

  const handleRepost = () => {
    if (!account) {
      toast.error('Please connect your wallet first');
      return;
    }
    if (!suit) return;

    const toastId = toast.loading('Reposting suit...');
    repostSuit.mutate(
      suit.id,
      {
        onSuccess: () => {
          toast.dismiss(toastId);
          toast.success('Suit reposted! 🔄');
        },
        onError: (error: any) => {
          toast.dismiss(toastId);
          const errorMessage = error?.message || error?.toString() || 'Failed to repost suit. Please try again.';
          toast.error(errorMessage);
        },
      }
    );
  };

  const handleComment = () => {
    if (!account) {
      toast.error('Please connect your wallet first');
      return;
    }
    if (!suit || !commentContent.trim()) return;

    const toastId = toast.loading('Posting comment...');
    commentSuit.mutate(
      { suitId: suit.id, content: commentContent.trim() },
      {
        onSuccess: () => {
          setCommentContent('');
          toast.dismiss(toastId);
          toast.success('Comment posted! 💬');
        },
        onError: (error: any) => {
          toast.dismiss(toastId);
          const errorMessage = error?.message || error?.toString() || 'Failed to post comment. Please try again.';
          toast.error(errorMessage);
        },
      }
    );
  };

  const renderContent = (text: string) => {
    const parts = text.split(/(\s+)/);
    return parts.map((part, index) => {
      if (part.startsWith('#')) {
        return (
          <span key={index} className="text-blue-600 font-medium hover:underline cursor-pointer">
            {part}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  const displayName = getUserDisplayName(suit?.author || null, authorProfile || undefined);
  const handle = getUserHandle(suit?.author || null, authorProfile || undefined);
  const avatarInitial = getUserAvatarInitial(suit?.author || null, authorProfile || undefined);
  const authorAvatar = getUserProfileImageUrl(authorProfile || undefined) || undefined;

  if (isLoadingSuit) {
    return (
      <div className="w-full">
        <div className="text-center py-16">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-gray-200 border-t-blue-600"></div>
          <p className="mt-4 text-gray-500 text-sm">Loading suit...</p>
        </div>
      </div>
    );
  }

  if (!suit) {
    return (
      <div className="w-full">
        <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-2xl border border-gray-100">
          <p className="text-gray-600 font-medium mb-2">Suit not found</p>
          <Button
            variant="default"
            onClick={() => navigate('/')}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
          >
            Go to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        <span className="text-sm font-medium">Back</span>
      </button>

      {/* Main Suit Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex gap-4">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-md overflow-hidden">
              {authorAvatar ? (
                <img 
                  src={authorAvatar} 
                  alt={displayName} 
                  className="w-full h-full rounded-full object-cover" 
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      const fallback = document.createElement('span');
                      fallback.className = 'text-white font-semibold text-lg';
                      fallback.textContent = avatarInitial;
                      parent.appendChild(fallback);
                    }
                  }}
                />
              ) : (
                <span className="text-white font-semibold text-lg">
                  {avatarInitial}
                </span>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center gap-6 mb-3">
              <span className="font-bold text-gray-900 text-[16px] hover:underline cursor-pointer">
                {displayName}
              </span>
              <span className="text-gray-500 text-[15px]">{handle}</span>
              <span className="text-gray-400 text-sm">•</span>
              <span className="text-gray-500 text-sm">{formatTime(suit.timestamp_ms)}</span>
            </div>

            {/* Content */}
            <div className="text-gray-800 text-[15px] leading-relaxed mb-4 whitespace-pre-wrap">
              {renderContent(suit.content)}
            </div>

            {/* Media */}
            {suit.walrus_blob_id && (
              <div className="mb-4 rounded-xl overflow-hidden">
                <img
                  src={`https://walrus.sui.io/v1/blobs/${suit.walrus_blob_id}`}
                  alt="Suit media"
                  className="w-full h-auto max-h-96 object-cover"
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-6 pt-4 border-t border-gray-100">
              <button
                onClick={handleLike}
                disabled={likeSuit.isPending}
                className={`flex items-center gap-2 transition-colors ${
                  isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
                }`}
              >
                <HeartIcon className="w-5 h-5" />
                <span className="text-sm font-medium">{suit.likes_count || likeEvents?.length || 0}</span>
              </button>

              <button
                className="flex items-center gap-2 text-gray-500 hover:text-blue-500 transition-colors"
              >
                <ChatBubbleIcon className="w-5 h-5" />
                <span className="text-sm font-medium">{suit.comments_count || comments?.length || 0}</span>
              </button>

              <button
                onClick={handleRepost}
                disabled={repostSuit.isPending || isReposted}
                className={`group flex items-center gap-2 transition-all disabled:opacity-50 active:scale-95 ${
                  isReposted ? 'text-gray-900' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <div className={`p-2 rounded-full transition-colors ${
                  isReposted 
                    ? 'bg-gray-100' 
                    : 'group-hover:bg-gray-50'
                }`}>
                  <svg className={`w-5 h-5 transition-transform ${
                    isReposted ? 'fill-gray-900 scale-110' : ''
                  }`} fill={isReposted ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <span className={`text-sm font-medium ${isReposted ? 'text-gray-900' : ''}`}>
                  {suit.reposts_count || repostEvents?.length || 0}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Comment Input */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex gap-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-semibold text-sm">
              {account?.address?.[0]?.toUpperCase() || 'U'}
            </span>
          </div>
          <div className="flex-1">
            <textarea
              value={commentContent}
              onChange={(e) => setCommentContent(e.target.value)}
              placeholder="Write a comment..."
              className="w-full min-h-[80px] resize-none border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 placeholder-gray-400 text-sm"
            />
            <div className="flex items-center justify-between mt-3">
              <span className={`text-xs font-medium ${commentContent.length > 280 ? 'text-red-500' : 'text-gray-400'}`}>
                {commentContent.length} / 280
              </span>
              <Button
                onClick={handleComment}
                disabled={!commentContent.trim() || commentContent.length > 280 || commentSuit.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm"
              >
                {commentSuit.isPending ? 'Posting...' : 'Post Comment'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Comments Section */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Comments ({comments?.length || 0})
        </h2>
        {isLoadingComments ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-blue-600"></div>
          </div>
        ) : comments && comments.length > 0 ? (
          <div className="space-y-4">
            {comments.map((comment) => {
              const CommentAuthor = ({ authorAddress, comment: commentData }: { authorAddress: string; comment: typeof comment }) => {
                const { data: commentAuthorProfile } = useProfile(authorAddress);
                const commentDisplayName = getUserDisplayName(authorAddress, commentAuthorProfile || undefined);
                const commentHandle = getUserHandle(authorAddress, commentAuthorProfile || undefined);
                const commentAvatarInitial = getUserAvatarInitial(authorAddress, commentAuthorProfile || undefined);
                const commentProfileImageUrl = getUserProfileImageUrl(commentAuthorProfile || undefined);

                return (
                  <div className="bg-white rounded-xl border border-gray-100 p-4">
                    <div className="flex gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {commentProfileImageUrl ? (
                          <img 
                            src={commentProfileImageUrl} 
                            alt={commentDisplayName} 
                            className="w-full h-full rounded-full object-cover" 
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                const fallback = document.createElement('span');
                                fallback.className = 'text-white font-semibold text-sm';
                                fallback.textContent = commentAvatarInitial;
                                parent.appendChild(fallback);
                              }
                            }}
                          />
                        ) : (
                          <span className="text-white font-semibold text-sm">
                            {commentAvatarInitial}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-gray-900 text-sm">{commentDisplayName}</span>
                          <span className="text-gray-500 text-xs">{commentHandle}</span>
                          <span className="text-gray-400 text-xs">•</span>
                          <span className="text-gray-500 text-xs">{formatTime(commentData.timestamp_ms)}</span>
                        </div>
                        <p className="text-gray-700 text-sm leading-relaxed">{commentData.content}</p>
                        {commentData.walrus_blob_id && (
                          <div className="mt-3 rounded-lg overflow-hidden border border-gray-200">
                            <img
                              src={`https://walrus.sui.io/v1/blobs/${commentData.walrus_blob_id}`}
                              alt="Comment media"
                              className="w-full max-h-[300px] object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              };

              return <CommentAuthor key={comment.id} authorAddress={comment.author} comment={comment} />;
            })}
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-50 rounded-xl border border-gray-100">
            <p className="text-gray-500 text-sm">No comments yet. Be the first to comment!</p>
          </div>
        )}
      </div>
    </div>
  );
}

