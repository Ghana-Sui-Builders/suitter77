import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
  ArrowLeft, 
  Upload, 
  Image as ImageIcon, 
  X, 
  Check,
  ImagePlus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';

export function CreateCommunity() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    handle: '',
    privacy: 'public' as 'public' | 'members',
    categories: [] as string[],
    description: '',
    thumbnail: null as File | null,
    coverImage: null as File | null,
    requireApproval: false,
    onlyModsCanPost: false,
  });

  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCategoryToggle = (category: string) => {
    setFormData((prev) => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter((c) => c !== category)
        : [...prev.categories, category],
    }));
  };

  const handleThumbnailUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Thumbnail image must be less than 5MB');
        return;
      }
      setFormData((prev) => ({ ...prev, thumbnail: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnailPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Cover image must be less than 10MB');
        return;
      }
      setFormData((prev) => ({ ...prev, coverImage: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const generateHandle = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .substring(0, 40);
  };

  const handleNameChange = (value: string) => {
    if (value.length <= 40) {
      // Auto-generate handle from name if handle is empty or matches the old name
      const shouldUpdateHandle = !formData.handle || formData.handle === generateHandle(formData.name);
      
      setFormData((prev) => ({
        ...prev,
        name: value,
        handle: shouldUpdateHandle ? generateHandle(value) : prev.handle,
      }));
    }
  };

  const handleHandleChange = (value: string) => {
    // Only allow lowercase, numbers, and underscores
    const sanitized = value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setFormData((prev) => ({ ...prev, handle: sanitized }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (formData.name.length < 3 || formData.name.length > 40) {
      toast.error('Community name must be between 3 and 40 characters');
      return;
    }

    if (formData.handle.length < 3) {
      toast.error('Handle must be at least 3 characters');
      return;
    }

    if (formData.categories.length === 0) {
      toast.error('Please select at least one category');
      return;
    }

    if (formData.description.length > 280) {
      toast.error('Description must be 280 characters or less');
      return;
    }

    // TODO: Implement actual community creation logic
    toast.success('Community created successfully! 🎉');
    navigate('/communities');
  };

  const categories = ['Development', 'Gaming', 'Business', 'Security'];

  return (
    <div className="w-full max-w-4xl mx-auto">
      <Card className="p-8">
        <CardContent className="p-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold">Create Community</h1>
            <Button
              variant="outline"
              onClick={() => navigate('/communities')}
            >
              <ArrowLeft className="size-4" />
              Back to Communities
            </Button>
          </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Community Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Community Name</Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g., Sui Builders"
            />
            <p className="text-xs text-muted-foreground">
              Use 3-40 characters. Unique across the network.
            </p>
          </div>

          {/* Handle */}
          <div className="space-y-2">
            <Label htmlFor="handle">Handle</Label>
            <div className="flex gap-3">
              <Input
                id="handle"
                type="text"
                value={formData.handle}
                onChange={(e) => handleHandleChange(e.target.value)}
                placeholder="@sui_builders"
                className="flex-1"
              />
              <div className="flex-1 px-4 py-2 bg-muted border border-input rounded-md text-sm flex items-center">
                sui.social/comm/{formData.handle || 'handle'}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Lowercase, numbers, and underscores only.
            </p>
          </div>

          {/* Privacy */}
          <div className="space-y-3">
            <Label>Privacy</Label>
            <div className="flex gap-3">
              <Button
                type="button"
                variant={formData.privacy === 'public' ? 'default' : 'outline'}
                onClick={() => handleInputChange('privacy', 'public')}
              >
                Public
              </Button>
              <Button
                type="button"
                variant={formData.privacy === 'members' ? 'default' : 'outline'}
                onClick={() => handleInputChange('privacy', 'members')}
              >
                Members only
              </Button>
            </div>
          </div>

          {/* Category */}
          <div className="space-y-3">
            <Label>Category</Label>
            <div className="flex flex-wrap gap-3">
              {categories.map((category) => (
                <Button
                  key={category}
                  type="button"
                  variant={formData.categories.includes(category) ? 'default' : 'outline'}
                  onClick={() => handleCategoryToggle(category)}
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe your community's purpose, rules, and topics..."
              rows={5}
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Max 280 characters. Markdown supported in posts, not in description.
              </p>
              <span className={`text-xs font-medium ${
                formData.description.length > 280 ? 'text-destructive' : 'text-muted-foreground'
              }`}>
                {formData.description.length} / 280
              </span>
            </div>
          </div>

          {/* Thumbnail */}
          <div className="space-y-2">
            <Label htmlFor="thumbnail">Thumbnail</Label>
            <div className="flex gap-4">
              <div className="size-32 border-2 border-dashed rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                {thumbnailPreview ? (
                  <img
                    src={thumbnailPreview}
                    alt="Thumbnail preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center p-4">
                    <ImageIcon className="size-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">No image</p>
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <input
                  type="file"
                  id="thumbnail-upload"
                  accept="image/jpeg,image/png,image/svg+xml"
                  onChange={handleThumbnailUpload}
                  className="hidden"
                />
                <Button 
                  variant="default" 
                  type="button"
                  onClick={() => document.getElementById('thumbnail-upload')?.click()}
                >
                  <Upload className="size-4" />
                  Upload
                </Button>
                <p className="text-xs text-muted-foreground">
                  Upload a square image (JPG/PNG/SVG). Recommended 512×512.
                </p>
              </div>
            </div>
          </div>

          {/* Cover Image */}
          <div className="space-y-2">
            <Label htmlFor="cover">
              Cover Image <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <div className="flex gap-4">
              <div className="flex-1 h-32 border-2 border-dashed rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                {coverPreview ? (
                  <img
                    src={coverPreview}
                    alt="Cover preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center p-4">
                    <ImageIcon className="size-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">No image</p>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <input
                  type="file"
                  id="cover-upload"
                  accept="image/jpeg,image/png,image/svg+xml"
                  onChange={handleCoverUpload}
                  className="hidden"
                />
                <Button 
                  variant="outline" 
                  type="button"
                  onClick={() => document.getElementById('cover-upload')?.click()}
                >
                  <ImagePlus className="size-4" />
                  Add Cover
                </Button>
                <p className="text-xs text-muted-foreground">
                  Wide image for the community header. Recommended 1200×400.
                </p>
              </div>
            </div>
          </div>

          {/* Moderation */}
          <div className="space-y-4">
            <Label>Moderation</Label>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="requireApproval"
                  checked={formData.requireApproval}
                  onCheckedChange={(checked) => handleInputChange('requireApproval', checked)}
                />
                <div className="space-y-1">
                  <Label htmlFor="requireApproval" className="cursor-pointer">
                    Require join request approval
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    You can change these in Settings later.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Checkbox
                  id="onlyModsCanPost"
                  checked={formData.onlyModsCanPost}
                  onCheckedChange={(checked) => handleInputChange('onlyModsCanPost', checked)}
                />
                <Label htmlFor="onlyModsCanPost" className="cursor-pointer">
                  Only mods can post
                </Label>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/communities')}
            >
              <X className="size-4" />
              Cancel
            </Button>
            <Button type="submit">
              <Check className="size-4" />
              Create Community
            </Button>
          </div>
        </form>
        </CardContent>
      </Card>
    </div>
  );
}

