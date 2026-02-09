import React from "react";
import { toCurrency } from "../../util";

const ChartTooltip = ({ active, payload, label, currency }) => {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + (p.value || 0), 0);
  return (
    <div className="alloc-chart-tooltip">
      {label && <div className="alloc-chart-tooltip-title">{label}</div>}
      <div className="alloc-chart-tooltip-total">
        {toCurrency(total, currency)}
      </div>
      <div className="alloc-chart-tooltip-items">
        {payload
          .filter((p) => p.value > 0.001)
          .sort((a, b) => b.value - a.value)
          .map((p) => (
            <div key={p.name} className="alloc-chart-tooltip-item">
              <span
                className="alloc-tooltip-dot"
                style={{ background: p.color || p.fill }}
              />
              <span className="alloc-tooltip-name">{p.name}</span>
              <span className="alloc-tooltip-value">
                {toCurrency(p.value, currency)}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
};

export default ChartTooltip;
