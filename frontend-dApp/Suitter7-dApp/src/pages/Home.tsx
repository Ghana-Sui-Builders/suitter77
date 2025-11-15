import { useSuits, useCreateSuit } from '../hooks/useContract';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { SuitCard } from '../components/SuitCard';
import toast from 'react-hot-toast';

export function Home() {
  const account = useCurrentAccount();
  const location = useLocation();
  const { data: suits, isLoading } = useSuits();
  const createSuit = useCreateSuit();
  const [content, setContent] = useState('');
  const suitRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  
  // Handle navigation from notifications - scroll to specific suit
  const [highlightedSuitId, setHighlightedSuitId] = useState<string | null>(null);
  
  useEffect(() => {
    if (location.state?.suitId && location.state?.scrollToSuit && suits && suits.length > 0) {
      const suitId = location.state.suitId;
      // Wait for suits to render and then scroll
      const scrollTimer = setTimeout(() => {
        const suitElement = suitRefs.current[suitId];
        if (suitElement) {
          // Highlight the suit
          setHighlightedSuitId(suitId);
          // Scroll to the suit
          suitElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Remove highlight after 3 seconds
          setTimeout(() => {
            setHighlightedSuitId(null);
          }, 3000);
        }
        // Clear the navigation state
        window.history.replaceState({}, document.title);
      }, 300);
      
      return () => clearTimeout(scrollTimer);
    }
  }, [location.state, suits]);

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
      {/* Create Suit Input */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4">
        <div className="flex gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-semibold text-base">
              {account?.address?.[0]?.toUpperCase() || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share something on-chain... #Sui"
              className="w-full min-h-[100px] resize-none border-none outline-none text-gray-800 placeholder-gray-400 text-[15px] leading-relaxed bg-transparent"
              style={{ fontFamily: 'inherit' }}
            />
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
              <span className={`text-xs font-medium ${content.length > 280 ? 'text-red-500' : 'text-gray-400'}`}>
                {content.length} / 280
              </span>
              <button
                onClick={handleCreateSuit}
                disabled={!content.trim() || content.length > 280 || createSuit.isPending}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 text-sm font-semibold"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
                Post Suit
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Suits Feed */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-gray-200 border-t-blue-600"></div>
            <p className="mt-4 text-gray-500 text-sm">Loading suits...</p>
          </div>
        ) : suits && suits.length > 0 ? (
          suits.map((suit) => (
            <div
              key={suit.id}
              ref={(el) => {
                if (el) suitRefs.current[suit.id] = el;
              }}
              id={`suit-${suit.id}`}
              className={`transition-all duration-300 ${
                highlightedSuitId === suit.id
                  ? 'ring-4 ring-blue-500 ring-opacity-50 rounded-2xl'
                  : ''
              }`}
            >
              <SuitCard suit={suit} />
            </div>
          ))
        ) : (
          <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-2xl border border-gray-100">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-gray-600 font-medium mb-2">No suits yet</p>
            <p className="text-gray-400 text-sm">Be the first to share something on-chain!</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {suits && suits.length > 0 && (
        <div className="flex items-center justify-center gap-3 mt-6 mb-4">
          <button className="px-5 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-900 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
            Newer
          </button>
          <span className="px-4 py-2.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-xl">
            Page 1 of 12
          </span>
          <button className="px-5 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-900 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
            Older
          </button>
        </div>
      )}
    </div>
  );
}