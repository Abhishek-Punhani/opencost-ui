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
  const nodeCount = assets.filter((a) => a.type === "Node").length;
  const diskCount = assets.filter((a) => a.type === "Disk").length;
  const lbCount = assets.filter((a) => a.type === "LoadBalancer").length;

  const tiles = [
    {
      key: "all",
      label: "Total Cost",
      value: toCurrency(totalCost, currency),
      sub: `${assets.length} assets`,
      className: "assets-summary-tile--total",
    },
    {
      key: "Node",
      label: "Nodes",
      value: nodeCount,
      sub: toCurrency(
        assets
          .filter((a) => a.type === "Node")
          .reduce((s, a) => s + a.totalCost, 0),
        currency,
      ),
      className: "assets-summary-tile--nodes",
    },
    {
      key: "Disk",
      label: "Disks",
      value: diskCount,
      sub: toCurrency(
        assets
          .filter((a) => a.type === "Disk")
          .reduce((s, a) => s + a.totalCost, 0),
        currency,
      ),
      className: "assets-summary-tile--disks",
    },
    {
      key: "LoadBalancer",
      label: "Load Balancers",
      value: lbCount,
      sub: toCurrency(
        assets
          .filter((a) => a.type === "LoadBalancer")
          .reduce((s, a) => s + a.totalCost, 0),
        currency,
      ),
      className: "assets-summary-tile--lbs",
    },
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
