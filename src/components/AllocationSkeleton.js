import React from "react";

/**
 * AllocationSkeleton — shimmer placeholder that mirrors the Allocations page layout.
 * Shows skeleton tiles, a chart area, and table rows.
 */
const AllocationSkeleton = () => {
  return (
    <div
      className="skeleton-wrap"
      aria-busy="true"
      aria-label="Loading allocations"
    >
      {/* ── Title skeleton ── */}
      <div style={{ marginBottom: "16px" }}>
        <div
          className="skeleton-line skeleton-line--md"
          style={{ marginBottom: 8 }}
        />
        <div className="skeleton-line skeleton-line--xs" />
      </div>

      {/* ── Summary tile skeletons ── */}
      <div
        className="skeleton-tiles"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}
      >
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="skeleton-tile"
            style={{ borderRadius: 10, padding: "16px 18px" }}
          >
            <div className="skeleton-line skeleton-line--sm" />
            <div
              className="skeleton-line"
              style={{ width: "100px", height: "22px", borderRadius: 6 }}
            />
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
          <div className="skeleton-bars">
            {[55, 75, 40, 65, 85, 50, 70, 60, 80, 45, 72, 38].map((h, i) => (
              <div
                key={i}
                className="skeleton-bar"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Table skeleton ── */}
      <div className="skeleton-table" style={{ borderRadius: 8 }}>
        {/* Toolbar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 14px",
            borderBottom: "1px solid var(--border-light, #f0f0f0)",
          }}
        >
          <div
            className="skeleton-line"
            style={{ width: 200, height: 28, borderRadius: 6 }}
          />
          <div className="skeleton-line skeleton-line--sm" />
        </div>
        {/* Header */}
        <div
          className="skeleton-table-header"
          style={{
            gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr 1fr 0.6fr 1fr",
          }}
        >
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
            <div key={i} className="skeleton-line skeleton-line--col" />
          ))}
        </div>
        {/* Rows */}
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((row) => (
          <div
            key={row}
            className="skeleton-table-row"
            style={{
              gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr 1fr 0.6fr 1fr",
            }}
          >
            <div className="skeleton-line skeleton-line--name" />
            <div className="skeleton-line skeleton-line--sm" />
            <div className="skeleton-line skeleton-line--sm" />
            <div className="skeleton-line skeleton-line--sm" />
            <div className="skeleton-line skeleton-line--sm" />
            <div className="skeleton-line skeleton-line--sm" />
            <div className="skeleton-line skeleton-line--sm" />
            <div className="skeleton-line skeleton-line--pill" />
            <div className="skeleton-line skeleton-line--sm skeleton-line--right" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default AllocationSkeleton;
