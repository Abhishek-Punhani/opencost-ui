import React, { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { toCurrency } from "../../util";
import { ALLOC_COLORS } from "./constants";
import ChartTooltip from "./ChartTooltip";

const AllocationCostChart = ({
  allocationData,
  cumData,
  currency,
  aggregateBy,
  accumulate,
  onAccumulateChange,
}) => {
  const [showCumulative, setShowCumulative] = useState(false);

  const { chartData, names } = useMemo(() => {
    if (!allocationData || allocationData.length <= 1) {
      return { chartData: null, names: [] };
    }
    const nameSet = new Set();
    allocationData.forEach((set) => {
      const items = Array.isArray(set) ? set : Object.values(set);
      items.forEach((a) => nameSet.add(a.name));
    });
    const sortedNames = [...nameSet].sort((a, b) => {
      const tA = cumData.find((c) => c.name === a)?.totalCost || 0;
      const tB = cumData.find((c) => c.name === b)?.totalCost || 0;
      return tB - tA;
    });
    const topNames = sortedNames.slice(0, 8);
    const hasOther = sortedNames.length > 8;

    const data = allocationData.map((set, i) => {
      const items = Array.isArray(set) ? set : Object.values(set);
      const startStr = items[0]?.start || items[0]?.window?.start || "";
      const dateLabel = startStr
        ? new Date(startStr).toLocaleDateString(navigator.language, {
            month: "short",
            day: "numeric",
            timeZone: "UTC",
          })
        : `Day ${i + 1}`;
      const point = { dateLabel };
      let otherCost = 0;
      items.forEach((a) => {
        if (topNames.includes(a.name)) {
          point[a.name] = Number((a.totalCost || 0).toFixed(4));
        } else {
          otherCost += a.totalCost || 0;
        }
      });
      if (hasOther && otherCost > 0)
        point["Other"] = Number(otherCost.toFixed(4));
      return point;
    });

    const finalNames = hasOther ? [...topNames, "Other"] : topNames;
    return { chartData: data, names: finalNames };
  }, [allocationData, cumData]);

  const donutData = useMemo(() => {
    if (chartData) return null;
    return cumData
      .filter((a) => a.name !== "__idle__" && a.totalCost > 0)
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, 10)
      .map((a, i) => ({
        name: a.name,
        value: Number(a.totalCost.toFixed(2)),
        fill: ALLOC_COLORS[i % ALLOC_COLORS.length],
      }));
  }, [cumData, chartData]);

  const cumulativeData = useMemo(() => {
    if (!chartData) return null;
    let running = 0;
    return chartData.map((d) => {
      const dayTotal = Object.entries(d)
        .filter(([k]) => k !== "dateLabel")
        .reduce((s, [, v]) => s + (typeof v === "number" ? v : 0), 0);
      running += dayTotal;
      return {
        dateLabel: d.dateLabel,
        total: Number(dayTotal.toFixed(4)),
        cumulative: Number(running.toFixed(4)),
      };
    });
  }, [chartData]);

  if (!chartData && !donutData) return null;

  return (
    <div className="alloc-chart-card">
      <div className="alloc-chart-head">
        <h3 className="alloc-chart-title">Cost by {aggregateBy}</h3>
        <div className="alloc-chart-controls">
          {chartData && (
            <label className="alloc-chart-toggle">
              <input
                type="checkbox"
                checked={showCumulative}
                onChange={(e) => setShowCumulative(e.target.checked)}
              />
              <span>Cumulative</span>
            </label>
          )}
          <div className="assets-view-toggle">
            <button
              className={`view-toggle-btn ${!accumulate ? "active" : ""}`}
              onClick={() => onAccumulateChange(false)}
              title="Daily"
            >
              <span>Daily</span>
            </button>
            <button
              className={`view-toggle-btn ${accumulate ? "active" : ""}`}
              onClick={() => onAccumulateChange(true)}
              title="Entire window"
            >
              <span>Entire window</span>
            </button>
          </div>
        </div>
      </div>
      <div className="alloc-chart-body">
        {chartData && !showCumulative && (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={chartData}
              margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--chart-grid)"
                vertical={false}
              />
              <XAxis
                dataKey="dateLabel"
                tick={{ fontSize: 10, fill: "var(--chart-text)" }}
                tickLine={false}
                axisLine={{ stroke: "var(--chart-grid)" }}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "var(--chart-text)" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `$${v.toFixed(0)}`}
                width={55}
              />
              <Tooltip content={<ChartTooltip currency={currency} />} />
              <Legend
                iconType="circle"
                iconSize={7}
                wrapperStyle={{ fontSize: 10, paddingTop: 4 }}
              />
              {names.map((n, i) => (
                <Bar
                  key={n}
                  dataKey={n}
                  stackId="a"
                  fill={ALLOC_COLORS[i % ALLOC_COLORS.length]}
                  radius={i === names.length - 1 ? [2, 2, 0, 0] : [0, 0, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
        {chartData && showCumulative && cumulativeData && (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={cumulativeData}
              margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--chart-grid)"
                vertical={false}
              />
              <XAxis
                dataKey="dateLabel"
                tick={{ fontSize: 10, fill: "var(--chart-text)" }}
                tickLine={false}
                axisLine={{ stroke: "var(--chart-grid)" }}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "var(--chart-text)" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `$${v.toFixed(0)}`}
                width={55}
              />
              <Tooltip content={<ChartTooltip currency={currency} />} />
              <Bar
                dataKey="cumulative"
                fill="#42be65"
                radius={[3, 3, 0, 0]}
                name="Cumulative Cost"
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
        {donutData && (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={donutData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                strokeWidth={0}
              >
                {donutData.map((s, i) => (
                  <Cell key={i} fill={s.fill} />
                ))}
              </Pie>
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 11 }}
              />
              <Tooltip
                formatter={(v) => toCurrency(v, currency)}
                contentStyle={{
                  background: "var(--card-bg)",
                  border: "1px solid var(--border-color)",
                  borderRadius: 4,
                  fontSize: 12,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default AllocationCostChart;
