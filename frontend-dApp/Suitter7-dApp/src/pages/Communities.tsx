import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function Communities() {
  const navigate = useNavigate();
  const communities = [
    {
      name: 'Sui Builders',
      description: 'Ship infra, SDKs, and tools on Sui. Weekly build threads.',
      members: '12.8k',
      status: 'Public',
      icon: '🔧',
    },
    {
      name: 'zkLogin Devs',
      description: 'Auth patterns, examples, and security best practices.',
      members: '7.2k',
      status: 'Members only',
      icon: '🔐',
    },
    {
      name: 'Sui Traders',
      description: 'Markets, strategies, and on-chain analytics chats.',
      members: '18.4k',
      status: 'Public',
      icon: '📈',
    },
    {
      name: 'Move Language',
      description: 'Learn, share snippets, audits, and patterns for Move.',
      members: '9.6k',
      status: 'Public',
      icon: '💻',
    },
  ];

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

      <div className="space-y-3">
        {communities.map((community, idx) => (
          <Card key={idx}>
            <CardContent className="p-6">
              <div className="flex gap-4 items-center">
                <div className="size-[60px] rounded-xl bg-muted flex items-center justify-center text-2xl shrink-0">
                  {community.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold mb-1">
                    {community.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    {community.description}
                  </p>
                  <div className="flex gap-3 items-center text-sm text-muted-foreground">
                    <span>{community.members} members</span>
                    <span>•</span>
                    <span>{community.status}</span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="ghost" size="sm">
                    View
                  </Button>
                  <Button size="sm">
                    {community.status === 'Public' ? 'Join' : 'Request'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-center gap-2">
        <Button variant="ghost">Previous</Button>
        <span className="text-sm text-muted-foreground px-4">
          Page 1 of 2 • Showing 6 of 9 communities
        </span>
        <Button>Next Page</Button>
      </div>
    </div>
  );
}



