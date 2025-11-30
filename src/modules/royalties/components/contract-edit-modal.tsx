"use client";

/**
 * Contract Edit Modal
 *
 * Modal for editing contract details including status, advances, and tiers.
 * Story 4.3: Build Contract Detail View and Management
 *
 * AC 7: Edit modal allows contract modifications
 * - Status dropdown
 * - Advance Amount field
 * - Advance Paid field
 * - Tier modification section (reuses TierBuilder)
 * - Warning displayed if modifying tiers when statements exist
 */

import { AlertTriangle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { updateContract } from "../actions";
import type { ContractWithRelations, ContractFormat, TierInput } from "../types";
import { ContractTierBuilder } from "./contract-tier-builder";

interface EditFormData {
  status: "active" | "suspended" | "terminated";
  advance_amount: string;
  advance_paid: string;
  physical_tiers: { min_quantity: number; max_quantity: number | null; rate: number }[];
  ebook_tiers: { min_quantity: number; max_quantity: number | null; rate: number }[];
  audiobook_tiers: { min_quantity: number; max_quantity: number | null; rate: number }[];
  physical_enabled: boolean;
  ebook_enabled: boolean;
  audiobook_enabled: boolean;
}

interface ContractEditModalProps {
  contract: ContractWithRelations;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContractEditModal({
  contract,
  open,
  onOpenChange,
}: ContractEditModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Group tiers by format
  const tiersByFormat = contract.tiers.reduce(
    (acc, tier) => {
      if (!acc[tier.format]) {
        acc[tier.format] = [];
      }
      acc[tier.format].push({
        min_quantity: tier.min_quantity,
        max_quantity: tier.max_quantity,
        rate: parseFloat(tier.rate),
      });
      return acc;
    },
    {} as Record<string, { min_quantity: number; max_quantity: number | null; rate: number }[]>
  );

  const methods = useForm<EditFormData>({
    defaultValues: {
      status: contract.status as "active" | "suspended" | "terminated",
      advance_amount: contract.advance_amount || "0",
      advance_paid: contract.advance_paid || "0",
      physical_tiers: tiersByFormat.physical || [],
      ebook_tiers: tiersByFormat.ebook || [],
      audiobook_tiers: tiersByFormat.audiobook || [],
      physical_enabled: (tiersByFormat.physical?.length || 0) > 0,
      ebook_enabled: (tiersByFormat.ebook?.length || 0) > 0,
      audiobook_enabled: (tiersByFormat.audiobook?.length || 0) > 0,
    },
  });

  const { handleSubmit, watch } = methods;
  const formData = watch();

  // TODO: Check if statements exist for this contract (Epic 5)
  // For now, we'll show the warning if any tiers exist
  const hasStatements = false; // Will be updated in Epic 5

  const onSubmit = (data: EditFormData) => {
    // Build tiers array from all formats
    const tiers: TierInput[] = [];

    if (data.physical_enabled && data.physical_tiers.length > 0) {
      tiers.push(
        ...data.physical_tiers.map((t) => ({
          ...t,
          format: "physical" as ContractFormat,
        }))
      );
    }

    if (data.ebook_enabled && data.ebook_tiers.length > 0) {
      tiers.push(
        ...data.ebook_tiers.map((t) => ({
          ...t,
          format: "ebook" as ContractFormat,
        }))
      );
    }

    if (data.audiobook_enabled && data.audiobook_tiers.length > 0) {
      tiers.push(
        ...data.audiobook_tiers.map((t) => ({
          ...t,
          format: "audiobook" as ContractFormat,
        }))
      );
    }

    if (tiers.length === 0) {
      toast.error("Please configure at least one format with tiers");
      return;
    }

    startTransition(async () => {
      const result = await updateContract(contract.id, {
        status: data.status,
        advance_amount: data.advance_amount || "0",
        advance_paid: data.advance_paid || "0",
        tiers,
      });

      if (result.success) {
        toast.success("Contract updated successfully");
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Contract</DialogTitle>
          <DialogDescription>
            {contract.author.name} - {contract.title.title}
          </DialogDescription>
        </DialogHeader>

        <FormProvider {...methods}>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex-1 overflow-y-auto space-y-6 p-1"
          >
            {/* Warning if statements exist - AC 7 */}
            {hasStatements && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  This contract has existing royalty statements. Modifying tier
                  rates may create inconsistencies with historical calculations.
                </AlertDescription>
              </Alert>
            )}

            {/* Status and Advance Fields */}
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                control={methods.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
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
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                        <SelectItem value="terminated">Terminated</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={methods.control}
                name="advance_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Advance Amount</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          $
                        </span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          className="pl-7"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={methods.control}
                name="advance_paid"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Advance Paid</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          $
                        </span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          className="pl-7"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Tier Editing - Reuses TierBuilder */}
            <Tabs defaultValue="physical" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="physical">Physical</TabsTrigger>
                <TabsTrigger value="ebook">Ebook</TabsTrigger>
                <TabsTrigger value="audiobook">Audiobook</TabsTrigger>
              </TabsList>

              <TabsContent value="physical" className="mt-4">
                <ContractTierBuilder
                  format="physical"
                  tiersFieldName="physical_tiers"
                  enabledFieldName="physical_enabled"
                  title="Physical Book Tiers"
                  description="Configure tiered royalty rates for physical book sales"
                />
              </TabsContent>

              <TabsContent value="ebook" className="mt-4">
                <ContractTierBuilder
                  format="ebook"
                  tiersFieldName="ebook_tiers"
                  enabledFieldName="ebook_enabled"
                  title="Ebook Tiers"
                  description="Configure tiered royalty rates for ebook sales"
                />
              </TabsContent>

              <TabsContent value="audiobook" className="mt-4">
                <ContractTierBuilder
                  format="audiobook"
                  tiersFieldName="audiobook_tiers"
                  enabledFieldName="audiobook_enabled"
                  title="Audiobook Tiers"
                  description="Configure tiered royalty rates for audiobook sales"
                />
              </TabsContent>
            </Tabs>
          </form>
        </FormProvider>

        <DialogFooter className="pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit(onSubmit)}
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
