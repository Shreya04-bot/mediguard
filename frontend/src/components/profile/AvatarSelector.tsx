import React, { useState } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import {
  avatarsByKey,
  avatarKeysByGender,
  normalizeGender,
  type AvatarKey,
  type DashboardRole,
} from "@/components/dashboard/dashboardAssets";
import { useAuth } from "@/context/AuthContext";
import { updateProfileApi } from "@/services/authService";

type AvatarSelectorProps = {
  className?: string;
};

const VALID_ROLES: DashboardRole[] = ["patient", "doctor", "admin"];

function resolveRole(role?: string): DashboardRole {
  return (VALID_ROLES as string[]).includes(role || "") ? (role as DashboardRole) : "patient";
}

/**
 * Lets the signed-in user choose from the bundled avatars available for
 * their role + gender. Saves immediately on click — no separate "Save"
 * step for the avatar itself — and pushes the result into AuthContext
 * so Sidebar/Navbar/dashboards/profile all update without a refresh.
 */
export default function AvatarSelector({ className = "" }: AvatarSelectorProps) {
  const { user, updateUser } = useAuth();
  const [savingKey, setSavingKey] = useState<AvatarKey | null>(null);

  const role = resolveRole(user?.role);
  const gender = normalizeGender(user?.gender);
  const options = avatarKeysByGender[gender];
  const currentKey = (user?.avatar_key ?? null) as AvatarKey | null;

  const handleSelect = async (key: AvatarKey) => {
    if (savingKey) return;
    setSavingKey(key);
    try {
      const { user: updated } = await updateProfileApi({ avatar_key: key });
      updateUser(updated);
      toast.success("Avatar updated.");
    } catch (err) {
      toast.error((err as { message?: string })?.message || "Could not update avatar.");
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className={className}>
      <p className="text-sm font-semibold text-foreground mb-3">Choose your avatar</p>
      <div className="flex flex-wrap gap-3">
        {options.map((key) => {
          const isSelected = currentKey === key;
          return (
            <button
              key={key}
              type="button"
              disabled={savingKey !== null}
              onClick={() => handleSelect(key)}
              className={`relative rounded-2xl border-2 p-1.5 transition-all disabled:opacity-60 ${
                isSelected
                  ? "border-primary shadow-sm"
                  : "border-border/60 hover:border-primary/40"
              }`}
              aria-pressed={isSelected}
              aria-label={key.replace(/-/g, " ")}
            >
              <img
                src={avatarsByKey[role][key]}
                alt={key.replace(/-/g, " ")}
                className="h-16 w-16 rounded-xl object-cover"
              />
              {isSelected && (
                <span className="absolute -top-1.5 -right-1.5 flex items-center gap-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground shadow">
                  <Check className="h-3 w-3" /> Selected
                </span>
              )}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Based on your gender setting. An uploaded profile photo always takes priority over the avatars shown here.
      </p>
    </div>
  );
}
