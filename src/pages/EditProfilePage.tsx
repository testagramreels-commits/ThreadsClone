import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Header } from '@/components/layout/Header';
import { useAuth } from '@/hooks/useAuth';
import { getUserProfile, updateUserProfile, uploadImage } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { UserProfile } from '@/types/database';

export function EditProfilePage() {
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    username: '',
    bio: '',
    website: '',
    location: '',
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    if (!user) return;
    
    try {
      const profileData = await getUserProfile(user.username);
      setProfile(profileData);
      setFormData({
        username: profileData.username || '',
        bio: profileData.bio || '',
        website: profileData.website || '',
        location: profileData.location || '',
      });
      setAvatarPreview(profileData.avatar_url || null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let avatarUrl = profile?.avatar_url;

      if (avatarFile) {
        avatarUrl = await uploadImage(avatarFile, 'avatars');
      }

      const updatedProfile = await updateUserProfile({
        username: formData.username,
        bio: formData.bio,
        website: formData.website,
        location: formData.location,
        avatar_url: avatarUrl,
      });

      // Update auth store with new avatar
      if (user) {
        login({
          ...user,
          username: formData.username,
          avatar_url: avatarUrl,
        });
      }

      toast({
        title: 'Profile updated!',
        description: 'Your changes have been saved.',
      });

      navigate(`/profile/${formData.username}`);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container max-w-2xl mx-auto pb-20 md:pb-4">
        <div className="border-b p-4 sticky top-16 glass-effect z-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/profile/${user?.username}`)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">Edit Profile</h1>
          </div>

          <Button
            onClick={handleSave}
            disabled={saving || !formData.username.trim()}
            className="rounded-full"
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Avatar */}
          <div className="flex justify-center">
            <div className="relative">
              <Avatar className="h-24 w-24 ring-2 ring-background">
                <AvatarImage src={avatarPreview || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`} />
                <AvatarFallback className="text-2xl">{formData.username?.[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarSelect}
                className="hidden"
                id="avatar-upload"
              />
              <Button
                variant="secondary"
                size="icon"
                className="absolute bottom-0 right-0 rounded-full h-8 w-8"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Username */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Username</label>
            <Input
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              placeholder="Your username"
            />
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Bio</label>
            <Textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Tell us about yourself"
              className="min-h-[100px] resize-none"
              maxLength={150}
            />
            <p className="text-xs text-muted-foreground text-right">
              {formData.bio.length}/150
            </p>
          </div>

          {/* Website */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Website</label>
            <Input
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              placeholder="https://yourwebsite.com"
              type="url"
            />
          </div>

          {/* Location */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Location</label>
            <Input
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Your location"
            />
          </div>
        </div>
      </main>
    </div>
  );
}
