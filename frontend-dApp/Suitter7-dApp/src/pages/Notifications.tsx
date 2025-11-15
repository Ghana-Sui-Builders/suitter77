import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import { useNotifications, useFollowUser, useProfile, Profile } from '../hooks/useContract';
import { Button } from '@/components/ui/button';
import { getUserDisplayName, getUserHandle, getUserAvatarInitial, getUserProfileImageUrl } from '../utils/userDisplay';
import { SuitModal } from '../components/SuitModal';
import toast from 'react-hot-toast';

const PACKAGE_ID = import.meta.env.VITE_PACKAGE_ID || '0x2039f72d58be7166b210e54145ecff010ea50ddca6043db743ea8a25e7542d39';

// Helper function to extract Option<String> from Sui object (same as in useContract.ts)
function extractOptionString(optionField: any): string | undefined {
  if (!optionField) return undefined;
  if (typeof optionField === 'string') return optionField || undefined;
  if (optionField.fields?.vec && Array.isArray(optionField.fields.vec) && optionField.fields.vec.length > 0) {
    return optionField.fields.vec[0] || undefined;
  }
  if (optionField.fields && Array.isArray(optionField.fields) && optionField.fields.length > 0) {
    return optionField.fields[0] || undefined;
  }
  if (optionField.vec && Array.isArray(optionField.vec) && optionField.vec.length > 0) {
    return optionField.vec[0] || undefined;
  }
  if (optionField.fields?.[0]) return optionField.fields[0] || undefined;
  return undefined;
}

export function Notifications() {
  const account = useCurrentAccount();
  const navigate = useNavigate();
  const suiClient = useSuiClient();
  const { data: notifications, isLoading } = useNotifications(account?.address || null);
  const { data: currentUserProfile } = useProfile(account?.address || null);
  const [activeTab, setActiveTab] = useState<'all' | 'mentions' | 'likes' | 'follows'>('all');
  
  // Modal state
  const [selectedSuitId, setSelectedSuitId] = useState<string | null>(null);
  const [modalShowComments, setModalShowComments] = useState(false);
  const [modalShowReply, setModalShowReply] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Follow state
  const [followingUser, setFollowingUser] = useState<string | null>(null);
  const followUser = useFollowUser();
  
  // Helper function to fetch profile by address
  const fetchProfileByAddress = async (address: string): Promise<Profile | null> => {
    try {
      const objects = await suiClient.getOwnedObjects({
        owner: address,
        filter: {
          StructType: `${PACKAGE_ID}::profile::Profile`,
        },
        options: {
          showContent: true,
          showType: true,
        },
      });

      if (objects.data.length === 0) return null;

      const profileObj = objects.data[0];
      if (!profileObj.data) return null;
      const content = profileObj.data.content as any;
      if (!content || !content.fields) return null;

      return {
        id: profileObj.data.objectId,
        owner: content.fields.owner || address,
        username: content.fields.username || '',
        bio: content.fields.bio || '',
        profile_image_blob_id: extractOptionString(content.fields.profile_image_blob_id),
        suits_count: Number(content.fields.suits_count || 0),
        followers_count: Number(content.fields.followers_count || 0),
        following_count: Number(content.fields.following_count || 0),
        created_at_ms: Number(content.fields.created_at_ms || 0),
      } as Profile;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  };

  // Filter notifications by tab
  const filteredNotifications = useMemo(() => {
    if (!notifications) return [];
    
    switch (activeTab) {
      case 'mentions':
        return notifications.filter((n) => n.type === 'mention');
      case 'likes':
        return notifications.filter((n) => n.type === 'like');
      case 'follows':
        return notifications.filter((n) => n.type === 'follow');
      default:
        return notifications;
    }
  }, [notifications, activeTab]);

  // Get user profile for avatar (deprecated - use getUserDisplayName instead)
  const getUserProfile = (userAddress: string) => {
    // This is kept for backward compatibility but should use getUserDisplayName
    return {
      avatar: getUserAvatarInitial(userAddress, null),
      username: getUserDisplayName(userAddress, null),
    };
  };

  // Handle view suit - navigate to home page with suit ID in state
  const handleViewSuit = (suitId: string | undefined) => {
    if (!suitId) return;
    // Navigate to home page with suit ID in state
    navigate('/', { state: { suitId, scrollToSuit: true } });
  };

  // Handle view thread (show comments)
  const handleViewThread = (suitId: string | undefined) => {
    if (!suitId) return;
    setSelectedSuitId(suitId);
    setModalShowComments(true);
    setModalShowReply(false);
    setIsModalOpen(true);
  };

  // Handle reply (show comment input)
  const handleReply = (suitId: string | undefined) => {
    if (!suitId) return;
    setSelectedSuitId(suitId);
    setModalShowComments(true);
    setModalShowReply(true);
    setIsModalOpen(true);
  };

  // Handle follow back
  const handleFollowBack = async (userAddress: string) => {
    if (!account?.address || !currentUserProfile?.id) {
      toast.error('Please connect your wallet and create a profile first');
      return;
    }

    setFollowingUser(userAddress);
    const toastId = toast.loading('Following user...');
    
    try {
      // Fetch the profile of the user to follow
      const userToFollowProfile = await fetchProfileByAddress(userAddress);
      
      if (!userToFollowProfile?.id) {
        toast.dismiss(toastId);
        toast.error('User profile not found. They may need to create a profile first.');
        setFollowingUser(null);
        return;
      }

      followUser.mutate(
        {
          followerProfileId: currentUserProfile.id,
          followeeProfileId: userToFollowProfile.id,
        },
        {
          onSuccess: () => {
            toast.dismiss(toastId);
            toast.success('Successfully followed user!');
            setFollowingUser(null);
          },
          onError: (error: any) => {
            toast.dismiss(toastId);
            const errorMessage = error?.message || error?.toString() || 'Failed to follow user. Please try again.';
            toast.error(errorMessage);
            setFollowingUser(null);
          },
        }
      );
    } catch (error) {
      toast.dismiss(toastId);
      toast.error('Failed to fetch user profile. Please try again.');
      setFollowingUser(null);
    }
  };

  // Close modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedSuitId(null);
    setModalShowComments(false);
    setModalShowReply(false);
  };

  const tabs = [
    { id: 'all', label: 'All' },
    { id: 'mentions', label: 'Mentions' },
    { id: 'likes', label: 'Likes' },
    { id: 'follows', label: 'Follows' },
  ] as const;

  return (
    <div className="w-full">
      {/* Header */}
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Notifications</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-3 text-sm font-medium transition-colors rounded-t-lg relative ${
              activeTab === tab.id
                ? 'text-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full"></span>
            )}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      {!account ? (
        <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-2xl border border-gray-100">
          <p className="text-gray-600 font-medium mb-2">Connect your wallet</p>
          <p className="text-gray-400 text-sm">Connect your wallet to see your notifications</p>
        </div>
      ) : isLoading ? (
        <div className="text-center py-16">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-gray-200 border-t-blue-600"></div>
          <p className="mt-4 text-gray-500 text-sm">Loading notifications...</p>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-2xl border border-gray-100">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
          </div>
          <p className="text-gray-600 font-medium mb-2">No notifications</p>
          <p className="text-gray-400 text-sm">You're all caught up! Check back later for new notifications.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredNotifications.map((notif, idx) => {
            const NotificationUser = ({ userAddress }: { userAddress: string }) => {
              const { data: userProfile } = useProfile(userAddress);
              const displayName = getUserDisplayName(userAddress, userProfile || undefined);
              const handle = getUserHandle(userAddress, userProfile || undefined);
              const avatarInitial = getUserAvatarInitial(userAddress, userProfile || undefined);
              const profileImageUrl = getUserProfileImageUrl(userProfile || undefined);
              
              return (
                <div className="flex items-start gap-4 p-4 bg-white rounded-xl border border-gray-100 hover:shadow-md transition-shadow">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden">
                    {profileImageUrl ? (
                      <img
                        src={profileImageUrl}
                        alt={displayName}
                        className="w-full h-full rounded-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            const fallback = document.createElement('span');
                            fallback.className = 'text-white font-semibold text-sm';
                            fallback.textContent = avatarInitial;
                            parent.appendChild(fallback);
                          }
                        }}
                      />
                    ) : (
                      <span className="text-white font-semibold text-sm">
                        {avatarInitial}
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-gray-900 text-sm">{displayName}</span>
                      <span className="text-gray-500 text-xs">{handle}</span>
                      <span className="text-gray-400 text-xs">•</span>
                      <span className="text-gray-500 text-xs">{notif.time}</span>
                    </div>
                    <p className="text-gray-700 text-sm">
                      <span className="font-semibold">{displayName}</span> {notif.action}
                    </p>
                    {notif.content && (
                      <p className="text-gray-600 text-sm mt-2 italic">"{notif.content}"</p>
                    )}
                    
                    {/* Action Buttons */}
                    <div className="flex gap-2 mt-3">
                      {notif.suit_id && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewSuit(notif.suit_id)}
                            className="text-xs"
                          >
                            View Suit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewThread(notif.suit_id)}
                            className="text-xs"
                          >
                            View Thread
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReply(notif.suit_id)}
                            className="text-xs"
                          >
                            Reply
                          </Button>
                        </>
                      )}
                      {notif.type === 'follow' && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleFollowBack(userAddress)}
                          disabled={followingUser === userAddress}
                          className="text-xs bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          {followingUser === userAddress ? 'Following...' : 'Follow Back'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            };
            
            return <NotificationUser key={idx} userAddress={notif.userAddress} />;
          })}
        </div>
      )}

      {/* Suit Modal */}
      <SuitModal
        suitId={selectedSuitId}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        showComments={modalShowComments}
        showReply={modalShowReply}
      />
    </div>
  );
}
