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
import LoadingSkeleton from "../components/assets/LoadingSkeleton";
import AssetsSummaryTiles from "../components/assets/AssetsSummaryTiles";
import AssetCostChart from "../components/assets/AssetCostChart";
import AssetsDashboard from "../components/assets/AssetsDashboard";
import AssetsTable from "../components/assets/AssetsTable";
import AssetsHeaderControls from "../components/assets/AssetsHeaderControls";
import AssetsNotification from "../components/assets/AssetsNotification";
import AssetsFilterBar from "../components/assets/AssetsFilterBar";
import { windowOptions, assetTypeTabs } from "../components/assets/tokens";
import AssetsService from "../services/assets";
import {
  getExchangeRates,
  CURRENCY_OPTIONS,
  FALLBACK_RATES,
} from "../services/currency";
import "../css/assets.css";

const REFRESH_INTERVAL = 60000; // 60 seconds
const MIN_LOADING_DURATION = 250; // ms

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
      const startTime = showLoading ? Date.now() : null;
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
        if (showLoading && startTime !== null) {
          const elapsed = Date.now() - startTime;
          const remaining = Math.max(0, MIN_LOADING_DURATION - elapsed);
          if (remaining > 0) {
            await new Promise((resolve) => setTimeout(resolve, remaining));
          }
        }
        if (mounted.current && showLoading) {
          setLoading(false);
        }
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
        <AssetsHeaderControls
          viewMode={viewMode}
          setViewMode={setViewMode}
          currency={currency}
          handleCurrencyChange={handleCurrencyChange}
          currencyOptions={CURRENCY_OPTIONS}
          ratesLive={ratesLive}
          loading={loading}
          convertedAssets={convertedAssets}
          windowParam={windowParam}
          windowOptions={windowOptions}
          updateParams={updateParams}
          autoRefresh={autoRefresh}
          setAutoRefresh={setAutoRefresh}
          fetchData={fetchData}
        />
      </Header>

      <div className="assets-page">
        <AssetsNotification
          show={isMock && showNotif}
          onDismiss={() => setShowNotif(false)}
        />

        {loading ? (
          <LoadingSkeleton />
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

                <AssetsFilterBar
                  tabs={assetTypeTabs}
                  activeTab={tabParam}
                  typeCounts={typeCounts}
                  onTabSelect={(key) => updateParams({ tab: key })}
                />

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
