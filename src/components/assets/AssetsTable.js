import React, { useState, useMemo } from "react";
import { toCurrency } from "../../util";
import { assetTypeTagColor } from "./tokens";

/**
 * Renders a CPU/RAM utilization bar with user/system/idle breakdown.
 */
const UtilizationBar = ({ breakdown, label }) => {
  if (!breakdown) return null;
  const user = Math.round((breakdown.user || 0) * 100);
  const system = Math.round((breakdown.system || 0) * 100);
  const idle = 100 - user - system;

  return (
    <div className="utilization-bar-container">
      <div className="asset-detail-row">
        <span className="detail-label">{label}</span>
        <span className="detail-value">{user + system}% utilized</span>
      </div>
      <div className="utilization-bar">
        <div className="bar-segment bar-user" style={{ width: `${user}%` }} />
        <div
          className="bar-segment bar-system"
          style={{ width: `${system}%` }}
        />
        <div className="bar-segment bar-idle" style={{ width: `${idle}%` }} />
      </div>
      <div className="utilization-legend">
        <span className="legend-user">User {user}%</span>
        <span className="legend-system">System {system}%</span>
        <span className="legend-idle">Idle {idle}%</span>
      </div>
    </div>
  );
};

/**
 * Renders the expanded detail content for a Node asset.
 */
const NodeDetail = ({ asset, currency }) => (
  <div className="asset-detail-grid">
    <div className="asset-detail-section">
      <h6>Compute Resources</h6>
      <div className="asset-detail-row">
        <span className="detail-label">Instance Type</span>
        <span className="detail-value">{asset.nodeType || "—"}</span>
      </div>
      {asset.pool && (
        <div className="asset-detail-row">
          <span className="detail-label">Node Pool</span>
          <span className="detail-value">{asset.pool}</span>
        </div>
      )}
      <div className="asset-detail-row">
        <span className="detail-label">CPU Cores</span>
        <span className="detail-value">{asset.cpuCores || 0}</span>
      </div>
      <div className="asset-detail-row">
        <span className="detail-label">RAM</span>
        <span className="detail-value">{formatBytes(asset.ramBytes)}</span>
      </div>
      {asset.gpuCount > 0 && (
        <div className="asset-detail-row">
          <span className="detail-label">GPU Count</span>
          <span className="detail-value">{asset.gpuCount}</span>
        </div>
      )}
      {asset.preemptible > 0 && (
        <div className="asset-detail-row">
          <span className="detail-label">Preemptible</span>
          <span className="detail-value">Yes</span>
        </div>
      )}
      {asset.properties?.account && (
        <div className="asset-detail-row">
          <span className="detail-label">Account</span>
          <span className="detail-value">{asset.properties.account}</span>
        </div>
      )}
    </div>
    <div className="asset-detail-section">
      <h6>Cost Breakdown</h6>
      <div className="asset-detail-row">
        <span className="detail-label">CPU Cost</span>
        <span className="detail-value">
          {toCurrency(asset.cpuCost, currency)}
        </span>
      </div>
      <div className="asset-detail-row">
        <span className="detail-label">RAM Cost</span>
        <span className="detail-value">
          {toCurrency(asset.ramCost, currency)}
        </span>
      </div>
      {asset.gpuCost > 0 && (
        <div className="asset-detail-row">
          <span className="detail-label">GPU Cost</span>
          <span className="detail-value">
            {toCurrency(asset.gpuCost, currency)}
          </span>
        </div>
      )}
      {asset.adjustment !== 0 && (
        <div className="asset-detail-row">
          <span className="detail-label">Adjustment</span>
          <span className="detail-value">
            {toCurrency(asset.adjustment, currency)}
          </span>
        </div>
      )}
      {asset.discount > 0 && (
        <div className="asset-detail-row">
          <span className="detail-label">Discount</span>
          <span className="detail-value">
            {Math.round(asset.discount * 100)}%
          </span>
        </div>
      )}
    </div>
    <div className="asset-detail-section">
      <h6>Utilization</h6>
      <UtilizationBar breakdown={asset.cpuBreakdown} label="CPU" />
      <div style={{ height: "0.75rem" }} />
      <UtilizationBar breakdown={asset.ramBreakdown} label="RAM" />
      {asset.overhead && (
        <div style={{ marginTop: "0.75rem" }}>
          <div className="asset-detail-row">
            <span className="detail-label">CPU Overhead</span>
            <span className="detail-value">
              {Math.round((asset.overhead.cpuOverheadFraction || 0) * 100)}%
            </span>
          </div>
          <div className="asset-detail-row">
            <span className="detail-label">RAM Overhead</span>
            <span className="detail-value">
              {Math.round((asset.overhead.ramOverheadFraction || 0) * 100)}%
            </span>
          </div>
          <div className="asset-detail-row">
            <span className="detail-label">Overhead Cost</span>
            <span className="detail-value">
              {Math.round((asset.overhead.overheadCostFraction || 0) * 100)}%
            </span>
          </div>
        </div>
      )}
    </div>
    {asset.minutes > 0 && (
      <div className="asset-detail-section">
        <h6>Time Coverage</h6>
        <div className="asset-detail-row">
          <span className="detail-label">Duration</span>
          <span className="detail-value">{formatMinutes(asset.minutes)}</span>
        </div>
      </div>
    )}
  </div>
);

/**
 * Renders the expanded detail content for a Disk asset.
 */
const DiskDetail = ({ asset, currency }) => (
  <div className="asset-detail-grid">
    <div className="asset-detail-section">
      <h6>Storage Details</h6>
      <div className="asset-detail-row">
        <span className="detail-label">Storage Class</span>
        <span className="detail-value">{asset.storageClass || "—"}</span>
      </div>
      <div className="asset-detail-row">
        <span className="detail-label">Capacity</span>
        <span className="detail-value">{formatBytes(asset.bytes)}</span>
      </div>
      <div className="asset-detail-row">
        <span className="detail-label">Peak Usage</span>
        <span className="detail-value">{formatBytes(asset.byteUsageMax)}</span>
      </div>
      {asset.volumeName && (
        <div className="asset-detail-row">
          <span className="detail-label">Volume Name</span>
          <span className="detail-value">{asset.volumeName}</span>
        </div>
      )}
      {asset.claimName && (
        <div className="asset-detail-row">
          <span className="detail-label">PVC Claim</span>
          <span className="detail-value">
            {asset.claimNamespace}/{asset.claimName}
          </span>
        </div>
      )}
      {asset.local > 0 && (
        <div className="asset-detail-row">
          <span className="detail-label">Local Disk</span>
          <span className="detail-value">Yes</span>
        </div>
      )}
    </div>
    <div className="asset-detail-section">
      <h6>Cost</h6>
      <div className="asset-detail-row">
        <span className="detail-label">Total Cost</span>
        <span className="detail-value">
          {toCurrency(asset.totalCost, currency)}
        </span>
      </div>
      {asset.adjustment !== 0 && asset.adjustment !== undefined && (
        <div className="asset-detail-row">
          <span className="detail-label">Adjustment</span>
          <span className="detail-value">
            {toCurrency(asset.adjustment, currency)}
          </span>
        </div>
      )}
    </div>
    <div className="asset-detail-section">
      <h6>Utilization</h6>
      <UtilizationBar breakdown={asset.breakdown} label="Storage" />
    </div>
    {asset.minutes > 0 && (
      <div className="asset-detail-section">
        <h6>Time Coverage</h6>
        <div className="asset-detail-row">
          <span className="detail-label">Duration</span>
          <span className="detail-value">{formatMinutes(asset.minutes)}</span>
        </div>
      </div>
    )}
  </div>
);

/**
 * Renders the expanded detail content for a LoadBalancer asset.
 */
const LoadBalancerDetail = ({ asset, currency }) => (
  <div className="asset-detail-grid">
    <div className="asset-detail-section">
      <h6>Load Balancer Details</h6>
      {asset.ip && (
        <div className="asset-detail-row">
          <span className="detail-label">IP Address</span>
          <span className="detail-value">{asset.ip}</span>
        </div>
      )}
      <div className="asset-detail-row">
        <span className="detail-label">Scope</span>
        <span className="detail-value">
          {asset.private ? "Private" : "Public"}
        </span>
      </div>
    </div>
    <div className="asset-detail-section">
      <h6>Cost</h6>
      <div className="asset-detail-row">
        <span className="detail-label">Total Cost</span>
        <span className="detail-value">
          {toCurrency(asset.totalCost, currency)}
        </span>
      </div>
      {asset.adjustment !== 0 && asset.adjustment !== undefined && (
        <div className="asset-detail-row">
          <span className="detail-label">Adjustment</span>
          <span className="detail-value">
            {toCurrency(asset.adjustment, currency)}
          </span>
        </div>
      )}
    </div>
    {asset.minutes > 0 && (
      <div className="asset-detail-section">
        <h6>Time Coverage</h6>
        <div className="asset-detail-row">
          <span className="detail-label">Duration</span>
          <span className="detail-value">{formatMinutes(asset.minutes)}</span>
        </div>
      </div>
    )}
  </div>
);

/**
 * Renders the expanded detail content for a Cloud asset.
 */
const CloudDetail = ({ asset, currency }) => (
  <div className="asset-detail-grid">
    <div className="asset-detail-section">
      <h6>Cloud Details</h6>
      <div className="asset-detail-row">
        <span className="detail-label">Provider</span>
        <span className="detail-value">
          {asset.properties?.provider || "—"}
        </span>
      </div>
      <div className="asset-detail-row">
        <span className="detail-label">Service</span>
        <span className="detail-value">{asset.properties?.service || "—"}</span>
      </div>
      <div className="asset-detail-row">
        <span className="detail-label">Project</span>
        <span className="detail-value">{asset.properties?.project || "—"}</span>
      </div>
      {asset.properties?.account && (
        <div className="asset-detail-row">
          <span className="detail-label">Account</span>
          <span className="detail-value">{asset.properties.account}</span>
        </div>
      )}
    </div>
    <div className="asset-detail-section">
      <h6>Cost</h6>
      <div className="asset-detail-row">
        <span className="detail-label">Total Cost</span>
        <span className="detail-value">
          {toCurrency(asset.totalCost, currency)}
        </span>
      </div>
      {asset.credit !== 0 && asset.credit !== undefined && (
        <div className="asset-detail-row">
          <span className="detail-label">Credit</span>
          <span className="detail-value">
            {toCurrency(asset.credit, currency)}
          </span>
        </div>
      )}
      {asset.adjustment !== 0 && asset.adjustment !== undefined && (
        <div className="asset-detail-row">
          <span className="detail-label">Adjustment</span>
          <span className="detail-value">
            {toCurrency(asset.adjustment, currency)}
          </span>
        </div>
      )}
    </div>
    {asset.minutes > 0 && (
      <div className="asset-detail-section">
        <h6>Time Coverage</h6>
        <div className="asset-detail-row">
          <span className="detail-label">Duration</span>
          <span className="detail-value">{formatMinutes(asset.minutes)}</span>
        </div>
      </div>
    )}
  </div>
);

/**
 * Generic detail for Network and ClusterManagement types.
 */
const GenericDetail = ({ asset, currency }) => (
  <div className="asset-detail-grid">
    <div className="asset-detail-section">
      <h6>Properties</h6>
      <div className="asset-detail-row">
        <span className="detail-label">Provider</span>
        <span className="detail-value">
          {asset.properties?.provider || "—"}
        </span>
      </div>
      <div className="asset-detail-row">
        <span className="detail-label">Service</span>
        <span className="detail-value">{asset.properties?.service || "—"}</span>
      </div>
      <div className="asset-detail-row">
        <span className="detail-label">Project</span>
        <span className="detail-value">{asset.properties?.project || "—"}</span>
      </div>
      {asset.properties?.account && (
        <div className="asset-detail-row">
          <span className="detail-label">Account</span>
          <span className="detail-value">{asset.properties.account}</span>
        </div>
      )}
    </div>
    <div className="asset-detail-section">
      <h6>Cost</h6>
      <div className="asset-detail-row">
        <span className="detail-label">Total Cost</span>
        <span className="detail-value">
          {toCurrency(asset.totalCost, currency)}
        </span>
      </div>
      {asset.adjustment !== 0 && asset.adjustment !== undefined && (
        <div className="asset-detail-row">
          <span className="detail-label">Adjustment</span>
          <span className="detail-value">
            {toCurrency(asset.adjustment, currency)}
          </span>
        </div>
      )}
    </div>
    {asset.minutes > 0 && (
      <div className="asset-detail-section">
        <h6>Time Coverage</h6>
        <div className="asset-detail-row">
          <span className="detail-label">Duration</span>
          <span className="detail-value">{formatMinutes(asset.minutes)}</span>
        </div>
      </div>
    )}
    {asset.labels && Object.keys(asset.labels).length > 0 && (
      <div className="asset-detail-section">
        <h6>Labels</h6>
        <div className="asset-labels-area">
          {Object.entries(asset.labels)
            .slice(0, 8)
            .map(([k, v]) => (
              <span key={k} className="label-tag">
                {k}: {v}
              </span>
            ))}
          {Object.keys(asset.labels).length > 8 && (
            <span className="label-tag">
              +{Object.keys(asset.labels).length - 8} more
            </span>
          )}
        </div>
      </div>
    )}
  </div>
);

/**
 * Renders type-specific expanded detail for an asset row.
 */
const AssetExpandedDetail = ({ asset, currency }) => {
  const detailMap = {
    Node: NodeDetail,
    Disk: DiskDetail,
    LoadBalancer: LoadBalancerDetail,
    Cloud: CloudDetail,
  };
  const DetailComponent = detailMap[asset.type] || GenericDetail;

  return (
    <div className="asset-expanded-detail">
      <DetailComponent asset={asset} currency={currency} />
      {/* Show labels for Node and Disk types too */}
      {asset.type !== "Cloud" &&
        asset.type !== "Network" &&
        asset.type !== "ClusterManagement" &&
        asset.labels &&
        Object.keys(asset.labels).length > 0 && (
          <div style={{ marginTop: "1rem" }}>
            <div
              style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "#525252",
                textTransform: "uppercase",
                letterSpacing: "0.32px",
                marginBottom: "0.5rem",
              }}
            >
              Labels
            </div>
            <div className="asset-labels-area">
              {Object.entries(asset.labels)
                .slice(0, 10)
                .map(([k, v]) => (
                  <span key={k} className="label-tag">
                    {k}: {v}
                  </span>
                ))}
              {Object.keys(asset.labels).length > 10 && (
                <span className="label-tag">
                  +{Object.keys(asset.labels).length - 10} more
                </span>
              )}
            </div>
          </div>
        )}
    </div>
  );
};

/**
 * Format bytes to human readable (GiB, MiB, etc.)
 */
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

/**
 * Format minutes to human readable (e.g. "7d 0h", "23h 45m").
 */
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
 * AssetsTable — clean custom table with expandable rows, search, sort, pagination.
 *
 * Props:
 * - assets: array of processed asset objects
 * - currency: ISO currency code
 */
const columns = [
  { key: "name", label: "Name" },
  { key: "type", label: "Type" },
  { key: "category", label: "Category" },
  { key: "provider", label: "Provider" },
  { key: "cluster", label: "Cluster" },
  { key: "totalCost", label: "Total Cost", align: "right" },
];

const AssetsTable = ({ assets, currency }) => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [searchText, setSearchText] = useState("");
  const [sortKey, setSortKey] = useState("totalCost");
  const [sortDir, setSortDir] = useState("desc");
  const [expandedRows, setExpandedRows] = useState(new Set());

  const toggleRow = (id) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "totalCost" ? "desc" : "asc");
    }
  };

  // Extract cell value for sorting/display
  const getCellValue = (asset, key) => {
    switch (key) {
      case "name":
        return asset.properties?.name || "—";
      case "type":
        return asset.type || "—";
      case "category":
        return asset.properties?.category || "—";
      case "provider":
        return asset.properties?.provider || "—";
      case "cluster":
        return asset.properties?.cluster || "—";
      case "totalCost":
        return asset.totalCost || 0;
      default:
        return "";
    }
  };

  // Filter
  const filtered = useMemo(() => {
    if (!searchText) return assets;
    const q = searchText.toLowerCase();
    return assets.filter(
      (a) =>
        (a.properties?.name || "").toLowerCase().includes(q) ||
        (a.type || "").toLowerCase().includes(q) ||
        (a.properties?.provider || "").toLowerCase().includes(q) ||
        (a.properties?.cluster || "").toLowerCase().includes(q),
    );
  }, [assets, searchText]);

  // Sort
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const va = getCellValue(a, sortKey);
      const vb = getCellValue(b, sortKey);
      let cmp = 0;
      if (typeof va === "number" && typeof vb === "number") {
        cmp = va - vb;
      } else {
        cmp = String(va).localeCompare(String(vb));
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  // Paginate
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, safePage, pageSize]);

  const startItem = sorted.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endItem = Math.min(safePage * pageSize, sorted.length);

  return (
    <div className="assets-table-container">
      {/* Search bar */}
      <div className="assets-search-bar">
        <span className="search-icon">⌕</span>
        <input
          type="text"
          placeholder="Search by name, type, provider, or cluster..."
          value={searchText}
          onChange={(e) => {
            setSearchText(e.target.value);
            setPage(1);
          }}
        />
        <span className="result-count">{filtered.length} results</span>
      </div>

      {/* Table */}
      <table className="assets-table">
        <thead>
          <tr>
            <th className="col-expand" />
            {columns.map((col) => (
              <th
                key={col.key}
                className={`${sortKey === col.key ? "sorted" : ""} ${col.align === "right" ? "col-cost" : ""}`}
                onClick={() => handleSort(col.key)}
              >
                {col.label}
                <span className="sort-indicator">
                  {sortKey === col.key ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {paginated.map((asset, idx) => {
            const rowId = asset._id || String(idx);
            const isOpen = expandedRows.has(rowId);
            return (
              <React.Fragment key={rowId}>
                <tr className={isOpen ? "expanded" : ""}>
                  <td>
                    <button
                      className={`expand-btn ${isOpen ? "open" : ""}`}
                      onClick={() => toggleRow(rowId)}
                      aria-label="Expand row"
                    >
                      ▶
                    </button>
                  </td>
                  <td>
                    <span
                      className="asset-name-cell"
                      title={getCellValue(asset, "name")}
                    >
                      {getCellValue(asset, "name")}
                    </span>
                  </td>
                  <td>
                    <span className={`type-badge type-badge--${asset.type}`}>
                      {asset.type}
                    </span>
                  </td>
                  <td>{getCellValue(asset, "category")}</td>
                  <td>{getCellValue(asset, "provider")}</td>
                  <td>{getCellValue(asset, "cluster")}</td>
                  <td>
                    <span className="cost-cell">
                      {toCurrency(asset.totalCost || 0, currency)}
                    </span>
                  </td>
                </tr>
                {isOpen && (
                  <tr className="asset-expanded-row-content">
                    <td colSpan={columns.length + 1}>
                      <AssetExpandedDetail asset={asset} currency={currency} />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
          {paginated.length === 0 && (
            <tr>
              <td
                colSpan={columns.length + 1}
                style={{
                  textAlign: "center",
                  padding: "2rem",
                  color: "#6f6f6f",
                }}
              >
                No assets match your search.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Pagination */}
      <div className="assets-pagination">
        <div className="pagination-info">
          Showing {startItem}–{endItem} of {sorted.length}
        </div>
        <div className="pagination-controls">
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
          >
            <option value={10}>10 / page</option>
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
          </select>
          <button
            disabled={safePage <= 1}
            onClick={() => setPage(safePage - 1)}
          >
            ‹
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              className={p === safePage ? "active" : ""}
              onClick={() => setPage(p)}
            >
              {p}
            </button>
          ))}
          <button
            disabled={safePage >= totalPages}
            onClick={() => setPage(safePage + 1)}
          >
            ›
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssetsTable;
