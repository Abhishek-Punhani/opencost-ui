import React, { useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router";
import { toCurrency } from "../../util";

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

const TYPE_COLORS = {
  Node: { bg: "#d0e2ff", text: "#0043ce" },
  Disk: { bg: "#d9fbfb", text: "#005d5d" },
  LoadBalancer: { bg: "#e8daff", text: "#6929c4" },
  Network: { bg: "#bae6ff", text: "#003a6d" },
  ClusterManagement: { bg: "#e8e8e8", text: "#393939" },
  Cloud: { bg: "#ffd6e8", text: "#9f1853" },
};

const columns = [
  { key: "name", label: "Name", flex: 2.5 },
  { key: "type", label: "Type", flex: 1 },
  { key: "provider", label: "Provider", flex: 1 },
  { key: "cluster", label: "Cluster", flex: 1.2 },
  { key: "details", label: "Details", flex: 1.5 },
  { key: "totalCost", label: "Total Cost", flex: 1, align: "right" },
];

/**
 * Gets a brief detail string for the asset (context-dependent).
 */
function getAssetDetail(asset) {
  switch (asset.type) {
    case "Node":
      return `${asset.cpuCores || 0} CPU · ${formatBytes(asset.ramBytes)}${asset.gpuCount > 0 ? ` · ${asset.gpuCount} GPU` : ""}`;
    case "Disk":
      return `${formatBytes(asset.bytes)} · ${asset.storageClass || "—"}`;
    case "LoadBalancer":
      return asset.ip || (asset.private ? "Private" : "Public");
    case "Cloud":
      return asset.properties?.service || "—";
    default:
      return asset.properties?.service || "—";
  }
}

/**
 * AssetsTable — clean professional table with row-click navigation.
 *
 * Props:
 * - assets: array of processed asset objects
 * - currency: ISO currency code
 * - windowStr: current window string for detail page
 */
const AssetsTable = ({ assets, currency, windowStr }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [searchText, setSearchText] = useState("");
  const [sortKey, setSortKey] = useState("totalCost");
  const [sortDir, setSortDir] = useState("desc");

  const handleSort = (key) => {
    if (key === "details") return; // not sortable
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "totalCost" ? "desc" : "asc");
    }
  };

  const getCellValue = (asset, key) => {
    switch (key) {
      case "name":
        return asset.properties?.name || "—";
      case "type":
        return asset.type || "—";
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

  const openDetail = (asset) => {
    const id = asset._id || asset.properties?.name || "unknown";
    navigate(`/assets/${encodeURIComponent(id)}`, {
      state: { asset, currency, windowStr },
    });
  };

  // Generate page numbers with ellipsis
  const getPageNumbers = () => {
    if (totalPages <= 7)
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages = [];
    pages.push(1);
    if (safePage > 3) pages.push("...");
    for (
      let i = Math.max(2, safePage - 1);
      i <= Math.min(totalPages - 1, safePage + 1);
      i++
    ) {
      pages.push(i);
    }
    if (safePage < totalPages - 2) pages.push("...");
    pages.push(totalPages);
    return pages;
  };

  return (
    <div className="assets-table-wrap">
      {/* Toolbar */}
      <div className="table-toolbar">
        <div className="table-search">
          <svg
            className="search-svg"
            viewBox="0 0 16 16"
            width="14"
            height="14"
          >
            <path
              d="M11.5 7a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0zm-.82 4.74a6 6 0 1 1 1.06-1.06l3.04 3.04a.75.75 0 1 1-1.06 1.06l-3.04-3.04z"
              fill="currentColor"
            />
          </svg>
          <input
            type="text"
            placeholder="Search assets..."
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <span className="table-count">{filtered.length} assets</span>
      </div>

      {/* Table */}
      <div className="table-scroll">
        <table className="assets-tbl">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`${col.align === "right" ? "th-right" : ""} ${col.key === "details" ? "th-nosort" : ""}`}
                  onClick={() => handleSort(col.key)}
                  style={{
                    width: col.key === "totalCost" ? "120px" : undefined,
                  }}
                >
                  <span className="th-inner">
                    {col.label}
                    {col.key !== "details" && (
                      <span
                        className={`sort-arrow ${sortKey === col.key ? "active" : ""}`}
                      >
                        {sortKey === col.key
                          ? sortDir === "asc"
                            ? "↑"
                            : "↓"
                          : "↕"}
                      </span>
                    )}
                  </span>
                </th>
              ))}
              <th className="th-action" />
            </tr>
          </thead>
          <tbody>
            {paginated.map((asset, idx) => {
              const rowId = asset._id || String(idx);
              const tc = TYPE_COLORS[asset.type] || {
                bg: "#e8e8e8",
                text: "#393939",
              };
              return (
                <tr
                  key={rowId}
                  className="tbl-row"
                  onClick={() => openDetail(asset)}
                >
                  <td className="td-name">
                    <span
                      className="name-text"
                      title={getCellValue(asset, "name")}
                    >
                      {getCellValue(asset, "name")}
                    </span>
                  </td>
                  <td>
                    <span
                      className="type-pill"
                      style={{ background: tc.bg, color: tc.text }}
                    >
                      {asset.type}
                    </span>
                  </td>
                  <td className="td-dim">{getCellValue(asset, "provider")}</td>
                  <td className="td-dim">{getCellValue(asset, "cluster")}</td>
                  <td className="td-detail">{getAssetDetail(asset)}</td>
                  <td className="td-cost">
                    {toCurrency(asset.totalCost || 0, currency)}
                  </td>
                  <td className="td-arrow">→</td>
                </tr>
              );
            })}
            {paginated.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1} className="td-empty">
                  No assets match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="tbl-pagination">
        <span className="pg-info">
          {startItem}–{endItem} of {sorted.length}
        </span>
        <div className="pg-controls">
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="pg-select"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
          <button
            className="pg-btn"
            disabled={safePage <= 1}
            onClick={() => setPage(1)}
          >
            «
          </button>
          <button
            className="pg-btn"
            disabled={safePage <= 1}
            onClick={() => setPage(safePage - 1)}
          >
            ‹
          </button>
          {getPageNumbers().map((p, i) =>
            p === "..." ? (
              <span key={`e${i}`} className="pg-ellipsis">
                …
              </span>
            ) : (
              <button
                key={p}
                className={`pg-btn ${p === safePage ? "pg-active" : ""}`}
                onClick={() => setPage(p)}
              >
                {p}
              </button>
            ),
          )}
          <button
            className="pg-btn"
            disabled={safePage >= totalPages}
            onClick={() => setPage(safePage + 1)}
          >
            ›
          </button>
          <button
            className="pg-btn"
            disabled={safePage >= totalPages}
            onClick={() => setPage(totalPages)}
          >
            »
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssetsTable;
