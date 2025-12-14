"use client";

/**
 * Alerts Section Component
 *
 * Story 13.7: Build System Health and Job Monitoring (AC: 6)
 *
 * Displays system alerts with:
 * - Color coding by severity (critical/warning/info)
 * - Dismiss/acknowledge button per alert
 * - "No alerts" message when all clear
 */

import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SystemAlert } from "../types";

interface AlertsSectionProps {
  alerts: SystemAlert[];
  onAcknowledge: (alertId: string) => void;
}

const severityConfig = {
  critical: {
    icon: AlertTriangle,
    bgColor: "bg-red-900/30",
    borderColor: "border-red-700",
    textColor: "text-red-400",
    iconColor: "text-red-500",
  },
  warning: {
    icon: AlertCircle,
    bgColor: "bg-amber-900/30",
    borderColor: "border-amber-700",
    textColor: "text-amber-400",
    iconColor: "text-amber-500",
  },
  info: {
    icon: Info,
    bgColor: "bg-blue-900/30",
    borderColor: "border-blue-700",
    textColor: "text-blue-400",
    iconColor: "text-blue-500",
  },
};

const sourceLabels: Record<string, string> = {
  database: "Database",
  inngest: "Background Jobs",
  email: "Email Service",
  application: "Application",
};

export function AlertsSection({ alerts, onAcknowledge }: AlertsSectionProps) {
  if (alerts.length === 0) {
    return (
      <div className="rounded-lg border border-green-700 bg-green-900/20 p-4">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <span className="font-medium text-green-400">
            All systems healthy
          </span>
          <span className="text-sm text-green-600">- No active alerts</span>
        </div>
      </div>
    );
  }

  // Sort by severity: critical first, then warning, then info
  const sortedAlerts = [...alerts].sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 };
    return order[a.severity] - order[b.severity];
  });

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-slate-400">
        Active Alerts ({alerts.length})
      </h3>
      <div className="space-y-2">
        {sortedAlerts.map((alert) => {
          const config = severityConfig[alert.severity];
          const Icon = config.icon;

          return (
            <div
              key={alert.id}
              className={`flex items-start gap-3 rounded-lg border ${config.borderColor} ${config.bgColor} p-3`}
            >
              <Icon
                className={`mt-0.5 h-5 w-5 flex-shrink-0 ${config.iconColor}`}
              />
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium ${config.textColor}`}>
                  {alert.message}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {sourceLabels[alert.source] ?? alert.source} -{" "}
                  {new Date(alert.createdAt).toLocaleTimeString()}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="flex-shrink-0 text-slate-400 hover:text-slate-200"
                onClick={() => onAcknowledge(alert.id)}
                title="Dismiss alert"
                aria-label="Dismiss alert"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
