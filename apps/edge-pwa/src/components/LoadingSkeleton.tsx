interface LoadingSkeletonProps {
  lines?: number;
  height?: number | string;
  className?: string;
}

/** Single skeleton line */
export function SkeletonLine({ height = 16, width = '100%' }: { height?: number | string; width?: string | number }) {
  return <div className="vc-skeleton" style={{ height, width, borderRadius: 6 }} />;
}

/** Card-shaped skeleton */
export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="vc-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <SkeletonLine height={20} width="60%" />
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine key={i} height={14} width={i === lines - 1 ? '75%' : '100%'} />
      ))}
    </div>
  );
}

/** Table skeleton */
export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: 'flex', gap: 24, padding: '14px 16px', borderBottom: '1px solid #e2e8f0' }}>
          <SkeletonLine width={120} height={14} />
          <SkeletonLine width={80}  height={14} />
          <SkeletonLine width={70}  height={14} />
          <SkeletonLine width={60}  height={14} />
          <SkeletonLine width={80}  height={14} />
        </div>
      ))}
    </div>
  );
}

/** Default inline skeleton */
export default function LoadingSkeleton({ lines = 3, height = 14, className = '' }: LoadingSkeletonProps) {
  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine key={i} height={height} width={i === lines - 1 ? '70%' : '100%'} />
      ))}
    </div>
  );
}
