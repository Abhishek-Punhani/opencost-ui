import React from "react";
import { toCurrency } from "../../util";

/**
 * AssetsSummaryTiles renders 4 summary metric tiles at the top of the Assets page.
 * Clicking a tile filters the table to that asset type.
 *
 * Props:
 * - assets: array of processed asset objects
 * - currency: ISO currency code
 * - activeTab: currently selected tab key
 * - onTabChange: callback to switch tab (filter by type)
 */
const AssetsSummaryTiles = ({ assets, currency, activeTab, onTabChange }) => {
  const totalCost = assets.reduce((sum, a) => sum + (a.totalCost || 0), 0);

  // Count and cost per type
  const typeSummary = (type) => {
    const items = assets.filter((a) => a.type === type);
    return {
      count: items.length,
      cost: items.reduce((s, a) => s + (a.totalCost || 0), 0),
    };
  };

  const nodes = typeSummary("Node");
  const disks = typeSummary("Disk");
  const lbs = typeSummary("LoadBalancer");
  const networks = typeSummary("Network");
  const mgmt = typeSummary("ClusterManagement");
  const cloud = typeSummary("Cloud");

  // Only include type tiles that have assets
  const typeTiles = [
    {
      key: "Node",
      label: "Nodes",
      data: nodes,
      className: "assets-summary-tile--nodes",
    },
    {
      key: "Disk",
      label: "Disks",
      data: disks,
      className: "assets-summary-tile--disks",
    },
    {
      key: "LoadBalancer",
      label: "Load Balancers",
      data: lbs,
      className: "assets-summary-tile--lbs",
    },
    {
      key: "Network",
      label: "Network",
      data: networks,
      className: "assets-summary-tile--network",
    },
    {
      key: "ClusterManagement",
      label: "Management",
      data: mgmt,
      className: "assets-summary-tile--mgmt",
    },
    {
      key: "Cloud",
      label: "Cloud",
      data: cloud,
      className: "assets-summary-tile--cloud",
    },
  ].filter((t) => t.data.count > 0);

  const tiles = [
    {
      key: "all",
      label: "Total Cost",
      value: toCurrency(totalCost, currency),
      sub: `${assets.length} assets`,
      className: "assets-summary-tile--total",
    },
    ...typeTiles.map((t) => ({
      key: t.key,
      label: t.label,
      value: t.data.count,
      sub: toCurrency(t.data.cost, currency),
      className: t.className,
    })),
  ];

  return (
    <div className="assets-summary-row">
      {tiles.map((tile) => (
        <div
          key={tile.key}
          className={`assets-summary-tile ${tile.className} ${
            activeTab === tile.key ? "active" : ""
          }`}
          onClick={() => onTabChange(tile.key)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") onTabChange(tile.key);
          }}
        >
          <span className="tile-label">{tile.label}</span>
          <span className="tile-value">{tile.value}</span>
          <span className="tile-sub">{tile.sub}</span>
        </div>
      ))}
    </div>
  );
};

export default AssetsSummaryTiles;
