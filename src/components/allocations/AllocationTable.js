import React, { useMemo, useState } from "react";
import { toCurrency } from "../../util";
import { drilldownHierarchy } from "./constants";

const AllocationTable = ({
  cumData,
  currency,
  aggregateBy,
  onDrilldown,
  onRowClick,
}) => {
  const [sortBy, setSortBy] = useState("totalCost");
  const [sortDir, setSortDir] = useState("desc");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const canDrill = !!drilldownHierarchy[aggregateBy];

  const sorted = useMemo(() => {
    let items = [...cumData];
    if (search) {
      const q = search.toLowerCase();
      items = items.filter((a) => (a.name || "").toLowerCase().includes(q));
    }
    items.sort((a, b) => {
      const va = a[sortBy] ?? 0;
      const vb = b[sortBy] ?? 0;
      return sortDir === "desc" ? (vb > va ? 1 : -1) : va > vb ? 1 : -1;
    });
    return items;
  }, [cumData, sortBy, sortDir, search]);

  const totalRow = useMemo(
    () => ({
      name: "Totals",
      cpuCost: cumData.reduce((s, a) => s + (a.cpuCost || 0), 0),
      gpuCost: cumData.reduce((s, a) => s + (a.gpuCost || 0), 0),
      ramCost: cumData.reduce((s, a) => s + (a.ramCost || 0), 0),
      pvCost: cumData.reduce((s, a) => s + (a.pvCost || 0), 0),
      totalEfficiency: (() => {
        const eff = cumData.filter(
          (a) => a.name !== "__idle__" && a.totalEfficiency > 0,
        );
        return eff.length
          ? eff.reduce((s, a) => s + a.totalEfficiency, 0) / eff.length
          : 0;
      })(),
      totalCost: cumData.reduce((s, a) => s + (a.totalCost || 0), 0),
    }),
    [cumData],
  );

  const paged = sorted.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
  const totalPages = Math.ceil(sorted.length / rowsPerPage);

  const cols = [
    { key: "name", label: "Name", align: "left" },
    { key: "cpuCost", label: "CPU", align: "right" },
    { key: "gpuCost", label: "GPU", align: "right" },
    { key: "ramCost", label: "RAM", align: "right" },
    { key: "pvCost", label: "PV", align: "right" },
    { key: "totalEfficiency", label: "Efficiency", align: "right" },
    { key: "totalCost", label: "Total Cost", align: "right" },
  ];

  const handleSort = (key) => {
    if (sortBy === key) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else {
      setSortBy(key);
      setSortDir("desc");
    }
  };

  const isSpecial = (name) =>
    ["__idle__", "__unallocated__", "__unmounted__"].includes(name);

  const handleRowClick = (a) => {
    const special = isSpecial(a.name);
    if (special) return;
    onRowClick(a);
  };

  const handleDrillClick = (e, a) => {
    e.stopPropagation();
    onDrilldown(a);
  };

  return (
    <div className="alloc-table-wrap">
      <div className="alloc-table-toolbar">
        <div className="alloc-table-search">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85zm-5.242.156a5 5 0 1 1 0-10 5 5 0 0 1 0 10z" />
          </svg>
          <input
            placeholder={`Search ${aggregateBy}s…`}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />
        </div>
        <span className="alloc-table-count">{sorted.length} items</span>
      </div>

      <div className="table-scroll">
        <table className="alloc-tbl">
          <thead>
            <tr>
              {cols.map((c) => (
                <th
                  key={c.key}
                  className={c.align === "right" ? "th-right" : ""}
                  onClick={() => handleSort(c.key)}
                >
                  <span className="th-inner">
                    {c.label}
                    <span
                      className={`sort-arrow ${sortBy === c.key ? "active" : ""}`}
                    >
                      {sortBy === c.key
                        ? sortDir === "desc"
                          ? "↓"
                          : "↑"
                        : "↕"}
                    </span>
                  </span>
                </th>
              ))}
              <th className="th-action" />
            </tr>
          </thead>
          <tbody>
            <tr className="alloc-tbl-row alloc-tbl-row--total">
              <td>
                <span className="alloc-name alloc-name--total">Totals</span>
              </td>
              <td className="alloc-td-cost">
                {toCurrency(totalRow.cpuCost, currency)}
              </td>
              <td className="alloc-td-cost">
                {toCurrency(totalRow.gpuCost, currency)}
              </td>
              <td className="alloc-td-cost">
                {toCurrency(totalRow.ramCost, currency)}
              </td>
              <td className="alloc-td-cost">
                {toCurrency(totalRow.pvCost, currency)}
              </td>
              <td className="alloc-td-cost">
                {totalRow.totalEfficiency > 0
                  ? `${(totalRow.totalEfficiency * 100).toFixed(1)}%`
                  : "—"}
              </td>
              <td className="alloc-td-cost alloc-td-cost--total">
                {toCurrency(totalRow.totalCost, currency)}
              </td>
              <td />
            </tr>
            {paged.map((a) => {
              const special = isSpecial(a.name);
              const clickable = !special;
              return (
                <tr
                  key={a.name}
                  className={`alloc-tbl-row ${special ? "alloc-tbl-row--special" : ""} ${
                    clickable ? "alloc-tbl-row--clickable" : ""
                  }`}
                  onClick={() => handleRowClick(a)}
                >
                  <td className="alloc-td-name">
                    <span className="alloc-name">{a.name}</span>
                  </td>
                  <td className="alloc-td-cost">
                    {toCurrency(a.cpuCost || 0, currency)}
                  </td>
                  <td className="alloc-td-cost">
                    {toCurrency(a.gpuCost || 0, currency)}
                  </td>
                  <td className="alloc-td-cost">
                    {toCurrency(a.ramCost || 0, currency)}
                  </td>
                  <td className="alloc-td-cost">
                    {toCurrency(a.pvCost || 0, currency)}
                  </td>
                  <td className="alloc-td-cost">
                    {a.totalEfficiency > 0
                      ? `${(a.totalEfficiency * 100).toFixed(1)}%`
                      : "—"}
                  </td>
                  <td className="alloc-td-cost">
                    {toCurrency(a.totalCost || 0, currency)}
                  </td>
                  <td className="alloc-td-arrow">
                    {clickable && canDrill ? (
                      <button
                        className="alloc-drill-btn"
                        onClick={(e) => handleDrillClick(e, a)}
                        title={`Drill down into ${a.name}`}
                      >
                        ⬊
                      </button>
                    ) : clickable ? (
                      "›"
                    ) : (
                      ""
                    )}
                  </td>
                </tr>
              );
            })}
            {paged.length === 0 && (
              <tr>
                <td colSpan={8} className="alloc-td-empty">
                  No results found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="alloc-tbl-pagination">
          <span className="alloc-pg-info">
            {page * rowsPerPage + 1}–
            {Math.min((page + 1) * rowsPerPage, sorted.length)} of{" "}
            {sorted.length}
          </span>
          <div className="alloc-pg-controls">
            <select
              className="alloc-pg-select"
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setPage(0);
              }}
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n} / page
                </option>
              ))}
            </select>
            <button
              className="alloc-pg-btn"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              ‹
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let pageNum;
              if (totalPages <= 7) pageNum = i;
              else if (page < 4) pageNum = i;
              else if (page > totalPages - 4) pageNum = totalPages - 7 + i;
              else pageNum = page - 3 + i;
              return (
                <button
                  key={pageNum}
                  className={`alloc-pg-btn ${page === pageNum ? "alloc-pg-active" : ""}`}
                  onClick={() => setPage(pageNum)}
                >
                  {pageNum + 1}
                </button>
              );
            })}
            <button
              className="alloc-pg-btn"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllocationTable;
