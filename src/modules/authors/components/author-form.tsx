"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useHasPermission } from "@/lib/hooks/useHasPermission";
import { VIEW_TAX_ID } from "@/lib/permissions";
import { createAuthor } from "../actions";
import { type CreateAuthorInput, createAuthorSchema } from "../schema";
import type { Author } from "../types";

interface AuthorFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (author: Author) => void;
}

/**
 * Author Form modal for creating new authors
 *
 * AC 13: "Create Author" button in left panel header opens modal dialog
 * AC 14: Create Author form fields: Name (required), Email (optional), Phone, Address, Tax ID (masked), Payment Method
 * AC 15: Payment Method dropdown: Direct Deposit, Check, Wire Transfer
 * AC 16: Form validation uses Zod schema with inline error messages
 * AC 21: After creating author: Success toast, author appears in list, detail loads
 */
export function AuthorForm({ open, onOpenChange, onSuccess }: AuthorFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const canViewTaxId = useHasPermission(VIEW_TAX_ID);

  const form = useForm<CreateAuthorInput>({
    resolver: zodResolver(createAuthorSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
      tax_id: "",
      payment_method: undefined,
    },
  });

  const handleSubmit = async (data: CreateAuthorInput) => {
    setIsLoading(true);
    const result = await createAuthor(data);
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Author</DialogTitle>
          <DialogDescription>
            Add a new author to your roster. Only name is required.
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

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Author name" autoFocus />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      placeholder="author@example.com"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="(555) 123-4567" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="123 Main St, City, ST 12345"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {canViewTaxId && (
              <FormField
                control={form.control}
                name="tax_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tax ID</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Tax ID (will be encrypted)"
                        autoComplete="off"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="payment_method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Method</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="direct_deposit">
                        Direct Deposit
                      </SelectItem>
                      <SelectItem value="check">Check</SelectItem>
                      <SelectItem value="wire_transfer">
                        Wire Transfer
                      </SelectItem>
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
                {isLoading ? "Creating..." : "Create Author"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
