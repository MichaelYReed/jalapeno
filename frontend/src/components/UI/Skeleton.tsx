interface SkeletonProps {
  className?: string;
}

// Base skeleton component with pulse animation
export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div className={`animate-pulse bg-gray-200 dark:bg-slate-700 rounded ${className}`} />
  );
}

// Product card skeleton for the catalog grid
export function ProductCardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
      {/* Image placeholder */}
      <Skeleton className="w-full h-48" />

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Category badge */}
        <Skeleton className="h-5 w-20 rounded-full" />

        {/* Title */}
        <Skeleton className="h-5 w-3/4" />

        {/* Description */}
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />

        {/* Price and button row */}
        <div className="flex justify-between items-center pt-2">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-10 w-24 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

// Product row skeleton for the inventory table
export function ProductRowSkeleton() {
  return (
    <tr className="border-b border-gray-100 dark:border-slate-700">
      {/* Image */}
      <td className="p-4">
        <Skeleton className="w-12 h-12 rounded-lg" />
      </td>
      {/* Name */}
      <td className="p-4">
        <Skeleton className="h-5 w-32" />
      </td>
      {/* Category */}
      <td className="p-4">
        <Skeleton className="h-5 w-24 rounded-full" />
      </td>
      {/* Price */}
      <td className="p-4">
        <Skeleton className="h-5 w-16" />
      </td>
      {/* Stock */}
      <td className="p-4">
        <Skeleton className="h-5 w-16 rounded-full" />
      </td>
      {/* Barcode */}
      <td className="p-4">
        <Skeleton className="h-5 w-28" />
      </td>
      {/* Actions */}
      <td className="p-4">
        <div className="flex gap-2">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
      </td>
    </tr>
  );
}

interface ProductGridSkeletonProps {
  count?: number;
}

// Grid of product card skeletons
export function ProductGridSkeleton({ count = 8 }: ProductGridSkeletonProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

interface ProductTableSkeletonProps {
  count?: number;
}

// Table of product row skeletons
export function ProductTableSkeleton({ count = 5 }: ProductTableSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <ProductRowSkeleton key={i} />
      ))}
    </>
  );
}
