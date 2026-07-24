export default function SkeletonCard() {
  return (
    <div className="glass rounded-2xl p-5 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="space-y-2">
          <div className="h-3 bg-dark-600 rounded w-24" />
          <div className="h-2 bg-dark-700 rounded w-16" />
        </div>
        <div className="h-5 bg-dark-600 rounded-full w-20" />
      </div>

      <div className="flex items-center gap-4 mb-4">
        <div className="text-center space-y-1">
          <div className="h-6 bg-dark-600 rounded w-12" />
          <div className="h-2 bg-dark-700 rounded w-8" />
        </div>
        <div className="flex-1 space-y-1">
          <div className="h-2 bg-dark-700 rounded w-16 mx-auto" />
          <div className="h-px bg-dark-600 w-full" />
          <div className="h-2 bg-dark-700 rounded w-8 mx-auto" />
        </div>
        <div className="text-center space-y-1">
          <div className="h-6 bg-dark-600 rounded w-12" />
          <div className="h-2 bg-dark-700 rounded w-8" />
        </div>
      </div>

      <div className="flex items-end justify-between">
        <div className="space-y-2">
          <div className="h-3 bg-dark-700 rounded w-20" />
          <div className="flex gap-2">
            <div className="h-2 bg-dark-700 rounded w-10" />
            <div className="h-2 bg-dark-700 rounded w-10" />
            <div className="h-2 bg-dark-700 rounded w-10" />
          </div>
        </div>
        <div className="text-right space-y-1">
          <div className="h-7 bg-dark-600 rounded w-24" />
          <div className="h-2 bg-dark-700 rounded w-16" />
        </div>
      </div>
    </div>
  );
}
