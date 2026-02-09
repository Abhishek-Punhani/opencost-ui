import { Dropdown } from "@carbon/react";

import * as React from "react";

import SelectWindow from "../../components/SelectWindow";
import {
  windowOptions,
  aggregationOptions,
  costTypeOptions,
} from "../../components/externalCosts/tokens";

function ExternalCostsControls({
  window,
  setWindow,
  aggregateBy,
  setAggregateBy,
  costType,
  setCostType,
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
        id="cost-type-select"
        titleText="Cost Type"
        label={
          costTypeOptions.find((o) => o.value === costType)?.name || "Select"
        }
        items={costTypeOptions}
        itemToString={(item) => (item ? item.name : "")}
        selectedItem={costTypeOptions.find((o) => o.value === costType)}
        onChange={({ selectedItem }) =>
          selectedItem && setCostType(selectedItem.value)
        }
        size="sm"
      />
    </div>
  );
}

export default React.memo(ExternalCostsControls);
