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

            {/* Cost over time chart */}
            <AssetCostChart
              assets={assets}
              currency={currency}
              windowStr={windowParam}
            />

            {/* Filter pills */}
            <div className="assets-filter-bar">
              {assetTypeTabs
                .filter((t) => t.key === "all" || (typeCounts[t.key] || 0) > 0)
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
