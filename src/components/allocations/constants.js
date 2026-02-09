export const ALLOC_COLORS = [
  "#0f62fe",
  "#009d9a",
  "#8a3ffc",
  "#d12771",
  "#ee5396",
  "#1192e8",
  "#fa4d56",
  "#42be65",
  "#6929c4",
  "#ff832b",
  "#b28600",
  "#a56eff",
];

export const COST_COLORS = {
  cpuCost: "#0f62fe",
  gpuCost: "#8a3ffc",
  ramCost: "#009d9a",
  pvCost: "#1192e8",
  networkCost: "#ee5396",
};

export const REFRESH_INTERVAL = 60000;

export const drilldownHierarchy = {
  namespace: "controllerKind",
  controllerKind: "controller",
  controller: "pod",
  pod: "container",
};

export const filterPropertyMap = {
  namespace: "namespace",
  controllerKind: "controllerKind",
  controller: "controllerName",
  pod: "pod",
  container: "container",
};
