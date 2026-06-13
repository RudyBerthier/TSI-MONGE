import React from 'react';

/* ═══════════════════════════════════════════════════════════════
   Reusable Skeleton Components
   ═══════════════════════════════════════════════════════════════ */

const shimmerStyle = {
  background: 'var(--surface-2)',
  position: 'relative',
  overflow: 'hidden',
};

const shimmerAfterStyle = `
@keyframes skeletonShimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
.skeleton-shimmer::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent);
  animation: skeletonShimmer 1.5s ease-in-out infinite;
}
`;

// Base skeleton block
export function SkeletonBlock({ className = '', style = {}, ...props }) {
  return (
    <>
      <style>{shimmerAfterStyle}</style>
      <div
        className={`skeleton-shimmer rounded-lg animate-pulse ${className}`}
        style={{ ...shimmerStyle, ...style }}
        {...props}
      />
    </>
  );
}

// Skeleton line (text placeholder)
export function SkeletonLine({ width = '100%', height = '0.75rem', className = '' }) {
  return <SkeletonBlock className={className} style={{ width, height, borderRadius: '0.5rem' }} />;
}

// Skeleton circle (avatar placeholder)
export function SkeletonCircle({ size = 40 }) {
  return <SkeletonBlock style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0 }} />;
}

/* ═══════════════════════════════════════════════════════════════
   Page-specific Skeleton Layouts
   ═══════════════════════════════════════════════════════════════ */

// Generic full-page centered skeleton
export function PageSkeleton({ rows = 4 }) {
  return (
    <div className="min-h-screen pt-24 pb-12 px-4" style={{ background: 'var(--bg)' }}>
      <div className="max-w-2xl mx-auto space-y-4">
        <SkeletonLine width="40%" height="1.5rem" />
        <SkeletonLine width="60%" height="0.875rem" />
        <div className="mt-6 space-y-3">
          {Array.from({ length: rows }).map((_, i) => (
            <SkeletonBlock key={i} style={{ height: 80, borderRadius: '1rem' }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// Cantine skeleton
export function CantineSkeleton() {
  return (
    <div className="space-y-4 py-4">
      {/* Date selector */}
      <div className="flex gap-2 overflow-hidden px-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonBlock key={i} style={{ width: 56, height: 64, borderRadius: '1rem', flexShrink: 0 }} />
        ))}
      </div>
      {/* Menu cards */}
      <div className="px-4 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <SkeletonLine width="30%" height="0.75rem" />
            <SkeletonLine width="80%" height="1rem" />
            <SkeletonLine width="60%" height="0.875rem" />
            <div className="flex gap-2 mt-2">
              <SkeletonBlock style={{ width: 48, height: 24, borderRadius: '0.75rem' }} />
              <SkeletonBlock style={{ width: 48, height: 24, borderRadius: '0.75rem' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Sondages skeleton
export function SondagesSkeleton() {
  return (
    <div className="min-h-screen pt-24 pb-12 px-4" style={{ background: 'var(--bg)' }}>
      <div className="max-w-2xl mx-auto space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <SkeletonLine width="60%" height="1.1rem" />
            <SkeletonLine width="40%" height="0.75rem" />
            <div className="space-y-2 mt-3">
              {Array.from({ length: 3 }).map((_, j) => (
                <SkeletonBlock key={j} style={{ height: 44, borderRadius: '0.75rem' }} />
              ))}
            </div>
            <SkeletonLine width="25%" height="0.625rem" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Kholleurs skeleton
export function KholleursSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-4 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <SkeletonCircle size={44} />
          <div className="flex-1 space-y-2">
            <SkeletonLine width="50%" height="0.875rem" />
            <SkeletonLine width="30%" height="0.625rem" />
          </div>
          <SkeletonBlock style={{ width: 48, height: 28, borderRadius: '0.75rem' }} />
        </div>
      ))}
    </div>
  );
}

// Places skeleton (seating chart)
export function PlacesSkeleton() {
  return (
    <div className="min-h-screen pt-24 pb-12 px-4" style={{ background: 'var(--bg)' }}>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex gap-2">
          <SkeletonBlock style={{ width: 80, height: 36, borderRadius: '0.75rem' }} />
          <SkeletonBlock style={{ width: 80, height: 36, borderRadius: '0.75rem' }} />
        </div>
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 16 }).map((_, i) => (
            <SkeletonBlock key={i} style={{ height: 56, borderRadius: '0.75rem' }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// Kanban skeleton
export function KanbanSkeleton() {
  return (
    <div className="min-h-screen pt-24 pb-12 px-4" style={{ background: 'var(--bg)' }}>
      <div className="max-w-4xl mx-auto">
        <SkeletonLine width="40%" height="1.5rem" className="mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, col) => (
            <div key={col} className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <SkeletonLine width="50%" height="1rem" />
              {Array.from({ length: 3 }).map((_, row) => (
                <SkeletonBlock key={row} style={{ height: 64, borderRadius: '0.75rem' }} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Covoiturage skeleton
export function CarpoolSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <SkeletonCircle size={36} />
            <SkeletonLine width="35%" height="0.875rem" />
          </div>
          <div className="flex items-center gap-2">
            <SkeletonBlock style={{ width: 10, height: 40, borderRadius: 4 }} />
            <div className="flex-1 space-y-2">
              <SkeletonLine width="55%" height="0.75rem" />
              <SkeletonLine width="45%" height="0.75rem" />
            </div>
          </div>
          <div className="flex gap-2">
            <SkeletonBlock style={{ width: 60, height: 24, borderRadius: '0.75rem' }} />
            <SkeletonBlock style={{ width: 80, height: 24, borderRadius: '0.75rem' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// Carpool details skeleton 
export function CarpoolDetailsSkeleton() {
  return (
    <div className="min-h-screen pt-24 pb-12 px-4" style={{ background: 'var(--bg)' }}>
      <div className="max-w-lg mx-auto space-y-4">
        <SkeletonLine width="30%" height="0.875rem" />
        <SkeletonBlock style={{ height: 180, borderRadius: '1.5rem' }} />
        <SkeletonBlock style={{ height: 120, borderRadius: '1.5rem' }} />
        <SkeletonBlock style={{ height: 80, borderRadius: '1.5rem' }} />
      </div>
    </div>
  );
}

// Meteo skeleton
export function MeteoSkeleton() {
  return (
    <div className="min-h-screen pt-24 pb-12 px-4" style={{ background: 'var(--bg)' }}>
      <div className="max-w-lg mx-auto text-center space-y-4">
        <SkeletonLine width="30%" height="0.75rem" className="mx-auto" />
        <SkeletonCircle size={72} />
        <SkeletonLine width="40%" height="3rem" className="mx-auto" />
        <SkeletonLine width="25%" height="0.875rem" className="mx-auto" />
        <SkeletonBlock className="mt-6" style={{ height: 140, borderRadius: '1.5rem' }} />
        <SkeletonBlock style={{ height: 260, borderRadius: '1.5rem' }} />
        <div className="grid grid-cols-2 gap-3 mt-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBlock key={i} style={{ height: 130, borderRadius: '1.5rem' }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// Status page skeleton
export function StatusSkeleton() {
  return (
    <div className="min-h-screen pt-24 pb-12 px-4" style={{ background: 'var(--bg)' }}>
      <div className="max-w-2xl mx-auto space-y-4">
        <SkeletonBlock style={{ height: 80, borderRadius: '1.5rem' }} />
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-4 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <SkeletonCircle size={32} />
              <div className="flex-1 space-y-1.5">
                <SkeletonLine width="40%" height="0.75rem" />
                <SkeletonLine width="25%" height="0.625rem" />
              </div>
              <SkeletonBlock style={{ width: 56, height: 24, borderRadius: '0.75rem' }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
