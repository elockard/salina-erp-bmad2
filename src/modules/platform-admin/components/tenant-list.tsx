"use client";

/**
 * Tenant List Component
 *
 * Story 13.2: Build Tenant List and Search Interface
 * AC: 1, 2, 3, 4, 5, 7 - Display, search, filter, sort tenants with navigation
 *
 * Features:
 * - Search by name or subdomain (debounced 300ms)
 * - Status filter (All, Active, Suspended)
 * - Sort by name, created date, or user count
 * - Sort order toggle
 * - Loading skeleton during fetch
 * - Empty state with icon
 * - Toast notifications on errors
 * - URL state persistence
 * - Click to navigate to tenant detail
 */

import { format } from "date-fns";
import { ArrowUpDown, Building2, Search } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

import { searchTenants } from "../actions";
import type { PaginatedTenantsResult } from "../types";
import { TenantPagination } from "./tenant-pagination";

interface TenantListProps {
  initialData: PaginatedTenantsResult;
}

export function TenantList({ initialData }: TenantListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Initialize state from URL params with validation
  const [data, setData] = useState(initialData);
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [status, setStatus] = useState<"all" | "active" | "suspended">(() => {
    const urlStatus = searchParams.get("status");
    return urlStatus === "active" || urlStatus === "suspended"
      ? urlStatus
      : "all";
  });
  const [sortBy, setSortBy] = useState<"name" | "created_at" | "user_count">(
    () => {
      const urlSort = searchParams.get("sort");
      return urlSort === "created_at" || urlSort === "user_count"
        ? urlSort
        : "name";
    },
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(() => {
    const urlOrder = searchParams.get("order");
    return urlOrder === "desc" ? "desc" : "asc";
  });
  const [page, setPage] = useState(() => {
    const urlPage = Number(searchParams.get("page"));
    return Number.isFinite(urlPage) && urlPage >= 1 ? Math.floor(urlPage) : 1;
  });
  const [pageSize, setPageSize] = useState(() => {
    const urlSize = Number(searchParams.get("size"));
    const validSizes = [10, 25, 50, 100];
    return validSizes.includes(urlSize) ? urlSize : 25;
  });

  // Update URL when filters change
  const updateUrl = useCallback(() => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (status !== "all") params.set("status", status);
    if (sortBy !== "name") params.set("sort", sortBy);
    if (sortOrder !== "asc") params.set("order", sortOrder);
    if (page > 1) params.set("page", String(page));
    if (pageSize !== 25) params.set("size", String(pageSize));
    router.replace(`/platform-admin/tenants?${params.toString()}`, {
      scroll: false,
    });
  }, [search, status, sortBy, sortOrder, page, pageSize, router]);

  // Fetch tenants
  const fetchTenants = useCallback(async () => {
    startTransition(async () => {
      const result = await searchTenants({
        search: search || undefined,
        status,
        sortBy,
        sortOrder,
        page,
        pageSize,
      });

      if (result.success) {
        setData(result.data);
      } else {
        toast.error(result.error);
      }
    });
  }, [search, status, sortBy, sortOrder, page, pageSize]);

  // Debounced search & URL update
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTenants();
      updateUrl();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchTenants, updateUrl]);

  const toggleSortOrder = () =>
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search by name or subdomain..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="border-slate-700 bg-slate-800 pl-10 text-white"
          />
        </div>
        {/* Status filter - disabled until Story 13.4 adds status column */}
        <Select
          value={status}
          onValueChange={(v: typeof status) => {
            setStatus(v);
            setPage(1);
          }}
          disabled
        >
          <SelectTrigger
            className="w-[140px] border-slate-700 bg-slate-800 text-white opacity-50 cursor-not-allowed"
            title="Status filtering coming in Story 13.4"
          >
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={sortBy}
          onValueChange={(v: typeof sortBy) => {
            setSortBy(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[160px] border-slate-700 bg-slate-800 text-white">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="created_at">Created Date</SelectItem>
            <SelectItem value="user_count">User Count</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="icon"
          onClick={toggleSortOrder}
          className="border-slate-700"
        >
          <ArrowUpDown
            className={`h-4 w-4 transition-transform ${sortOrder === "desc" ? "rotate-180" : ""}`}
          />
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-slate-700 bg-slate-800">
        <table className="w-full">
          <thead className="border-b border-slate-700 bg-slate-800/50">
            <tr className="text-left text-sm text-slate-400">
              <th className="p-4 font-medium">Tenant</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium">Created</th>
              <th className="p-4 font-medium">Users</th>
            </tr>
          </thead>
          <tbody>
            {isPending ? (
              Array.from({ length: 5 }).map((_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: Skeleton placeholders have no stable IDs
                <tr key={`skeleton-${i}`} className="border-b border-slate-700">
                  <td className="p-4">
                    <Skeleton className="h-10 w-48 bg-slate-700" />
                  </td>
                  <td className="p-4">
                    <Skeleton className="h-6 w-16 bg-slate-700" />
                  </td>
                  <td className="p-4">
                    <Skeleton className="h-6 w-24 bg-slate-700" />
                  </td>
                  <td className="p-4">
                    <Skeleton className="h-6 w-16 bg-slate-700" />
                  </td>
                </tr>
              ))
            ) : data.tenants.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-12 text-center">
                  <Building2 className="mx-auto mb-3 h-12 w-12 text-slate-600" />
                  <p className="font-medium text-slate-400">No tenants found</p>
                  <p className="text-sm text-slate-500">
                    Try adjusting your search or filters
                  </p>
                </td>
              </tr>
            ) : (
              data.tenants.map((tenant) => (
                <tr
                  key={tenant.id}
                  className="border-b border-slate-700 transition-colors hover:bg-slate-700/50"
                >
                  <td className="p-4">
                    <Link
                      href={`/platform-admin/tenants/${tenant.id}`}
                      className="group block"
                    >
                      <div className="font-medium text-white group-hover:text-blue-400">
                        {tenant.name}
                      </div>
                      {/* TODO: Extract domain to env config (e.g., NEXT_PUBLIC_APP_DOMAIN) */}
                      <div className="text-sm text-slate-400">
                        {tenant.subdomain}.salina-erp.com
                      </div>
                    </Link>
                  </td>
                  <td className="p-4">
                    <Badge
                      className={
                        tenant.status === "active"
                          ? "bg-green-600 hover:bg-green-700"
                          : "bg-red-600 hover:bg-red-700"
                      }
                    >
                      {tenant.status}
                    </Badge>
                  </td>
                  <td className="p-4 text-slate-300">
                    {format(new Date(tenant.created_at), "MMM dd, yyyy")}
                  </td>
                  <td className="p-4">
                    <Badge variant="secondary" className="bg-slate-700">
                      {tenant.user_count} users
                    </Badge>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <TenantPagination
        page={data.page}
        pageSize={data.pageSize}
        total={data.total}
        totalPages={data.totalPages}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />
    </div>
  );
}
