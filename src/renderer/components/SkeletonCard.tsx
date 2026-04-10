/**
 * SkeletonCard component for loading states.
 * Displays a shimmer placeholder mimicking the EntryCard layout.
 */

interface SkeletonCardProps {
  count?: number;
}

export function SkeletonCard({ count = 5 }: SkeletonCardProps): JSX.Element {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="flex items-start gap-3 rounded-xl border border-border bg-surface p-3"
          aria-hidden="true"
        >
          {/* Icon skeleton */}
          <div className="skeleton h-10 w-10 flex-shrink-0 rounded-lg" />

          {/* Content skeleton */}
          <div className="min-w-0 flex-1 space-y-2">
            {/* Title skeleton */}
            <div className="skeleton h-4 w-3/4 rounded" />

            {/* Username skeleton */}
            <div className="skeleton h-3 w-1/2 rounded" />

            {/* Strength bar skeleton */}
            <div className="mt-2 flex items-center gap-2">
              <div className="skeleton h-1 w-16 rounded-full" />
              <div className="skeleton h-3 w-12 rounded" />
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
