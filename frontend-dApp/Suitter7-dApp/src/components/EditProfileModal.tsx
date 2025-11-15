import { useState, useEffect, useRef } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useUpdateProfile, useUpdateProfileImage, Profile } from '../hooks/useContract';
import { useProfileMetadata } from '../hooks/useProfileMetadata';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import toast from 'react-hot-toast';
import { Upload, X } from 'lucide-react';
import { WalrusService } from '../services/walrus';

interface EditProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: Profile | null | undefined;
}

export function EditProfileModal({ open, onOpenChange, profile }: EditProfileModalProps) {
  const account = useCurrentAccount();
  const updateProfile = useUpdateProfile();
  const updateProfileImage = useUpdateProfileImage();
  const { metadata, updateMetadata } = useProfileMetadata(account?.address);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    displayName: '',
    bio: '',
    website: '',
    location: '',
    imagePreview: '' as string | null,
    walrusBlobId: '' as string | null,
  });
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData({
        displayName: metadata.displayName || profile.username || '',
        bio: profile.bio || '',
        website: metadata.website || '',
        location: metadata.location || '',
        imagePreview: profile.profile_image_blob_id ? WalrusService.getBlobUrl(profile.profile_image_blob_id) : null,
        walrusBlobId: profile.profile_image_blob_id || null,
      });
    }
  }, [profile, metadata]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB for Walrus)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((prev) => ({
        ...prev,
        imagePreview: reader.result as string,
      }));
    };
    reader.readAsDataURL(file);

    // Upload to Walrus blob storage
    setIsUploadingImage(true);
    const toastId = toast.loading('Uploading image to Walrus...');
    
    try {
      const walrusBlob = await WalrusService.uploadFile(file, account?.address);
      setFormData((prev) => ({
        ...prev,
        walrusBlobId: walrusBlob.blobId,
      }));
      toast.dismiss(toastId);
      toast.success('Image uploaded successfully!');
    } catch (error: any) {
      toast.dismiss(toastId);
      toast.error(error?.message || 'Failed to upload image. Please try again.');
      // Reset preview on error
      setFormData((prev) => ({
        ...prev,
        imagePreview: null,
      }));
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setFormData((prev) => ({
      ...prev,
      imagePreview: null,
      walrusBlobId: null,
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile) {
      toast.error('Profile not found. Please create a profile first.');
      onOpenChange(false);
      return;
    }

    if (!formData.bio.trim()) {
      toast.error('Bio is required');
      return;
    }

    const toastId = toast.loading('Updating profile...');
    const updates: Promise<any>[] = [];

    // Update bio (on-chain)
    updates.push(
      new Promise((resolve, reject) => {
        updateProfile.mutate(
          { profileId: profile.id, bio: formData.bio },
          {
            onSuccess: resolve,
            onError: reject,
          }
        );
      })
    );

    // Update image if changed (on-chain)
    if (formData.walrusBlobId && formData.walrusBlobId !== profile.profile_image_blob_id) {
      updates.push(
        new Promise((resolve, reject) => {
          updateProfileImage.mutate(
            { profileId: profile.id, walrusBlobId: formData.walrusBlobId! },
            {
              onSuccess: resolve,
              onError: reject,
            }
          );
        })
      );
    }

    // Update metadata (localStorage)
    updateMetadata({
      displayName: formData.displayName,
      website: formData.website,
      location: formData.location,
    });

    try {
      await Promise.all(updates);
      toast.dismiss(toastId);
      toast.success('Profile updated successfully! 🎉');
      onOpenChange(false);
    } catch (error: any) {
      toast.dismiss(toastId);
      const errorMessage = error?.message || error?.toString() || 'Failed to update profile. Please try again.';
      toast.error(errorMessage);
    }
  };

  const handleCancel = () => {
    // Reset form to original values
    if (profile) {
      setFormData({
        displayName: metadata.displayName || profile.username || '',
        bio: profile.bio || '',
        website: metadata.website || '',
        location: metadata.location || '',
        imagePreview: profile.profile_image_blob_id ? WalrusService.getBlobUrl(profile.profile_image_blob_id) : null,
        walrusBlobId: profile.profile_image_blob_id || null,
      });
    }
    onOpenChange(false);
  };

  const handleWalrusBlobIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const blobId = e.target.value.trim();
    setFormData((prev) => ({
      ...prev,
      walrusBlobId: blobId || null,
      imagePreview: blobId ? WalrusService.getBlobUrl(blobId) : prev.imagePreview,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Make changes to your profile here. Click save when you're done.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profile Picture Section */}
          <div className="space-y-2">
            <Label>Profile Picture</Label>
            <div className="flex items-center gap-4">
              {formData.imagePreview ? (
                <div className="relative w-20 h-20 rounded-full overflow-hidden bg-muted shrink-0">
                  <img
                    src={formData.imagePreview}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-2xl font-semibold text-muted-foreground shrink-0">
                  {formData.displayName[0]?.toUpperCase() || profile?.username[0]?.toUpperCase() || 'U'}
                </div>
              )}
              <div className="flex flex-col gap-2">
                <Button type="button" variant="outline" size="sm" asChild>
                  <label className="cursor-pointer">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Photo
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageChange}
                    />
                  </label>
                </Button>
                {formData.imagePreview && (
                  <Button type="button" variant="ghost" size="sm" onClick={handleRemoveImage}>
                    <X className="w-4 h-4 mr-2" />
                    Remove
                  </Button>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Input
                value={formData.walrusBlobId || ''}
                onChange={handleWalrusBlobIdChange}
                placeholder="Or paste Walrus blob ID"
                className="text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Recommended: Square image, at least 400x400px. Upload via file picker or paste Walrus blob ID.
              </p>
            </div>
          </div>

          {/* Display Name */}
          <div className="space-y-2">
            <Label htmlFor="displayName">Display name</Label>
            <Input
              id="displayName"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              placeholder="Your display name"
              maxLength={50}
            />
            <p className="text-xs text-muted-foreground">
              This is your display name. It can be your real name or a pseudonym.
            </p>
          </div>

          {/* Handle (Read-only) */}
          <div className="space-y-2">
            <Label htmlFor="handle">Handle</Label>
            <Input
              id="handle"
              value={profile?.username ? `@${profile.username}` : ''}
              placeholder="@username"
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Your handle is unique and cannot be changed. This is your blockchain username.
            </p>
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Tell us about yourself"
              className="min-h-[100px]"
              maxLength={160}
            />
            <div className="flex justify-between">
              <p className="text-xs text-muted-foreground">
                You can mention other people and topics in your bio.
              </p>
              <p className="text-xs text-muted-foreground">
                {formData.bio.length}/160
              </p>
            </div>
          </div>

          {/* Website */}
          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              type="url"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              placeholder="https://example.com"
            />
            <p className="text-xs text-muted-foreground">
              Add a link to your website or blog.
            </p>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Location"
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground">
              Add your location to help people find you.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={updateProfile.isPending || updateProfileImage.isPending || !formData.bio.trim()}
            >
              {(updateProfile.isPending || updateProfileImage.isPending) ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
