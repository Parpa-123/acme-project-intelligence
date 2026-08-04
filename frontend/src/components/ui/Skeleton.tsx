import { twMerge } from 'tailwind-merge';

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={twMerge("animate-pulse rounded-md bg-white/10", className)}
      {...props}
    />
  );
}

export function ProjectCardSkeleton() {
  return (
    <div className="glass-panel rounded-2xl p-6 border border-white/10 flex flex-col h-full">
      <div className="flex justify-between items-start mb-3">
        <Skeleton className="h-6 w-1/2 rounded" />
        <div className="flex gap-1.5">
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </div>
      <Skeleton className="h-4 w-full mt-2 rounded" />
      <Skeleton className="h-4 w-3/4 mt-2 rounded" />
      
      <div className="mt-6 pt-4 border-t border-white/10 flex justify-between">
        <Skeleton className="h-3 w-24 rounded" />
        <Skeleton className="h-3 w-8 rounded" />
      </div>
    </div>
  );
}

export function ProjectWorkspaceSkeleton() {
  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-2xl p-6 shadow-lg flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="space-y-3 flex-1">
          <Skeleton className="h-8 w-64 rounded" />
          <Skeleton className="h-4 w-96 max-w-full rounded" />
        </div>
        <div className="flex items-center gap-4">
          <Skeleton className="h-12 w-32 rounded-xl" />
          <Skeleton className="h-12 w-32 rounded-xl hidden md:block" />
          <Skeleton className="h-12 w-48 rounded-xl hidden md:block" />
        </div>
      </div>
      <div className="border-b border-white/10 flex gap-8 pb-2 mt-4 px-2 overflow-hidden">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-6 w-24 rounded" />)}
      </div>
      <div className="glass-panel rounded-2xl h-[400px]" />
    </div>
  );
}
