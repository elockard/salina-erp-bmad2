"use client";

/**
 * Royalty Calculation Test Form
 *
 * Form component for triggering test royalty calculations.
 * Uses searchable author dropdown, date pickers, and form validation.
 *
 * Story 4.5: Build Manual Royalty Calculation Trigger (Testing)
 * AC 2: Form displays Author dropdown, Period Start/End dates, Calculate button
 * AC 3: Form validation rules
 * AC 4: On submit, calls calculateRoyaltyForPeriod with loading state
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { addYears, format, isBefore, isFuture } from "date-fns";
import { CalendarIcon, Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { useCallback, useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { searchAuthorsAction, triggerTestCalculation } from "../actions";
import type { AuthorOption, RoyaltyCalculation } from "../types";

/**
 * Form validation schema - AC 3
 */
const calculationFormSchema = z
  .object({
    author_id: z.string().min(1, "Please select an author"),
    author_name: z.string().optional(),
    start_date: z.date({
      message: "Please select a start date",
    }),
    end_date: z.date({
      message: "Please select an end date",
    }),
  })
  .refine((data) => !isFuture(data.start_date), {
    message: "Start date cannot be in the future",
    path: ["start_date"],
  })
  .refine((data) => !isBefore(data.end_date, data.start_date), {
    message: "End date cannot be before start date",
    path: ["end_date"],
  })
  .refine((data) => !isBefore(addYears(data.start_date, 1), data.end_date), {
    message: "End date cannot be more than 1 year after start date",
    path: ["end_date"],
  });

type CalculationFormData = z.infer<typeof calculationFormSchema>;

interface CalculationTestFormProps {
  onCalculationComplete: (result: RoyaltyCalculation) => void;
}

/**
 * Debounce hook for search inputs
 */
function useDebounce<T extends (...args: Parameters<T>) => void>(
  callback: T,
  delay: number,
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);
  const delayRef = useRef(delay);
  callbackRef.current = callback;
  delayRef.current = delay;

  return useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(
        () => callbackRef.current(...args),
        delayRef.current,
      );
    }) as T,
    [],
  );
}

export function CalculationTestForm({
  onCalculationComplete,
}: CalculationTestFormProps) {
  // Form state
  const form = useForm<CalculationFormData>({
    resolver: zodResolver(calculationFormSchema),
    defaultValues: {
      author_id: "",
      author_name: "",
      start_date: undefined,
      end_date: undefined,
    },
  });

  // Author search state
  const [authorOpen, setAuthorOpen] = useState(false);
  const [authorSearch, setAuthorSearch] = useState("");
  const [authors, setAuthors] = useState<AuthorOption[]>([]);
  const [authorPending, startAuthorTransition] = useTransition();

  // Submission state - AC 4
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedAuthorId = form.watch("author_id");
  const selectedAuthorName = form.watch("author_name");

  // Search authors with debounce
  const searchAuthors = useDebounce((term: string) => {
    startAuthorTransition(async () => {
      const result = await searchAuthorsAction(term);
      if (result.success) {
        setAuthors(result.data);
      }
    });
  }, 300);

  // Handle author search input
  const handleAuthorSearchChange = (value: string) => {
    setAuthorSearch(value);
    searchAuthors(value);
  };

  // Select author
  const handleAuthorSelect = (author: AuthorOption) => {
    form.setValue("author_id", author.id);
    form.setValue("author_name", author.name);
    setAuthorOpen(false);
  };

  // Load initial authors when dropdown opens
  const handleAuthorOpenChange = (open: boolean) => {
    setAuthorOpen(open);
    if (open && authors.length === 0) {
      searchAuthors("");
    }
  };

  // Form submission - AC 4
  const onSubmit = async (data: CalculationFormData) => {
    setIsSubmitting(true);

    try {
      const result = await triggerTestCalculation(
        data.author_id,
        data.start_date,
        data.end_date,
      );

      if (result.success) {
        onCalculationComplete(result.calculation);
        toast.success("Calculation complete");
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      console.error("Calculation error:", error);
      toast.error("Failed to calculate royalties");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if form is valid for button state - AC 2
  const isFormValid = form.formState.isValid;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Calculate Royalties</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Author Selection - AC 2 */}
            <FormField
              control={form.control}
              name="author_id"
              render={() => (
                <FormItem className="flex flex-col">
                  <FormLabel>Author *</FormLabel>
                  <Popover
                    open={authorOpen}
                    onOpenChange={handleAuthorOpenChange}
                  >
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={authorOpen}
                          className={cn(
                            "w-full justify-between",
                            !selectedAuthorId && "text-muted-foreground",
                          )}
                        >
                          {selectedAuthorName || "Select author..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                      <Command shouldFilter={false}>
                        <CommandInput
                          placeholder="Search authors..."
                          value={authorSearch}
                          onValueChange={handleAuthorSearchChange}
                        />
                        <CommandList>
                          {authorPending ? (
                            <div className="flex items-center justify-center py-6">
                              <Loader2 className="h-4 w-4 animate-spin" />
                            </div>
                          ) : authors.length === 0 ? (
                            <CommandEmpty>No authors found.</CommandEmpty>
                          ) : (
                            <CommandGroup>
                              {authors.map((author) => (
                                <CommandItem
                                  key={author.id}
                                  value={author.id}
                                  onSelect={() => handleAuthorSelect(author)}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selectedAuthorId === author.id
                                        ? "opacity-100"
                                        : "opacity-0",
                                    )}
                                  />
                                  <div>
                                    <p className="font-medium">{author.name}</p>
                                    {author.email && (
                                      <p className="text-sm text-muted-foreground">
                                        {author.email}
                                      </p>
                                    )}
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    Select the author whose royalties you want to calculate
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date Pickers - AC 2 */}
            <div className="grid grid-cols-2 gap-4">
              {/* Start Date */}
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Period Start *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground",
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => isFuture(date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      Start of calculation period
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* End Date */}
              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Period End *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground",
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>End of calculation period</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Submit Button - AC 2 */}
            <Button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className="w-full"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Calculating...
                </>
              ) : (
                "Calculate Royalties"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
