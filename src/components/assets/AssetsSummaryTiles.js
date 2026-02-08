import React, { useMemo } from "react";
import { toCurrency } from "../../util";

/**
 * AssetsSummaryTiles — cost-focused summary cards like a billing dashboard.
 * Shows: Total Cost, CPU Cost, RAM Cost, GPU Cost, Total Assets count.
 *
 * Props:
 * - assets: array of processed asset objects
 * - currency: ISO currency code
 */
const AssetsSummaryTiles = ({ assets, currency }) => {
  const metrics = useMemo(() => {
    let totalCost = 0;
    let cpuCost = 0;
    let ramCost = 0;
    let gpuCost = 0;
    let storageCost = 0;

    assets.forEach((a) => {
      totalCost += a.totalCost || 0;
      cpuCost += a.cpuCost || 0;
      ramCost += a.ramCost || 0;
      gpuCost += a.gpuCost || 0;
      if (a.type === "Disk") storageCost += a.totalCost || 0;
    });

    return { totalCost, cpuCost, ramCost, gpuCost, storageCost };
  }, [assets]);

  const tiles = [
    {
      label: "Total Cost",
      value: toCurrency(metrics.totalCost, currency),
      accent: "#161616",
    },
    {
      label: "CPU Cost",
      value: toCurrency(metrics.cpuCost, currency),
      accent: "#0f62fe",
    },
    {
      label: "RAM Cost",
      value: toCurrency(metrics.ramCost, currency),
      accent: "#009d9a",
    },
    {
      label: "GPU Cost",
      value: toCurrency(metrics.gpuCost, currency),
      accent: "#8a3ffc",
      hide: metrics.gpuCost === 0,
    },
    {
      label: "Storage Cost",
      value: toCurrency(metrics.storageCost, currency),
      accent: "#1192e8",
      hide: metrics.storageCost === 0,
    },
    {
      label: "Total Assets",
      value: String(assets.length),
      accent: "#6f6f6f",
    },
  ].filter((t) => !t.hide);

  return (
    <div className="cost-tiles-row">
      {tiles.map((tile) => (
        <div key={tile.label} className="cost-tile">
          <span className="cost-tile-value" style={{ color: tile.accent }}>
            {tile.value}
          </span>
          <span className="cost-tile-label">{tile.label}</span>
        </div>
      ))}
    </div>
  );
};

export default AssetsSummaryTiles;
