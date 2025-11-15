import { HeartIcon, ChatBubbleIcon } from '@radix-ui/react-icons';
import { useLikeSuit, useCommentOnSuit, useCommentOnSuitWithMedia, useRepostSuit, Suit, useProfile } from '../hooks/useContract';
import { useComments } from '../hooks/useComments';
import { useLikeAddedEvents, useRepostAddedEvents } from '../hooks/useEvents';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { WalrusService } from '../services/walrus';
import { Image, Repeat2 } from 'lucide-react';
import { getUserDisplayName, getUserHandle, getUserAvatarInitial, getUserProfileImageUrl } from '../utils/userDisplay';

interface SuitCardProps {
  suit: Suit;
  authorUsername?: string; // Deprecated: Use profile from useProfile hook instead
  authorAvatar?: string;
  defaultShowComments?: boolean;
  defaultShowReply?: boolean;
  isRepost?: boolean;
}

export function SuitCard({ suit, authorUsername: _authorUsername, authorAvatar, defaultShowComments = false, defaultShowReply = false, isRepost = false }: SuitCardProps) {
  const account = useCurrentAccount();
  const navigate = useNavigate();
  const likeSuit = useLikeSuit();
  const repostSuit = useRepostSuit();
  const { data: authorProfile } = useProfile(suit.author);
  const [showCommentInput, setShowCommentInput] = useState(defaultShowReply);
  const [showComments, setShowComments] = useState(defaultShowComments);
  const [commentContent, setCommentContent] = useState('');
  const [commentMediaFile, setCommentMediaFile] = useState<File | null>(null);
  const [commentMediaPreview, setCommentMediaPreview] = useState<string | null>(null);
  const [isUploadingCommentMedia, setIsUploadingCommentMedia] = useState(false);
  const commentFileInputRef = useRef<HTMLInputElement>(null);
  const commentSuit = useCommentOnSuit();
  const commentSuitWithMedia = useCommentOnSuitWithMedia();
  const { data: comments } = useComments(suit.id);
  const { data: likeEvents } = useLikeAddedEvents(suit.id);
  const { data: repostEvents } = useRepostAddedEvents(suit.id);
  const [isLiked, setIsLiked] = useState(false);
  const [isReposted, setIsReposted] = useState(false);
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'unknown'>('image');

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on interactive elements
    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('textarea') ||
      target.closest('input') ||
      target.closest('a')
    ) {
      return;
    }
    navigate(`/suit/${suit.id}`);
  };

  // Update state when props change
  useEffect(() => {
    if (defaultShowComments) {
      setShowComments(true);
    }
    if (defaultShowReply) {
      setShowCommentInput(true);
      setShowComments(true);
    }
  }, [defaultShowComments, defaultShowReply]);

  // Check if current user has liked this suit
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

  // Check if current user has reposted this suit
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

  // Detect media type (image or video)
  useEffect(() => {
    const blobId = suit.walrus_blob_id;
    if (!blobId) {
      setMediaType('unknown');
      return;
    }

    const detectMediaType = async () => {
      try {
        const mediaUrl = WalrusService.getBlobUrl(blobId);
        
        // First, try to fetch headers to check Content-Type
        try {
          const response = await fetch(mediaUrl, { method: 'HEAD' });
          const contentType = response.headers.get('Content-Type') || '';
          
          if (contentType.startsWith('video/')) {
            setMediaType('video');
            return;
          } else if (contentType.startsWith('image/')) {
            setMediaType('image');
            return;
          }
        } catch (headError) {
          // HEAD request might fail due to CORS, continue to fallback
          console.debug('HEAD request failed, using fallback detection:', headError);
        }
        
        // Fallback: try to determine by testing with video element
        // We'll try loading as video first, then fall back to image
        const video = document.createElement('video');
        video.preload = 'metadata';
        
        video.onloadedmetadata = () => {
          setMediaType('video');
        };
        
        video.onerror = () => {
          // If video fails, assume it's an image
          setMediaType('image');
        };
        
        video.src = mediaUrl;
      } catch (error) {
        // On error, default to image (most common case)
        console.warn('Could not detect media type, defaulting to image:', error);
        setMediaType('image');
      }
    };

    detectMediaType();
  }, [suit.walrus_blob_id]);

  const formatTime = (timestamp: number) => {
    if (!timestamp) return 'Just now';
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    return `${days}d`;
  };

  const handleLike = () => {
    if (!account) {
      toast.error('Please connect your wallet first');
      return;
    }

    const wasLiked = isLiked;
    setIsLiked(!isLiked);
    const toastId = toast.loading(wasLiked ? 'Removing like...' : 'Liking Suit...');
    likeSuit.mutate(suit.id, {
      onSuccess: () => {
        toast.dismiss(toastId);
        if (!wasLiked) {
          toast.success('Suit liked! ❤️');
        } else {
          toast.success('Like removed');
        }
        // The useEffect will update isLiked based on the refreshed likeEvents
      },
      onError: (error: any) => {
        setIsLiked(wasLiked); // Revert on error
        toast.dismiss(toastId);
        const errorMessage = error?.message || error?.toString() || 'Failed to like Suit. Please try again.';
        toast.error(errorMessage);
      },
    });
  };

  const handleComment = async () => {
    if (!commentContent.trim() && !commentMediaFile) {
      toast.error('Please enter a comment or add media before posting.');
      return;
    }

    const toastId = toast.loading('Posting comment...');

    try {
      // If there's media, upload it first
      if (commentMediaFile) {
        setIsUploadingCommentMedia(true);
        const walrusBlob = await WalrusService.uploadFile(commentMediaFile, account?.address);
        
        // Post comment with media
        commentSuitWithMedia.mutate(
          { suitId: suit.id, content: commentContent.trim() || '', walrusBlobId: walrusBlob.blobId },
          {
            onSuccess: () => {
              setCommentContent('');
              setCommentMediaFile(null);
              setCommentMediaPreview(null);
              setShowCommentInput(false);
              setIsUploadingCommentMedia(false);
              if (!showComments) {
                setShowComments(true);
              }
              toast.dismiss(toastId);
              toast.success('Comment with media posted! 💬');
            },
            onError: (error: any) => {
              setIsUploadingCommentMedia(false);
              toast.dismiss(toastId);
              const errorMessage = error?.message || error?.toString() || 'Failed to post comment. Please try again.';
              toast.error(errorMessage);
            },
          }
        );
      } else {
        // Post text-only comment
        commentSuit.mutate(
          { suitId: suit.id, content: commentContent.trim() },
          {
            onSuccess: () => {
              setCommentContent('');
              setShowCommentInput(false);
              if (!showComments) {
                setShowComments(true);
              }
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
      }
    } catch (error: any) {
      setIsUploadingCommentMedia(false);
      toast.dismiss(toastId);
      toast.error(error?.message || 'Failed to upload media. Please try again.');
    }
  };

  const handleCommentMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 5MB for Walrus)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }

      setCommentMediaFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setCommentMediaPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeCommentMedia = () => {
    setCommentMediaFile(null);
    setCommentMediaPreview(null);
    if (commentFileInputRef.current) {
      commentFileInputRef.current.value = '';
    }
  };

  const handleRepost = () => {
    if (isReposted) {
      toast.error('You have already reposted this Suit.');
      return;
    }

    const toastId = toast.loading('Reposting Suit...');
    repostSuit.mutate(suit.id, {
      onSuccess: () => {
        setIsReposted(true);
        toast.dismiss(toastId);
        toast.success('Suit reposted! 🔄');
      },
      onError: (error: any) => {
        toast.dismiss(toastId);
        const errorMessage = error?.message || error?.toString() || 'Failed to repost Suit. You may have already reposted this.';
        toast.error(errorMessage);
      },
    });
  };

  const handleCommentButtonClick = () => {
    // Toggle comments display
    setShowComments(!showComments);
    // If opening comments for the first time, also show input
    if (!showComments) {
      setShowCommentInput(true);
    }
  };

  // Get display name with fallback priority: displayName > username > address
  const displayName = getUserDisplayName(suit.author, authorProfile || undefined);
  const handle = getUserHandle(suit.author, authorProfile || undefined);
  const avatarInitial = getUserAvatarInitial(suit.author, authorProfile || undefined);
  // Get profile image URL from profile, fallback to authorAvatar prop
  const profileImageUrl = getUserProfileImageUrl(authorProfile || undefined) || authorAvatar;

  // Parse hashtags for styling
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

  return (
    <div 
      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all cursor-pointer"
      onClick={handleCardClick}
    >
      <div className="flex gap-4">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-md overflow-hidden">
            {profileImageUrl ? (
              <img 
                src={profileImageUrl} 
                alt={displayName} 
                className="w-full h-full rounded-full object-cover" 
                onError={(e) => {
                  // Fallback to initial if image fails to load
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    const fallback = document.createElement('span');
                    fallback.className = 'text-white font-semibold text-base';
                    fallback.textContent = avatarInitial;
                    parent.appendChild(fallback);
                  }
                }}
              />
            ) : (
              <span className="text-white font-semibold text-base">
                {avatarInitial}
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Repost Indicator */}
          {isRepost && (
            <div className="flex items-center gap-2 mb-2 text-gray-600 text-sm font-medium">
              <Repeat2 className="w-4 h-4 text-gray-600" />
              <span>You reposted</span>
            </div>
          )}
          
          {/* Header */}
          <div className="flex items-center gap-6 mb-3">
            <span className="font-bold text-gray-900 text-[15px] hover:underline cursor-pointer">
              {displayName}
            </span>
            <span className="text-gray-500 text-[15px]">{handle}</span>
            <span className="text-gray-300">•</span>
            <span className="text-gray-500 text-[15px] hover:underline cursor-pointer">
              {formatTime(suit.timestamp_ms)}
            </span>
          </div>

          {/* Post Content */}
          <p className="text-gray-800 mb-4 leading-relaxed text-[15px] whitespace-pre-wrap">
            {renderContent(suit.content)}
          </p>

          {/* Media */}
          {suit.walrus_blob_id && (
            <div className="mb-4 rounded-xl overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              {mediaType === 'video' ? (
                <video
                  src={WalrusService.getBlobUrl(suit.walrus_blob_id)}
                  controls
                  className="w-full max-h-[500px] object-contain bg-black"
                  onError={() => {
                    // Fallback to image if video fails
                    console.error('Failed to load video, trying as image:', suit.walrus_blob_id);
                    setMediaType('image');
                  }}
                >
                  Your browser does not support the video tag.
                </video>
              ) : mediaType === 'unknown' ? (
                // Show loading state while detecting
                <div className="w-full h-[300px] bg-gray-100 flex items-center justify-center">
                  <div className="text-gray-400 text-sm">Loading media...</div>
                </div>
              ) : (
                <img
                  src={WalrusService.getBlobUrl(suit.walrus_blob_id)}
                  alt="Suit media"
                  className="w-full max-h-[500px] object-cover"
                  onError={(e) => {
                    // Fallback if image fails to load
                    console.error('Failed to load media:', suit.walrus_blob_id);
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-12 mt-4">
            <button
              onClick={handleLike}
              disabled={likeSuit.isPending}
              className={`group flex items-center gap-2 transition-all disabled:opacity-50 active:scale-95 ${
                isLiked ? 'text-red-600' : 'text-gray-500 hover:text-red-600'
              }`}
            >
              <div className={`p-2 rounded-full transition-colors ${
                isLiked 
                  ? 'bg-red-100' 
                  : 'group-hover:bg-red-50'
              }`}>
                <HeartIcon 
                  className={`w-5 h-5 transition-transform ${
                    isLiked ? 'fill-red-600 scale-110' : ''
                  }`} 
                />
              </div>
              <span className={`text-sm font-medium ${isLiked ? 'text-red-600' : ''}`}>
                {suit.likes_count || 0}
              </span>
            </button>

            <button
              onClick={handleCommentButtonClick}
              className={`group flex items-center gap-2 transition-all active:scale-95 ${
                showComments ? 'text-blue-600' : 'text-gray-500 hover:text-blue-600'
              }`}
            >
              <div className={`p-2 rounded-full transition-colors ${
                showComments 
                  ? 'bg-blue-50' 
                  : 'group-hover:bg-blue-50'
              }`}>
                <ChatBubbleIcon className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium">{suit.comments_count || 0}</span>
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
                {suit.reposts_count || 0}
              </span>
            </button>
          </div>

          {/* Comments Display */}
          {showComments && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              {comments && comments.length > 0 ? (
                <div className="space-y-5 mb-4">
                  {comments.map((comment) => {
                    const CommentAuthor = ({ authorAddress, comment: commentData }: { authorAddress: string; comment: typeof comment }) => {
                      const { data: commentAuthorProfile } = useProfile(authorAddress);
                      const commentDisplayName = getUserDisplayName(authorAddress, commentAuthorProfile || undefined);
                      const commentHandle = getUserHandle(authorAddress, commentAuthorProfile || undefined);
                      const commentAvatarInitial = getUserAvatarInitial(authorAddress, commentAuthorProfile || undefined);
                      const commentProfileImageUrl = getUserProfileImageUrl(commentAuthorProfile || undefined);
                      
                      return (
                        <div className="flex gap-3 group">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden">
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
                                    fallback.className = 'text-sm font-semibold text-white';
                                    fallback.textContent = commentAvatarInitial;
                                    parent.appendChild(fallback);
                                  }
                                }}
                              />
                            ) : (
                              <span className="text-sm font-semibold text-white">
                                {commentAvatarInitial}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 bg-gray-50 rounded-xl px-4 py-3 group-hover:bg-gray-100 transition-colors">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="text-sm font-bold text-gray-900">
                                {commentDisplayName}
                              </span>
                              <span className="text-sm text-gray-500">
                                {commentHandle}
                              </span>
                              <span className="text-sm text-gray-400">
                                {formatTime(commentData.timestamp_ms)}
                              </span>
                            </div>
                            <p className="text-[15px] text-gray-800 leading-relaxed">
                              {commentData.content}
                            </p>
                            {commentData.walrus_blob_id && (
                              <div className="mt-3 rounded-lg overflow-hidden border border-gray-200">
                                <img
                                  src={WalrusService.getBlobUrl(commentData.walrus_blob_id)}
                                  alt="Comment media"
                                  className="w-full max-h-[300px] object-cover"
                                  onError={(e) => {
                                    console.error('Failed to load comment media:', commentData.walrus_blob_id);
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    };
                    
                    return (
                      <CommentAuthor key={comment.id} authorAddress={comment.author} comment={comment} />
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-4 mb-4">
                  <p className="text-sm text-gray-500">No comments yet. Be the first to comment!</p>
                </div>
              )}
            </div>
          )}

          {/* Comment Input */}
          {showCommentInput && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 focus-within:border-blue-500 focus-within:bg-white transition-all">
                <textarea
                  value={commentContent}
                  onChange={(e) => setCommentContent(e.target.value)}
                  placeholder="Write a comment..."
                  className="w-full min-h-[80px] bg-transparent resize-none focus:outline-none text-[15px] text-gray-800 placeholder-gray-400"
                />
                {commentMediaPreview && (
                  <div className="mt-3 relative rounded-lg overflow-hidden border border-gray-200">
                    <img
                      src={commentMediaPreview}
                      alt="Preview"
                      className="w-full max-h-[200px] object-cover"
                    />
                    <button
                      onClick={removeCommentMedia}
                      className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between mt-3">
                <input
                  ref={commentFileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleCommentMediaSelect}
                  className="hidden"
                />
                <button
                  onClick={() => commentFileInputRef.current?.click()}
                  className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Add image or video"
                >
                  <Image className="w-5 h-5" />
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowCommentInput(false);
                      setCommentContent('');
                      removeCommentMedia();
                    }}
                    className="px-5 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-900 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleComment}
                    disabled={(commentSuit.isPending || commentSuitWithMedia.isPending || isUploadingCommentMedia) || (!commentContent.trim() && !commentMediaFile)}
                    className="px-5 py-2.5 text-sm font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md active:scale-95"
                  >
                    {(commentSuit.isPending || commentSuitWithMedia.isPending || isUploadingCommentMedia) ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        {isUploadingCommentMedia ? 'Uploading...' : 'Posting...'}
                      </span>
                    ) : (
                      'Comment'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}