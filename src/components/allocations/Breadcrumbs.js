import React from "react";

const Breadcrumbs = ({ filters, aggregateBy, onNavigate }) => {
  if (!filters || filters.length === 0) return null;
  return (
    <div className="alloc-breadcrumbs">
      <button className="alloc-bc-item" onClick={() => onNavigate(-1)}>
        All Results
      </button>
      {filters.map((f, i) => (
        <React.Fragment key={i}>
          <span className="alloc-bc-sep">›</span>
          <button
            className="alloc-bc-item alloc-bc-item--active"
            onClick={() => onNavigate(i)}
          >
            {f.value}
          </button>
        </React.Fragment>
      ))}
      <span className="alloc-bc-sep">›</span>
      <span className="alloc-bc-current">{aggregateBy}</span>
    </div>
  );
};

export default Breadcrumbs;
