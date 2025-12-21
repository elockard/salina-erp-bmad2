"use client";

/**
 * Production Board Component
 *
 * Kanban-style board with drag-and-drop stage transitions.
 * AC-18.3.1: Board with columns for each workflow stage
 * AC-18.3.3: Drag projects between stages with validation
 * AC-18.3.5: Filter by date range and search by title
 *
 * Story: 18.3 - Track Production Workflow Stages
 */

import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { format } from "date-fns";
import { CalendarIcon, Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

import { updateWorkflowStage } from "../actions";
import {
  isValidWorkflowTransition,
  WORKFLOW_STAGE_LABELS,
  WORKFLOW_STAGES,
  type WorkflowStage,
} from "../schema";
import type { BoardProjectCard, ProductionBoardData } from "../types";
import { BoardColumn } from "./board-column";
import { BoardProjectCardComponent } from "./board-project-card";

interface ProductionBoardProps {
  initialData: ProductionBoardData;
}

export function ProductionBoard({ initialData }: ProductionBoardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [boardData, setBoardData] = useState(initialData);
  const [activeCard, setActiveCard] = useState<BoardProjectCard | null>(null);

  // Filter state
  const [searchValue, setSearchValue] = useState(
    initialData.filters.search || "",
  );
  const [dateFrom, setDateFrom] = useState<Date | undefined>(
    initialData.filters.dateFrom
      ? new Date(initialData.filters.dateFrom)
      : undefined,
  );
  const [dateTo, setDateTo] = useState<Date | undefined>(
    initialData.filters.dateTo
      ? new Date(initialData.filters.dateTo)
      : undefined,
  );

  // DnD sensors with activation constraints
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
  );

  // Find card by ID across all stages
  const findCard = useCallback(
    (id: string): { card: BoardProjectCard; stage: WorkflowStage } | null => {
      for (const stage of WORKFLOW_STAGES) {
        const card = boardData.stages[stage].find((c) => c.id === id);
        if (card) {
          return { card, stage };
        }
      }
      return null;
    },
    [boardData.stages],
  );

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    const id = event.active.id as string;
    const found = findCard(id);
    setActiveCard(found?.card || null);
  };

  // Handle drag end
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);

    if (!over) return;

    const projectId = active.id as string;
    const newStage = over.id as WorkflowStage;

    // Find current card and stage
    const found = findCard(projectId);
    if (!found) return;

    const { card, stage: currentStage } = found;
    if (currentStage === newStage) return;

    // Validate transition (client-side check for immediate feedback)
    if (!isValidWorkflowTransition(currentStage, newStage)) {
      toast.error("Cannot skip stages. Move one stage at a time.");
      return;
    }

    // Optimistic update
    setBoardData((prev) => ({
      ...prev,
      stages: {
        ...prev.stages,
        [currentStage]: prev.stages[currentStage].filter(
          (c) => c.id !== projectId,
        ),
        [newStage]: [
          ...prev.stages[newStage],
          { ...card, workflowStage: newStage },
        ],
      },
    }));

    // Server update
    const result = await updateWorkflowStage(projectId, newStage);

    if (!result.success) {
      toast.error(result.message || "Failed to update stage");
      // Rollback on failure
      setBoardData((prev) => ({
        ...prev,
        stages: {
          ...prev.stages,
          [newStage]: prev.stages[newStage].filter((c) => c.id !== projectId),
          [currentStage]: [...prev.stages[currentStage], card],
        },
      }));
    } else {
      toast.success(`Moved to ${WORKFLOW_STAGE_LABELS[newStage]}`);
    }
  };

  // Apply filters via URL params
  const applyFilters = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());

    if (searchValue) {
      params.set("search", searchValue);
    } else {
      params.delete("search");
    }

    if (dateFrom) {
      params.set("dateFrom", format(dateFrom, "yyyy-MM-dd"));
    } else {
      params.delete("dateFrom");
    }

    if (dateTo) {
      params.set("dateTo", format(dateTo, "yyyy-MM-dd"));
    } else {
      params.delete("dateTo");
    }

    startTransition(() => {
      router.push(`/production/board?${params.toString()}`);
    });
  }, [searchValue, dateFrom, dateTo, searchParams, router]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearchValue("");
    setDateFrom(undefined);
    setDateTo(undefined);
    startTransition(() => {
      router.push("/production/board");
    });
  }, [router]);

  const hasFilters = searchValue || dateFrom || dateTo;

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/30 rounded-lg border">
        {/* Search */}
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyFilters()}
            className="pl-9"
          />
        </div>

        {/* Date from */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-40 justify-start text-left font-normal",
                !dateFrom && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateFrom ? format(dateFrom, "MMM d, yyyy") : "From date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateFrom}
              onSelect={setDateFrom}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        {/* Date to */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-40 justify-start text-left font-normal",
                !dateTo && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateTo ? format(dateTo, "MMM d, yyyy") : "To date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateTo}
              onSelect={setDateTo}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        {/* Apply button */}
        <Button onClick={applyFilters} disabled={isPending}>
          Apply
        </Button>

        {/* Clear filters */}
        {hasFilters && (
          <Button
            variant="ghost"
            onClick={clearFilters}
            disabled={isPending}
            className="text-muted-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Board */}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {WORKFLOW_STAGES.map((stage) => (
            <BoardColumn
              key={stage}
              stage={stage}
              label={WORKFLOW_STAGE_LABELS[stage]}
              cards={boardData.stages[stage]}
            />
          ))}
        </div>
        <DragOverlay>
          {activeCard && (
            <BoardProjectCardComponent card={activeCard} isDragging />
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
