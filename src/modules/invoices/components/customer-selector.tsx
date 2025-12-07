"use client";

/**
 * Customer Selector Component
 *
 * Searchable combobox for selecting customers in invoice creation.
 * Displays customers with "Last, First" format and email.
 *
 * Story 8.2: Build Invoice Creation Form
 * AC-8.2.2: Customer selector (contacts with Customer role, searchable combobox)
 * AC-8.2.8: On select, return full ContactWithRoles for address extraction
 *
 * Pattern: Based on src/modules/sales/components/title-autocomplete.tsx
 */

import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import * as React from "react";
import { useTransition } from "react";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { ContactWithRoles } from "@/modules/contacts/types";
import { searchCustomersAction } from "../actions";

/**
 * Selected customer data for form state
 */
export interface SelectedCustomer {
  id: string;
  displayName: string; // "Last, First" format
  email: string | null;
  /** Full contact with roles for address extraction */
  contact: ContactWithRoles;
}

interface CustomerSelectorProps {
  /** Currently selected customer */
  value: SelectedCustomer | null;
  /** Callback when customer is selected */
  onSelect: (customer: SelectedCustomer | null) => void;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Placeholder text */
  placeholder?: string;
}

/**
 * Format contact name as "Last, First"
 */
function formatCustomerName(contact: ContactWithRoles): string {
  return `${contact.last_name}, ${contact.first_name}`;
}

export function CustomerSelector({
  value,
  onSelect,
  disabled = false,
  placeholder = "Search customers...",
}: CustomerSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [customers, setCustomers] = React.useState<ContactWithRoles[]>([]);
  const [isPending, startTransition] = useTransition();
  const debounceRef = React.useRef<NodeJS.Timeout | null>(null);

  // Debounced search effect (300ms per story spec)
  React.useEffect(() => {
    // Clear previous timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Don't search if query is too short
    if (searchQuery.length < 2) {
      setCustomers([]);
      return;
    }

    // Debounce 300ms
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const result = await searchCustomersAction(searchQuery);
        if (result.success && result.data) {
          setCustomers(result.data);
        } else {
          setCustomers([]);
        }
      });
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchQuery]);

  // Handle customer selection
  const handleSelect = (customer: ContactWithRoles) => {
    const selected: SelectedCustomer = {
      id: customer.id,
      displayName: formatCustomerName(customer),
      email: customer.email,
      contact: customer,
    };
    onSelect(selected);
    setOpen(false);
    setSearchQuery("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Select customer"
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            !value && "text-muted-foreground",
          )}
        >
          {value ? (
            <span className="truncate">
              {value.displayName}
              {value.email && (
                <span className="ml-2 text-muted-foreground">
                  ({value.email})
                </span>
              )}
            </span>
          ) : (
            placeholder
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Type to search customers..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            {/* Loading state */}
            {isPending && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">
                  Searching...
                </span>
              </div>
            )}

            {/* Empty state */}
            {!isPending && searchQuery.length >= 2 && customers.length === 0 && (
              <CommandEmpty>No customers found.</CommandEmpty>
            )}

            {/* Prompt to type more */}
            {!isPending && searchQuery.length < 2 && searchQuery.length > 0 && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Type at least 2 characters to search
              </div>
            )}

            {/* Initial state */}
            {!isPending && searchQuery.length === 0 && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Start typing to search customers
              </div>
            )}

            {/* Results */}
            {!isPending && customers.length > 0 && (
              <CommandGroup>
                {customers.map((customer) => {
                  const displayName = formatCustomerName(customer);
                  return (
                    <CommandItem
                      key={customer.id}
                      value={customer.id}
                      onSelect={() => handleSelect(customer)}
                      className="flex flex-col items-start gap-1 py-3"
                    >
                      <div className="flex w-full items-center gap-2">
                        <Check
                          className={cn(
                            "h-4 w-4",
                            value?.id === customer.id
                              ? "opacity-100"
                              : "opacity-0",
                          )}
                        />
                        <span className="font-medium">{displayName}</span>
                      </div>
                      {customer.email && (
                        <span className="ml-6 text-sm text-muted-foreground">
                          {customer.email}
                        </span>
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
