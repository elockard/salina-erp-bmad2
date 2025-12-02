"use client";

/**
 * Dashboard Chart Wrapper Component
 *
 * Provides Suspense boundary, error handling, and skeleton loaders for
 * dashboard chart widgets. Enables independent widget loading and error states.
 *
 * Story: 6.7 - Enhance All Dashboards with Role-Specific Analytics
 * AC-6: Dashboard widgets load independently with skeleton loaders
 * AC-7: Failed widgets show error state without blocking others
 */

import { AlertTriangle, RefreshCw } from "lucide-react";
import { Component, type ReactNode, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Chart Skeleton - Loading state for chart widgets
 * Matches typical chart dimensions with animated placeholder
 */
interface ChartSkeletonProps {
  /** Height of the skeleton (default: 300) */
  height?: number;
  /** Optional title to show during loading */
  title?: string;
}

export function ChartSkeleton({ height = 300, title }: ChartSkeletonProps) {
  return (
    <Card>
      {title && (
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className="pt-0">
        <Skeleton className="w-full" style={{ height }} />
      </CardContent>
    </Card>
  );
}

/**
 * Widget Error - Error fallback UI with retry capability
 * Displays error message and retry button without blocking other widgets
 */
interface WidgetErrorProps {
  /** Title of the widget that failed */
  title: string;
  /** Error message to display (optional) */
  error?: string;
  /** Callback to retry loading */
  onRetry?: () => void;
}

export function WidgetError({ title, error, onRetry }: WidgetErrorProps) {
  return (
    <Card className="border-destructive/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            {error || "Failed to load widget data"}
          </p>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Error Boundary - Class component for catching render errors
 * Required for error boundary functionality in React
 */
interface ErrorBoundaryProps {
  /** Widget title for error display */
  title: string;
  /** Fallback content (defaults to WidgetError) */
  fallback?: ReactNode;
  /** Children to render */
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ChartErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <WidgetError
          title={this.props.title}
          error={this.state.error?.message}
          onRetry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Dashboard Chart Wrapper - Combines ErrorBoundary and Suspense
 * Use this to wrap any dashboard chart widget for independent loading/error handling
 *
 * @example
 * <DashboardChartWrapper title="Revenue Trend" height={300}>
 *   <RevenueTrendChart />
 * </DashboardChartWrapper>
 */
interface DashboardChartWrapperProps {
  /** Title of the widget (used for skeleton and error states) */
  title: string;
  /** Children to render (the chart component) */
  children: ReactNode;
  /** Height for skeleton loader (default: 300) */
  height?: number;
  /** Custom fallback for loading state */
  loadingFallback?: ReactNode;
  /** Custom fallback for error state */
  errorFallback?: ReactNode;
}

export function DashboardChartWrapper({
  title,
  children,
  height = 300,
  loadingFallback,
  errorFallback,
}: DashboardChartWrapperProps) {
  return (
    <ChartErrorBoundary title={title} fallback={errorFallback}>
      <Suspense fallback={loadingFallback || <ChartSkeleton title={title} height={height} />}>
        {children}
      </Suspense>
    </ChartErrorBoundary>
  );
}
