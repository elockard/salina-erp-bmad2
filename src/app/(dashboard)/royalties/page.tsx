"use client";

/**
 * Royalties Page - Contracts List
 *
 * View and manage royalty contracts.
 * Story 4.2: Build Contract Creation Form with Tiered Royalty Configuration
 *
 * AC 10: Contract entry accessible from Royalties module
 * AC 7: Redirects to contract detail on success
 */

import {
  ChevronRight,
  DollarSign,
  Home,
  Loader2,
  Plus,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ContractWizardModal } from "@/modules/royalties/components/contract-wizard-modal";
import { getContracts } from "@/modules/royalties/queries";
import type { ContractWithRelations } from "@/modules/royalties/types";

const STATUS_BADGES: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" }
> = {
  active: { label: "Active", variant: "default" },
  suspended: { label: "Suspended", variant: "secondary" },
  terminated: { label: "Terminated", variant: "destructive" },
};

export default function RoyaltiesPage() {
  const router = useRouter();

  // Data state
  const [contracts, setContracts] = useState<ContractWithRelations[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  // Loading states
  const [isLoading, setIsLoading] = useState(true);

  // Modal state
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  // Search state
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch contracts
  const fetchContracts = useCallback(async (page: number) => {
    setIsLoading(true);
    try {
      const result = await getContracts(page, 20);
      setContracts(result.items);
      setTotal(result.total);
    } catch (error) {
      toast.error("Failed to load contracts");
      console.error("fetchContracts error:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchContracts(1);
  }, [fetchContracts]);

  // Handle page change
  const _handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchContracts(page);
  };

  // Handle contract creation success - AC 10: Redirect to detail after creation
  const handleContractCreated = (contractId: string) => {
    fetchContracts(currentPage);
    router.push(`/royalties/${contractId}`);
  };

  // Format currency
  const formatCurrency = (amount: string): string => {
    const num = parseFloat(amount || "0");
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(num);
  };

  // Filter contracts by search
  const filteredContracts = contracts.filter((contract) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (contract.author?.name ?? "").toLowerCase().includes(term) ||
      contract.title.title.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center text-sm text-muted-foreground">
        <Link
          href="/dashboard"
          className="flex items-center hover:text-foreground transition-colors"
        >
          <Home className="h-4 w-4" />
          <span className="ml-1">Dashboard</span>
        </Link>
        <ChevronRight className="mx-2 h-4 w-4" />
        <span className="text-foreground font-medium">Royalty Contracts</span>
      </nav>

      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <DollarSign className="h-6 w-6" />
            Royalty Contracts
          </h1>
          <p className="text-muted-foreground">
            Manage royalty contracts with tiered rates
          </p>
        </div>
        <Button onClick={() => setIsWizardOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Contract
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Contracts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Contracts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {contracts.filter((c) => c.status === "active").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Advances
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                contracts
                  .reduce(
                    (sum, c) => sum + parseFloat(c.advance_amount || "0"),
                    0,
                  )
                  .toString(),
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by author or title..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Contracts Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredContracts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {searchTerm
                  ? "No contracts match your search"
                  : "No contracts yet. Create your first contract."}
              </p>
              {!searchTerm && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setIsWizardOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Contract
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Author</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Advance</TableHead>
                  <TableHead>Formats</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContracts.map((contract) => {
                  const status =
                    STATUS_BADGES[contract.status] || STATUS_BADGES.active;
                  const formats = [
                    ...new Set(contract.tiers.map((t) => t.format)),
                  ];

                  return (
                    <TableRow
                      key={contract.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        // AC 10: Navigate to contract detail on row click
                        router.push(`/royalties/${contract.id}`);
                      }}
                    >
                      <TableCell className="font-medium">
                        {contract.author?.name ?? "Author"}
                      </TableCell>
                      <TableCell>{contract.title.title}</TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell>
                        {formatCurrency(contract.advance_amount)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {formats.map((format) => (
                            <Badge
                              key={format}
                              variant="outline"
                              className="text-xs"
                            >
                              {format}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(contract.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Contract Wizard Modal */}
      <ContractWizardModal
        open={isWizardOpen}
        onOpenChange={setIsWizardOpen}
        onSuccess={handleContractCreated}
      />
    </div>
  );
}
