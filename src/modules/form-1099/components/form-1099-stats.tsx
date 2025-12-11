/**
 * Form 1099 Stats Component
 *
 * Displays summary statistics for 1099 generation.
 *
 * Story 11.3: Generate 1099-MISC Forms
 * AC-11.3.1: Show eligible authors meeting $10 royalty threshold
 */

"use client";

import { CheckCircle, DollarSign, FileText, Flag, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Form1099StatsProps {
  stats: {
    totalAuthors: number;
    eligibleAuthors: number;
    withTaxInfo: number;
    usBased: number;
    alreadyGenerated: number;
    totalEarnings: string;
  };
  year: number;
}

export function Form1099Stats({ stats, year }: Form1099StatsProps) {
  // Calculate ready to generate (eligible + has tax info + US-based - already generated)
  const readyToGenerate = Math.max(
    0,
    Math.min(stats.withTaxInfo, stats.usBased) - stats.alreadyGenerated,
  );

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Authors</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalAuthors}</div>
          <p className="text-xs text-muted-foreground">
            Authors in system for {year}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Meet Threshold</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.eligibleAuthors}</div>
          <p className="text-xs text-muted-foreground">Earned $10+ in {year}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Has Tax Info</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.withTaxInfo}</div>
          <p className="text-xs text-muted-foreground">With TIN on file</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">US-Based</CardTitle>
          <Flag className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.usBased}</div>
          <p className="text-xs text-muted-foreground">Require 1099-MISC</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Generated</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {stats.alreadyGenerated}
          </div>
          <p className="text-xs text-muted-foreground">
            {readyToGenerate} remaining
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
