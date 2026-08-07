import { SkeletonBar, SkeletonDashboardCards } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div>
      <SkeletonBar className="mb-6 h-8 w-48" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SkeletonDashboardCards count={6} />
      </div>
      <div className="card mt-6">
        <SkeletonBar className="mb-4 h-4 w-48" />
        <SkeletonBar className="h-64 w-full" />
      </div>
    </div>
  );
}
