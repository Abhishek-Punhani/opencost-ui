import React, { useEffect, useState, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router";

import Page from "../components/Page";
import Header from "../components/Header";
import Footer from "../components/Footer";
import AssetsSummaryTiles from "../components/assets/AssetsSummaryTiles";
import AssetsTable from "../components/assets/AssetsTable";
import { windowOptions, assetTypeTabs } from "../components/assets/tokens";
import AssetsService from "../services/assets";
import "../css/assets.css";

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

  // Fetch assets when window changes
  useEffect(() => {
    mounted.current = true;

    async function fetchData() {
      setLoading(true);
      try {
        const result = await AssetsService.fetchAssets(windowParam);
        if (!mounted.current) return;

        // The API returns { code, data: [ { assetKey: assetObj, ... } ] }
        // Convert the flat object into an array with _id set from the key
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
      } catch (err) {
        if (!mounted.current) return;
        console.error("Failed to fetch assets:", err);
        setAssets([]);
      } finally {
        if (mounted.current) setLoading(false);
      }
    }

    fetchData();

    return () => {
      mounted.current = false;
    };
  }, [windowParam]);

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

  // Find selected window option for dropdown
  const selectedWindow = useMemo(
    () =>
      windowOptions.find((w) => w.value === windowParam) || windowOptions[0],
    [windowParam],
  );

  const [showNotif, setShowNotif] = useState(true);

  return (
    <Page>
      <Header headerTitle="Assets">
        <select
          value={windowParam}
          onChange={(e) => updateParams({ window: e.target.value })}
          style={{
            border: "1px solid #d0d5dd",
            borderRadius: 4,
            padding: "6px 12px",
            fontSize: "0.8125rem",
            fontFamily: "inherit",
            color: "#161616",
            background: "#fff",
            cursor: "pointer",
          }}
        >
          {windowOptions.map((w) => (
            <option key={w.value} value={w.value}>
              {w.name}
            </option>
          ))}
        </select>
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
            <AssetsSummaryTiles
              assets={assets}
              currency={currency}
              activeTab={tabParam}
              onTabChange={(key) => updateParams({ tab: key })}
            />

            {/* Filter pills — Grafana style */}
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

            <AssetsTable assets={filteredAssets} currency={currency} />
          </>
        )}
      </div>

      <Footer />
    </Page>
  );
});

export default Assets;
