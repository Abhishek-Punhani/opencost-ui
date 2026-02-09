import React, {
  useEffect,
  useState,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { useLocation, useNavigate } from "react-router";
import { Dropdown, Checkbox, Button } from "@carbon/react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from "recharts";

import Page from "../components/Page";
import Header from "../components/Header";
import Footer from "../components/Footer";
import AllocationSkeleton from "../components/AllocationSkeleton";
import { ArrowLeft } from "@carbon/icons-react";
import AllocationService from "../services/allocation.service";
import {
  rangeToCumulative,
  cumulativeToTotals,
  parseFilters,
  parseFiltersFromUrl,
  toCurrency,
} from "../util";
import {
  getExchangeRates,
  CURRENCY_OPTIONS,
  FALLBACK_RATES,
} from "../services/currency";
import "../css/allocations.css";

/* ── Constants ─────────────────────────────────────── */

const windowOptions = [
  { name: "Entire window", value: "month" },
  { name: "Today", value: "today" },
  { name: "Yesterday", value: "yesterday" },
  { name: "Last 24h", value: "24h" },
  { name: "Last 48h", value: "48h" },
  { name: "Week-to-date", value: "week" },
  { name: "Last week", value: "lastweek" },
  { name: "Last 7 days", value: "7d" },
  { name: "Last 14 days", value: "14d" },
];

const aggregationOptions = [
  { name: "Namespace", value: "namespace" },
  { name: "Cluster", value: "cluster" },
  { name: "Node", value: "node" },
  { name: "Controller Kind", value: "controllerKind" },
  { name: "Controller", value: "controller" },
  { name: "Pod", value: "pod" },
  { name: "Container", value: "container" },
];

const ALLOC_COLORS = [
  "#0f62fe",
  "#009d9a",
  "#8a3ffc",
  "#d12771",
  "#ee5396",
  "#1192e8",
  "#fa4d56",
  "#42be65",
  "#6929c4",
  "#ff832b",
  "#b28600",
  "#a56eff",
];

const COST_COLORS = {
  cpuCost: "#0f62fe",
  gpuCost: "#8a3ffc",
  ramCost: "#009d9a",
  pvCost: "#1192e8",
  networkCost: "#ee5396",
};

const REFRESH_INTERVAL = 60000;

const drilldownHierarchy = {
  namespace: "controllerKind",
  controllerKind: "controller",
  controller: "pod",
  pod: "container",
};

const filterPropertyMap = {
  namespace: "namespace",
  controllerKind: "controllerKind",
  controller: "controllerName",
  pod: "pod",
  container: "container",
};

/* ── CSV export ────────────────────────────────────── */

function exportAllocationCSV(data, currency) {
  const headers = [
    "Name",
    "CPU",
    "GPU",
    "RAM",
    "PV",
    "Network",
    "Shared",
    "Efficiency",
    "Total Cost",
  ];
  const rows = data.map((a) => [
    (a.name || "").replace(/,/g, " "),
    toCurrency(a.cpuCost || 0, currency),
    toCurrency(a.gpuCost || 0, currency),
    toCurrency(a.ramCost || 0, currency),
    toCurrency(a.pvCost || 0, currency),
    toCurrency(a.networkCost || 0, currency),
    toCurrency(a.sharedCost || 0, currency),
    a.totalEfficiency ? `${(a.totalEfficiency * 100).toFixed(1)}%` : "—",
    toCurrency(a.totalCost || 0, currency),
  ]);
  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `allocations_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/* ── Chart tooltip ─────────────────────────────────── */

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

/* ── Summary Tiles ─────────────────────────────────── */

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

/* ── Cost Chart ────────────────────────────────────── */

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
    allocationData.forEach((set) => set.forEach((a) => nameSet.add(a.name)));
    const sortedNames = [...nameSet].sort((a, b) => {
      const tA = cumData.find((c) => c.name === a)?.totalCost || 0;
      const tB = cumData.find((c) => c.name === b)?.totalCost || 0;
      return tB - tA;
    });
    const topNames = sortedNames.slice(0, 8);
    const hasOther = sortedNames.length > 8;

    const data = allocationData.map((set, i) => {
      const startStr = set[0]?.start || set[0]?.window?.start || "";
      const dateLabel = startStr
        ? new Date(startStr).toLocaleDateString(navigator.language, {
            month: "short",
            day: "numeric",
            timeZone: "UTC",
          })
        : `Day ${i + 1}`;
      const point = { dateLabel };
      let otherCost = 0;
      set.forEach((a) => {
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

/* ── Table ──────────────────────────────────────────── */

const AllocationTable = ({
  cumData,
  currency,
  aggregateBy,
  onDrilldown,
  onRowClick,
}) => {
  const [sortBy, setSortBy] = useState("totalCost");
  const [sortDir, setSortDir] = useState("desc");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const canDrill = !!drilldownHierarchy[aggregateBy];

  const sorted = useMemo(() => {
    let items = [...cumData];
    if (search) {
      const q = search.toLowerCase();
      items = items.filter((a) => (a.name || "").toLowerCase().includes(q));
    }
    items.sort((a, b) => {
      const va = a[sortBy] ?? 0;
      const vb = b[sortBy] ?? 0;
      return sortDir === "desc" ? (vb > va ? 1 : -1) : va > vb ? 1 : -1;
    });
    return items;
  }, [cumData, sortBy, sortDir, search]);

  const totalRow = useMemo(
    () => ({
      name: "Totals",
      cpuCost: cumData.reduce((s, a) => s + (a.cpuCost || 0), 0),
      gpuCost: cumData.reduce((s, a) => s + (a.gpuCost || 0), 0),
      ramCost: cumData.reduce((s, a) => s + (a.ramCost || 0), 0),
      pvCost: cumData.reduce((s, a) => s + (a.pvCost || 0), 0),
      totalEfficiency: (() => {
        const eff = cumData.filter(
          (a) => a.name !== "__idle__" && a.totalEfficiency > 0,
        );
        return eff.length
          ? eff.reduce((s, a) => s + a.totalEfficiency, 0) / eff.length
          : 0;
      })(),
      totalCost: cumData.reduce((s, a) => s + (a.totalCost || 0), 0),
    }),
    [cumData],
  );

  const paged = sorted.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
  const totalPages = Math.ceil(sorted.length / rowsPerPage);

  const cols = [
    { key: "name", label: "Name", align: "left" },
    { key: "cpuCost", label: "CPU", align: "right" },
    { key: "gpuCost", label: "GPU", align: "right" },
    { key: "ramCost", label: "RAM", align: "right" },
    { key: "pvCost", label: "PV", align: "right" },
    { key: "totalEfficiency", label: "Efficiency", align: "right" },
    { key: "totalCost", label: "Total Cost", align: "right" },
  ];

  const handleSort = (key) => {
    if (sortBy === key) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else {
      setSortBy(key);
      setSortDir("desc");
    }
  };

  const isSpecial = (name) =>
    ["__idle__", "__unallocated__", "__unmounted__"].includes(name);

  const handleRowClick = (a) => {
    const special = isSpecial(a.name);
    if (special) return;
    // Always open detail view on row click
    onRowClick(a);
  };

  const handleDrillClick = (e, a) => {
    e.stopPropagation();
    onDrilldown(a);
  };

  return (
    <div className="alloc-table-wrap">
      <div className="alloc-table-toolbar">
        <div className="alloc-table-search">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85zm-5.242.156a5 5 0 1 1 0-10 5 5 0 0 1 0 10z" />
          </svg>
          <input
            placeholder={`Search ${aggregateBy}s…`}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />
        </div>
        <span className="alloc-table-count">{sorted.length} items</span>
      </div>

      <div className="table-scroll">
        <table className="alloc-tbl">
          <thead>
            <tr>
              {cols.map((c) => (
                <th
                  key={c.key}
                  className={c.align === "right" ? "th-right" : ""}
                  onClick={() => handleSort(c.key)}
                >
                  <span className="th-inner">
                    {c.label}
                    <span
                      className={`sort-arrow ${sortBy === c.key ? "active" : ""}`}
                    >
                      {sortBy === c.key
                        ? sortDir === "desc"
                          ? "↓"
                          : "↑"
                        : "↕"}
                    </span>
                  </span>
                </th>
              ))}
              <th className="th-action" />
            </tr>
          </thead>
          <tbody>
            {/* Totals row */}
            <tr className="alloc-tbl-row alloc-tbl-row--total">
              <td>
                <span className="alloc-name alloc-name--total">Totals</span>
              </td>
              <td className="alloc-td-cost">
                {toCurrency(totalRow.cpuCost, currency)}
              </td>
              <td className="alloc-td-cost">
                {toCurrency(totalRow.gpuCost, currency)}
              </td>
              <td className="alloc-td-cost">
                {toCurrency(totalRow.ramCost, currency)}
              </td>
              <td className="alloc-td-cost">
                {toCurrency(totalRow.pvCost, currency)}
              </td>
              <td className="alloc-td-cost">
                {totalRow.totalEfficiency > 0
                  ? `${(totalRow.totalEfficiency * 100).toFixed(1)}%`
                  : "—"}
              </td>
              <td className="alloc-td-cost alloc-td-cost--total">
                {toCurrency(totalRow.totalCost, currency)}
              </td>
              <td />
            </tr>
            {paged.map((a) => {
              const special = isSpecial(a.name);
              const clickable = !special;
              return (
                <tr
                  key={a.name}
                  className={`alloc-tbl-row ${special ? "alloc-tbl-row--special" : ""} ${clickable ? "alloc-tbl-row--clickable" : ""}`}
                  onClick={() => handleRowClick(a)}
                >
                  <td className="alloc-td-name">
                    <span className="alloc-name">{a.name}</span>
                  </td>
                  <td className="alloc-td-cost">
                    {toCurrency(a.cpuCost || 0, currency)}
                  </td>
                  <td className="alloc-td-cost">
                    {toCurrency(a.gpuCost || 0, currency)}
                  </td>
                  <td className="alloc-td-cost">
                    {toCurrency(a.ramCost || 0, currency)}
                  </td>
                  <td className="alloc-td-cost">
                    {toCurrency(a.pvCost || 0, currency)}
                  </td>
                  <td className="alloc-td-cost">
                    {a.totalEfficiency > 0
                      ? `${(a.totalEfficiency * 100).toFixed(1)}%`
                      : "—"}
                  </td>
                  <td className="alloc-td-cost">
                    {toCurrency(a.totalCost || 0, currency)}
                  </td>
                  <td className="alloc-td-arrow">
                    {clickable && canDrill ? (
                      <button
                        className="alloc-drill-btn"
                        onClick={(e) => handleDrillClick(e, a)}
                        title={`Drill down into ${a.name}`}
                      >
                        ⬊
                      </button>
                    ) : clickable ? (
                      "›"
                    ) : (
                      ""
                    )}
                  </td>
                </tr>
              );
            })}
            {paged.length === 0 && (
              <tr>
                <td colSpan={8} className="alloc-td-empty">
                  No results found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="alloc-tbl-pagination">
          <span className="alloc-pg-info">
            {page * rowsPerPage + 1}–
            {Math.min((page + 1) * rowsPerPage, sorted.length)} of{" "}
            {sorted.length}
          </span>
          <div className="alloc-pg-controls">
            <select
              className="alloc-pg-select"
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setPage(0);
              }}
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n} / page
                </option>
              ))}
            </select>
            <button
              className="alloc-pg-btn"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              ‹
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let pageNum;
              if (totalPages <= 7) pageNum = i;
              else if (page < 4) pageNum = i;
              else if (page > totalPages - 4) pageNum = totalPages - 7 + i;
              else pageNum = page - 3 + i;
              return (
                <button
                  key={pageNum}
                  className={`alloc-pg-btn ${page === pageNum ? "alloc-pg-active" : ""}`}
                  onClick={() => setPage(pageNum)}
                >
                  {pageNum + 1}
                </button>
              );
            })}
            <button
              className="alloc-pg-btn"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Breadcrumbs ───────────────────────────────────── */

const Breadcrumbs = ({ filters, aggregateBy, onNavigate }) => {
  if (!filters || filters.length === 0) return null;
  return (
    <div className="alloc-breadcrumbs">
      <button className="alloc-bc-item" onClick={() => onNavigate(-1)}>
        All Results
      </button>
      {filters.map((f, i) => (
        <React.Fragment key={i}>
          <span className="alloc-bc-sep">›</span>
          <button
            className="alloc-bc-item alloc-bc-item--active"
            onClick={() => onNavigate(i)}
          >
            {f.value}
          </button>
        </React.Fragment>
      ))}
      <span className="alloc-bc-sep">›</span>
      <span className="alloc-bc-current">{aggregateBy}</span>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════
   Detail Page
   ═══════════════════════════════════════════════════════ */

const AllocationDetail = ({
  alloc,
  allocationData,
  currency,
  aggregateBy,
  onBack,
}) => {
  // Build daily cost trend for this allocation
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

      {/* Cost cards */}
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

      {/* Charts row */}
      <div className="alloc-detail-charts">
        {/* Daily cost trend */}
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

        {/* Cost breakdown donut */}
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

      {/* Efficiency bars */}
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

      {/* Cost comparison visualization */}
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

      {/* Properties info */}
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

      {/* Resource metrics */}
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

/* ═══════════════════════════════════════════════════════
   Main Page
   ═══════════════════════════════════════════════════════ */

const Allocations = () => {
  const routerLocation = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(routerLocation.search);

  // URL-driven state
  const windowParam = searchParams.get("window") || "7d";
  const aggregateBy = searchParams.get("agg") || "namespace";
  const accumulate = searchParams.get("acc") === "true";
  const filterParam = searchParams.get("filter");

  const filters = useMemo(
    () => (filterParam ? parseFiltersFromUrl(filterParam) : []),
    [filterParam],
  );

  // Component state
  const [allocationData, setAllocationData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMock, setIsMock] = useState(false);
  const [includeIdle, setIncludeIdle] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [currency, setCurrency] = useState(
    () => localStorage.getItem("opencost-currency") || "USD",
  );
  const [exchangeRates, setExchangeRates] = useState(FALLBACK_RATES);
  const [ratesLive, setRatesLive] = useState(false);
  const [showNotif, setShowNotif] = useState(true);
  const [selectedAlloc, setSelectedAlloc] = useState(null);
  const mounted = useRef(true);

  // Fetch exchange rates
  useEffect(() => {
    let cancelled = false;
    getExchangeRates().then(({ rates, isLive }) => {
      if (cancelled) return;
      setExchangeRates(rates);
      setRatesLive(isLive);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCurrencyChange = (c) => {
    setCurrency(c);
    localStorage.setItem("opencost-currency", c);
  };

  // Compute cumulative data
  const cumData = useMemo(() => {
    const cum = rangeToCumulative(allocationData, aggregateBy);
    return cum ? Object.values(cum) : [];
  }, [allocationData, aggregateBy]);

  // Currency conversion
  const convertedCumData = useMemo(() => {
    const rate = exchangeRates[currency] || 1;
    if (rate === 1) return cumData;
    return cumData.map((a) => ({
      ...a,
      cpuCost: (a.cpuCost || 0) * rate,
      gpuCost: (a.gpuCost || 0) * rate,
      ramCost: (a.ramCost || 0) * rate,
      pvCost: (a.pvCost || 0) * rate,
      networkCost: (a.networkCost || 0) * rate,
      sharedCost: (a.sharedCost || 0) * rate,
      externalCost: (a.externalCost || 0) * rate,
      totalCost: (a.totalCost || 0) * rate,
    }));
  }, [cumData, currency, exchangeRates]);

  const updateParams = (updates) => {
    const params = new URLSearchParams(routerLocation.search);
    Object.entries(updates).forEach(([k, v]) => {
      if (v === null || v === undefined) params.delete(k);
      else params.set(k, v);
    });
    navigate(`${routerLocation.pathname}?${params.toString()}`, {
      replace: true,
    });
  };

  // Fetch data
  const fetchData = useCallback(
    async (showLoading = true) => {
      if (showLoading) setLoading(true);
      try {
        const resp = await AllocationService.fetchAllocation(
          windowParam,
          aggregateBy,
          {
            accumulate,
            filters,
            includeIdle,
          },
        );
        if (!mounted.current) return;
        if (resp.data && resp.data.length > 0) {
          setAllocationData(resp.data);
        } else {
          setAllocationData([]);
        }
        setIsMock(!!resp.isMock);
        setLastUpdated(new Date());
      } catch (err) {
        if (!mounted.current) return;
        console.error("Failed to fetch allocations:", err);
        setAllocationData([]);
      } finally {
        if (mounted.current) setLoading(false);
      }
    },
    [windowParam, aggregateBy, accumulate, filters, includeIdle],
  );

  useEffect(() => {
    mounted.current = true;
    setSelectedAlloc(null);
    fetchData();
    return () => {
      mounted.current = false;
    };
  }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => fetchData(false), REFRESH_INTERVAL);
    return () => clearInterval(timer);
  }, [autoRefresh, fetchData]);

  // Drilldown
  function drilldown(row) {
    const nextAgg = drilldownHierarchy[aggregateBy];
    if (!nextAgg || !row.name || row.name.trim() === "") return;

    const filterProperty = filterPropertyMap[aggregateBy] || aggregateBy;
    let filterValue = String(row.name).trim();
    let updatedFilters = [...filters];

    // Handle controller "kind:name" format
    if (aggregateBy === "controller" && filterValue.includes(":")) {
      const [maybeKind, ...nameParts] = filterValue.split(":");
      const trimmedName = nameParts.join(":").trim();
      if (trimmedName.length > 0) filterValue = trimmedName;
      const normalizedKind = maybeKind.trim();
      if (
        normalizedKind.length > 0 &&
        !updatedFilters.some((f) => f.property === "controllerKind")
      ) {
        updatedFilters = [
          ...updatedFilters,
          { property: "controllerKind", value: normalizedKind },
        ];
      }
    }

    const newFilters = [
      ...updatedFilters,
      { property: filterProperty, value: filterValue },
    ];
    const newParams = new URLSearchParams(routerLocation.search);
    newParams.set("agg", nextAgg);
    newParams.set("filter", parseFilters(newFilters));
    navigate({ search: `?${newParams.toString()}` });
  }

  // Breadcrumb navigation
  function handleBreadcrumbNavigate(level) {
    const aggregateHierarchy = [
      "namespace",
      "controllerKind",
      "controller",
      "pod",
      "container",
    ];
    if (level === -1) {
      const p = new URLSearchParams(routerLocation.search);
      p.set("agg", "namespace");
      p.delete("filter");
      navigate({ search: `?${p.toString()}` });
      return;
    }
    const trimmedFilters = filters.slice(0, level + 1);
    const targetAgg = aggregateHierarchy[trimmedFilters.length] || "namespace";
    const p = new URLSearchParams(routerLocation.search);
    p.set("agg", targetAgg);
    if (trimmedFilters.length > 0)
      p.set("filter", parseFilters(trimmedFilters));
    else p.delete("filter");
    navigate({ search: `?${p.toString()}` });
  }

  // Labels
  const windowLabel =
    windowOptions.find((w) => w.value === windowParam)?.name || windowParam;
  const aggLabel =
    aggregationOptions.find((a) => a.value === aggregateBy)?.name ||
    aggregateBy;
  const title = `${windowLabel} by ${aggLabel.toLowerCase()}${!accumulate ? " daily" : ""}`;

  // Detail view
  if (selectedAlloc) {
    return (
      <Page active="reports.html">
        <Header headerTitle="Cost Allocation" />
        <div className="alloc-page">
          <AllocationDetail
            alloc={selectedAlloc}
            allocationData={allocationData}
            currency={currency}
            aggregateBy={aggregateBy}
            onBack={() => setSelectedAlloc(null)}
          />
        </div>
        <Footer />
      </Page>
    );
  }

  return (
    <Page active="reports.html">
      <Header headerTitle="Cost Allocation">
        <div className="alloc-header-controls">
          {/* Currency */}
          <select
            value={currency}
            onChange={(e) => handleCurrencyChange(e.target.value)}
            className="currency-select"
            title={
              ratesLive
                ? "Live exchange rates (ECB)"
                : "Offline rates (approximate)"
            }
          >
            {CURRENCY_OPTIONS.map((c) => (
              <option key={c.code} value={c.code}>
                {c.symbol} {c.code}
              </option>
            ))}
          </select>
          {!ratesLive && currency !== "USD" && (
            <span
              className="rates-badge"
              title="Using approximate offline rates"
            >
              ≈
            </span>
          )}

          {/* CSV */}
          <button
            className="export-csv-btn"
            onClick={() => exportAllocationCSV(convertedCumData, currency)}
            disabled={loading || convertedCumData.length === 0}
            title="Export as CSV"
          >
            <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
              <path d="M4.406 1.342A5.53 5.53 0 0 1 8 0c2.69 0 4.923 2 5.166 4.579C14.758 4.804 16 6.137 16 7.773 16 9.569 14.502 11 12.687 11H10a.5.5 0 0 1 0-1h2.688C13.979 10 15 8.988 15 7.773c0-1.216-1.02-2.228-2.313-2.228h-.5v-.5C12.188 2.825 10.328 1 8 1a4.53 4.53 0 0 0-2.941 1.1c-.757.652-1.153 1.438-1.153 2.055v.448l-.445.049C2.064 4.805 1 5.952 1 7.318 1 8.785 2.23 10 3.781 10H6a.5.5 0 0 1 0 1H3.781C1.708 11 0 9.366 0 7.318c0-1.763 1.266-3.223 2.942-3.593.143-.863.698-1.723 1.464-2.383z" />
              <path d="M7.646 15.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 14.293V5.5a.5.5 0 0 0-1 0v8.793l-2.146-2.147a.5.5 0 0 0-.708.708l3 3z" />
            </svg>
            CSV
          </button>

          <div className="alloc-header-divider" />

          {/* Window */}
          <Dropdown
            id="alloc-window"
            titleText=""
            label={windowLabel}
            items={windowOptions}
            itemToString={(i) => (i ? i.name : "")}
            selectedItem={windowOptions.find((w) => w.value === windowParam)}
            onChange={({ selectedItem }) =>
              selectedItem && updateParams({ window: selectedItem.value })
            }
            size="sm"
          />

          {/* Breakdown */}
          <Dropdown
            id="alloc-agg"
            titleText=""
            label={aggLabel}
            items={aggregationOptions}
            itemToString={(i) => (i ? i.name : "")}
            selectedItem={aggregationOptions.find(
              (a) => a.value === aggregateBy,
            )}
            onChange={({ selectedItem }) => {
              if (!selectedItem) return;
              const p = new URLSearchParams(routerLocation.search);
              p.set("agg", selectedItem.value);
              p.delete("filter");
              navigate({ search: `?${p.toString()}` });
            }}
            size="sm"
          />

          <div className="alloc-header-divider" />

          <Checkbox
            id="alloc-idle"
            labelText="Include idle"
            checked={includeIdle}
            onChange={(_, { checked }) => setIncludeIdle(checked)}
          />
          <Checkbox
            id="alloc-autorefresh"
            labelText="Auto-refresh"
            checked={autoRefresh}
            onChange={(_, { checked }) => setAutoRefresh(checked)}
          />

          <button
            className="assets-refresh-btn"
            onClick={() => fetchData(true)}
            title="Refresh now"
          >
            ↻
          </button>
        </div>
      </Header>

      <div className="alloc-page">
        {isMock && showNotif && (
          <div className="alloc-notification">
            <span className="alloc-notif-icon">ℹ</span>
            <span>
              <strong>Demo mode</strong> — Unable to reach the OpenCost API.
              Displaying sample data.
            </span>
            <button
              className="alloc-notif-dismiss"
              onClick={() => setShowNotif(false)}
            >
              ✕
            </button>
          </div>
        )}

        {loading ? (
          <AllocationSkeleton />
        ) : convertedCumData.length === 0 ? (
          <div className="alloc-empty">
            <p>No allocation data available for the selected window.</p>
          </div>
        ) : (
          <>
            {/* Title & Breadcrumbs */}
            <div className="alloc-subtitle-row">
              <div>
                <h2 className="alloc-title">{title}</h2>
                <Breadcrumbs
                  filters={filters}
                  aggregateBy={aggregateBy}
                  onNavigate={handleBreadcrumbNavigate}
                />
              </div>
            </div>

            <SummaryTiles cumData={convertedCumData} currency={currency} />

            <AllocationCostChart
              allocationData={allocationData}
              cumData={convertedCumData}
              currency={currency}
              aggregateBy={aggregateBy}
              accumulate={accumulate}
              onAccumulateChange={(val) => updateParams({ acc: String(val) })}
            />

            <AllocationTable
              cumData={convertedCumData}
              currency={currency}
              aggregateBy={aggregateBy}
              onDrilldown={drilldown}
              onRowClick={(row) => setSelectedAlloc(row)}
            />

            {lastUpdated && (
              <div className="alloc-last-updated">
                Last updated: {lastUpdated.toLocaleTimeString()}
                {autoRefresh && <span className="alloc-auto-badge">AUTO</span>}
              </div>
            )}
          </>
        )}
      </div>
      <Footer />
    </Page>
  );
};

export default Allocations;
