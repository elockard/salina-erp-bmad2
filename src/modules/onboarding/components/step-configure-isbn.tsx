"use client";

/**
 * Step 5: Configure ISBN
 * Story 20.1: Build Onboarding Wizard
 * AC 20.1.7: Configure ISBN (Optional)
 *
 * Reference: src/modules/isbn-prefixes/components/isbn-prefix-form.tsx
 * Two options: Add prefix or link to import
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { ExternalLink, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createIsbnPrefix } from "@/modules/isbn-prefixes/actions";
import { type ConfigureIsbnInput, configureIsbnSchema } from "../schema";

const BLOCK_SIZES = [
  { value: "100", label: "100 ISBNs" },
  { value: "1000", label: "1,000 ISBNs" },
  { value: "10000", label: "10,000 ISBNs" },
];

interface StepConfigureIsbnProps {
  /** Callback when step is completed */
  onComplete: (prefix: string) => void;
  /** Callback when step is skipped / finished */
  onSkip: () => void;
}

export function StepConfigureIsbn({
  onComplete,
  onSkip,
}: StepConfigureIsbnProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ConfigureIsbnInput>({
    resolver: zodResolver(configureIsbnSchema),
    defaultValues: {
      prefix: "",
      blockSize: 100,
    },
  });

  async function handleSubmit(data: ConfigureIsbnInput) {
    setIsSubmitting(true);
    try {
      // Create ISBN prefix using existing action
      const result = await createIsbnPrefix({
        prefix: data.prefix,
        block_size: data.blockSize as
          | 10
          | 100
          | 1000
          | 10000
          | 100000
          | 1000000,
      });

      if (result.success) {
        toast.success("ISBN prefix configured successfully");
        onComplete(data.prefix);
      } else {
        toast.error(result.error || "Failed to configure ISBN prefix");
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
        <h2 className="text-xl font-semibold">Configure ISBN</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Set up your ISBN management. ISBNs are unique identifiers for your
          books.
        </p>
      </div>

      <Tabs defaultValue="prefix" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="prefix">Add Prefix</TabsTrigger>
          <TabsTrigger value="import">Import ISBNs</TabsTrigger>
        </TabsList>

        <TabsContent value="prefix" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Add Publisher ISBN Prefix
              </CardTitle>
              <CardDescription>
                Register your publisher prefix to generate ISBNs automatically
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(handleSubmit)}
                  className="space-y-6"
                >
                  {/* Prefix */}
                  <FormField
                    control={form.control}
                    name="prefix"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Publisher Prefix</FormLabel>
                        <FormControl>
                          <Input placeholder="978-1-12345" {...field} />
                        </FormControl>
                        <FormDescription>
                          Your ISBN prefix from your ISBN agency (e.g.,
                          978-1-12345)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Block Size */}
                  <FormField
                    control={form.control}
                    name="blockSize"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Block Size</FormLabel>
                        <Select
                          onValueChange={(val) => field.onChange(Number(val))}
                          value={String(field.value)}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select block size" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {BLOCK_SIZES.map((size) => (
                              <SelectItem key={size.value} value={size.value}>
                                {size.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Number of ISBNs in your purchased block
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full"
                  >
                    {isSubmitting && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Generate ISBN Pool
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="import" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Import Existing ISBNs</CardTitle>
              <CardDescription>
                Already have ISBNs? Import them from a file
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                If you already have ISBNs purchased from your ISBN agency, you
                can import them to manage in Salina.
              </p>
              <Button variant="outline" asChild className="w-full">
                <Link href="/isbn/import">
                  Go to ISBN Import
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Skip / Finish Button */}
      <div className="flex justify-center pt-4">
        <Button type="button" variant="outline" onClick={onSkip}>
          Skip & Finish Setup
        </Button>
      </div>

      <p className="text-xs text-center text-muted-foreground">
        You can configure ISBN settings later in Settings &gt; ISBN Prefixes
      </p>
    </div>
  );
}

export default StepConfigureIsbn;
