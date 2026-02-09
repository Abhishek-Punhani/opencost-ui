import { Dropdown } from "@carbon/react";

import * as React from "react";

import SelectWindow from "../../SelectWindow";

function EditCloudCostControls({
  windowOptions,
  window,
  setWindow,
  aggregationOptions,
  aggregateBy,
  setAggregateBy,
  costMetricOptions,
  costMetric,
  setCostMetric,
  currencyOptions,
  currency,
  setCurrency,
}) {
  return (
    <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
      <SelectWindow
        windowOptions={windowOptions}
        window={window}
        setWindow={setWindow}
      />
      <Dropdown
        id="aggregation-select"
        titleText="Breakdown"
        label={
          aggregationOptions.find((o) => o.value === aggregateBy)?.name ||
          "Select"
        }
        items={aggregationOptions}
        itemToString={(item) => (item ? item.name : "")}
        selectedItem={aggregationOptions.find((o) => o.value === aggregateBy)}
        onChange={({ selectedItem }) =>
          selectedItem && setAggregateBy(selectedItem.value)
        }
        size="sm"
      />
      <Dropdown
        id="cost-metric-select"
        titleText="Cost Metric"
        label={
          costMetricOptions.find((o) => o.value === costMetric)?.name ||
          "Select"
        }
        items={costMetricOptions}
        itemToString={(item) => (item ? item.name : "")}
        selectedItem={costMetricOptions.find((o) => o.value === costMetric)}
        onChange={({ selectedItem }) =>
          selectedItem && setCostMetric(selectedItem.value)
        }
        size="sm"
      />
      <Dropdown
        id="currency-select"
        titleText="Currency"
        label={currency}
        items={currencyOptions?.map((c) => ({ value: c, name: c })) || []}
        itemToString={(item) => (item ? item.name : "")}
        selectedItem={{ value: currency, name: currency }}
        onChange={({ selectedItem }) =>
          selectedItem && setCurrency(selectedItem.value)
        }
        size="sm"
      />
    </div>
  );
}

export default React.memo(EditCloudCostControls);
