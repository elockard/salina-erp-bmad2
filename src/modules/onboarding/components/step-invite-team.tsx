"use client";

/**
 * Step 2: Invite Team Member
 * Story 20.1: Build Onboarding Wizard
 * AC 20.1.4: Invite Team Member (Optional)
 *
 * Reference: src/modules/users/components/invite-user-dialog.tsx
 * Uses inviteUser action from users module
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { inviteUser } from "@/modules/users/actions";
import { type InviteTeamInput, inviteTeamSchema } from "../schema";

interface StepInviteTeamProps {
  /** Callback when step is completed (team member invited) */
  onComplete: () => void;
  /** Callback when step is skipped */
  onSkip: () => void;
}

export function StepInviteTeam({ onComplete, onSkip }: StepInviteTeamProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<InviteTeamInput>({
    resolver: zodResolver(inviteTeamSchema),
    defaultValues: {
      email: "",
      name: "",
      role: "editor",
    },
  });

  async function handleSubmit(data: InviteTeamInput) {
    setIsSubmitting(true);
    try {
      // Call existing invite user action
      const result = await inviteUser({
        email: data.email,
        role: data.role,
      });

      if (result.success) {
        toast.success(`Invitation sent to ${data.email}`);
        onComplete();
      } else {
        toast.error(result.error || "Failed to send invitation");
      }
    } catch {
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Invite Team Member</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Invite your first team member to help manage your publishing catalog.
          This step is optional - you can always invite team members later.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Email */}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email Address</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="colleague@example.com"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  An invitation email will be sent to this address
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Name */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder="Team member name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Role */}
          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Role</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="admin">
                      <span className="font-medium">Admin</span>
                      <span className="text-muted-foreground ml-2">
                        - Full access except owner settings
                      </span>
                    </SelectItem>
                    <SelectItem value="editor">
                      <span className="font-medium">Editor</span>
                      <span className="text-muted-foreground ml-2">
                        - Manage titles, contacts, and content
                      </span>
                    </SelectItem>
                    <SelectItem value="finance">
                      <span className="font-medium">Finance</span>
                      <span className="text-muted-foreground ml-2">
                        - Manage royalties and statements
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Choose the level of access for this team member
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Action Buttons */}
          <div className="flex justify-between pt-4">
            <Button type="button" variant="ghost" onClick={onSkip}>
              Skip for now
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Send Invitation
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

export default StepInviteTeam;
