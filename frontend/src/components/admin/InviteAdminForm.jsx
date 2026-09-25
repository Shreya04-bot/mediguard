import React, { useState } from "react";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { UserPlus, Loader2 } from "lucide-react";

import { toast } from "sonner";

import { inviteAdminApi } from "@/services/adminService";


export const InviteAdminForm = () => {
  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmed = email.trim();
    if (!trimmed) {
      toast.error("Please enter an email address.");
      return;
    }

    setIsSending(true);

    try {
      await inviteAdminApi(trimmed);
      toast.success(`Invitation sent to ${trimmed}.`);
      setEmail("");
    } catch (err) {
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        err?.message ||
        "Could not send the invitation. Please try again.";
      toast.error(message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UserPlus className="h-4 w-4" />
          Invite Administrator
        </CardTitle>
        <CardDescription>
          Send an email invite to add another platform administrator. The
          link expires in 7 days.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="invite-admin-email">Email address</Label>
            <Input
              id="invite-admin-email"
              type="email"
              placeholder="new-admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSending}
              required
            />
          </div>

          <Button type="submit" disabled={isSending} className="gap-2">
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" />
                Send Invite
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};