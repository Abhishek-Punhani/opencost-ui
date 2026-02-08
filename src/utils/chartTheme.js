/**
 * Helper function to get chart theme colors based on current theme
 */
export const getChartTheme = () => {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";

  return {
    grid: isDark ? "#333333" : "#e5e7eb",
    text: isDark ? "#a3a3a3" : "#737373",
    tooltipBg: isDark ? "#262626" : "#ffffff",
    tooltipBorder: isDark ? "#404040" : "#e5e7eb",
    tooltipText: isDark ? "#e5e5e5" : "#1a1a1a",
  };
};

export const TYPE_COLORS = {
  Node: "#0f62fe",
  Disk: "#009d9a",
  LoadBalancer: "#8a3ffc",
  Network: "#1192e8",
  ClusterManagement: "#8d8d8d",
  Cloud: "#d12771",
};

export const COST_COLORS = {
  cpuCost: "#0f62fe",
  ramCost: "#009d9a",
  gpuCost: "#8a3ffc",
  storageCost: "#1192e8",
  networkCost: "#ee5396",
  lbCost: "#6929c4",
  adjustment: "#fa4d56",
  credit: "#42be65",
};
