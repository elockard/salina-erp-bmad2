"use client";

/**
 * Production Split View Component
 *
 * Split view layout for production project management.
 * Left panel: list with filters. Right panel: detail view.
 *
 * Story: 18.1 - Create Production Projects
 * AC-18.1.4: View list
 * AC-18.1.5: View detail
 */

import { Plus, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { getProductionProject, getProductionProjects } from "../queries";
import type { ProductionStatus } from "../schema";
import type { ProductionProjectWithTitle, TitleOption } from "../types";
import { ProductionProjectDetail } from "./production-project-detail";
import { ProductionProjectForm } from "./production-project-form";
import { ProductionProjectList } from "./production-project-list";

interface ProductionSplitViewProps {
  initialProjects: ProductionProjectWithTitle[];
  availableTitles: TitleOption[];
}

export function ProductionSplitView({
  initialProjects,
  availableTitles: initialTitles,
}: ProductionSplitViewProps) {
  const [projects, setProjects] =
    useState<ProductionProjectWithTitle[]>(initialProjects);
  const [availableTitles, setAvailableTitles] =
    useState<TitleOption[]>(initialTitles);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] =
    useState<ProductionProjectWithTitle | null>(null);
  const [statusFilter, setStatusFilter] = useState<ProductionStatus | "all">(
    "all",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  // Reload projects with current filters
  const reloadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getProductionProjects({
        status: statusFilter === "all" ? undefined : statusFilter,
        search: searchQuery || undefined,
      });
      setProjects(result);
    } catch (error) {
      console.error("Failed to reload projects:", error);
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery]);

  // Reload when filters change
  useEffect(() => {
    reloadProjects();
  }, [reloadProjects]);

  // Load full project detail when selected
  useEffect(() => {
    if (!selectedId) {
      setSelectedProject(null);
      return;
    }

    const projectId = selectedId;
    async function loadProject() {
      try {
        const project = await getProductionProject(projectId);
        setSelectedProject(project);
      } catch (error) {
        console.error("Failed to load project:", error);
        toast.error("Failed to load project details");
      }
    }

    loadProject();
  }, [selectedId]);

  // Handle project selection
  const handleSelect = (id: string) => {
    setSelectedId(id);
    setMobileDetailOpen(true);
  };

  // Handle project created
  const handleProjectCreated = async () => {
    await reloadProjects();
    setCreateDialogOpen(false);
    // Refresh available titles
    const { getAvailableTitlesForProduction } = await import("../queries");
    const titles = await getAvailableTitlesForProduction();
    setAvailableTitles(titles);
  };

  // Handle project updated
  const handleProjectUpdated = async () => {
    await reloadProjects();
    if (selectedId) {
      const project = await getProductionProject(selectedId);
      setSelectedProject(project);
    }
    // Refresh available titles
    const { getAvailableTitlesForProduction } = await import("../queries");
    const titles = await getAvailableTitlesForProduction();
    setAvailableTitles(titles);
  };

  // Handle project deleted
  const handleProjectDeleted = async () => {
    setSelectedId(null);
    setSelectedProject(null);
    setMobileDetailOpen(false);
    await reloadProjects();
    // Refresh available titles
    const { getAvailableTitlesForProduction } = await import("../queries");
    const titles = await getAvailableTitlesForProduction();
    setAvailableTitles(titles);
  };

  // Close mobile detail view
  const closeMobileDetail = () => {
    setMobileDetailOpen(false);
  };

  return (
    <>
      <div className="flex h-[calc(100vh-12rem)] overflow-hidden rounded-lg border">
        {/* Left Panel - List */}
        <div
          className={cn(
            "w-full flex-shrink-0 border-r md:w-80",
            mobileDetailOpen && "hidden md:block",
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b p-4">
            <h3 className="font-semibold">Projects</h3>
            <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New
            </Button>
          </div>

          {/* List */}
          <ProductionProjectList
            projects={projects}
            selectedId={selectedId}
            onSelect={handleSelect}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            loading={loading}
          />
        </div>

        {/* Right Panel - Detail */}
        <div
          className={cn(
            "flex-1 overflow-y-auto bg-muted/30",
            !mobileDetailOpen && "hidden md:block",
          )}
        >
          {/* Mobile back button */}
          <div className="flex items-center border-b p-4 md:hidden">
            <Button variant="ghost" size="sm" onClick={closeMobileDetail}>
              <X className="mr-2 h-4 w-4" />
              Back
            </Button>
          </div>

          {selectedProject ? (
            <ProductionProjectDetail
              project={selectedProject}
              availableTitles={availableTitles}
              onUpdate={handleProjectUpdated}
              onDelete={handleProjectDeleted}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              Select a project to view details
            </div>
          )}
        </div>
      </div>

      {/* Create Dialog */}
      <ProductionProjectForm
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        availableTitles={availableTitles}
        onSuccess={handleProjectCreated}
      />
    </>
  );
}
