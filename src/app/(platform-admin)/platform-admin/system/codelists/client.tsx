"use client";

/**
 * Codelist Admin Client Component
 *
 * Story 14.4: Build Codelist Management System (AC: 1, 2, 3)
 *
 * Client component that displays codelist status and handles updates.
 */

import { AlertTriangle, Check, Download, RefreshCw } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  type CodelistMetadata,
  loadAllCodelistsAction,
  loadCodelistAction,
} from "@/modules/onix/codelists";
import { REQUIRED_CODELISTS } from "@/modules/onix/codelists/types";

interface CodelistAdminClientProps {
  initialCodelists: CodelistMetadata[];
  initialLoadedStatus: {
    allLoaded: boolean;
    loadedLists: number[];
    missingLists: number[];
  };
}

const CODELIST_NAMES: Record<number, string> = {
  5: "Product Identifier Type",
  15: "Title Type",
  17: "Contributor Role",
  27: "Subject Scheme",
  150: "Product Form",
  196: "E-publication Accessibility",
};

export function CodelistAdminClient({
  initialCodelists,
  initialLoadedStatus,
}: CodelistAdminClientProps) {
  const [codelists, setCodelists] = useState(initialCodelists);
  const [loadedStatus, setLoadedStatus] = useState(initialLoadedStatus);
  const [isPending, startTransition] = useTransition();
  const [loadingList, setLoadingList] = useState<number | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleLoadAll = () => {
    startTransition(async () => {
      setMessage(null);
      try {
        const results = await loadAllCodelistsAction();
        const successful = results.filter((r) => r.success).length;
        const failed = results.filter((r) => !r.success).length;

        if (failed === 0) {
          setMessage({
            type: "success",
            text: `Successfully loaded ${successful} codelists`,
          });
        } else {
          setMessage({
            type: "error",
            text: `Loaded ${successful} codelists, ${failed} failed`,
          });
        }

        // Refresh data
        const newCodelists = results
          .filter((r) => r.success && r.valueCount)
          .map((r) => ({
            listNumber: r.listNumber,
            issueNumber: 68,
            listName: CODELIST_NAMES[r.listNumber] || `List ${r.listNumber}`,
            valueCount: r.valueCount || 0,
            loadedAt: new Date(),
          }));

        setCodelists((prev) => {
          const existing = new Set(prev.map((c) => c.listNumber));
          const updated = prev.map((c) => {
            const result = results.find((r) => r.listNumber === c.listNumber);
            if (result?.success && result.valueCount) {
              return {
                ...c,
                valueCount: result.valueCount,
                loadedAt: new Date(),
              };
            }
            return c;
          });
          const added = newCodelists.filter((c) => !existing.has(c.listNumber));
          return [...updated, ...added].sort(
            (a, b) => a.listNumber - b.listNumber,
          );
        });

        setLoadedStatus({
          allLoaded: true,
          loadedLists: [...REQUIRED_CODELISTS],
          missingLists: [],
        });
      } catch (error) {
        setMessage({
          type: "error",
          text:
            error instanceof Error ? error.message : "Failed to load codelists",
        });
      }
    });
  };

  const handleLoadSingle = (listNumber: number) => {
    setLoadingList(listNumber);
    startTransition(async () => {
      setMessage(null);
      try {
        const result = await loadCodelistAction(listNumber);

        if (result.success) {
          setMessage({
            type: "success",
            text: `Loaded List ${listNumber} with ${result.valueCount} values`,
          });

          // Update or add codelist
          setCodelists((prev) => {
            const existing = prev.find((c) => c.listNumber === listNumber);
            if (existing) {
              return prev.map((c) =>
                c.listNumber === listNumber
                  ? {
                      ...c,
                      valueCount: result.valueCount || 0,
                      loadedAt: new Date(),
                    }
                  : c,
              );
            }
            return [
              ...prev,
              {
                listNumber,
                issueNumber: 68,
                listName: CODELIST_NAMES[listNumber] || `List ${listNumber}`,
                valueCount: result.valueCount || 0,
                loadedAt: new Date(),
              },
            ].sort((a, b) => a.listNumber - b.listNumber);
          });

          // Update loaded status
          setLoadedStatus((prev) => ({
            ...prev,
            loadedLists: prev.loadedLists.includes(listNumber)
              ? prev.loadedLists
              : [...prev.loadedLists, listNumber],
            missingLists: prev.missingLists.filter((n) => n !== listNumber),
            allLoaded:
              prev.missingLists.filter((n) => n !== listNumber).length === 0,
          }));
        } else {
          setMessage({
            type: "error",
            text: result.error || `Failed to load List ${listNumber}`,
          });
        }
      } catch (error) {
        setMessage({
          type: "error",
          text:
            error instanceof Error ? error.message : "Failed to load codelist",
        });
      } finally {
        setLoadingList(null);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Status Alert */}
      {!loadedStatus.allLoaded && (
        <div className="flex items-start gap-3 rounded-lg border border-yellow-700 bg-yellow-900/20 p-4">
          <AlertTriangle className="h-5 w-5 text-yellow-400" />
          <div>
            <p className="font-medium text-yellow-400">Missing Codelists</p>
            <p className="text-sm text-yellow-300/80">
              {loadedStatus.missingLists.length} required codelist(s) not
              loaded:
              {loadedStatus.missingLists.map((n) => ` List ${n}`).join(",")}
            </p>
          </div>
        </div>
      )}

      {/* Message */}
      {message && (
        <div
          className={`rounded-lg border p-4 ${
            message.type === "success"
              ? "border-green-700 bg-green-900/20"
              : "border-red-700 bg-red-900/20"
          }`}
        >
          <p
            className={
              message.type === "success" ? "text-green-400" : "text-red-400"
            }
          >
            {message.text}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          onClick={handleLoadAll}
          disabled={isPending}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isPending && !loadingList ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Loading...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Load All Codelists
            </>
          )}
        </Button>
      </div>

      {/* Codelists Table */}
      <div className="rounded-lg border border-slate-700 bg-slate-800/50">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">
                List #
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">
                Name
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">
                Values
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">
                Issue
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">
                Loaded
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {REQUIRED_CODELISTS.map((listNumber) => {
              const codelist = codelists.find(
                (c) => c.listNumber === listNumber,
              );
              const isLoaded = loadedStatus.loadedLists.includes(listNumber);

              return (
                <tr
                  key={listNumber}
                  className="border-b border-slate-700/50 last:border-0"
                >
                  <td className="px-4 py-3 text-white">{listNumber}</td>
                  <td className="px-4 py-3 text-white">
                    {CODELIST_NAMES[listNumber] || `List ${listNumber}`}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {codelist?.valueCount ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {codelist?.issueNumber ?? "-"}
                  </td>
                  <td className="px-4 py-3">
                    {isLoaded ? (
                      <span className="flex items-center gap-1 text-green-400">
                        <Check className="h-4 w-4" />
                        {codelist?.loadedAt
                          ? new Date(codelist.loadedAt).toLocaleDateString()
                          : "Yes"}
                      </span>
                    ) : (
                      <span className="text-slate-500">Not loaded</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleLoadSingle(listNumber)}
                      disabled={isPending}
                      className="border-slate-600 text-slate-300 hover:bg-slate-700"
                    >
                      {loadingList === listNumber ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Info */}
      <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
        <h3 className="mb-2 font-medium text-white">About EDItEUR Codelists</h3>
        <p className="text-sm text-slate-400">
          Codelists are standardized code values used in ONIX for Books
          messages. They are maintained by EDItEUR and updated quarterly. Salina
          uses codelists for ONIX export validation and accessibility metadata.
          Issue 68 (January 2025) is the currently bundled version.
        </p>
      </div>
    </div>
  );
}
