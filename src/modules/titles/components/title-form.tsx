"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, ChevronsUpDown } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { fetchAuthors } from "@/modules/authors/actions";
import type { Author } from "@/modules/authors/types";
import { createTitle } from "../actions";
import { type CreateTitleFormInput, createTitleFormSchema } from "../schema";
import type { TitleWithAuthor } from "../types";

interface TitleFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (title: TitleWithAuthor) => void;
}

/**
 * Genre options for dropdown
 */
const GENRE_OPTIONS = [
  "Fiction",
  "Non-Fiction",
  "Mystery",
  "Romance",
  "Science Fiction",
  "Fantasy",
  "Thriller",
  "Biography",
  "Self-Help",
  "Business",
  "Children",
  "Young Adult",
  "Poetry",
  "History",
  "Other",
];

/**
 * Title Form modal for creating new titles
 *
 * AC 5: "Create Title" modal implements Spacious Guided Flow
 * AC 5: Title (required), Subtitle (optional), Author (required searchable dropdown)
 * AC 5: Genre (optional dropdown), Word Count (optional), Publication Status (dropdown)
 * AC 5: Form validation with Zod schema and inline error messages
 * AC 5: Submit creates title via Server Action
 * AC 5: Success: toast notification, modal closes, new title appears in list
 */
export function TitleForm({ open, onOpenChange, onSuccess }: TitleFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [authorsLoading, setAuthorsLoading] = useState(false);
  const [authorOpen, setAuthorOpen] = useState(false);

  const form = useForm<CreateTitleFormInput>({
    resolver: zodResolver(createTitleFormSchema),
    defaultValues: {
      title: "",
      subtitle: "",
      author_id: "",
      genre: "",
      word_count: undefined,
      publication_status: "draft",
    },
  });

  // Load authors when dialog opens
  useEffect(() => {
    if (open && authors.length === 0) {
      setAuthorsLoading(true);
      fetchAuthors({ includeInactive: false })
        .then(setAuthors)
        .catch(console.error)
        .finally(() => setAuthorsLoading(false));
    }
  }, [open, authors.length]);

  const handleSubmit = async (data: CreateTitleFormInput) => {
    setIsLoading(true);
    const result = await createTitle(data);
    setIsLoading(false);

    if (result.success) {
      form.reset();
      onSuccess(result.data);
    } else {
      form.setError("root", { message: result.error });
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      form.reset();
    }
    onOpenChange(newOpen);
  };

  const selectedAuthor = authors.find((a) => a.id === form.watch("author_id"));

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Title</DialogTitle>
          <DialogDescription>
            Add a new title to your catalog. Title and author are required.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            {form.formState.errors.root && (
              <div className="text-sm text-red-500 bg-red-50 p-3 rounded">
                {form.formState.errors.root.message}
              </div>
            )}

            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Enter title"
                      maxLength={200}
                      autoFocus
                    />
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
                  <FormLabel>Subtitle</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Enter subtitle (optional)"
                      maxLength={200}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Author - Searchable Combobox */}
            <FormField
              control={form.control}
              name="author_id"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Author *</FormLabel>
                  <Popover open={authorOpen} onOpenChange={setAuthorOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={authorOpen}
                          className={cn(
                            "w-full justify-between",
                            !field.value && "text-muted-foreground",
                          )}
                        >
                          {selectedAuthor?.name || "Select author..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0">
                      <Command>
                        <CommandInput placeholder="Search authors..." />
                        <CommandList>
                          <CommandEmpty>
                            {authorsLoading
                              ? "Loading..."
                              : "No authors found."}
                          </CommandEmpty>
                          <CommandGroup>
                            {authors.map((author) => (
                              <CommandItem
                                key={author.id}
                                value={author.name}
                                onSelect={() => {
                                  form.setValue("author_id", author.id);
                                  setAuthorOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    author.id === field.value
                                      ? "opacity-100"
                                      : "opacity-0",
                                  )}
                                />
                                <div>
                                  <p>{author.name}</p>
                                  {author.email && (
                                    <p className="text-xs text-muted-foreground">
                                      {author.email}
                                    </p>
                                  )}
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Genre */}
            <FormField
              control={form.control}
              name="genre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Genre</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select genre (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {GENRE_OPTIONS.map((genre) => (
                        <SelectItem key={genre} value={genre}>
                          {genre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Word Count */}
            <FormField
              control={form.control}
              name="word_count"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Word Count</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Enter word count (optional)"
                      min={0}
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        field.onChange(val ? parseInt(val, 10) : undefined);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Publication Status */}
            <FormField
              control={form.control}
              name="publication_status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Publication Status</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="out_of_print">Out of Print</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Creating..." : "Create Title"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
