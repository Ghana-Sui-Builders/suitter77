import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Hash, 
  Users, 
  User, 
  Bell, 
  PenSquare, 
  Search,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSuits, useTopicStats, useAllProfiles } from '../hooks/useContract';
import { FollowButton } from './FollowButton';
import { getUserDisplayName, getUserHandle, getUserAvatarInitial, getUserProfileImageUrl } from '../utils/userDisplay';

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const account = useCurrentAccount();
  const { data: suits } = useSuits();
  const { data: topicStats } = useTopicStats(suits);
  const { data: allProfiles, isLoading: isLoadingProfiles } = useAllProfiles();

  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/explore', label: 'Explore', icon: Hash },
    { path: '/communities', label: 'Communities', icon: Users },
    { path: '/profile', label: 'Profile', icon: User },
    { path: '/notifications', label: 'Notifications', icon: Bell },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="relative">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <span className="text-xl font-bold text-foreground">Suitter</span>
            </Link>

            {/* Search Bar */}
            <div className="flex-1 max-w-lg mx-8 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search users, Suits, or hashtags"
                className="w-full pl-10 pr-4 py-2 bg-muted border border-input rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent placeholder:text-muted-foreground"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                asChild
              >
                <Link to="/notifications">
                  <Bell className="w-5 h-5" />
                </Link>
              </Button>
              <Button
                asChild
                size="sm"
              >
                <Link to="/create" className="flex items-center gap-2">
                  <PenSquare className="w-4 h-4" />
                  Create Suit
                </Link>
              </Button>
              <ConnectButton />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex">
          {/* Left Sidebar */}
          <aside className="w-64 min-h-[calc(100vh-4rem)] border-r border-border pt-6 sticky top-16">
            <nav className="space-y-1 px-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                      isActive
                        ? "bg-blue-50 text-blue-600 font-medium dark:bg-blue-950/50 dark:text-blue-400"
                        : "text-muted-foreground hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/50 dark:hover:text-blue-400"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 px-8 py-6 min-w-0">
            {children}
          </main>

          {/* Right Sidebar */}
          <aside className="w-64 min-h-[calc(100vh-4rem)] border-l border-border pt-6 px-6 sticky top-16 space-y-6">
            {/* Trending Hashtags */}
            <div className="bg-card rounded-2xl border border-border p-4">
              <h2 className="text-lg font-semibold text-foreground mb-4">Trending Hashtags</h2>
              <div className="space-y-2">
                {topicStats && topicStats.length > 0 ? (
                  topicStats.slice(0, 5).map((topic) => (
                    <Button
                      key={topic.hashtag}
                      variant="ghost"
                      className="w-full justify-start text-primary hover:bg-accent hover:text-accent-foreground"
                      asChild
                    >
                      <Link to={`/explore?hashtag=${topic.hashtag}`}>
                        <Hash className="w-4 h-4 mr-2" />
                        #{topic.hashtag}
                        <span className="ml-auto text-xs text-muted-foreground">
                          {topic.count >= 1000 ? `${(topic.count / 1000).toFixed(1)}k` : topic.count}
                        </span>
                      </Link>
                    </Button>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground py-4 text-center">
                    No trending hashtags yet
                  </div>
                )}
              </div>
            </div>

            {/* Who to follow */}
            <div className="bg-card rounded-2xl border border-border p-4">
              <h2 className="text-lg font-semibold text-foreground mb-4">Who to follow</h2>
              <div className="space-y-4">
                {isLoadingProfiles ? (
                  <div className="text-sm text-muted-foreground py-4 text-center">
                    Loading...
                  </div>
                ) : (() => {
                  // Filter out current user and get top profiles by followers
                  const filteredProfiles = allProfiles
                    ?.filter((profile) => 
                      account?.address?.toLowerCase() !== profile.owner.toLowerCase()
                    )
                    .sort((a, b) => b.followers_count - a.followers_count)
                    .slice(0, 3) || [];

                  if (filteredProfiles.length === 0) {
                    return (
                      <div className="text-sm text-muted-foreground py-4 text-center">
                        No users to follow yet
                      </div>
                    );
                  }

                  return filteredProfiles.map((profile) => {
                    const displayName = getUserDisplayName(profile.owner, profile);
                    const handle = getUserHandle(profile.owner, profile);
                    const avatarInitial = getUserAvatarInitial(profile.owner, profile);
                    const profileImageUrl = getUserProfileImageUrl(profile);

                    return (
                      <div key={profile.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground shrink-0 overflow-hidden">
                            {profileImageUrl ? (
                              <img
                                src={profileImageUrl}
                                alt={displayName}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const parent = target.parentElement;
                                  if (parent) {
                                    const fallback = document.createElement('span');
                                    fallback.className = 'text-muted-foreground font-medium text-sm';
                                    fallback.textContent = avatarInitial;
                                    parent.appendChild(fallback);
                                  }
                                }}
                              />
                            ) : (
                              <span>{avatarInitial}</span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-sm text-foreground truncate">{displayName}</div>
                            <div className="text-xs text-muted-foreground truncate">{handle}</div>
                          </div>
                        </div>
                        <FollowButton
                          profile={profile}
                          size="sm"
                          variant="default"
                          className="shrink-0 ml-2"
                        />
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
