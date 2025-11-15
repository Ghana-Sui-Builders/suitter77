import { Box, Flex, Text, Button, TextArea, Tabs, TextField } from '@radix-ui/themes';
import { useCreateSuit } from '../hooks/useContract';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useState, useRef } from 'react';
import { WalrusService } from '../services/walrus';
import toast from 'react-hot-toast';
import { Image, Video, X } from 'lucide-react';

export function CreateSuit() {
  const account = useCurrentAccount();
  const [activeTab, setActiveTab] = useState<'text' | 'video' | 'image'>('text');
  const [content, setContent] = useState('');
  const [walrusBlobId, setWalrusBlobId] = useState<string>('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const createSuit = useCreateSuit();

  const handleMediaSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 5MB for Walrus)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setMediaFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setMediaPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to Walrus
    setIsUploadingMedia(true);
    const toastId = toast.loading('Uploading to Walrus...');
    
    try {
      const walrusBlob = await WalrusService.uploadFile(file, account?.address);
      setWalrusBlobId(walrusBlob.blobId);
      toast.dismiss(toastId);
      toast.success('Media uploaded successfully!');
    } catch (error: any) {
      toast.dismiss(toastId);
      toast.error(error?.message || 'Failed to upload media. Please try again.');
      setMediaFile(null);
      setMediaPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const removeMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
    setWalrusBlobId('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = () => {
    if (!account) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (activeTab === 'text') {
      if (!content.trim()) {
        toast.error('Please enter some content');
        return;
      }
      createSuit.mutate(
        { content: content.trim() },
        {
          onSuccess: () => {
            setContent('');
            toast.success('Suit posted successfully!');
          },
          onError: (error: any) => {
            toast.error(error?.message || 'Failed to post suit');
          },
        }
      );
    } else {
      if (!walrusBlobId && !content.trim()) {
        toast.error('Please add media or enter content');
        return;
      }
      if (!walrusBlobId) {
        toast.error('Please wait for media upload to complete');
        return;
      }
      createSuit.mutate(
        { content: content.trim() || '', walrusBlobId },
        {
          onSuccess: () => {
            setContent('');
            setMediaFile(null);
            setMediaPreview(null);
            setWalrusBlobId('');
            toast.success('Suit with media posted successfully!');
          },
          onError: (error: any) => {
            toast.error(error?.message || 'Failed to post suit');
          },
        }
      );
    }
  };

  return (
    <Box>
      <Flex justify="between" align="center" mb="4">
        <Text size="6" weight="bold">
          {activeTab === 'text' ? 'New Text Post' : activeTab === 'video' ? 'New Video Post' : 'New Image Post'}
        </Text>
        <Button variant="soft" size="2">
          Back
        </Button>
      </Flex>

      <Flex gap="4">
        {/* Left Panel */}
        <Box style={{ flex: 1 }}>
          <Tabs.Root value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
            <Tabs.List mb="4">
              <Tabs.Trigger value="text">Text</Tabs.Trigger>
              <Tabs.Trigger value="video">Video</Tabs.Trigger>
              <Tabs.Trigger value="image">Image</Tabs.Trigger>
            </Tabs.List>

            <Tabs.Content value="text">
              <TextArea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Share what's on your mind... #web3 @friend"
                style={{ minHeight: 200, marginBottom: '1rem' }}
              />
              <Flex justify="between" align="center" mb="4">
                <Text size="2" style={{ color: 'var(--gray-11)' }}>
                  {content.length}/280 characters
                </Text>
                <Text size="2" style={{ color: 'var(--gray-11)' }}>
                  Draft autosaves
                </Text>
              </Flex>
              <Flex gap="2" mb="4">
                <Button variant="soft" size="2">
                  Add hashtags
                </Button>
                <Button variant="soft" size="2">
                  Mention
                </Button>
                <Button variant="soft" size="2">
                  Public
                </Button>
              </Flex>
              <Flex gap="2">
                <Button variant="soft" size="2">
                  Schedule
                </Button>
                <Button variant="soft" size="2">
                  Preview
                </Button>
              </Flex>
            </Tabs.Content>

            <Tabs.Content value="video">
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleMediaSelect}
                className="hidden"
              />
              {mediaPreview ? (
                <Box mb="4" position="relative">
                  <video
                    src={mediaPreview}
                    controls
                    className="w-full rounded-xl border border-gray-200"
                    style={{ maxHeight: '400px' }}
                  />
                  <Button
                    variant="soft"
                    size="1"
                    onClick={removeMedia}
                    style={{ position: 'absolute', top: '8px', right: '8px' }}
                  >
                    <X size={16} />
                  </Button>
                </Box>
              ) : (
                <Box
                  mb="4"
                  p="6"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: '2px dashed var(--gray-a6)',
                    borderRadius: '12px',
                    textAlign: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <Text size="3" style={{ color: 'var(--gray-11)' }}>
                    {isUploadingMedia ? 'Uploading...' : 'Click to upload or drag & drop .mp4, .mov, .webm (max 5MB)'}
                  </Text>
                </Box>
              )}
              <TextField.Root
                placeholder="Add a concise title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                mb="3"
              />
              <TextField.Root
                placeholder="Select a topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                mb="3"
              />
              <Box mb="4">
                <Box mb="2">
                  <Text size="2">
                    Thumbnail
                  </Text>
                </Box>
                <Box
                  style={{
                    width: 100,
                    height: 100,
                    backgroundColor: 'var(--gray-4)',
                    borderRadius: '8px',
                  }}
                />
                <Text size="2" style={{ color: 'var(--gray-11)' }}>
                  Upload or auto-generate from video
                </Text>
              </Box>
              <TextField.Root placeholder="Public" mb="3" />
              <TextField.Root placeholder="Enabled" mb="4" />
              <Flex gap="2">
                <Button variant="soft" size="2">
                  Save Draft
                </Button>
                <Button size="2" onClick={handleSubmit} style={{ backgroundColor: 'var(--blue-9)' }}>
                  Post Video
                </Button>
              </Flex>
            </Tabs.Content>

            <Tabs.Content value="image">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleMediaSelect}
                className="hidden"
              />
              {mediaPreview ? (
                <Box mb="4" position="relative">
                  <img
                    src={mediaPreview}
                    alt="Preview"
                    className="w-full rounded-xl border border-gray-200"
                    style={{ maxHeight: '400px', objectFit: 'contain' }}
                  />
                  <Button
                    variant="soft"
                    size="1"
                    onClick={removeMedia}
                    style={{ position: 'absolute', top: '8px', right: '8px' }}
                  >
                    <X size={16} />
                  </Button>
                </Box>
              ) : (
                <Box
                  mb="4"
                  p="6"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: '2px dashed var(--gray-a6)',
                    borderRadius: '12px',
                    textAlign: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <Text size="3" style={{ color: 'var(--gray-11)' }}>
                    {isUploadingMedia ? 'Uploading...' : 'Click to upload or drag & drop image files (max 5MB)'}
                  </Text>
                </Box>
              )}
              <TextArea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write a caption, hashtags, or mention people..."
                style={{ minHeight: 150, marginBottom: '1rem' }}
              />
              <Flex gap="2" mb="4">
                <Button variant="soft" size="2">
                  Mention
                </Button>
                <Button variant="soft" size="2">
                  Add tags
                </Button>
                <Button variant="soft" size="2">
                  Public
                </Button>
              </Flex>
              <Flex gap="2">
                <Button variant="soft" size="2">
                  Schedule
                </Button>
                <Button
                  variant="soft"
                  size="2"
                  onClick={handleSubmit}
                  disabled={isUploadingMedia || (!walrusBlobId && !content.trim())}
                >
                  {isUploadingMedia ? 'Uploading...' : 'Post Image'}
                </Button>
              </Flex>
            </Tabs.Content>
          </Tabs.Root>
        </Box>

        {/* Right Panel - Post Settings */}
        <Box style={{ width: 300 }}>
          <Text size="4" weight="bold" mb="3">
            Post settings
          </Text>
          <Box mb="3">
            <Box mb="1">
              <Text size="2">
                Topic
              </Text>
            </Box>
            <TextField.Root placeholder="Choose a topic" />
          </Box>
          <Box mb="3">
            <Box mb="1">
              <Text size="2">
                Reply controls
              </Text>
            </Box>
            <TextField.Root placeholder="Everyone can reply" />
          </Box>
          <Box mb="3">
            <Box mb="1">
              <Text size="2">
                Add link
              </Text>
            </Box>
            <TextField.Root placeholder="Paste a URL to generate preview" />
          </Box>
          <Box mb="4">
            <Box mb="2">
              <Text size="2">
                Quick tags
              </Text>
            </Box>
            <Flex gap="2" wrap="wrap">
              <Button variant="solid" size="1">
                Sui
              </Button>
              <Button variant="solid" size="1">
                On-chain
              </Button>
              <Button variant="soft" size="1">
                Announcements
              </Button>
            </Flex>
          </Box>
          <Flex gap="2">
            <Button variant="soft" size="2" style={{ flex: 1 }}>
              Save Draft
            </Button>
            <Button
              size="2"
              onClick={handleSubmit}
              disabled={isUploadingMedia || !content.trim()}
              style={{ flex: 1, backgroundColor: 'var(--blue-9)' }}
            >
              Post Text
            </Button>
          </Flex>
        </Box>
      </Flex>

      {/* Preview */}
      <Box mt="4" p="4" style={{ backgroundColor: 'var(--gray-2)', borderRadius: '12px' }}>
        <Flex gap="2" align="center" mb="2">
          <Box
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              backgroundColor: 'var(--gray-4)',
            }}
          />
          <Text size="2">you @you • preview</Text>
        </Flex>
        <Text size="3">{content || 'Preview will appear here'}</Text>
      </Box>
    </Box>
  );
}

