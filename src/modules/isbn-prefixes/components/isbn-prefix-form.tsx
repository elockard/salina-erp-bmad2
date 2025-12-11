"use client";

/**
 * ISBN Prefix Registration Form
 *
 * Story 7.4: Implement Publisher ISBN Prefix System
 * AC-7.4.3: Prefix Registration Form with validation
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { createIsbnPrefix } from "../actions";
import { formatPrefix, validateIsbnPrefix } from "../utils";

/**
 * Form values type
 * Story 7.6: Removed type field - ISBNs are unified without type distinction
 */
interface FormValues {
  prefix: string;
  block_size: number;
  description?: string;
}

/**
 * Form-specific schema for validation
 * Story 7.6: Removed type field - ISBNs are unified without type distinction
 */
const formSchema = z.object({
  prefix: z
    .string()
    .min(1, "Prefix is required")
    .refine(
      (val) => {
        const normalized = val.replace(/[-\s]/g, "");
        return normalized.length >= 7 && normalized.length <= 12;
      },
      { message: "Prefix must be 7-12 digits" },
    )
    .refine(
      (val) => {
        const normalized = val.replace(/[-\s]/g, "");
        return /^\d+$/.test(normalized);
      },
      { message: "Prefix must contain only digits and hyphens" },
    )
    .refine(
      (val) => {
        const normalized = val.replace(/[-\s]/g, "");
        return normalized.startsWith("978") || normalized.startsWith("979");
      },
      { message: "Prefix must start with 978 or 979" },
    ),
  block_size: z.number(),
  description: z.string().max(100).optional(),
});

const blockSizeOptions = [
  { value: "10", label: "10 ISBNs" },
  { value: "100", label: "100 ISBNs" },
  { value: "1000", label: "1,000 ISBNs" },
  { value: "10000", label: "10,000 ISBNs" },
  { value: "100000", label: "100,000 ISBNs" },
  { value: "1000000", label: "1,000,000 ISBNs" },
];

interface IsbnPrefixFormProps {
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function IsbnPrefixForm({ trigger, onSuccess }: IsbnPrefixFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [prefixPreview, setPrefixPreview] = useState<string>("");
  const [maxBlockSize, setMaxBlockSize] = useState<number>(1000000);

  // Story 7.6: Removed type from default values - ISBNs are unified
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      prefix: "",
      block_size: 100,
      description: "",
    },
  });

  const handlePrefixChange = (value: string) => {
    // Format preview with hyphens
    const validation = validateIsbnPrefix(value);
    if (validation.valid && validation.normalizedPrefix) {
      setPrefixPreview(formatPrefix(validation.normalizedPrefix));
      setMaxBlockSize(validation.maxBlockSize ?? 1000000);
    } else {
      setPrefixPreview("");
      setMaxBlockSize(1000000);
    }
  };

  async function onSubmit(data: FormValues) {
    setIsSubmitting(true);
    try {
      const result = await createIsbnPrefix({
        ...data,
        block_size: data.block_size as
          | 10
          | 100
          | 1000
          | 10000
          | 100000
          | 1000000,
      });

      if (result.success) {
        toast.success(result.data.message);
        form.reset();
        setOpen(false);
        router.refresh();
        onSuccess?.();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Failed to create prefix. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button>Add ISBN Prefix</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Register ISBN Prefix</DialogTitle>
          <DialogDescription>
            Add a new publisher ISBN prefix to generate ISBNs for your titles.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="prefix"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Publisher Prefix</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="978-1-234567"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        handlePrefixChange(e.target.value);
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    {prefixPreview ? (
                      <span className="font-mono">{prefixPreview}</span>
                    ) : (
                      "Enter your publisher prefix (e.g., 978-1-234567)"
                    )}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="block_size"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Block Size</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(Number(v))}
                    defaultValue={String(field.value)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select block size" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {blockSizeOptions
                        .filter((opt) => Number(opt.value) <= maxBlockSize)
                        .map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Number of ISBNs to generate (max{" "}
                    {maxBlockSize.toLocaleString()} for this prefix)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Story 7.6: Removed ISBN Type radio group - ISBNs are unified */}

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Main series, Fiction titles"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    A friendly name to identify this prefix
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Prefix
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
