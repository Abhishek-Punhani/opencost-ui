import React, { useMemo } from "react";
import { toCurrency } from "../../util";
import { COST_COLORS } from "./constants";

const SummaryTiles = ({ cumData, currency }) => {
  const totals = useMemo(() => {
    let cpu = 0,
      gpu = 0,
      ram = 0,
      pv = 0,
      net = 0,
      total = 0;
    cumData.forEach((a) => {
      cpu += a.cpuCost || 0;
      gpu += a.gpuCost || 0;
      ram += a.ramCost || 0;
      pv += a.pvCost || 0;
      net += a.networkCost || 0;
      total += a.totalCost || 0;
    });
    const effArr = cumData.filter(
      (a) => a.name !== "__idle__" && a.totalEfficiency > 0,
    );
    const avgEff =
      effArr.length > 0
        ? effArr.reduce((s, a) => s + a.totalEfficiency, 0) / effArr.length
        : 0;
    return { cpu, gpu, ram, pv, net, total, avgEff, count: cumData.length };
  }, [cumData]);

  const tiles = [
    {
      label: "Total Cost",
      value: toCurrency(totals.total, currency),
      color: "var(--text-primary)",
    },
    {
      label: "CPU Cost",
      value: toCurrency(totals.cpu, currency),
      color: COST_COLORS.cpuCost,
    },
    {
      label: "GPU Cost",
      value: toCurrency(totals.gpu, currency),
      color: COST_COLORS.gpuCost,
    },
    {
      label: "RAM Cost",
      value: toCurrency(totals.ram, currency),
      color: COST_COLORS.ramCost,
    },
    {
      label: "PV Cost",
      value: toCurrency(totals.pv, currency),
      color: COST_COLORS.pvCost,
    },
    {
      label: "Avg Efficiency",
      value: `${(totals.avgEff * 100).toFixed(1)}%`,
      color: "#42be65",
    },
  ];

  return (
    <div className="alloc-tiles-row">
      {tiles.map((t) => (
        <div className="alloc-tile" key={t.label}>
          <span className="alloc-tile-label">{t.label}</span>
          <span className="alloc-tile-value" style={{ color: t.color }}>
            {t.value}
          </span>
        </div>
      ))}
    </div>
  );
};

export default SummaryTiles;
