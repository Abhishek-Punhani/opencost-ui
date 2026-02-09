import React, { useMemo, useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
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
} from "recharts";
import { toCurrency } from "../../util";
import Page from "../Page";
import Header from "../Header";
import Footer from "../Footer";
import AssetsService from "../../services/assets";
import "../../css/assets.css";

const TYPE_COLORS = {
  Node: "#0f62fe",
  Disk: "#009d9a",
  LoadBalancer: "#8a3ffc",
  Network: "#1192e8",
  ClusterManagement: "#8d8d8d",
  Cloud: "#d12771",
};

const COST_COLORS = {
  cpuCost: "#0f62fe",
  ramCost: "#009d9a",
  gpuCost: "#8a3ffc",
  storageCost: "#1192e8",
  networkCost: "#ee5396",
  lbCost: "#6929c4",
  adjustment: "#fa4d56",
  credit: "#42be65",
};

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return "0 B";
  const units = ["B", "KiB", "MiB", "GiB", "TiB", "PiB"];
  let i = 0;
  let val = bytes;
  while (val >= 1024 && i < units.length - 1) {
    val /= 1024;
    i++;
  }
  return `${val.toFixed(val >= 100 ? 0 : val >= 10 ? 1 : 2)} ${units[i]}`;
}

function formatMinutes(mins) {
  if (!mins || mins <= 0) return "—";
  const days = Math.floor(mins / 1440);
  const hours = Math.floor((mins % 1440) / 60);
  const minutes = Math.round(mins % 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/**
 * UtilizationBar component for the detail view.
 */
const UtilizationBar = ({ breakdown, label }) => {
  if (!breakdown) return null;
  const user = Math.round((breakdown.user || 0) * 100);
  const system = Math.round((breakdown.system || 0) * 100);
  const idle = 100 - user - system;

  return (
    <div className="detail-util-container">
      <div className="detail-util-header">
        <span>{label}</span>
        <span className="detail-util-pct">{user + system}%</span>
      </div>
      <div className="detail-util-bar">
        <div className="bar-seg bar-seg--user" style={{ width: `${user}%` }} />
        <div
          className="bar-seg bar-seg--system"
          style={{ width: `${system}%` }}
        />
        <div className="bar-seg bar-seg--idle" style={{ width: `${idle}%` }} />
      </div>
      <div className="detail-util-legend">
        <span className="leg-user">User {user}%</span>
        <span className="leg-system">System {system}%</span>
        <span className="leg-idle">Idle {idle}%</span>
      </div>
    </div>
  );
};

/**
 * Cost breakdown donut chart for the asset detail page.
 */
const CostDonut = ({ asset, currency }) => {
  const slices = [];

  if (asset.cpuCost > 0)
    slices.push({
      name: "CPU",
      value: asset.cpuCost,
      fill: COST_COLORS.cpuCost,
    });
  if (asset.ramCost > 0)
    slices.push({
      name: "RAM",
      value: asset.ramCost,
      fill: COST_COLORS.ramCost,
    });
  if (asset.gpuCost > 0)
    slices.push({
      name: "GPU",
      value: asset.gpuCost,
      fill: COST_COLORS.gpuCost,
    });
  if (asset.type === "Disk" && asset.totalCost > 0)
    slices.push({
      name: "Storage",
      value: asset.totalCost,
      fill: COST_COLORS.storageCost,
    });
  if (asset.type === "LoadBalancer" && asset.totalCost > 0)
    slices.push({
      name: "LB",
      value: asset.totalCost,
      fill: COST_COLORS.lbCost,
    });

  // For generic types, just show total
  if (slices.length === 0 && asset.totalCost > 0) {
    slices.push({
      name: asset.type,
      value: asset.totalCost,
      fill: TYPE_COLORS[asset.type] || "#6f6f6f",
    });
  }

  if (slices.length === 0) return null;

  return (
    <div className="detail-donut">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={slices}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
            strokeWidth={0}
          >
            {slices.map((s, i) => (
              <Cell key={i} fill={s.fill} />
            ))}
          </Pie>
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(name) => (
              <span style={{ fontSize: 11, color: "#525252" }}>{name}</span>
            )}
          />
          <Tooltip
            formatter={(val) => toCurrency(val, currency)}
            contentStyle={{
              background: "#fff",
              border: "1px solid #e0e0e0",
              borderRadius: 4,
              fontSize: 12,
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

/**
 * Daily cost trend for a single asset.
 * Uses real dailyCosts when available, otherwise generates 7-day synthetic data.
 */
const AssetCostTrend = ({ asset, currency, windowStr }) => {
  const data = useMemo(() => {
    // Use real timestamped dailyCosts if available
    if (asset.dailyCosts && asset.dailyCosts.length > 1) {
      return asset.dailyCosts.map((dc) => ({
        date: new Date(dc.date + "T00:00:00Z").toLocaleDateString(
          navigator.language,
          {
            month: "short",
            day: "numeric",
            timeZone: "UTC",
          },
        ),
        cost: dc.cost,
      }));
    }

    // Synthetic fallback — always at least 7 days
    const days = 7;
    const dailyCost = (asset.totalCost || 0) / days;
    const now = new Date();

    return Array.from({ length: days }, (_, i) => {
      const date = new Date(now);
      date.setDate(date.getDate() - (days - 1 - i));
      const variance = 1 + Math.sin(i * 2.1) * 0.12;
      return {
        date: date.toLocaleDateString(navigator.language, {
          month: "short",
          day: "numeric",
          timeZone: "UTC",
        }),
        cost: Number((dailyCost * variance).toFixed(4)),
      };
    });
  }, [asset, windowStr]);

  return (
    <div className="detail-trend-chart">
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#e0e0e0"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "#6f6f6f" }}
            tickLine={false}
            axisLine={{ stroke: "#e0e0e0" }}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#6f6f6f" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `$${v.toFixed(1)}`}
            width={50}
          />
          <Tooltip
            formatter={(val) => toCurrency(val, currency)}
            contentStyle={{
              background: "#fff",
              border: "1px solid #e0e0e0",
              borderRadius: 4,
              fontSize: 12,
            }}
          />
          <Bar
            dataKey="cost"
            fill={TYPE_COLORS[asset.type] || "#0f62fe"}
            radius={[3, 3, 0, 0]}
            maxBarSize={40}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

/**
 * AssetDetail — full-page detail view for a single asset.
 * Receives asset data via location state, OR fetches it from the API
 * when navigated to directly (deep-link / bookmark support).
 */
const AssetDetail = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { id: routeId } = useParams();

  // Try location.state first (from in-app navigation)
  const stateAsset = location.state?.asset;
  const stateCurrency = location.state?.currency || "USD";
  const stateWindow = location.state?.windowStr || "7d";

  const [asset, setAsset] = useState(stateAsset || null);
  const [currency, setCurrency] = useState(stateCurrency);
  const [windowStr, setWindowStr] = useState(stateWindow);
  const [fetchLoading, setFetchLoading] = useState(!stateAsset);
  const [fetchError, setFetchError] = useState(false);

  // When no state is passed (direct navigation), fetch asset by ID
  useEffect(() => {
    if (stateAsset || !routeId) return;

    let cancelled = false;
    setFetchLoading(true);
    setFetchError(false);

    AssetsService.fetchAssetById(decodeURIComponent(routeId), "7d")
      .then(({ asset: fetched }) => {
        if (cancelled) return;
        if (fetched) {
          setAsset(fetched);
        } else {
          setFetchError(true);
        }
      })
      .catch(() => {
        if (!cancelled) setFetchError(true);
      })
      .finally(() => {
        if (!cancelled) setFetchLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [routeId, stateAsset]);

  // Loading state while fetching via deep-link
  if (fetchLoading) {
    return (
      <Page>
        <Header headerTitle="Asset Detail" />
        <div className="assets-page">
          <div className="skeleton-wrap">
            <div
              className="skeleton-tiles"
              style={{
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              }}
            >
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="skeleton-tile">
                  <div className="skeleton-line skeleton-line--sm" />
                  <div className="skeleton-line skeleton-line--lg" />
                </div>
              ))}
            </div>
            <div className="skeleton-chart">
              <div className="skeleton-chart-header">
                <div className="skeleton-line skeleton-line--md" />
              </div>
              <div className="skeleton-chart-body">
                <div className="skeleton-bars">
                  {[65, 85, 45, 70, 90, 55, 75].map((h, i) => (
                    <div
                      key={i}
                      className="skeleton-bar"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </Page>
    );
  }

  if (!asset || fetchError) {
    return (
      <Page>
        <Header headerTitle="Asset Detail" />
        <div className="assets-page">
          <div className="assets-empty">
            <p>
              {fetchError
                ? "Asset not found."
                : "No asset data. Please go back and select an asset."}
            </p>
            <button
              className="detail-back-btn"
              onClick={() => navigate("/assets")}
            >
              ← Back to Assets
            </button>
          </div>
        </div>
        <Footer />
      </Page>
    );
  }

  const name = asset.properties?.name || "Unknown";
  const assetType = asset.type || "Unknown";

  // Gather all info sections
  const infoSections = [];

  // Properties section
  const propsRows = [
    { label: "Type", value: assetType },
    { label: "Category", value: asset.properties?.category },
    { label: "Provider", value: asset.properties?.provider },
    { label: "Cluster", value: asset.properties?.cluster },
    { label: "Project", value: asset.properties?.project },
    { label: "Account", value: asset.properties?.account },
    { label: "Service", value: asset.properties?.service },
    { label: "Provider ID", value: asset.properties?.providerID },
  ].filter((r) => r.value);

  // Type-specific info
  const specRows = [];
  if (assetType === "Node") {
    if (asset.nodeType)
      specRows.push({ label: "Instance Type", value: asset.nodeType });
    if (asset.pool) specRows.push({ label: "Node Pool", value: asset.pool });
    specRows.push({ label: "CPU Cores", value: asset.cpuCores || 0 });
    specRows.push({ label: "RAM", value: formatBytes(asset.ramBytes) });
    if (asset.gpuCount > 0)
      specRows.push({ label: "GPUs", value: asset.gpuCount });
    if (asset.preemptible > 0)
      specRows.push({ label: "Preemptible", value: "Yes" });
    if (asset.discount > 0)
      specRows.push({
        label: "Discount",
        value: `${Math.round(asset.discount * 100)}%`,
      });
  } else if (assetType === "Disk") {
    if (asset.storageClass)
      specRows.push({ label: "Storage Class", value: asset.storageClass });
    specRows.push({ label: "Capacity", value: formatBytes(asset.bytes) });
    specRows.push({
      label: "Peak Usage",
      value: formatBytes(asset.byteUsageMax),
    });
    if (asset.volumeName)
      specRows.push({ label: "Volume Name", value: asset.volumeName });
    if (asset.claimName)
      specRows.push({
        label: "PVC",
        value: `${asset.claimNamespace}/${asset.claimName}`,
      });
    if (asset.local > 0) specRows.push({ label: "Local Disk", value: "Yes" });
  } else if (assetType === "LoadBalancer") {
    if (asset.ip) specRows.push({ label: "IP Address", value: asset.ip });
    specRows.push({
      label: "Scope",
      value: asset.private ? "Private" : "Public",
    });
  }

  // Cost section
  const costRows = [];
  if (asset.cpuCost > 0)
    costRows.push({
      label: "CPU Cost",
      value: toCurrency(asset.cpuCost, currency),
    });
  if (asset.ramCost > 0)
    costRows.push({
      label: "RAM Cost",
      value: toCurrency(asset.ramCost, currency),
    });
  if (asset.gpuCost > 0)
    costRows.push({
      label: "GPU Cost",
      value: toCurrency(asset.gpuCost, currency),
    });
  if (asset.credit)
    costRows.push({
      label: "Credit",
      value: toCurrency(asset.credit, currency),
      className: "val-credit",
    });
  if (asset.adjustment)
    costRows.push({
      label: "Adjustment",
      value: toCurrency(asset.adjustment, currency),
      className: asset.adjustment < 0 ? "val-credit" : "val-adj",
    });
  costRows.push({
    label: "Total Cost",
    value: toCurrency(asset.totalCost || 0, currency),
    className: "val-total",
  });

  return (
    <Page>
      <Header headerTitle="Asset Detail" />
      <div className="assets-page">
        {/* Back nav + title */}
        <div className="detail-page-header">
          <button className="detail-back-btn" onClick={() => navigate(-1)}>
            ← Back
          </button>
          <div className="detail-page-title-row">
            <span className={`type-badge type-badge--${assetType}`}>
              {assetType}
            </span>
            <h2 className="detail-page-name">{name}</h2>
          </div>
          <div className="detail-page-meta">
            <span>
              Window: {asset.window?.start?.slice(0, 10)} →{" "}
              {asset.window?.end?.slice(0, 10)}
            </span>
            {asset.minutes > 0 && (
              <span>Duration: {formatMinutes(asset.minutes)}</span>
            )}
          </div>
        </div>

        {/* Cost summary cards */}
        <div className="detail-cost-cards">
          <div className="detail-cost-card detail-cost-card--primary">
            <span className="dcc-label">Total Cost</span>
            <span className="dcc-value">
              {toCurrency(asset.totalCost || 0, currency)}
            </span>
          </div>
          {asset.cpuCost > 0 && (
            <div className="detail-cost-card">
              <span className="dcc-label">CPU Cost</span>
              <span
                className="dcc-value"
                style={{ color: COST_COLORS.cpuCost }}
              >
                {toCurrency(asset.cpuCost, currency)}
              </span>
            </div>
          )}
          {asset.ramCost > 0 && (
            <div className="detail-cost-card">
              <span className="dcc-label">RAM Cost</span>
              <span
                className="dcc-value"
                style={{ color: COST_COLORS.ramCost }}
              >
                {toCurrency(asset.ramCost, currency)}
              </span>
            </div>
          )}
          {asset.gpuCost > 0 && (
            <div className="detail-cost-card">
              <span className="dcc-label">GPU Cost</span>
              <span
                className="dcc-value"
                style={{ color: COST_COLORS.gpuCost }}
              >
                {toCurrency(asset.gpuCost, currency)}
              </span>
            </div>
          )}
        </div>

        {/* Charts row */}
        <div className="detail-charts-row">
          <div className="detail-chart-panel">
            <h4 className="detail-section-title">Daily Cost Trend</h4>
            <AssetCostTrend
              asset={asset}
              currency={currency}
              windowStr={windowStr || "7d"}
            />
          </div>
          {(asset.cpuCost > 0 || asset.ramCost > 0 || asset.gpuCost > 0) && (
            <div className="detail-chart-panel detail-chart-panel--small">
              <h4 className="detail-section-title">Cost Breakdown</h4>
              <CostDonut asset={asset} currency={currency} />
            </div>
          )}
        </div>

        {/* Info grid */}
        <div className="detail-info-grid">
          {/* Properties */}
          <div className="detail-info-card">
            <h4 className="detail-section-title">Properties</h4>
            <div className="detail-info-rows">
              {propsRows.map((r) => (
                <div key={r.label} className="detail-info-row">
                  <span className="dir-label">{r.label}</span>
                  <span className="dir-value">{r.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Type-specific */}
          {specRows.length > 0 && (
            <div className="detail-info-card">
              <h4 className="detail-section-title">
                {assetType === "Node"
                  ? "Compute Resources"
                  : assetType === "Disk"
                    ? "Storage Details"
                    : assetType === "LoadBalancer"
                      ? "Load Balancer"
                      : "Details"}
              </h4>
              <div className="detail-info-rows">
                {specRows.map((r) => (
                  <div key={r.label} className="detail-info-row">
                    <span className="dir-label">{r.label}</span>
                    <span className="dir-value">{r.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cost details */}
          <div className="detail-info-card">
            <h4 className="detail-section-title">Cost Details</h4>
            <div className="detail-info-rows">
              {costRows.map((r) => (
                <div
                  key={r.label}
                  className={`detail-info-row ${r.className || ""}`}
                >
                  <span className="dir-label">{r.label}</span>
                  <span className="dir-value">{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Utilization */}
        {(asset.cpuBreakdown || asset.ramBreakdown || asset.breakdown) && (
          <div className="detail-info-card detail-util-card">
            <h4 className="detail-section-title">Utilization</h4>
            <div className="detail-util-grid">
              {asset.cpuBreakdown && (
                <UtilizationBar
                  breakdown={asset.cpuBreakdown}
                  label="CPU Utilization"
                />
              )}
              {asset.ramBreakdown && (
                <UtilizationBar
                  breakdown={asset.ramBreakdown}
                  label="RAM Utilization"
                />
              )}
              {asset.breakdown && (
                <UtilizationBar
                  breakdown={asset.breakdown}
                  label="Storage Utilization"
                />
              )}
            </div>
            {asset.overhead && (
              <div className="detail-overhead">
                <h5 className="detail-subsection-title">Overhead</h5>
                <div className="detail-info-rows">
                  <div className="detail-info-row">
                    <span className="dir-label">CPU Overhead</span>
                    <span className="dir-value">
                      {Math.round(
                        (asset.overhead.cpuOverheadFraction || 0) * 100,
                      )}
                      %
                    </span>
                  </div>
                  <div className="detail-info-row">
                    <span className="dir-label">RAM Overhead</span>
                    <span className="dir-value">
                      {Math.round(
                        (asset.overhead.ramOverheadFraction || 0) * 100,
                      )}
                      %
                    </span>
                  </div>
                  <div className="detail-info-row">
                    <span className="dir-label">Overhead Cost Fraction</span>
                    <span className="dir-value">
                      {Math.round(
                        (asset.overhead.overheadCostFraction || 0) * 100,
                      )}
                      %
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Labels */}
        {asset.labels && Object.keys(asset.labels).length > 0 && (
          <div className="detail-info-card">
            <h4 className="detail-section-title">Labels</h4>
            <div className="detail-labels-grid">
              {Object.entries(asset.labels).map(([k, v]) => (
                <span key={k} className="detail-label-tag">
                  <span className="dlt-key">{k}</span>
                  <span className="dlt-val">{v}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
      <Footer />
    </Page>
  );
};

export default AssetDetail;
