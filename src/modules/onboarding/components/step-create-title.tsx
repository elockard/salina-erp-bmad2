"use client";

/**
 * Step 4: Create First Title
 * Story 20.1: Build Onboarding Wizard
 * AC 20.1.6: Create First Title (Optional)
 *
 * Reference: src/modules/titles/components/title-form.tsx
 * Simplified title form for onboarding
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
import { createTitle } from "@/modules/titles/actions";
import { type CreateTitleInput, createTitleSchema } from "../schema";

const FORMATS = [
  { value: "paperback", label: "Paperback" },
  { value: "hardcover", label: "Hardcover" },
  { value: "ebook", label: "E-book" },
  { value: "audiobook", label: "Audiobook" },
];

interface Author {
  id: string;
  name: string;
}

interface StepCreateTitleProps {
  /** Available authors from Step 3 */
  authors?: Author[];
  /** Callback when step is completed */
  onComplete: (titleId: string, titleName: string, format: string) => void;
  /** Callback when step is skipped */
  onSkip: () => void;
}

export function StepCreateTitle({
  authors = [],
  onComplete,
  onSkip,
}: StepCreateTitleProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CreateTitleInput>({
    resolver: zodResolver(createTitleSchema),
    defaultValues: {
      title: "",
      subtitle: "",
      format: "paperback",
      publicationDate: null,
      authorId: authors[0]?.id || null,
    },
  });

  async function handleSubmit(data: CreateTitleInput) {
    setIsSubmitting(true);
    try {
      // Create title using existing action
      const result = await createTitle({
        title: data.title,
        subtitle: data.subtitle || undefined,
        author_id: data.authorId || authors[0]?.id || "",
        publication_status: "draft",
        publication_date: data.publicationDate || undefined,
      });

      if (result.success) {
        toast.success(`Title "${data.title}" created`);
        onComplete(result.data.id, data.title, data.format);
      } else {
        toast.error(
          "error" in result ? result.error : "Failed to create title",
        );
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
        <h2 className="text-xl font-semibold">Create Your First Title</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Add your first book or publication to the catalog. You can add more
          details later.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Title */}
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input placeholder="The Great Adventure" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Subtitle */}
          <FormField
            control={form.control}
            name="subtitle"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Subtitle (Optional)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="A Journey Through Time"
                    {...field}
                    value={field.value || ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Format */}
          <FormField
            control={form.control}
            name="format"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Format</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {FORMATS.map((format) => (
                      <SelectItem key={format.value} value={format.value}>
                        {format.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Select the primary format. Additional formats can be added
                  later when assigning ISBNs.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Publication Date */}
          <FormField
            control={form.control}
            name="publicationDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Publication Date (Optional)</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    value={field.value || ""}
                    onChange={(e) => field.onChange(e.target.value || null)}
                  />
                </FormControl>
                <FormDescription>
                  When the title was or will be published
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Author */}
          {authors.length > 0 && (
            <FormField
              control={form.control}
              name="authorId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Author</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || undefined}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select author" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {authors.map((author) => (
                        <SelectItem key={author.id} value={author.id}>
                          {author.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Link this title to an author you created
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {authors.length === 0 && (
            <p className="text-sm text-muted-foreground italic">
              No authors available. You can link an author after creating
              contacts.
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between pt-4">
            <Button type="button" variant="ghost" onClick={onSkip}>
              Skip for now
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create Title
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

export default StepCreateTitle;
