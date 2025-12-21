"use client";

/**
 * Board Column Component
 *
 * Droppable column for production board representing a workflow stage.
 * AC-18.3.1: Column displays stage label and project count
 *
 * Story: 18.3 - Track Production Workflow Stages
 */

import { useDroppable } from "@dnd-kit/core";

import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

import type { WorkflowStage } from "../schema";
import type { BoardProjectCard } from "../types";
import { BoardProjectCardComponent } from "./board-project-card";

interface BoardColumnProps {
  stage: WorkflowStage;
  label: string;
  cards: BoardProjectCard[];
}

export function BoardColumn({ stage, label, cards }: BoardColumnProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: stage,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex-shrink-0 w-72 bg-muted/30 rounded-lg border",
        isOver && "ring-2 ring-primary bg-primary/5",
      )}
    >
      {/* Column header */}
      <div className="p-3 border-b bg-muted/50 rounded-t-lg">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">{label}</h3>
          <Badge variant="secondary" className="text-xs">
            {cards.length}
          </Badge>
        </div>
      </div>

      {/* Cards container */}
      <ScrollArea className="h-[calc(100vh-220px)]">
        <div className="p-2 space-y-2">
          {cards.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No projects
            </div>
          ) : (
            cards.map((card) => (
              <BoardProjectCardComponent key={card.id} card={card} />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
