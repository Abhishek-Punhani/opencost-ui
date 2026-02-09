import React, {
  useEffect,
  useState,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { useLocation, useNavigate } from "react-router";
import { Dropdown } from "@carbon/react";
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
import AllocationService from "../services/allocation.service";
import {
  rangeToCumulative,
  parseFilters,
  parseFiltersFromUrl,
  toCurrency,
} from "../util";
import {
  getExchangeRates,
  CURRENCY_OPTIONS,
  FALLBACK_RATES,
} from "../services/currency";
import {
  REFRESH_INTERVAL,
  drilldownHierarchy,
  filterPropertyMap,
} from "../components/allocations/constants";
import AllocationCostChart from "../components/allocations/AllocationCostChart";
import AllocationTable from "../components/allocations/AllocationTable";
import AllocationDetail from "../components/allocations/AllocationDetail";
import Breadcrumbs from "../components/allocations/Breadcrumbs";
import SummaryTiles from "../components/allocations/SummaryTiles";
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

          <label
            className="alloc-header-check"
            title="Include idle cost allocations"
          >
            <input
              type="checkbox"
              checked={includeIdle}
              onChange={(e) => setIncludeIdle(e.target.checked)}
            />
            <span>Idle</span>
          </label>

          <label className="alloc-header-check" title="Auto-refresh every 60s">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            <span>Auto-refresh</span>
          </label>

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
