import classNames from 'classnames';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'rect' | 'circle';
  width?: string | number;
  height?: string | number;
}

export function Skeleton({ className, variant = 'rect', width, height }: SkeletonProps) {
  const baseClasses = 'animate-pulse bg-panel/60';

  const variantClasses = {
    text: 'rounded',
    rect: 'rounded-xl',
    circle: 'rounded-full'
  };

  return (
    <div
      className={classNames(baseClasses, variantClasses[variant], className)}
      style={{ width, height }}
    />
  );
}

export function HabitSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3 p-4 rounded-xl border border-gray-700/50 bg-panel/30">
          <Skeleton variant="circle" width={24} height={24} />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" width="60%" height={16} />
            <Skeleton variant="text" width="30%" height={12} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ProtocolSkeleton() {
  return (
    <div className="space-y-4">
      {/* Header skeleton */}
      <div className="glow-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton variant="text" width={80} height={12} />
            <Skeleton variant="text" width={180} height={24} />
          </div>
          <div className="text-center space-y-1">
            <Skeleton variant="text" width={50} height={36} />
            <Skeleton variant="text" width={60} height={12} />
          </div>
        </div>
        <Skeleton variant="rect" width="100%" height={8} />
        <Skeleton variant="text" width={100} height={12} />
      </div>

      {/* Today skeleton */}
      <div className="glow-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton variant="text" width={60} height={20} />
          <Skeleton variant="text" width={80} height={14} />
        </div>
        <Skeleton variant="rect" width="100%" height={12} />
      </div>

      {/* Habits skeleton */}
      <div className="glow-card p-5 space-y-3">
        <Skeleton variant="text" width={60} height={18} />
        <HabitSkeleton />
      </div>
    </div>
  );
}

export function CalendarSkeleton() {
  return (
    <div className="glow-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton variant="circle" width={32} height={32} />
        <Skeleton variant="text" width={120} height={20} />
        <Skeleton variant="circle" width={32} height={32} />
      </div>
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 35 }).map((_, i) => (
          <Skeleton key={i} variant="rect" width="100%" height={40} className="aspect-square" />
        ))}
      </div>
    </div>
  );
}
