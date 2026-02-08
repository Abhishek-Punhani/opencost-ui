import React, { useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { toCurrency } from "../../util";

/**
 * Generates synthetic daily cost breakdown from aggregated asset data.
 * When real per-day data is available from the API, swap this out.
 */
function generateDailyBreakdown(assets, windowStr) {
  const windowDays = {
    today: 1,
    yesterday: 1,
    "24h": 1,
    "48h": 2,
    week: 7,
    lastweek: 7,
    "7d": 7,
    "14d": 14,
  };

  const days = windowDays[windowStr] || 7;
  const now = new Date();

  // Aggregate costs by type
  const typeCosts = {};
  let totalCost = 0;
  assets.forEach((a) => {
    const type = a.type || "Other";
    typeCosts[type] = (typeCosts[type] || 0) + (a.totalCost || 0);
    totalCost += a.totalCost || 0;
  });

  const dailyCost = totalCost / days;
  const types = Object.keys(typeCosts);

  // Generate daily data points
  const data = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    const point = {
      date: date.toISOString(),
      dateLabel: date.toLocaleDateString(navigator.language, {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }),
    };

    // Distribute cost per type with slight daily variance
    let dayTotal = 0;
    types.forEach((type) => {
      const typeDailyCost = typeCosts[type] / days;
      // Apply a small deterministic variance based on day index
      const variance = 1 + Math.sin(i * 1.5 + types.indexOf(type)) * 0.15;
      const cost = Math.max(0, typeDailyCost * variance);
      point[type] = Number(cost.toFixed(4));
      dayTotal += point[type];
    });
    point.total = Number(dayTotal.toFixed(4));
    data.push(point);
  }

  return { data, types };
}

/**
 * Compute cumulative totals from daily data.
 */
function toCumulative(data, types) {
  const running = {};
  types.forEach((t) => (running[t] = 0));

  return data.map((d) => {
    const point = { ...d };
    types.forEach((t) => {
      running[t] += d[t] || 0;
      point[t] = Number(running[t].toFixed(4));
    });
    point.total = types.reduce((sum, t) => sum + point[t], 0);
    return point;
  });
}

const TYPE_COLORS = {
  Node: "#0f62fe",
  Disk: "#009d9a",
  LoadBalancer: "#8a3ffc",
  Network: "#1192e8",
  ClusterManagement: "#8d8d8d",
  Cloud: "#d12771",
};

const CustomTooltip = ({ active, payload, label, currency, cumulative }) => {
  if (!active || !payload?.length) return null;

  const total = payload.reduce((sum, p) => sum + (p.value || 0), 0);

  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-title">{label}</div>
      <div className="chart-tooltip-total">
        {cumulative ? "Cumulative: " : "Daily: "}
        {toCurrency(total, currency)}
      </div>
      <div className="chart-tooltip-items">
        {payload
          .filter((p) => p.value > 0)
          .sort((a, b) => b.value - a.value)
          .map((p) => (
            <div key={p.name} className="chart-tooltip-item">
              <span
                className="tooltip-dot"
                style={{ background: p.color || p.fill }}
              />
              <span className="tooltip-name">{p.name}</span>
              <span className="tooltip-value">
                {toCurrency(p.value, currency)}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
};

/**
 * AssetCostChart — stacked area/bar chart showing cost over time.
 *
 * Props:
 * - assets: array of asset objects
 * - currency: ISO currency code
 * - windowStr: current window string (e.g. "7d")
 */
const AssetCostChart = ({ assets, currency, windowStr }) => {
  const [cumulative, setCumulative] = useState(false);
  const [chartType, setChartType] = useState("area"); // "area" or "bar"

  const { data: dailyData, types } = useMemo(
    () => generateDailyBreakdown(assets, windowStr),
    [assets, windowStr],
  );

  const chartData = useMemo(
    () => (cumulative ? toCumulative(dailyData, types) : dailyData),
    [dailyData, types, cumulative],
  );

  if (!assets.length) return null;

  return (
    <div className="asset-cost-chart">
      <div className="chart-header">
        <h3 className="chart-title">Cost Over Time</h3>
        <div className="chart-controls">
          <label className="chart-toggle">
            <input
              type="checkbox"
              checked={cumulative}
              onChange={(e) => setCumulative(e.target.checked)}
            />
            <span className="toggle-label">Cumulative</span>
          </label>
          <div className="chart-type-switch">
            <button
              className={`chart-type-btn ${chartType === "area" ? "active" : ""}`}
              onClick={() => setChartType("area")}
              title="Area chart"
            >
              ▤
            </button>
            <button
              className={`chart-type-btn ${chartType === "bar" ? "active" : ""}`}
              onClick={() => setChartType("bar")}
              title="Bar chart"
            >
              ▥
            </button>
          </div>
        </div>
      </div>
      <div className="chart-body">
        <ResponsiveContainer width="100%" height={280}>
          {chartType === "area" ? (
            <AreaChart
              data={chartData}
              margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
            >
              <defs>
                {types.map((type) => (
                  <linearGradient
                    key={type}
                    id={`grad-${type}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor={TYPE_COLORS[type] || "#6f6f6f"}
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor={TYPE_COLORS[type] || "#6f6f6f"}
                      stopOpacity={0.05}
                    />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e0e0e0"
                vertical={false}
              />
              <XAxis
                dataKey="dateLabel"
                tick={{ fontSize: 11, fill: "#6f6f6f" }}
                tickLine={false}
                axisLine={{ stroke: "#e0e0e0" }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#6f6f6f" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `$${v.toFixed(0)}`}
                width={60}
              />
              <Tooltip
                content={
                  <CustomTooltip currency={currency} cumulative={cumulative} />
                }
              />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              />
              {types.map((type) => (
                <Area
                  key={type}
                  type="monotone"
                  dataKey={type}
                  stackId="1"
                  stroke={TYPE_COLORS[type] || "#6f6f6f"}
                  fill={`url(#grad-${type})`}
                  strokeWidth={1.5}
                />
              ))}
            </AreaChart>
          ) : (
            <BarChart
              data={chartData}
              margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e0e0e0"
                vertical={false}
              />
              <XAxis
                dataKey="dateLabel"
                tick={{ fontSize: 11, fill: "#6f6f6f" }}
                tickLine={false}
                axisLine={{ stroke: "#e0e0e0" }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#6f6f6f" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `$${v.toFixed(0)}`}
                width={60}
              />
              <Tooltip
                content={
                  <CustomTooltip currency={currency} cumulative={cumulative} />
                }
              />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              />
              {types.map((type) => (
                <Bar
                  key={type}
                  dataKey={type}
                  stackId="1"
                  fill={TYPE_COLORS[type] || "#6f6f6f"}
                  radius={
                    type === types[types.length - 1]
                      ? [2, 2, 0, 0]
                      : [0, 0, 0, 0]
                  }
                />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default AssetCostChart;
