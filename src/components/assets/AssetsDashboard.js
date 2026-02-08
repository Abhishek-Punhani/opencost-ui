import React, { useMemo } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { toCurrency } from "../../util";

/* ── Palette ─────────────────────────────────────── */
const TYPE_COLORS = {
  Node: "#0f62fe",
  Disk: "#009d9a",
  LoadBalancer: "#8a3ffc",
  Network: "#1192e8",
  ClusterManagement: "#8d8d8d",
  Cloud: "#d12771",
};

const PROVIDER_COLORS = {
  GCP: "#4285f4",
  AWS: "#ff9900",
  Azure: "#0089d6",
};

const CLUSTER_COLORS = [
  "#0f62fe",
  "#8a3ffc",
  "#009d9a",
  "#d12771",
  "#ee5396",
  "#1192e8",
];

const COST_PART_COLORS = [
  "#0f62fe",
  "#009d9a",
  "#8a3ffc",
  "#1192e8",
  "#ee5396",
];

/* ── Shared tooltip ──────────────────────────────── */
const PanelTooltip = ({ active, payload, label, currency, prefix }) => {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + (p.value || 0), 0);
  return (
    <div className="dash-tooltip">
      {label && <div className="dash-tooltip-title">{label}</div>}
      <div className="dash-tooltip-total">
        {prefix || ""}
        {toCurrency(total, currency)}
      </div>
      <div className="dash-tooltip-items">
        {payload
          .filter((p) => p.value > 0.001)
          .sort((a, b) => b.value - a.value)
          .map((p) => (
            <div key={p.name} className="dash-tooltip-row">
              <span
                className="dash-tooltip-dot"
                style={{ background: p.color || p.fill }}
              />
              <span className="dash-tooltip-name">{p.name}</span>
              <span className="dash-tooltip-val">
                {toCurrency(p.value, currency)}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
};

/* ── Chart panel wrapper ─────────────────────────── */
const Panel = ({ title, subtitle, children, className }) => (
  <div className={`dash-panel ${className || ""}`}>
    <div className="dash-panel-header">
      <h4 className="dash-panel-title">{title}</h4>
      {subtitle && <span className="dash-panel-sub">{subtitle}</span>}
    </div>
    <div className="dash-panel-body">{children}</div>
  </div>
);

/* ── Helpers ─────────────────────────────────────── */
function buildDailyByType(assets) {
  // Collect all unique dates across all assets
  const dateMap = {};
  const types = new Set();

  assets.forEach((a) => {
    const type = a.type || "Other";
    types.add(type);
    (a.dailyCosts || []).forEach((dc) => {
      if (!dateMap[dc.date]) dateMap[dc.date] = {};
      dateMap[dc.date][type] = (dateMap[dc.date][type] || 0) + dc.cost;
    });
  });

  // If no dailyCosts, generate synthetic from aggregated data
  if (Object.keys(dateMap).length === 0) {
    return buildSyntheticDaily(assets);
  }

  const typeArr = [...types].sort();
  const dates = Object.keys(dateMap).sort();

  return {
    data: dates.map((d) => {
      const point = {
        date: d,
        dateLabel: new Date(d + "T00:00:00Z").toLocaleDateString(
          navigator.language,
          {
            month: "short",
            day: "numeric",
            timeZone: "UTC",
          },
        ),
      };
      typeArr.forEach((t) => {
        point[t] = Number((dateMap[d][t] || 0).toFixed(4));
      });
      point.total = typeArr.reduce((s, t) => s + (point[t] || 0), 0);
      return point;
    }),
    types: typeArr,
  };
}

function buildSyntheticDaily(assets) {
  const days = 7;
  const now = new Date();
  const typeCosts = {};
  assets.forEach((a) => {
    const t = a.type || "Other";
    typeCosts[t] = (typeCosts[t] || 0) + (a.totalCost || 0);
  });
  const types = Object.keys(typeCosts).sort();

  const data = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const point = {
      date: d.toISOString().slice(0, 10),
      dateLabel: d.toLocaleDateString(navigator.language, {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }),
    };
    let total = 0;
    types.forEach((t) => {
      const v = 1 + Math.sin(i * 1.5 + types.indexOf(t)) * 0.15;
      const cost = Math.max(0, (typeCosts[t] / days) * v);
      point[t] = Number(cost.toFixed(4));
      total += point[t];
    });
    point.total = Number(total.toFixed(4));
    data.push(point);
  }
  return { data, types };
}

function buildDailyByProvider(assets) {
  const dateMap = {};
  const providers = new Set();

  assets.forEach((a) => {
    const prov = a.properties?.provider || "Unknown";
    providers.add(prov);
    (a.dailyCosts || []).forEach((dc) => {
      if (!dateMap[dc.date]) dateMap[dc.date] = {};
      dateMap[dc.date][prov] = (dateMap[dc.date][prov] || 0) + dc.cost;
    });
  });

  if (Object.keys(dateMap).length === 0) {
    // Synthetic fallback
    const days = 7;
    const now = new Date();
    const provCosts = {};
    assets.forEach((a) => {
      const p = a.properties?.provider || "Unknown";
      provCosts[p] = (provCosts[p] || 0) + (a.totalCost || 0);
    });
    const provArr = Object.keys(provCosts);
    const data = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const point = {
        dateLabel: d.toLocaleDateString(navigator.language, {
          month: "short",
          day: "numeric",
          timeZone: "UTC",
        }),
      };
      provArr.forEach((p) => {
        const v = 1 + Math.sin(i * 2 + provArr.indexOf(p)) * 0.2;
        point[p] = Number(((provCosts[p] / days) * v).toFixed(4));
      });
      data.push(point);
    }
    return { data, providers: provArr };
  }

  const provArr = [...providers].sort();
  const dates = Object.keys(dateMap).sort();
  return {
    data: dates.map((d) => {
      const point = {
        dateLabel: new Date(d + "T00:00:00Z").toLocaleDateString(
          navigator.language,
          {
            month: "short",
            day: "numeric",
            timeZone: "UTC",
          },
        ),
      };
      provArr.forEach((p) => {
        point[p] = Number((dateMap[d][p] || 0).toFixed(4));
      });
      return point;
    }),
    providers: provArr,
  };
}

function buildDailyByCluster(assets) {
  const dateMap = {};
  const clusters = new Set();

  assets.forEach((a) => {
    const cl = a.properties?.cluster || "Unknown";
    clusters.add(cl);
    (a.dailyCosts || []).forEach((dc) => {
      if (!dateMap[dc.date]) dateMap[dc.date] = {};
      dateMap[dc.date][cl] = (dateMap[dc.date][cl] || 0) + dc.cost;
    });
  });

  if (Object.keys(dateMap).length === 0) {
    const days = 7;
    const now = new Date();
    const clCosts = {};
    assets.forEach((a) => {
      const c = a.properties?.cluster || "Unknown";
      clCosts[c] = (clCosts[c] || 0) + (a.totalCost || 0);
    });
    const clArr = Object.keys(clCosts);
    const data = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const point = {
        dateLabel: d.toLocaleDateString(navigator.language, {
          month: "short",
          day: "numeric",
          timeZone: "UTC",
        }),
      };
      clArr.forEach((c) => {
        const v = 1 + Math.cos(i * 1.3 + clArr.indexOf(c)) * 0.18;
        point[c] = Number(((clCosts[c] / days) * v).toFixed(4));
      });
      data.push(point);
    }
    return { data, clusters: clArr };
  }

  const clArr = [...clusters].sort();
  const dates = Object.keys(dateMap).sort();
  return {
    data: dates.map((d) => {
      const point = {
        dateLabel: new Date(d + "T00:00:00Z").toLocaleDateString(
          navigator.language,
          {
            month: "short",
            day: "numeric",
            timeZone: "UTC",
          },
        ),
      };
      clArr.forEach((c) => {
        point[c] = Number((dateMap[d][c] || 0).toFixed(4));
      });
      return point;
    }),
    clusters: clArr,
  };
}

function buildCumulativeTotal(dailyByType) {
  let running = 0;
  return dailyByType.data.map((d) => {
    running += d.total;
    return {
      dateLabel: d.dateLabel,
      cumulative: Number(running.toFixed(4)),
    };
  });
}

/* ── Main Dashboard Component ────────────────────── */
const AssetsDashboard = ({ assets, currency, windowStr }) => {
  // 1. Daily spend by service/type (stacked bar — like "Estimated charges by Service")
  const dailyByType = useMemo(() => buildDailyByType(assets), [assets]);

  // 2. Daily spend by provider (stacked bar — like "Daily Spend by Account")
  const dailyByProvider = useMemo(() => buildDailyByProvider(assets), [assets]);

  // 3. Cumulative cost (area — like "Monthly Estimated Charges")
  const cumulativeData = useMemo(
    () => buildCumulativeTotal(dailyByType),
    [dailyByType],
  );

  // 4. Cost breakdown by type (donut — like "Estimated charges by Service" pie)
  const typeDonut = useMemo(() => {
    const map = {};
    assets.forEach((a) => {
      const t = a.type || "Other";
      map[t] = (map[t] || 0) + (a.totalCost || 0);
    });
    return Object.entries(map)
      .map(([name, value]) => ({
        name,
        value: Number(value.toFixed(2)),
        fill: TYPE_COLORS[name] || "#6f6f6f",
      }))
      .sort((a, b) => b.value - a.value);
  }, [assets]);

  // 5. Cost by provider (horizontal bar — like "Biggest spenders")
  const providerBars = useMemo(() => {
    const map = {};
    assets.forEach((a) => {
      const p = a.properties?.provider || "Unknown";
      map[p] = (map[p] || 0) + (a.totalCost || 0);
    });
    return Object.entries(map)
      .map(([name, value]) => ({
        name,
        cost: Number(value.toFixed(2)),
        fill: PROVIDER_COLORS[name] || "#6f6f6f",
      }))
      .sort((a, b) => b.cost - a.cost);
  }, [assets]);

  // 6. Daily spend by cluster (stacked bar)
  const dailyByCluster = useMemo(() => buildDailyByCluster(assets), [assets]);

  // Summary metrics for header tiles
  const metrics = useMemo(() => {
    let totalCost = 0;
    let avgDaily = 0;
    assets.forEach((a) => (totalCost += a.totalCost || 0));
    const dayCount = dailyByType.data.length || 1;
    avgDaily = totalCost / dayCount;
    // Estimate today's cost from the last day
    const lastDay = dailyByType.data[dailyByType.data.length - 1];
    const todayCost = lastDay ? lastDay.total : avgDaily;
    return { totalCost, avgDaily, todayCost };
  }, [assets, dailyByType]);

  // Cost breakdown table for the donut legend
  const typeTable = useMemo(() => {
    const total = typeDonut.reduce((s, d) => s + d.value, 0);
    return typeDonut.map((d) => ({
      ...d,
      pct: total > 0 ? Math.round((d.value / total) * 100) : 0,
    }));
  }, [typeDonut]);

  if (!assets.length) return null;

  const windowLabel =
    windowStr === "7d"
      ? "Last 7 days"
      : windowStr === "14d"
        ? "Last 14 days"
        : windowStr === "today"
          ? "Today"
          : windowStr === "week"
            ? "Week to date"
            : windowStr;

  return (
    <div className="assets-dashboard">
      {/* ── Top summary tiles (orange accent like AWS billing) ── */}
      <div className="dash-summary-row">
        <div className="dash-summary-tile">
          <span className="dash-sum-label">Total Spend</span>
          <span className="dash-sum-sub">{windowLabel}</span>
          <span className="dash-sum-value">
            {toCurrency(metrics.totalCost, currency)}
          </span>
        </div>
        <div className="dash-summary-tile">
          <span className="dash-sum-label">Average Daily Spend</span>
          <span className="dash-sum-sub">per day</span>
          <span className="dash-sum-value">
            {toCurrency(metrics.avgDaily, currency)}
          </span>
        </div>
        <div className="dash-summary-tile">
          <span className="dash-sum-label">Latest Day Spend</span>
          <span className="dash-sum-sub">
            {dailyByType.data.length
              ? dailyByType.data[dailyByType.data.length - 1].dateLabel
              : "—"}
          </span>
          <span className="dash-sum-value">
            {toCurrency(metrics.todayCost, currency)}
          </span>
        </div>
      </div>

      {/* ── Row 1: Cumulative + Daily by Type + Donut ── */}
      <div className="dash-row dash-row--3col">
        {/* Cumulative Estimated Charges (area) */}
        <Panel title="Cumulative Cost" subtitle={windowLabel}>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart
              data={cumulativeData}
              margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="gradCum" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#42be65" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#42be65" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e0e0e0"
                vertical={false}
              />
              <XAxis
                dataKey="dateLabel"
                tick={{ fontSize: 10, fill: "#6f6f6f" }}
                tickLine={false}
                axisLine={{ stroke: "#e0e0e0" }}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#6f6f6f" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `$${v.toFixed(0)}`}
                width={55}
              />
              <Tooltip
                content={
                  <PanelTooltip currency={currency} prefix="Cumulative: " />
                }
              />
              <Area
                type="monotone"
                dataKey="cumulative"
                stroke="#42be65"
                fill="url(#gradCum)"
                strokeWidth={2}
                name="Cumulative"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>

        {/* Daily Cost by Type (stacked bar) */}
        <Panel title="Daily Cost by Service" subtitle={windowLabel}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={dailyByType.data}
              margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e0e0e0"
                vertical={false}
              />
              <XAxis
                dataKey="dateLabel"
                tick={{ fontSize: 10, fill: "#6f6f6f" }}
                tickLine={false}
                axisLine={{ stroke: "#e0e0e0" }}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#6f6f6f" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `$${v.toFixed(0)}`}
                width={55}
              />
              <Tooltip content={<PanelTooltip currency={currency} />} />
              <Legend
                iconType="circle"
                iconSize={7}
                wrapperStyle={{ fontSize: 10, paddingTop: 4 }}
              />
              {dailyByType.types.map((t, i) => (
                <Bar
                  key={t}
                  dataKey={t}
                  stackId="a"
                  fill={
                    TYPE_COLORS[t] ||
                    COST_PART_COLORS[i % COST_PART_COLORS.length]
                  }
                  radius={
                    i === dailyByType.types.length - 1
                      ? [2, 2, 0, 0]
                      : [0, 0, 0, 0]
                  }
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        {/* Donut + table */}
        <Panel
          title="Cost by Service"
          subtitle="breakdown"
          className="dash-panel--donut"
        >
          <div className="dash-donut-wrap">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={typeDonut}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {typeDonut.map((s, i) => (
                    <Cell key={i} fill={s.fill} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v) => toCurrency(v, currency)}
                  contentStyle={{
                    background: "#fff",
                    border: "1px solid #e0e0e0",
                    borderRadius: 4,
                    fontSize: 11,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="dash-donut-legend">
              {typeTable.map((t) => (
                <div key={t.name} className="dash-donut-row">
                  <span
                    className="dash-donut-dot"
                    style={{ background: t.fill }}
                  />
                  <span className="dash-donut-name">{t.name}</span>
                  <span className="dash-donut-cost">
                    {toCurrency(t.value, currency)}
                  </span>
                  <span className="dash-donut-pct">{t.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>

      {/* ── Row 2: Provider bar + Daily by Provider + Daily by Cluster ── */}
      <div className="dash-row dash-row--3col">
        {/* Cost by Provider (horizontal bar) */}
        <Panel title="Cost by Provider" subtitle={windowLabel}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={providerBars}
              layout="vertical"
              margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e0e0e0"
                horizontal={false}
              />
              <XAxis
                type="number"
                tick={{ fontSize: 10, fill: "#6f6f6f" }}
                tickLine={false}
                axisLine={{ stroke: "#e0e0e0" }}
                tickFormatter={(v) => `$${v.toFixed(0)}`}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11, fill: "#161616", fontWeight: 500 }}
                tickLine={false}
                axisLine={false}
                width={60}
              />
              <Tooltip
                formatter={(v) => toCurrency(v, currency)}
                contentStyle={{
                  background: "#fff",
                  border: "1px solid #e0e0e0",
                  borderRadius: 4,
                  fontSize: 11,
                }}
              />
              <Bar
                dataKey="cost"
                radius={[0, 4, 4, 0]}
                maxBarSize={28}
                name="Cost"
              >
                {providerBars.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        {/* Daily Spend by Provider (stacked bar) */}
        <Panel title="Daily Spend by Provider" subtitle={windowLabel}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={dailyByProvider.data}
              margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e0e0e0"
                vertical={false}
              />
              <XAxis
                dataKey="dateLabel"
                tick={{ fontSize: 10, fill: "#6f6f6f" }}
                tickLine={false}
                axisLine={{ stroke: "#e0e0e0" }}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#6f6f6f" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `$${v.toFixed(0)}`}
                width={55}
              />
              <Tooltip content={<PanelTooltip currency={currency} />} />
              <Legend
                iconType="circle"
                iconSize={7}
                wrapperStyle={{ fontSize: 10, paddingTop: 4 }}
              />
              {dailyByProvider.providers.map((p, i) => (
                <Bar
                  key={p}
                  dataKey={p}
                  stackId="b"
                  fill={
                    PROVIDER_COLORS[p] ||
                    COST_PART_COLORS[i % COST_PART_COLORS.length]
                  }
                  radius={
                    i === dailyByProvider.providers.length - 1
                      ? [2, 2, 0, 0]
                      : [0, 0, 0, 0]
                  }
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        {/* Daily Spend by Cluster (stacked bar) */}
        <Panel title="Daily Spend by Cluster" subtitle={windowLabel}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={dailyByCluster.data}
              margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e0e0e0"
                vertical={false}
              />
              <XAxis
                dataKey="dateLabel"
                tick={{ fontSize: 10, fill: "#6f6f6f" }}
                tickLine={false}
                axisLine={{ stroke: "#e0e0e0" }}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#6f6f6f" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `$${v.toFixed(0)}`}
                width={55}
              />
              <Tooltip content={<PanelTooltip currency={currency} />} />
              <Legend
                iconType="circle"
                iconSize={7}
                wrapperStyle={{ fontSize: 10, paddingTop: 4 }}
              />
              {dailyByCluster.clusters.map((c, i) => (
                <Bar
                  key={c}
                  dataKey={c}
                  stackId="c"
                  fill={CLUSTER_COLORS[i % CLUSTER_COLORS.length]}
                  radius={
                    i === dailyByCluster.clusters.length - 1
                      ? [2, 2, 0, 0]
                      : [0, 0, 0, 0]
                  }
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>
    </div>
  );
};

export default AssetsDashboard;
