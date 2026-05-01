import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Image as ImageIcon, Video, X, Send, Loader2,
  Smile, MapPin, Camera, BadgeCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BottomNav } from '@/components/features/BottomNav';
import { useAuth } from '@/hooks/useAuth';
import { getUserProfile, updateUserProfile, uploadImage } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { UserProfile } from '@/types/database';

const AVATAR_COLORS = [
  'from-pink-500 to-orange-400',
  'from-purple-500 to-blue-500',
  'from-green-400 to-cyan-500',
  'from-yellow-400 to-orange-500',
  'from-blue-500 to-indigo-600',
];

export function EditProfilePage() {
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => { loadProfile(); }, []);

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
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: 'Image too large', description: 'Max 5MB', variant: 'destructive' });
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!formData.username.trim()) {
      toast({ title: 'Username required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      let avatarUrl = profile?.avatar_url;
      if (avatarFile) {
        avatarUrl = await uploadImage(avatarFile, 'avatars');
      }

      const updatedProfile = await updateUserProfile({
        username: formData.username.trim().toLowerCase().replace(/[^a-z0-9_]/g, ''),
        bio: formData.bio.trim(),
        website: formData.website.trim(),
        location: formData.location.trim(),
        avatar_url: avatarUrl,
      });

      if (user) {
        login({ ...user, username: updatedProfile.username, avatar_url: avatarUrl });
      }

      toast({ title: 'Profile updated!', description: 'Your changes have been saved.' });
      navigate(`/profile/${updatedProfile.username}`);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border/60">
        <div className="max-w-2xl mx-auto flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="font-bold text-base">Edit Profile</h1>
          </div>
          <Button
            onClick={handleSave}
            disabled={saving || !formData.username.trim()}
            size="sm"
            className="rounded-full px-5 font-semibold"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
          </Button>
        </div>
      </div>

      <main className="max-w-2xl mx-auto pb-28">
        {/* Cover + Avatar */}
        <div className="relative">
          <div className="h-32 bg-gradient-to-br from-primary/30 via-purple-500/20 to-blue-500/30 cursor-pointer" />
          <div className="absolute left-4 -bottom-12">
            <div className="relative">
              <Avatar className="h-24 w-24 ring-4 ring-background shadow-xl">
                <AvatarImage src={avatarPreview || `https://api.dicebear.com/7.x/avataaars/svg?seed=${formData.username}`} />
                <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-primary to-purple-600 text-white">
                  {formData.username?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 rounded-full flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity"
              >
                <Camera className="h-6 w-6 text-white" />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarSelect} />
            </div>
          </div>
          <div className="absolute right-4 bottom-3">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full text-xs h-8 bg-background/80 backdrop-blur-sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera className="h-3.5 w-3.5 mr-1.5" />
              Change Photo
            </Button>
          </div>
        </div>

        {/* Form */}
        <div className="px-4 pt-16 space-y-5">
          {/* Username */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold flex items-center gap-1.5">
              Username
              <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
              <Input
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="username"
                className="pl-8"
                maxLength={30}
              />
            </div>
            <p className="text-xs text-muted-foreground">Only letters, numbers, and underscores</p>
          </div>

          {/* Bio */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold">Bio</label>
            <Textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Tell people about yourself..."
              className="min-h-[100px] resize-none text-sm"
              maxLength={160}
            />
            <p className="text-xs text-muted-foreground text-right">{formData.bio.length}/160</p>
          </div>

          {/* Website */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold">Website</label>
            <Input
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              placeholder="https://yourwebsite.com"
              type="url"
            />
          </div>

          {/* Location */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              Location
            </label>
            <Input
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="City, Country"
              maxLength={50}
            />
          </div>

          {/* Preview */}
          <div className="border border-border/60 rounded-2xl p-4 bg-muted/20">
            <p className="text-xs font-semibold text-muted-foreground mb-3">Preview</p>
            <div className="flex items-start gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={avatarPreview || `https://api.dicebear.com/7.x/avataaars/svg?seed=${formData.username}`} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-purple-600 text-white font-bold">
                  {formData.username?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-sm">{formData.username || 'username'}</p>
                {formData.bio && <p className="text-xs text-muted-foreground mt-0.5">{formData.bio}</p>}
              </div>
            </div>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
