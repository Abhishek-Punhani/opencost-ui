import React from "react";

/**
 * LoadingSkeleton — shimmer placeholder that mirrors the Assets page layout.
 * Shows skeleton tiles, a chart area, filter bar, and table rows.
 */
const LoadingSkeleton = () => {
  return (
    <div className="skeleton-wrap" aria-busy="true" aria-label="Loading assets">
      {/* ── Summary tile skeletons ── */}
      <div className="skeleton-tiles">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="skeleton-tile">
            <div className="skeleton-line skeleton-line--sm" />
            <div className="skeleton-line skeleton-line--lg" />
          </div>
        ))}
      </div>

      {/* ── Chart skeleton ── */}
      <div className="skeleton-chart">
        <div className="skeleton-chart-header">
          <div className="skeleton-line skeleton-line--md" />
          <div className="skeleton-line skeleton-line--xs" />
        </div>
        <div className="skeleton-chart-body">
          {/* Simulated bar chart bars */}
          <div className="skeleton-bars">
            {[65, 85, 45, 70, 90, 55, 75, 60, 80, 50, 70, 40].map((h, i) => (
              <div
                key={i}
                className="skeleton-bar"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Filter bar skeleton ── */}
      <div className="skeleton-filters">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton-pill" />
        ))}
      </div>

      {/* ── Table skeleton ── */}
      <div className="skeleton-table">
        <div className="skeleton-table-header">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="skeleton-line skeleton-line--col" />
          ))}
        </div>
        {[1, 2, 3, 4, 5, 6, 7, 8].map((row) => (
          <div key={row} className="skeleton-table-row">
            <div className="skeleton-line skeleton-line--name" />
            <div className="skeleton-line skeleton-line--pill" />
            <div className="skeleton-line skeleton-line--md" />
            <div className="skeleton-line skeleton-line--md" />
            <div className="skeleton-line skeleton-line--lg" />
            <div className="skeleton-line skeleton-line--sm skeleton-line--right" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default LoadingSkeleton;
