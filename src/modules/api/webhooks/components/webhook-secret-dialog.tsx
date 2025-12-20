"use client";

/**
 * Webhook Secret Dialog
 * Story 15.4 - Display webhook secret (one-time view)
 */

import { AlertTriangle, Check, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface WebhookSecretDialogProps {
  secret: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isNew?: boolean;
}

export function WebhookSecretDialog({
  secret,
  open,
  onOpenChange,
  isNew = false,
}: WebhookSecretDialogProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    toast.success("Secret copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isNew ? "Webhook Created Successfully" : "New Webhook Secret"}
          </DialogTitle>
          <DialogDescription>
            {isNew
              ? "Your webhook has been created. Copy the secret below."
              : "Your webhook secret has been regenerated."}
          </DialogDescription>
        </DialogHeader>

        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Important - Copy Now!</AlertTitle>
          <AlertDescription>
            This secret will only be shown once. Store it securely - you cannot
            retrieve it later.
            {!isNew && " The previous secret is now invalid."}
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <label htmlFor="webhook-secret" className="text-sm font-medium">
            Webhook Secret
          </label>
          <div className="flex gap-2">
            <Input
              id="webhook-secret"
              value={secret}
              readOnly
              className="font-mono text-sm"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Use this secret to verify webhook signatures with HMAC-SHA256.
          </p>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>
            I&apos;ve Copied the Secret
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
