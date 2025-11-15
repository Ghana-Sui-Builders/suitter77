import { useState, useMemo } from 'react';
import { SuitCard } from '../components/SuitCard';
import { useSuits, useCreateSuit, useAllProfiles, useTopicStats } from '../hooks/useContract';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';

export function Explore() {
  const [activeTab, setActiveTab] = useState<'trending' | 'latest' | 'people' | 'topics'>('trending');
  const { data: suits, isLoading } = useSuits();
  const { data: allProfiles, isLoading: isLoadingProfiles } = useAllProfiles();
  const { data: topicStats } = useTopicStats(suits);
  const account = useCurrentAccount();
  const createSuit = useCreateSuit();
  const [content, setContent] = useState('');
  const [filter, setFilter] = useState<'all' | 'following' | 'media'>('all');
  const [peopleFilter, setPeopleFilter] = useState<'all' | 'verified'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [topicSearchQuery, setTopicSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  // People to follow (top 3 by followers count)
  const peopleToFollow = useMemo(() => {
    if (!allProfiles || allProfiles.length === 0) return [];
    return allProfiles
      .sort((a, b) => b.followers_count - a.followers_count)
      .slice(0, 3)
      .map((profile) => ({
        name: profile.username || `User${profile.owner.slice(2, 6)}`,
        username: `@${profile.username || profile.owner.slice(0, 6)}`,
        avatar: (profile.username || profile.owner)[0]?.toUpperCase() || 'U',
      }));
  }, [allProfiles]);

  // Topic tags from real data
  const topicTags = useMemo(() => {
    if (!topicStats || topicStats.length === 0) {
      // Fallback to common topics if no stats available
      return [
        { name: 'Sui', count: 0, label: 'Suits' },
        { name: 'zkLogin', count: 0, label: '' },
        { name: 'DeFi', count: 0, label: '' },
        { name: 'NFTs', count: 0, label: '' },
        { name: 'Builders', count: 0, label: '' },
        { name: 'Security', count: 0, label: '' },
      ];
    }
    return topicStats.slice(0, 6).map((topic) => ({
      name: topic.hashtag.charAt(0).toUpperCase() + topic.hashtag.slice(1),
      count: topic.count,
      label: '',
    }));
  }, [topicStats]);

  // Filter suits by hashtag
  const getSuitsByHashtag = (hashtag: string) => {
    if (!suits) return [];
    const tag = hashtag.toLowerCase().replace('#', '');
    return suits
      .filter((suit) => suit.content.toLowerCase().includes(`#${tag}`))
      .slice(0, 2); // Show only first 2 suits per topic
  };

  const tabs = [
    { id: 'trending', label: 'Trending' },
    { id: 'latest', label: 'Latest' },
    { id: 'people', label: 'People' },
    { id: 'topics', label: 'Topics' },
  ] as const;

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

  return (
    <div className="w-full">
      {/* Header */}
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Explore</h1>

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

      {/* Trending Tab Content */}
      {activeTab === 'trending' && (
        <div className="space-y-8">
          {/* Trending Suits Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Trending Suits</h2>
              <button className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline">
                See all
              </button>
            </div>
            
            {isLoading ? (
              <div className="text-center py-16">
                <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-gray-200 border-t-blue-600"></div>
                <p className="mt-4 text-gray-500 text-sm">Loading trending suits...</p>
              </div>
            ) : suits && suits.length > 0 ? (
              <div className="space-y-4">
                {suits.slice(0, 2).map((suit) => (
                  <SuitCard key={suit.id} suit={suit} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-2xl border border-gray-100">
                <p className="text-gray-600 font-medium">No trending suits yet</p>
                <p className="text-gray-400 text-sm mt-2">Be the first to create something trending!</p>
              </div>
            )}
          </div>

          {/* People to Follow Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">People to follow</h2>
              <button className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline">
                View more
              </button>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              {peopleToFollow.length > 0 ? (
                peopleToFollow.map((person, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-md transition-shadow text-center"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-md">
                        <span className="text-white font-semibold text-lg">
                          {person.avatar}
                        </span>
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-[15px]">{person.name}</p>
                        <p className="text-gray-500 text-sm mt-0.5">{person.username}</p>
                      </div>
                      <Button
                        variant="default"
                        size="sm"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
                      >
                        Follow
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-3 text-center py-8 text-gray-400 text-sm">
                  No users to follow yet
                </div>
              )}
            </div>
          </div>

          {/* Topics Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Topics</h2>
              <button className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline">
                Browse
              </button>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              {topicStats && topicStats.length > 0 ? (
                topicStats.slice(0, 3).map((topic, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-md transition-shadow"
                  >
                    <h3 className="text-lg font-bold text-gray-900 mb-2">#{topic.hashtag}</h3>
                    <p className="text-sm text-gray-500">
                      {topic.count >= 1000
                        ? `${(topic.count / 1000).toFixed(1)}k`
                        : topic.count}{' '}
                      Suits today
                    </p>
                  </div>
                ))
              ) : (
                <div className="col-span-3 text-center py-8 text-gray-400 text-sm">
                  No topics available yet
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Latest Tab Content */}
      {activeTab === 'latest' && (
        <div className="space-y-4">
          {/* Latest Suits Header */}
          <h2 className="text-xl font-bold text-gray-900">Latest Suits</h2>

          {/* Create Suit Input */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex gap-4">
              {/* Profile Picture */}
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-semibold text-base">
                  {account?.address?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>

              {/* Input Area */}
              <div className="flex-1 min-w-0">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write a new Suit..."
                  className="w-full min-h-[100px] resize-none border border-gray-200 rounded-xl px-4 py-3 mb-3 text-gray-800 placeholder-gray-400 text-[15px] leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  style={{ fontFamily: 'inherit' }}
                />
                <div className="flex items-center justify-between">
                  {/* Filter Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setFilter('all')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                        filter === 'all'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setFilter('following')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                        filter === 'following'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Following
                    </button>
                    <button
                      onClick={() => setFilter('media')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                        filter === 'media'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      With media
                    </button>
                  </div>
                  {/* Post Button and Character Count */}
                  <div className="flex items-center gap-3">
                    {content.length > 0 && (
                      <span className={`text-xs font-medium ${content.length > 280 ? 'text-red-500' : 'text-gray-400'}`}>
                        {content.length} / 280
                      </span>
                    )}
                    <button
                      onClick={handleCreateSuit}
                      disabled={!content.trim() || content.length > 280 || createSuit.isPending}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-semibold whitespace-nowrap"
                    >
                      {createSuit.isPending ? 'Posting...' : 'Post'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Suits Feed */}
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-16">
                <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-gray-200 border-t-blue-600"></div>
                <p className="mt-4 text-gray-500 text-sm">Loading latest suits...</p>
              </div>
            ) : suits && suits.length > 0 ? (
              suits.map((suit) => (
                <SuitCard key={suit.id} suit={suit} />
              ))
            ) : (
              <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-2xl border border-gray-100">
                <p className="text-gray-600 font-medium">No suits yet</p>
                <p className="text-gray-400 text-sm mt-2">Be the first to share something on-chain!</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* People Tab Content */}
      {activeTab === 'people' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">People on Suitter</h2>
            <button className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline">
              Invite friends
            </button>
          </div>

          {/* Search Input */}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search people by name or handle"
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />

          {/* Filter Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setPeopleFilter('all')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                peopleFilter === 'all'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setPeopleFilter('verified')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                peopleFilter === 'verified'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Verified
            </button>
          </div>

          {/* People Grid */}
          {isLoadingProfiles ? (
            <div className="text-center py-16">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-gray-200 border-t-blue-600"></div>
              <p className="mt-4 text-gray-500 text-sm">Loading people...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {allProfiles && allProfiles.length > 0 ? (
                allProfiles
                  .filter((person) => {
                    // Filter by search query
                    if (searchQuery) {
                      const query = searchQuery.toLowerCase();
                      return (
                        person.username.toLowerCase().includes(query) ||
                        person.bio.toLowerCase().includes(query) ||
                        person.owner.toLowerCase().includes(query)
                      );
                    }
                    // Note: verified filter would need a verified field in Profile
                    // For now, we'll skip it since it's not in the Profile struct
                    return true;
                  })
                  .map((person) => (
                    <div
                      key={person.id}
                      className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start gap-4">
                        {/* Profile Picture */}
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-md">
                          {person.profile_image_blob_id ? (
                            <img
                              src={`https://walrus.sui.io/v1/blobs/${person.profile_image_blob_id}`}
                              alt={person.username}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-white font-semibold text-lg">
                              {(person.username || person.owner)[0]?.toUpperCase() || 'U'}
                            </span>
                          )}
                        </div>

                        {/* User Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-gray-900 text-[15px]">
                              {person.username || `User${person.owner.slice(2, 6)}`}
                            </h3>
                          </div>
                          <p className="text-gray-500 text-sm mb-2">
                            @{person.username || person.owner.slice(0, 6)}
                          </p>
                          <p className="text-gray-700 text-sm mb-3 leading-relaxed">
                            {person.bio || 'No bio yet'}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                            <span>
                              {person.followers_count >= 1000
                                ? `${(person.followers_count / 1000).toFixed(1)}k`
                                : person.followers_count}{' '}
                              followers
                            </span>
                            <span>
                              {person.following_count >= 1000
                                ? `${(person.following_count / 1000).toFixed(1)}k`
                                : person.following_count}{' '}
                              following
                            </span>
                          </div>
                        </div>

                        {/* Follow Button */}
                        <Button
                          variant="default"
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white font-medium whitespace-nowrap"
                        >
                          Follow
                        </Button>
                      </div>
                    </div>
                  ))
              ) : (
                <div className="col-span-2 text-center py-16 text-gray-400 text-sm">
                  No people found
                </div>
              )}
            </div>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-center gap-3 pt-4">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-900 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Prev
            </button>
            <span className="px-4 py-2.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-xl">
              Page {currentPage}
            </span>
            <button
              onClick={() => setCurrentPage((p) => p + 1)}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-900 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Topics Tab Content */}
      {activeTab === 'topics' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Topics</h2>
            <button className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline">
              Suggest topic
            </button>
          </div>

          {/* Search Input */}
          <input
            type="text"
            value={topicSearchQuery}
            onChange={(e) => setTopicSearchQuery(e.target.value)}
            placeholder="Search topics or hashtags"
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />

          {/* Topic Tags */}
          <div className="flex flex-wrap gap-2">
            {topicTags.map((tag) => (
              <button
                key={tag.name}
                onClick={() => setSelectedTopic(tag.name)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  selectedTopic === tag.name
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tag.name}{' '}
                {tag.count >= 1000
                  ? `${(tag.count / 1000).toFixed(1)}k`
                  : tag.count}
                {tag.label ? ` ${tag.label}` : ''}
              </button>
            ))}
          </div>

          {/* Two-Column Topic Display */}
          {topicStats && topicStats.length >= 2 ? (
            <div className="grid grid-cols-2 gap-6">
              {/* Left Column - First Topic */}
              {topicStats[0] && (
                <div className="space-y-4">
                  <div className="bg-white rounded-2xl border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xl font-bold text-gray-900">
                        #{topicStats[0].hashtag}
                      </h3>
                      <button className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
                        Subscribe
                      </button>
                    </div>
                    <p className="text-sm text-gray-500 mb-4">
                      {topicStats[0].count >= 1000
                        ? `${(topicStats[0].count / 1000).toFixed(1)}k`
                        : topicStats[0].count}{' '}
                      Suits · {topicStats[0].activeToday >= 1000
                        ? `${(topicStats[0].activeToday / 1000).toFixed(1)}k`
                        : topicStats[0].activeToday}{' '}
                      active today
                    </p>
                    <div className="space-y-4">
                      {getSuitsByHashtag(topicStats[0].hashtag).length > 0 ? (
                        getSuitsByHashtag(topicStats[0].hashtag).map((suit) => (
                          <SuitCard key={suit.id} suit={suit} />
                        ))
                      ) : (
                        <div className="text-center py-8 text-gray-400 text-sm">
                          No suits found for #{topicStats[0].hashtag}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Right Column - Second Topic */}
              {topicStats[1] && (
                <div className="space-y-4">
                  <div className="bg-white rounded-2xl border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xl font-bold text-gray-900">
                        #{topicStats[1].hashtag}
                      </h3>
                      <button className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
                        Subscribe
                      </button>
                    </div>
                    <p className="text-sm text-gray-500 mb-4">
                      {topicStats[1].count >= 1000
                        ? `${(topicStats[1].count / 1000).toFixed(1)}k`
                        : topicStats[1].count}{' '}
                      Suits · {topicStats[1].activeToday >= 1000
                        ? `${(topicStats[1].activeToday / 1000).toFixed(1)}k`
                        : topicStats[1].activeToday}{' '}
                      active today
                    </p>
                    <div className="space-y-4">
                      {getSuitsByHashtag(topicStats[1].hashtag).length > 0 ? (
                        getSuitsByHashtag(topicStats[1].hashtag).map((suit) => (
                          <SuitCard key={suit.id} suit={suit} />
                        ))
                      ) : (
                        <div className="text-center py-8 text-gray-400 text-sm">
                          No suits found for #{topicStats[1].hashtag}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-16 text-gray-400 text-sm">
              No topics available yet. Create suits with hashtags to see trending topics!
            </div>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-center gap-3 pt-4">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-900 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Prev
            </button>
            <button
              onClick={() => setCurrentPage((p) => p + 1)}
              className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
