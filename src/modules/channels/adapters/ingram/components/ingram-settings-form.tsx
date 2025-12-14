"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  CheckCircle2,
  Loader2,
  TestTube2,
  Unplug,
  XCircle,
} from "lucide-react";
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
  disconnectIngram,
  saveIngramCredentials,
  testIngramConnectionAction,
} from "../actions";
import {
  type IngramCredentialsFormInput,
  ingramCredentialsFormSchema,
} from "../schema";
import type { IngramStatus } from "../types";

interface IngramSettingsFormProps {
  initialStatus: IngramStatus | null;
}

export function IngramSettingsForm({ initialStatus }: IngramSettingsFormProps) {
  const [isPending, startTransition] = useTransition();
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [saveResult, setSaveResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const form = useForm<IngramCredentialsFormInput>({
    resolver: zodResolver(ingramCredentialsFormSchema),
    defaultValues: {
      host: "ftps.ingramcontent.com",
      port: "990",
      username: "",
      password: "",
    },
  });

  const handleTestConnection = async () => {
    const values = form.getValues();

    // Validate non-password fields first
    const hostValid = await form.trigger("host");
    const usernameValid = await form.trigger("username");
    const portValid = await form.trigger("port");

    if (!hostValid || !usernameValid || !portValid) {
      return;
    }

    // For test connection, password is required (can't test with blank password)
    if (!values.password) {
      form.setError("password", {
        message: "Password is required for connection test",
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const result = await testIngramConnectionAction({
        host: values.host,
        username: values.username,
        password: values.password,
        port: parseInt(values.port, 10),
      });

      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        message:
          error instanceof Error ? error.message : "Connection test failed",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const onSubmit = (data: IngramCredentialsFormInput) => {
    // For new connections, password is required
    if (!initialStatus && !data.password) {
      form.setError("password", {
        message: "Password is required for new connections",
      });
      return;
    }

    setSaveResult(null);
    setTestResult(null);

    startTransition(async () => {
      try {
        const result = await saveIngramCredentials({
          host: data.host,
          username: data.username,
          password: data.password, // Can be empty for updates (AC5)
          port: parseInt(data.port, 10),
        });

        if (result.success) {
          setSaveResult({
            success: true,
            message: "Credentials saved successfully",
          });
          form.reset({
            host: data.host,
            port: data.port,
            username: data.username,
            password: "",
          });
        } else {
          setSaveResult({ success: false, message: result.message });
        }
      } catch (error) {
        setSaveResult({
          success: false,
          message:
            error instanceof Error
              ? error.message
              : "Failed to save credentials",
        });
      }
    });
  };

  const handleDisconnect = () => {
    startTransition(async () => {
      try {
        await disconnectIngram();
        setSaveResult({ success: true, message: "Disconnected from Ingram" });
        form.reset({
          host: "ftps.ingramcontent.com",
          port: "990",
          username: "",
          password: "",
        });
      } catch (error) {
        setSaveResult({
          success: false,
          message:
            error instanceof Error ? error.message : "Failed to disconnect",
        });
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>FTP Credentials</CardTitle>
        <CardDescription>
          Enter your Ingram Content Group FTPS credentials. These are used to
          upload ONIX feeds automatically.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Current Status */}
        {initialStatus && (
          <Alert
            className="mb-6"
            variant={initialStatus.connected ? "default" : "destructive"}
          >
            {initialStatus.connected ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            <AlertTitle>
              {initialStatus.connected ? "Connected" : "Connection Issue"}
            </AlertTitle>
            <AlertDescription>
              {initialStatus.lastStatus || "No status available"}
              {initialStatus.lastTest && (
                <span className="block text-xs text-muted-foreground mt-1">
                  Last tested:{" "}
                  {new Date(initialStatus.lastTest).toLocaleString()}
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Test Result */}
        {testResult && (
          <Alert
            className="mb-6"
            variant={testResult.success ? "default" : "destructive"}
          >
            {testResult.success ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            <AlertTitle>
              {testResult.success
                ? "Connection Successful"
                : "Connection Failed"}
            </AlertTitle>
            <AlertDescription>{testResult.message}</AlertDescription>
          </Alert>
        )}

        {/* Save Result */}
        {saveResult && (
          <Alert
            className="mb-6"
            variant={saveResult.success ? "default" : "destructive"}
          >
            {saveResult.success ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            <AlertTitle>{saveResult.success ? "Success" : "Error"}</AlertTitle>
            <AlertDescription>{saveResult.message}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="host"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>FTP Host</FormLabel>
                    <FormControl>
                      <Input placeholder="ftps.ingramcontent.com" {...field} />
                    </FormControl>
                    <FormDescription>
                      Ingram FTPS server hostname
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="port"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Port</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="990" {...field} />
                    </FormControl>
                    <FormDescription>FTPS port (default: 990)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input placeholder="Your Ingram username" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder={
                        initialStatus ? "••••••••" : "Your Ingram password"
                      }
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {initialStatus
                      ? "Leave blank to keep existing password"
                      : "Your Ingram FTP password"}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-wrap gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleTestConnection}
                disabled={isTesting || isPending}
              >
                {isTesting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <TestTube2 className="mr-2 h-4 w-4" />
                )}
                Test Connection
              </Button>

              <Button type="submit" disabled={isPending || isTesting}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {initialStatus ? "Update Credentials" : "Save Credentials"}
              </Button>

              {initialStatus && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={isPending}
                    >
                      <Unplug className="mr-2 h-4 w-4" />
                      Disconnect
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Disconnect from Ingram?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        This will remove your Ingram credentials and stop any
                        automated ONIX feed delivery. You can reconnect at any
                        time by entering new credentials.
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
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
