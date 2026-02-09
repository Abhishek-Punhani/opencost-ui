import React, {
  useEffect,
  useState,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { useLocation, useNavigate } from "react-router";
import { Loading, Dropdown, Checkbox } from "@carbon/react";

import Page from "../components/Page";
import Header from "../components/Header";
import Footer from "../components/Footer";
import AssetsSummaryTiles from "../components/assets/AssetsSummaryTiles";
import AssetCostChart from "../components/assets/AssetCostChart";
import AssetsDashboard from "../components/assets/AssetsDashboard";
import AssetsTable from "../components/assets/AssetsTable";
import { windowOptions, assetTypeTabs } from "../components/assets/tokens";
import AssetsService from "../services/assets";
import {
  getExchangeRates,
  CURRENCY_OPTIONS,
  FALLBACK_RATES,
} from "../services/currency";
import { toCurrency } from "../util";
import "../css/assets.css";

/**
 * Exports assets data as a CSV file download.
 */
function exportAssetsCSV(assets, currency) {
  const headers = [
    "Name",
    "Type",
    "Provider",
    "Cluster",
    "Total Cost",
    "CPU Cost",
    "RAM Cost",
    "GPU Cost",
    "Start",
    "End",
  ];

  const rows = assets.map((a) => [
    (a.properties?.name || "—").replace(/,/g, " "),
    a.type || "—",
    (a.properties?.provider || "—").replace(/,/g, " "),
    (a.properties?.cluster || "—").replace(/,/g, " "),
    toCurrency(a.totalCost || 0, currency),
    toCurrency(a.cpuCost || 0, currency),
    toCurrency(a.ramCost || 0, currency),
    toCurrency(a.gpuCost || 0, currency),
    a.start || "",
    a.end || "",
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join(
    "\n",
  );

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `assets_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const REFRESH_INTERVAL = 60000; // 60 seconds

const Assets = () => {
  const routerLocation = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(routerLocation.search);

  // URL-driven state
  const windowParam = searchParams.get("window") || windowOptions[0].value;
  const tabParam = searchParams.get("tab") || "all";

  // Component state
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMock, setIsMock] = useState(false);
  const [currency, setCurrency] = useState(
    () => localStorage.getItem("opencost-currency") || "USD",
  );
  const [exchangeRates, setExchangeRates] = useState(FALLBACK_RATES);
  const [ratesLive, setRatesLive] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [viewMode, setViewMode] = useState("table"); // "table" or "dashboard"
  const mounted = useRef(true);

  // Fetch live exchange rates on mount
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

  // Persist currency preference
  const handleCurrencyChange = (newCurrency) => {
    setCurrency(newCurrency);
    localStorage.setItem("opencost-currency", newCurrency);
  };

  // Convert cost values based on selected currency
  const convertedAssets = useMemo(() => {
    const rate = exchangeRates[currency] || 1;
    if (rate === 1) return assets; // USD, no conversion needed
    return assets.map((a) => ({
      ...a,
      totalCost: (a._rawTotalCost ?? a.totalCost ?? 0) * rate,
      cpuCost: (a._rawCpuCost ?? a.cpuCost ?? 0) * rate,
      ramCost: (a._rawRamCost ?? a.ramCost ?? 0) * rate,
      gpuCost: (a._rawGpuCost ?? a.gpuCost ?? 0) * rate,
      // Keep raw USD values for re-conversion
      _rawTotalCost: a._rawTotalCost ?? a.totalCost ?? 0,
      _rawCpuCost: a._rawCpuCost ?? a.cpuCost ?? 0,
      _rawRamCost: a._rawRamCost ?? a.ramCost ?? 0,
      _rawGpuCost: a._rawGpuCost ?? a.gpuCost ?? 0,
    }));
  }, [assets, currency, exchangeRates]);

  // Update URL params without full re-render
  const updateParams = (updates) => {
    const params = new URLSearchParams(routerLocation.search);
    Object.entries(updates).forEach(([k, v]) => {
      if (v === null || v === undefined) {
        params.delete(k);
      } else {
        params.set(k, v);
      }
    });
    navigate(`${routerLocation.pathname}?${params.toString()}`, {
      replace: true,
    });
  };

  // Fetch assets
  const fetchData = useCallback(
    async (showLoading = true) => {
      if (showLoading) setLoading(true);
      try {
        const result = await AssetsService.fetchAssets(windowParam);
        if (!mounted.current) return;

        const raw = result.data;
        let parsed = [];
        if (raw && raw.data && Array.isArray(raw.data) && raw.data.length > 0) {
          const assetMap = raw.data[0];
          parsed = Object.entries(assetMap).map(([key, asset]) => ({
            ...asset,
            _id: key,
          }));
        }

        setAssets(parsed);
        setIsMock(result.isMock);
        setLastUpdated(new Date());
      } catch (err) {
        if (!mounted.current) return;
        console.error("Failed to fetch assets:", err);
        setAssets([]);
      } finally {
        if (mounted.current) setLoading(false);
      }
    },
    [windowParam],
  );

  // Initial fetch and window change
  useEffect(() => {
    mounted.current = true;
    fetchData();
    return () => {
      mounted.current = false;
    };
  }, [fetchData]);

  // Auto-refresh interval
  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => fetchData(false), REFRESH_INTERVAL);
    return () => clearInterval(timer);
  }, [autoRefresh, fetchData]);

  // Filter assets by the active tab
  const filteredAssets = useMemo(() => {
    if (!tabParam || tabParam === "all") return convertedAssets;
    return convertedAssets.filter((a) => a.type === tabParam);
  }, [convertedAssets, tabParam]);

  // Count assets by type for filter buttons
  const typeCounts = useMemo(() => {
    const counts = { all: convertedAssets.length };
    assetTypeTabs.forEach((t) => {
      if (t.key !== "all") {
        counts[t.key] = convertedAssets.filter((a) => a.type === t.key).length;
      }
    });
    return counts;
  }, [convertedAssets]);

  const [showNotif, setShowNotif] = useState(true);

  return (
    <Page>
      <Header headerTitle="Assets">
        <div className="assets-header-controls">
          {/* View mode toggle */}
          <div className="assets-view-toggle">
            <button
              className={`view-toggle-btn ${viewMode === "table" ? "active" : ""}`}
              onClick={() => setViewMode("table")}
              title="Table view"
            >
              <svg
                viewBox="0 0 16 16"
                width="14"
                height="14"
                fill="currentColor"
              >
                <path d="M1 2.5A1.5 1.5 0 012.5 1h11A1.5 1.5 0 0115 2.5v11a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 011 13.5v-11zM2.5 2a.5.5 0 00-.5.5V5h12V2.5a.5.5 0 00-.5-.5h-11zM14 6H2v3h12V6zm0 4H2v3.5a.5.5 0 00.5.5h11a.5.5 0 00.5-.5V10z" />
              </svg>
              <span>Table</span>
            </button>
            <button
              className={`view-toggle-btn ${viewMode === "dashboard" ? "active" : ""}`}
              onClick={() => setViewMode("dashboard")}
              title="Dashboard visualizations"
            >
              <svg
                viewBox="0 0 16 16"
                width="14"
                height="14"
                fill="currentColor"
              >
                <path d="M0 1.5A1.5 1.5 0 011.5 0h3A1.5 1.5 0 016 1.5v3A1.5 1.5 0 014.5 6h-3A1.5 1.5 0 010 4.5v-3zm6.5 0A1.5 1.5 0 018 0h3a1.5 1.5 0 011.5 1.5v3A1.5 1.5 0 0111 6H8a1.5 1.5 0 01-1.5-1.5v-3zM0 8a1.5 1.5 0 011.5-1.5h3A1.5 1.5 0 016 8v3a1.5 1.5 0 01-1.5 1.5h-3A1.5 1.5 0 010 11V8zm6.5 0A1.5 1.5 0 018 6.5h3A1.5 1.5 0 0112.5 8v3a1.5 1.5 0 01-1.5 1.5H8A1.5 1.5 0 016.5 11V8z" />
              </svg>
              <span>Visualizations</span>
            </button>
          </div>

          <div className="assets-header-divider" />

          {/* Currency selector */}
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

          {/* Export CSV */}
          <button
            className="export-csv-btn"
            onClick={() => exportAssetsCSV(convertedAssets, currency)}
            disabled={loading || convertedAssets.length === 0}
            title="Export as CSV"
          >
            <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
              <path d="M4.406 1.342A5.53 5.53 0 0 1 8 0c2.69 0 4.923 2 5.166 4.579C14.758 4.804 16 6.137 16 7.773 16 9.569 14.502 11 12.687 11H10a.5.5 0 0 1 0-1h2.688C13.979 10 15 8.988 15 7.773c0-1.216-1.02-2.228-2.313-2.228h-.5v-.5C12.188 2.825 10.328 1 8 1a4.53 4.53 0 0 0-2.941 1.1c-.757.652-1.153 1.438-1.153 2.055v.448l-.445.049C2.064 4.805 1 5.952 1 7.318 1 8.785 2.23 10 3.781 10H6a.5.5 0 0 1 0 1H3.781C1.708 11 0 9.366 0 7.318c0-1.763 1.266-3.223 2.942-3.593.143-.863.698-1.723 1.464-2.383z" />
              <path d="M7.646 15.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 14.293V5.5a.5.5 0 0 0-1 0v8.793l-2.146-2.147a.5.5 0 0 0-.708.708l3 3z" />
            </svg>
            CSV
          </button>

          <div className="assets-header-divider" />

          <Dropdown
            id="window-selector"
            titleText=""
            label={
              windowOptions.find((w) => w.value === windowParam)?.name ||
              "Select window"
            }
            items={windowOptions}
            itemToString={(item) => (item ? item.name : "")}
            selectedItem={windowOptions.find((w) => w.value === windowParam)}
            onChange={({ selectedItem }) =>
              selectedItem && updateParams({ window: selectedItem.value })
            }
            size="sm"
          />
          <label
            className="assets-refresh-toggle"
            title="Auto-refresh every 60s"
          >
            <Checkbox
              id="auto-refresh-checkbox"
              labelText="Auto-refresh"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
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

      <div className="assets-page">
        {isMock && showNotif && (
          <div className="assets-notification">
            <span className="notif-icon">ℹ</span>
            <span>
              <strong>Demo mode</strong>
              Unable to reach the OpenCost API. Displaying sample data.
            </span>
            <button
              className="notif-dismiss"
              onClick={() => setShowNotif(false)}
            >
              ✕
            </button>
          </div>
        )}

        {loading ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "50px",
            }}
          >
            <Loading description="Loading assets" withOverlay={false} />
          </div>
        ) : assets.length === 0 ? (
          <div className="assets-empty">
            <p>No asset data available for the selected window.</p>
          </div>
        ) : (
          <>
            {/* Cost summary tiles */}
            <AssetsSummaryTiles assets={convertedAssets} currency={currency} />

            {viewMode === "dashboard" ? (
              /* ── Full dashboard visualizations ── */
              <AssetsDashboard
                assets={convertedAssets}
                currency={currency}
                windowStr={windowParam}
              />
            ) : (
              /* ── Table view (default) ── */
              <>
                {/* Cost over time chart */}
                <AssetCostChart
                  assets={convertedAssets}
                  currency={currency}
                  windowStr={windowParam}
                />

                {/* Filter pills */}
                <div className="assets-filter-bar">
                  {assetTypeTabs
                    .filter(
                      (t) => t.key === "all" || (typeCounts[t.key] || 0) > 0,
                    )
                    .map((t) => (
                      <button
                        key={t.key}
                        className={`assets-filter-btn ${tabParam === t.key ? "active" : ""}`}
                        onClick={() => updateParams({ tab: t.key })}
                      >
                        {t.label}
                        <span className="filter-count">
                          {typeCounts[t.key] || 0}
                        </span>
                      </button>
                    ))}
                </div>

                <AssetsTable
                  assets={filteredAssets}
                  currency={currency}
                  windowStr={windowParam}
                />
              </>
            )}

            {lastUpdated && (
              <div className="assets-last-updated">
                Last updated: {lastUpdated.toLocaleTimeString()}
                {autoRefresh && <span className="auto-badge">AUTO</span>}
              </div>
            )}
          </>
        )}
      </div>

      <Footer />
    </Page>
  );
};

export default Assets;
