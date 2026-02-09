import React, { useMemo } from "react";
import { Button } from "@carbon/react";
import { ArrowLeft } from "@carbon/icons-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import { toCurrency } from "../../util";
import { COST_COLORS } from "./constants";
import ChartTooltip from "./ChartTooltip";

const AllocationDetail = ({
  alloc,
  allocationData,
  currency,
  aggregateBy,
  onBack,
}) => {
  const dailyCosts = useMemo(() => {
    if (!allocationData || allocationData.length <= 1) return [];
    return allocationData.map((set, i) => {
      const match = set.find((a) => a.name === alloc.name);
      const startStr = set[0]?.start || set[0]?.window?.start || "";
      const label = startStr
        ? new Date(startStr).toLocaleDateString(navigator.language, {
            month: "short",
            day: "numeric",
            timeZone: "UTC",
          })
        : `Day ${i + 1}`;
      return {
        label,
        cpu: match?.cpuCost || 0,
        gpu: match?.gpuCost || 0,
        ram: match?.ramCost || 0,
        pv: match?.pvCost || 0,
        network: match?.networkCost || 0,
      };
    });
  }, [allocationData, alloc.name]);

  const costBreakdown = useMemo(() => {
    const data = [];
    if (alloc.cpuCost > 0)
      data.push({
        name: "CPU",
        value: +alloc.cpuCost.toFixed(2),
        fill: COST_COLORS.cpuCost,
      });
    if (alloc.gpuCost > 0)
      data.push({
        name: "GPU",
        value: +alloc.gpuCost.toFixed(2),
        fill: COST_COLORS.gpuCost,
      });
    if (alloc.ramCost > 0)
      data.push({
        name: "RAM",
        value: +alloc.ramCost.toFixed(2),
        fill: COST_COLORS.ramCost,
      });
    if (alloc.pvCost > 0)
      data.push({
        name: "PV",
        value: +alloc.pvCost.toFixed(2),
        fill: COST_COLORS.pvCost,
      });
    if (alloc.networkCost > 0)
      data.push({
        name: "Network",
        value: +alloc.networkCost.toFixed(2),
        fill: COST_COLORS.networkCost,
      });
    return data;
  }, [alloc]);

  const cpuEff =
    alloc.cpuEfficiency > 0 ? (alloc.cpuEfficiency * 100).toFixed(1) : null;
  const ramEff =
    alloc.ramEfficiency > 0 ? (alloc.ramEfficiency * 100).toFixed(1) : null;
  const totalEff =
    alloc.totalEfficiency > 0 ? (alloc.totalEfficiency * 100).toFixed(1) : null;

  return (
    <div className="alloc-detail">
      <div className="alloc-detail-top">
        <Button
          kind="ghost"
          size="md"
          renderIcon={ArrowLeft}
          onClick={onBack}
          className="alloc-detail-back-btn"
        >
          Back to {aggregateBy}s
        </Button>

        <div className="alloc-detail-header">
          <span className="alloc-detail-badge">{aggregateBy}</span>
          <h2 className="alloc-detail-name">{alloc.name}</h2>
        </div>
      </div>

      <div className="alloc-detail-cards">
        <div className="alloc-detail-card alloc-detail-card--primary">
          <span className="alloc-card-label">Total Cost</span>
          <span className="alloc-card-value">
            {toCurrency(alloc.totalCost, currency)}
          </span>
        </div>
        <div className="alloc-detail-card">
          <span
            className="alloc-card-label"
            style={{ color: COST_COLORS.cpuCost }}
          >
            CPU
          </span>
          <span className="alloc-card-value">
            {toCurrency(alloc.cpuCost || 0, currency)}
          </span>
        </div>
        <div className="alloc-detail-card">
          <span
            className="alloc-card-label"
            style={{ color: COST_COLORS.gpuCost }}
          >
            GPU
          </span>
          <span className="alloc-card-value">
            {toCurrency(alloc.gpuCost || 0, currency)}
          </span>
        </div>
        <div className="alloc-detail-card">
          <span
            className="alloc-card-label"
            style={{ color: COST_COLORS.ramCost }}
          >
            RAM
          </span>
          <span className="alloc-card-value">
            {toCurrency(alloc.ramCost || 0, currency)}
          </span>
        </div>
        <div className="alloc-detail-card">
          <span
            className="alloc-card-label"
            style={{ color: COST_COLORS.pvCost }}
          >
            PV
          </span>
          <span className="alloc-card-value">
            {toCurrency(alloc.pvCost || 0, currency)}
          </span>
        </div>
      </div>

      <div className="alloc-detail-charts">
        {dailyCosts.length > 0 ? (
          <div className="alloc-detail-chart-card">
            <h4 className="alloc-detail-section-title">Daily Cost Trend</h4>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart
                data={dailyCosts}
                margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={COST_COLORS.cpuCost}
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor={COST_COLORS.cpuCost}
                      stopOpacity={0.05}
                    />
                  </linearGradient>
                  <linearGradient id="ramGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={COST_COLORS.ramCost}
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor={COST_COLORS.ramCost}
                      stopOpacity={0.05}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--chart-grid)"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: "var(--chart-text)" }}
                  tickLine={false}
                  axisLine={{ stroke: "var(--chart-grid)" }}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "var(--chart-text)" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `$${v.toFixed(0)}`}
                  width={50}
                />
                <Tooltip content={<ChartTooltip currency={currency} />} />
                <Legend
                  iconType="circle"
                  iconSize={7}
                  wrapperStyle={{ fontSize: 10 }}
                />
                <Area
                  type="monotone"
                  dataKey="cpu"
                  stackId="1"
                  stroke={COST_COLORS.cpuCost}
                  fill="url(#cpuGrad)"
                  name="CPU"
                />
                <Area
                  type="monotone"
                  dataKey="gpu"
                  stackId="1"
                  stroke={COST_COLORS.gpuCost}
                  fill={COST_COLORS.gpuCost}
                  fillOpacity={0.15}
                  name="GPU"
                />
                <Area
                  type="monotone"
                  dataKey="ram"
                  stackId="1"
                  stroke={COST_COLORS.ramCost}
                  fill="url(#ramGrad)"
                  name="RAM"
                />
                <Area
                  type="monotone"
                  dataKey="pv"
                  stackId="1"
                  stroke={COST_COLORS.pvCost}
                  fill={COST_COLORS.pvCost}
                  fillOpacity={0.15}
                  name="PV"
                />
                <Area
                  type="monotone"
                  dataKey="network"
                  stackId="1"
                  stroke={COST_COLORS.networkCost}
                  fill={COST_COLORS.networkCost}
                  fillOpacity={0.15}
                  name="Network"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="alloc-detail-chart-card">
            <h4 className="alloc-detail-section-title">Cost Distribution</h4>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={costBreakdown}
                layout="vertical"
                margin={{ top: 8, right: 20, left: 10, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--chart-grid)"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: "var(--chart-text)" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `$${v.toFixed(0)}`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "var(--chart-text)" }}
                  tickLine={false}
                  axisLine={false}
                  width={60}
                />
                <Tooltip
                  formatter={(v) => toCurrency(v, currency)}
                  contentStyle={{
                    background: "var(--card-bg)",
                    border: "1px solid var(--border-color)",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={28}>
                  {costBreakdown.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {costBreakdown.length > 0 && (
          <div className="alloc-detail-chart-card">
            <h4 className="alloc-detail-section-title">Cost Breakdown</h4>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={costBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {costBreakdown.map((s, i) => (
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
          </div>
        )}
      </div>

      {(cpuEff || ramEff || totalEff) && (
        <div className="alloc-detail-info-card">
          <h4 className="alloc-detail-section-title">Resource Efficiency</h4>
          <div className="alloc-eff-bars">
            {totalEff && (
              <div className="alloc-eff-row">
                <span className="alloc-eff-label">Total</span>
                <div className="alloc-eff-bar-track">
                  <div
                    className="alloc-eff-bar-fill"
                    style={{
                      width: `${Math.min(parseFloat(totalEff), 100)}%`,
                      background:
                        parseFloat(totalEff) > 80
                          ? "#42be65"
                          : parseFloat(totalEff) > 50
                            ? "#f1c21b"
                            : "#fa4d56",
                    }}
                  />
                </div>
                <span className="alloc-eff-val">{totalEff}%</span>
              </div>
            )}
            {cpuEff && (
              <div className="alloc-eff-row">
                <span className="alloc-eff-label">CPU</span>
                <div className="alloc-eff-bar-track">
                  <div
                    className="alloc-eff-bar-fill"
                    style={{
                      width: `${Math.min(parseFloat(cpuEff), 100)}%`,
                      background: COST_COLORS.cpuCost,
                    }}
                  />
                </div>
                <span className="alloc-eff-val">{cpuEff}%</span>
              </div>
            )}
            {ramEff && (
              <div className="alloc-eff-row">
                <span className="alloc-eff-label">RAM</span>
                <div className="alloc-eff-bar-track">
                  <div
                    className="alloc-eff-bar-fill"
                    style={{
                      width: `${Math.min(parseFloat(ramEff), 100)}%`,
                      background: COST_COLORS.ramCost,
                    }}
                  />
                </div>
                <span className="alloc-eff-val">{ramEff}%</span>
              </div>
            )}
          </div>
        </div>
      )}

      {dailyCosts.length > 1 && (
        <div className="alloc-detail-info-card">
          <h4 className="alloc-detail-section-title">Cost Trend Analysis</h4>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart
              data={dailyCosts}
              margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--chart-grid)"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "var(--chart-text)" }}
                tickLine={false}
                axisLine={{ stroke: "var(--chart-grid)" }}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "var(--chart-text)" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `$${v.toFixed(0)}`}
                width={50}
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
              <Bar
                dataKey={(d) => d.cpu + d.gpu + d.ram + d.pv + d.network}
                fill="#0f62fe"
                radius={[3, 3, 0, 0]}
                name="Total Daily Cost"
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="alloc-detail-info-card">
        <h4 className="alloc-detail-section-title">Cost Details</h4>
        <div className="alloc-info-grid">
          <div className="alloc-info-item">
            <span className="alloc-info-label">CPU Cost</span>
            <span className="alloc-info-value">
              {toCurrency(alloc.cpuCost || 0, currency)}
            </span>
          </div>
          <div className="alloc-info-item">
            <span className="alloc-info-label">GPU Cost</span>
            <span className="alloc-info-value">
              {toCurrency(alloc.gpuCost || 0, currency)}
            </span>
          </div>
          <div className="alloc-info-item">
            <span className="alloc-info-label">RAM Cost</span>
            <span className="alloc-info-value">
              {toCurrency(alloc.ramCost || 0, currency)}
            </span>
          </div>
          <div className="alloc-info-item">
            <span className="alloc-info-label">PV Cost</span>
            <span className="alloc-info-value">
              {toCurrency(alloc.pvCost || 0, currency)}
            </span>
          </div>
          <div className="alloc-info-item">
            <span className="alloc-info-label">Network Cost</span>
            <span className="alloc-info-value">
              {toCurrency(alloc.networkCost || 0, currency)}
            </span>
          </div>
          <div className="alloc-info-item">
            <span className="alloc-info-label">Shared Cost</span>
            <span className="alloc-info-value">
              {toCurrency(alloc.sharedCost || 0, currency)}
            </span>
          </div>
          <div className="alloc-info-item">
            <span className="alloc-info-label">External Cost</span>
            <span className="alloc-info-value">
              {toCurrency(alloc.externalCost || 0, currency)}
            </span>
          </div>
          <div className="alloc-info-item">
            <span className="alloc-info-label">Total Cost</span>
            <span className="alloc-info-value alloc-info-value--total">
              {toCurrency(alloc.totalCost || 0, currency)}
            </span>
          </div>
        </div>
      </div>

      <div className="alloc-detail-info-card">
        <h4 className="alloc-detail-section-title">Resource Metrics</h4>
        <div className="alloc-metrics-grid">
          {alloc.cpuCoreRequestAverage > 0 && (
            <div className="alloc-metric-card">
              <span className="alloc-metric-label">CPU Request</span>
              <span className="alloc-metric-value">
                {alloc.cpuCoreRequestAverage.toFixed(2)} cores
              </span>
            </div>
          )}
          {alloc.cpuCoreUsageAverage > 0 && (
            <div className="alloc-metric-card">
              <span className="alloc-metric-label">CPU Usage</span>
              <span className="alloc-metric-value">
                {alloc.cpuCoreUsageAverage.toFixed(2)} cores
              </span>
            </div>
          )}
          {alloc.ramByteRequestAverage > 0 && (
            <div className="alloc-metric-card">
              <span className="alloc-metric-label">RAM Request</span>
              <span className="alloc-metric-value">
                {(alloc.ramByteRequestAverage / 1024 / 1024 / 1024).toFixed(2)}{" "}
                GB
              </span>
            </div>
          )}
          {alloc.ramByteUsageAverage > 0 && (
            <div className="alloc-metric-card">
              <span className="alloc-metric-label">RAM Usage</span>
              <span className="alloc-metric-value">
                {(alloc.ramByteUsageAverage / 1024 / 1024 / 1024).toFixed(2)} GB
              </span>
            </div>
          )}
          {alloc.minutes > 0 && (
            <div className="alloc-metric-card">
              <span className="alloc-metric-label">Runtime</span>
              <span className="alloc-metric-value">
                {(alloc.minutes / 60).toFixed(1)} hours
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AllocationDetail;
