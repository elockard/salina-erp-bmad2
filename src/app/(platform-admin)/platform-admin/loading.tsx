/**
 * Platform Admin Loading State
 *
 * Story 13.5: Build Platform Analytics Dashboard
 *
 * Skeleton loader shown while dashboard data is loading.
 */

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse">
      {/* Header skeleton */}
      <div className="mb-2 h-9 w-48 rounded bg-slate-700" />
      <div className="mb-8 h-5 w-64 rounded bg-slate-700" />

      {/* Dashboard title skeleton */}
      <div className="mb-6 flex items-center justify-between">
        <div className="h-7 w-40 rounded bg-slate-700" />
        <div className="h-9 w-24 rounded bg-slate-700" />
      </div>

      {/* Stats cards skeleton */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 rounded-lg bg-slate-800" />
        ))}
      </div>

      {/* Charts skeleton */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="h-72 rounded-lg bg-slate-800" />
        <div className="h-72 rounded-lg bg-slate-800" />
      </div>

      {/* Usage & Health skeleton */}
      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="h-6 w-32 rounded bg-slate-700" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-lg bg-slate-800" />
            ))}
          </div>
        </div>
        <div className="h-36 rounded-lg bg-slate-800" />
      </div>

      {/* Quick Access skeleton */}
      <div className="mb-4 h-7 w-28 rounded bg-slate-700" />
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="h-24 rounded-lg bg-slate-800" />
      </div>

      {/* Coming Soon skeleton */}
      <div className="mb-4 h-7 w-28 rounded bg-slate-700" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-lg bg-slate-800" />
        ))}
      </div>
    </div>
  );
}
