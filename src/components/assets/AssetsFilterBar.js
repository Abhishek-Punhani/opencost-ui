import React from "react";

const AssetsFilterBar = ({ tabs, activeTab, typeCounts, onTabSelect }) => (
  <div className="assets-filter-bar">
    {tabs
      .filter((t) => t.key === "all" || (typeCounts[t.key] || 0) > 0)
      .map((t) => (
        <button
          key={t.key}
          className={`assets-filter-btn ${activeTab === t.key ? "active" : ""}`}
          onClick={() => onTabSelect(t.key)}
        >
          {t.label}
          <span className="filter-count">{typeCounts[t.key] || 0}</span>
        </button>
      ))}
  </div>
);

export default AssetsFilterBar;
