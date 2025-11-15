import { Box, Flex, Text, Button, TextArea, Tabs, TextField } from '@radix-ui/themes';
import { useCreateSuit } from '../hooks/useContract';
import { useState } from 'react';

export function CreateSuit() {
  const [activeTab, setActiveTab] = useState<'text' | 'video' | 'image'>('text');
  const [content, setContent] = useState('');
  const [walrusBlobId] = useState('');
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const createSuit = useCreateSuit();

  const handleSubmit = () => {
    if (activeTab === 'text') {
      createSuit.mutate({ content: content.trim() });
    } else {
      createSuit.mutate({ content: content.trim(), walrusBlobId });
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
              <Box
                mb="4"
                p="6"
                style={{
                  border: '2px dashed var(--gray-a6)',
                  borderRadius: '12px',
                  textAlign: 'center',
                }}
              >
                <Text size="3" style={{ color: 'var(--gray-11)' }}>
                  Drag & drop .mp4, .mov, .webm (max 200MB)
                </Text>
              </Box>
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
              <Box
                mb="4"
                p="6"
                style={{
                  border: '2px dashed var(--gray-a6)',
                  borderRadius: '12px',
                  textAlign: 'center',
                }}
              >
                <Text size="3" style={{ color: 'var(--gray-11)' }}>
                  Drag & drop image files (max 10MB)
                </Text>
              </Box>
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
                <Button variant="soft" size="2">
                  Add link
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

