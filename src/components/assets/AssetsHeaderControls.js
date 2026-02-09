import React from "react";
import { Dropdown } from "@carbon/react";
import { toCurrency } from "../../util";

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

const AssetsHeaderControls = ({
  viewMode,
  setViewMode,
  currency,
  handleCurrencyChange,
  currencyOptions,
  ratesLive,
  loading,
  convertedAssets,
  windowParam,
  windowOptions,
  updateParams,
  autoRefresh,
  setAutoRefresh,
  fetchData,
}) => {
  const windowLabel =
    windowOptions.find((w) => w.value === windowParam)?.name || windowParam;

  return (
    <div className="assets-header-controls">
      <div className="assets-view-toggle">
        <button
          className={`view-toggle-btn ${viewMode === "table" ? "active" : ""}`}
          onClick={() => setViewMode("table")}
          title="Table view"
        >
          <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
            <path d="M1 2.5A1.5 1.5 0 012.5 1h11A1.5 1.5 0 0115 2.5v11a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 011 13.5v-11zM2.5 2a.5.5 0 00-.5.5V5h12V2.5a.5.5 0 00-.5-.5h-11zM14 6H2v3h12V6zm0 4H2v3.5a.5.5 0 00.5.5h11a.5.5 0 00.5-.5V10z" />
          </svg>
          <span>Table</span>
        </button>
        <button
          className={`view-toggle-btn ${viewMode === "dashboard" ? "active" : ""}`}
          onClick={() => setViewMode("dashboard")}
          title="Dashboard visualizations"
        >
          <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
            <path d="M0 1.5A1.5 1.5 0 011.5 0h3A1.5 1.5 0 016 1.5v3A1.5 1.5 0 014.5 6h-3A1.5 1.5 0 010 4.5v-3zm6.5 0A1.5 1.5 0 018 0h3a1.5 1.5 0 011.5 1.5v3A1.5 1.5 0 0111 6H8a1.5 1.5 0 01-1.5-1.5v-3zM0 8a1.5 1.5 0 011.5-1.5h3A1.5 1.5 0 016 8v3a1.5 1.5 0 01-1.5 1.5h-3A1.5 1.5 0 010 11V8zm6.5 0A1.5 1.5 0 018 6.5h3A1.5 1.5 0 0112.5 8v3a1.5 1.5 0 01-1.5 1.5H8A1.5 1.5 0 016.5 11V8z" />
          </svg>
          <span>Visualizations</span>
        </button>
      </div>

      <div className="assets-header-divider" />

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
        {currencyOptions.map((c) => (
          <option key={c.code} value={c.code}>
            {c.symbol} {c.code}
          </option>
        ))}
      </select>
      {!ratesLive && currency !== "USD" && (
        <span className="rates-badge" title="Using approximate offline rates">
          ≈
        </span>
      )}

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
        label={windowLabel}
        items={windowOptions}
        itemToString={(item) => (item ? item.name : "")}
        selectedItem={windowOptions.find((w) => w.value === windowParam)}
        onChange={({ selectedItem }) =>
          selectedItem && updateParams({ window: selectedItem.value })
        }
        size="sm"
      />

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
  );
};

export default AssetsHeaderControls;
