import { useSuit } from '../hooks/useContract';
import { SuitCard } from './SuitCard';

// XMarkIcon component for modal close button
const XMarkIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

interface SuitModalProps {
  suitId: string | null;
  isOpen: boolean;
  onClose: () => void;
  showComments?: boolean;
  showReply?: boolean;
}

export function SuitModal({ suitId, isOpen, onClose, showComments = false, showReply = false }: SuitModalProps) {
  const { data: suit, isLoading } = useSuit(suitId);

  if (!isOpen || !suitId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-gray-900">Suit Details</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close"
          >
            <XMarkIcon className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-16">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-gray-200 border-t-blue-600"></div>
              <p className="mt-4 text-gray-500 text-sm">Loading suit...</p>
            </div>
          ) : suit ? (
            <SuitCard
              suit={suit}
              authorUsername={undefined}
              authorAvatar={undefined}
              defaultShowComments={showComments}
              defaultShowReply={showReply}
            />
          ) : (
            <div className="text-center py-16">
              <p className="text-gray-500 text-sm">Suit not found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

