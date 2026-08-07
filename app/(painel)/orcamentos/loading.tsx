import { SkeletonBar, SkeletonTableRows } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <SkeletonBar className="h-8 w-40" />
        <SkeletonBar className="h-10 w-36 rounded-xl" />
      </div>
      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <tbody>
            <SkeletonTableRows rows={8} cols={6} />
          </tbody>
        </table>
      </div>
    </div>
  );
}
