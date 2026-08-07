export function SkeletonBar({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-gray-200 ${className}`} />;
}

export function SkeletonTableRows({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="border-t border-gray-50">
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} className="px-5 py-3">
              <SkeletonBar className="h-4 w-full max-w-[160px]" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function SkeletonCards({ count = 8 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card flex flex-col gap-3 p-4">
          <SkeletonBar className="h-32 w-full rounded-xl" />
          <SkeletonBar className="h-3 w-1/3" />
          <SkeletonBar className="h-4 w-3/4" />
          <div className="flex items-center justify-between">
            <SkeletonBar className="h-5 w-20" />
            <SkeletonBar className="h-3 w-16" />
          </div>
        </div>
      ))}
    </>
  );
}

export function SkeletonDetail() {
  return (
    <div className="space-y-4">
      <SkeletonBar className="h-8 w-64" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card space-y-3 lg:col-span-2">
          <SkeletonBar className="h-4 w-32" />
          <SkeletonBar className="h-16 w-full" />
          <SkeletonBar className="h-16 w-full" />
          <SkeletonBar className="h-16 w-full" />
        </div>
        <div className="card space-y-3">
          <SkeletonBar className="h-4 w-24" />
          <SkeletonBar className="h-4 w-full" />
          <SkeletonBar className="h-4 w-2/3" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonDashboardCards({ count = 6 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card flex items-center gap-4">
          <SkeletonBar className="h-12 w-12 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2">
            <SkeletonBar className="h-3 w-24" />
            <SkeletonBar className="h-5 w-16" />
          </div>
        </div>
      ))}
    </>
  );
}
