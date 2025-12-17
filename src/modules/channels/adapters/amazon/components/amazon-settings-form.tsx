"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, ExternalLink, Loader2, XCircle } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  disconnectAmazon,
  saveAmazonCredentials,
  testAmazonConnectionAction,
} from "../actions";
import {
  AMAZON_MARKETPLACES,
  AMAZON_PROGRAM_TYPES,
  type AmazonCredentialsFormInput,
  type AmazonMarketplaceCode,
  amazonCredentialsFormSchema,
} from "../schema";

/**
 * Amazon Settings Form Component
 *
 * Story 17.1 - Configure Amazon Account Connection
 * AC1: Amazon Account Type Selection
 * AC2: API Credential Configuration
 * AC3: Connection Testing
 * AC6: Edit and Disconnect
 */

interface AmazonSettingsFormProps {
  initialStatus: {
    connected: boolean;
    programType?: string;
    marketplace?: string;
    accessKeyId?: string;
    lastTest?: Date | null;
    lastStatus?: string | null;
  } | null;
}

export function AmazonSettingsForm({ initialStatus }: AmazonSettingsFormProps) {
  const [isPending, startTransition] = useTransition();
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    sellerName?: string;
  } | null>(null);
  const [saveResult, setSaveResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [disconnectResult, setDisconnectResult] = useState<{
    success: boolean;
    message?: string;
  } | null>(null);

  // Pre-populate form with existing values for edit mode (AC6)
  const form = useForm<AmazonCredentialsFormInput>({
    resolver: zodResolver(amazonCredentialsFormSchema),
    defaultValues: {
      programType:
        (initialStatus?.programType as "kdp" | "advantage") ||
        AMAZON_PROGRAM_TYPES.KDP,
      marketplace:
        (initialStatus?.marketplace as AmazonMarketplaceCode) || "US",
      accessKeyId: initialStatus?.accessKeyId || "",
      secretAccessKey: "", // Always empty - user must re-enter or leave blank to keep existing
    },
  });

  const selectedProgram = form.watch("programType");
  const secretAccessKey = form.watch("secretAccessKey");

  // In edit mode without new secret, user can save without re-testing (AC6)
  const canSaveWithoutTest = initialStatus?.connected && !secretAccessKey;

  async function handleTestConnection() {
    const values = form.getValues();

    // Validate non-secret fields first
    const programTypeValid = await form.trigger("programType");
    const marketplaceValid = await form.trigger("marketplace");
    const accessKeyIdValid = await form.trigger("accessKeyId");

    if (!programTypeValid || !marketplaceValid || !accessKeyIdValid) {
      return;
    }

    // For test connection, secret is required (can't test with blank secret)
    if (!values.secretAccessKey) {
      form.setError("secretAccessKey", {
        message: "Secret Access Key is required for connection test",
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    setSaveResult(null);

    try {
      const result = await testAmazonConnectionAction(values);
      setTestResult(result);
    } catch {
      setTestResult({ success: false, message: "Test failed unexpectedly" });
    } finally {
      setIsTesting(false);
    }
  }

  async function onSubmit(data: AmazonCredentialsFormInput) {
    // For new connections, require secret key
    if (!initialStatus?.connected && !data.secretAccessKey) {
      form.setError("secretAccessKey", {
        message: "Secret Access Key is required for new connections",
      });
      return;
    }

    // For updates with new secret, require connection test first
    // For updates without new secret (keeping existing), skip test requirement
    const isEditWithoutNewSecret =
      initialStatus?.connected && !data.secretAccessKey;

    if (!isEditWithoutNewSecret && !testResult?.success) {
      setSaveResult({
        success: false,
        message: "Please test the connection before saving",
      });
      return;
    }

    setSaveResult(null);
    startTransition(async () => {
      const result = await saveAmazonCredentials(data);
      setSaveResult(result);
    });
  }

  async function handleDisconnect() {
    setDisconnectResult(null);
    startTransition(async () => {
      const result = await disconnectAmazon();
      setDisconnectResult(result);
      if (result.success) {
        form.reset();
        setTestResult(null);
        setSaveResult(null);
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* AC6: Show current configuration when connected */}
      {initialStatus?.connected && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Connected</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>
              {initialStatus.programType === "kdp" ? "KDP" : "Advantage"} -{" "}
              {initialStatus.marketplace} marketplace
            </span>
            {/* AC6: Disconnect requires confirmation dialog */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={isPending}>
                  Disconnect
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Disconnect Amazon?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove your Amazon credentials. You will need to
                    reconfigure the integration to resume automated feeds.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDisconnect}>
                    Disconnect
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </AlertDescription>
        </Alert>
      )}

      {/* Disconnect result feedback */}
      {disconnectResult && (
        <Alert variant={disconnectResult.success ? "default" : "destructive"}>
          {disconnectResult.success ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          <AlertTitle>
            {disconnectResult.success ? "Disconnected" : "Disconnect Failed"}
          </AlertTitle>
          <AlertDescription>
            {disconnectResult.success
              ? "Amazon integration removed successfully"
              : disconnectResult.message || "Failed to disconnect"}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Amazon API Credentials</CardTitle>
          {/* AC2: Help text explaining where to find credentials */}
          <CardDescription>
            Enter your Amazon Selling Partner API credentials.{" "}
            <a
              href="https://developer-docs.amazon.com/sp-api/docs/registering-your-application"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-primary hover:underline"
            >
              How to get credentials <ExternalLink className="ml-1 h-3 w-3" />
            </a>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* AC1: Amazon Account Type Selection */}
              <FormField
                control={form.control}
                name="programType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amazon Program</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select program type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={AMAZON_PROGRAM_TYPES.KDP}>
                          KDP (Kindle Direct Publishing)
                        </SelectItem>
                        <SelectItem value={AMAZON_PROGRAM_TYPES.ADVANTAGE}>
                          Advantage (Vendor Central)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {/* AC1: Form adapts to show relevant credential fields */}
                    <FormDescription>
                      {selectedProgram === AMAZON_PROGRAM_TYPES.KDP
                        ? "For self-publishers using Seller Central"
                        : "For publishers using Vendor Central wholesale program"}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* AC2: Marketplace dropdown */}
              <FormField
                control={form.control}
                name="marketplace"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marketplace</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select marketplace" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(AMAZON_MARKETPLACES).map(
                          ([code, info]) => (
                            <SelectItem key={code} value={code}>
                              {info.name} ({code})
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Primary marketplace for metadata delivery
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* AC2: AWS Access Key ID */}
              <FormField
                control={form.control}
                name="accessKeyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>AWS Access Key ID</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="AKIAIOSFODNN7EXAMPLE"
                        autoComplete="off"
                      />
                    </FormControl>
                    <FormDescription>
                      From your AWS IAM user credentials
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* AC2: AWS Secret Access Key - AC6: secret key shown as masked */}
              <FormField
                control={form.control}
                name="secretAccessKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>AWS Secret Access Key</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        placeholder={
                          initialStatus?.connected
                            ? "••••••••••••••••"
                            : "Enter secret key"
                        }
                        autoComplete="off"
                      />
                    </FormControl>
                    <FormDescription>
                      Keep this secure - never share it
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* AC3: Connection test result display */}
              {testResult && (
                <Alert variant={testResult.success ? "default" : "destructive"}>
                  {testResult.success ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  <AlertTitle>
                    {testResult.success
                      ? "Connection Test Passed"
                      : "Connection Test Failed"}
                  </AlertTitle>
                  <AlertDescription>
                    {testResult.message}
                    {testResult.sellerName && (
                      <span className="block mt-1 font-medium">
                        Account: {testResult.sellerName}
                      </span>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {/* Save result feedback */}
              {saveResult && (
                <Alert variant={saveResult.success ? "default" : "destructive"}>
                  {saveResult.success ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  <AlertTitle>
                    {saveResult.success ? "Saved" : "Save Failed"}
                  </AlertTitle>
                  <AlertDescription>{saveResult.message}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-4">
                {/* AC3: Test Connection button */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={isTesting || isPending}
                >
                  {isTesting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Test Connection
                </Button>
                {/* AC4: Only saves if connection test succeeds (or edit mode without new secret) */}
                <Button
                  type="submit"
                  disabled={
                    isPending ||
                    isTesting ||
                    (!canSaveWithoutTest && !testResult?.success)
                  }
                >
                  {isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save Credentials
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
