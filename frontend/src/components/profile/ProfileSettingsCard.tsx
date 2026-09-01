import React, { useRef, useState } from "react";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, type Gender } from "@/context/AuthContext";
import { updateProfileApi, uploadProfilePhotoApi, deleteProfilePhotoApi } from "@/services/authService";
import ProfileAvatar from "@/components/profile/ProfileAvatar";
import AvatarSelector from "@/components/profile/AvatarSelector";
import { normalizeGender } from "@/components/dashboard/dashboardAssets";

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "neutral", label: "Prefer not to specify" },
];

/**
 * Shared "Profile photo / Name / Gender / Avatar" editor, reused by
 * PatientProfilePage, DoctorProfilePage, and admin/ProfilePage so the
 * three roles don't each get their own copy of this logic.
 */
export default function ProfileSettingsCard() {
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [name, setName] = useState(user?.name || "");
  const [gender, setGender] = useState<Gender>((user?.gender as Gender) || "neutral");
  const [savingDetails, setSavingDetails] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const hasPhoto = !!(user?.profile_photo_url || user?.avatar);

  const handleSaveDetails = async () => {
    setSavingDetails(true);
    try {
      // A manually-picked avatar (avatar_key) always overrides the gender
      // default (see resolveAvatarSrc in dashboardAssets.ts). That's correct
      // while gender stays the same, but if the person is actively changing
      // their gender here, a stale avatar_key from the old gender would
      // silently "stick" and look like the avatar isn't updating. So: only
      // when gender actually changes, clear avatar_key and let it fall back
      // to the new gender's default — the same behavior you'd see on an
      // account that never picked a custom avatar in the first place.
      const genderChanged = normalizeGender(user?.gender) !== normalizeGender(gender);
      const { user: updated } = await updateProfileApi({
        name: name.trim(),
        gender,
        ...(genderChanged ? { clear_avatar_key: true } : {}),
      });
      updateUser(updated);
      toast.success("Profile updated.");
    } catch (err) {
      toast.error((err as { message?: string })?.message || "Could not save changes.");
    } finally {
      setSavingDetails(false);
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Please choose a JPG, PNG, or WEBP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB.");
      return;
    }

    setUploadingPhoto(true);
    try {
      const { user: updated } = await uploadProfilePhotoApi(file);
      updateUser(updated);
      toast.success("Profile photo updated.");
    } catch (err) {
      toast.error((err as { message?: string })?.message || "Could not upload photo.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = async () => {
    setUploadingPhoto(true);
    try {
      const { user: updated } = await deleteProfilePhotoApi();
      updateUser(updated);
      toast.success("Profile photo removed.");
    } catch (err) {
      toast.error((err as { message?: string })?.message || "Could not remove photo.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-bold">Profile Photo & Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Photo + avatar */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <ProfileAvatar user={user} className="h-20 w-20" />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background shadow-sm hover:bg-muted disabled:opacity-60"
              aria-label="Upload profile photo"
            >
              {uploadingPhoto ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handlePhotoChange}
            />
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              An uploaded photo always takes priority over your selected avatar.
            </p>
            {hasPhoto && (
              <Button variant="ghost" size="sm" className="gap-1.5 text-destructive hover:text-destructive px-0" onClick={handleRemovePhoto} disabled={uploadingPhoto}>
                <Trash2 className="h-3.5 w-3.5" /> Remove photo
              </Button>
            )}
          </div>
        </div>

        {/* Name + gender + save */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="profile-name">Name</Label>
            <Input id="profile-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-email">Email</Label>
            <Input id="profile-email" value={user?.email || ""} disabled />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="profile-gender">Gender</Label>
            <select
              id="profile-gender"
              value={gender}
              onChange={(e) => setGender(e.target.value as Gender)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
            >
              {GENDER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Controls which default avatar and health illustration are shown for your account.
            </p>
          </div>
        </div>

        <div className="pt-2 border-t border-border/60">
          <Button onClick={handleSaveDetails} disabled={savingDetails}>
            {savingDetails ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Save Changes
          </Button>
        </div>

        {/* Avatar selection */}
        <div className="pt-4 border-t border-border/60">
          <AvatarSelector />
        </div>
      </CardContent>
    </Card>
  );
}