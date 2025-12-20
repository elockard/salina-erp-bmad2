"use client";

/**
 * Production Project List Component
 *
 * Displays list of production projects with filters.
 *
 * Story: 18.1 - Create Production Projects
 * AC-18.1.4: View list with status filter and search
 */

import { format } from "date-fns";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { PRODUCTION_STATUS_LABELS, type ProductionStatus } from "../schema";
import type { ProductionProjectWithTitle } from "../types";
import { ProductionStatusBadge } from "./status-badge";

interface ProductionProjectListProps {
  projects: ProductionProjectWithTitle[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  statusFilter: ProductionStatus | "all";
  onStatusFilterChange: (status: ProductionStatus | "all") => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  loading?: boolean;
}

export function ProductionProjectList({
  projects,
  selectedId,
  onSelect,
  statusFilter,
  onStatusFilterChange,
  searchQuery,
  onSearchChange,
  loading,
}: ProductionProjectListProps) {
  return (
    <div className="flex h-full flex-col">
      {/* Filters */}
      <div className="space-y-3 border-b p-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search titles..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Status Filter */}
        <Select
          value={statusFilter}
          onValueChange={(value) =>
            onStatusFilterChange(value as ProductionStatus | "all")
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(PRODUCTION_STATUS_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : projects.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-muted-foreground">
            No production projects yet
          </div>
        ) : (
          <div className="divide-y">
            {projects.map((project) => (
              <button
                key={project.id}
                type="button"
                onClick={() => onSelect(project.id)}
                className={cn(
                  "w-full p-4 text-left transition-colors hover:bg-muted/50",
                  selectedId === project.id && "bg-muted",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h4 className="truncate font-medium">
                      {project.titleName}
                    </h4>
                    {project.isbn13 && (
                      <p className="text-sm text-muted-foreground">
                        {project.isbn13}
                      </p>
                    )}
                  </div>
                  <ProductionStatusBadge status={project.status} />
                </div>

                <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                  {project.targetPublicationDate && (
                    <span>
                      Target:{" "}
                      {format(
                        new Date(project.targetPublicationDate),
                        "MMM d, yyyy",
                      )}
                    </span>
                  )}
                  <span>
                    Created: {format(project.createdAt, "MMM d, yyyy")}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
