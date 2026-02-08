import React, {
  useEffect,
  useState,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { useLocation, useNavigate } from "react-router";

import Page from "../components/Page";
import Header from "../components/Header";
import Footer from "../components/Footer";
import AssetsSummaryTiles from "../components/assets/AssetsSummaryTiles";
import AssetCostChart from "../components/assets/AssetCostChart";
import AssetsDashboard from "../components/assets/AssetsDashboard";
import AssetsTable from "../components/assets/AssetsTable";
import { windowOptions, assetTypeTabs } from "../components/assets/tokens";
import AssetsService from "../services/assets";
import "../css/assets.css";

const REFRESH_INTERVAL = 60000; // 60 seconds

const Assets = React.memo(() => {
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
  const [currency] = useState("USD");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [viewMode, setViewMode] = useState("table"); // "table" or "dashboard"
  const mounted = useRef(true);

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
    if (!tabParam || tabParam === "all") return assets;
    return assets.filter((a) => a.type === tabParam);
  }, [assets, tabParam]);

  // Count assets by type for filter buttons
  const typeCounts = useMemo(() => {
    const counts = { all: assets.length };
    assetTypeTabs.forEach((t) => {
      if (t.key !== "all") {
        counts[t.key] = assets.filter((a) => a.type === t.key).length;
      }
    });
    return counts;
  }, [assets]);

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

          <select
            value={windowParam}
            onChange={(e) => updateParams({ window: e.target.value })}
            className="assets-window-select"
          >
            {windowOptions.map((w) => (
              <option key={w.value} value={w.value}>
                {w.name}
              </option>
            ))}
          </select>
          <label
            className="assets-refresh-toggle"
            title="Auto-refresh every 60s"
          >
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            <span className="refresh-label">Auto-refresh</span>
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
          <div className="assets-loading">
            <div className="loading-spinner" />
            Loading assets...
          </div>
        ) : assets.length === 0 ? (
          <div className="assets-empty">
            <p>No asset data available for the selected window.</p>
          </div>
        ) : (
          <>
            {/* Cost summary tiles */}
            <AssetsSummaryTiles assets={assets} currency={currency} />

            {viewMode === "dashboard" ? (
              /* ── Full dashboard visualizations ── */
              <AssetsDashboard
                assets={assets}
                currency={currency}
                windowStr={windowParam}
              />
            ) : (
              /* ── Table view (default) ── */
              <>
                {/* Cost over time chart */}
                <AssetCostChart
                  assets={assets}
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
});

export default Assets;
