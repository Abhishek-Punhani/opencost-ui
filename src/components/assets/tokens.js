/**
 * Constants and configuration for the Assets page.
 * Follows the tokens pattern used by cloudCost/tokens.js and externalCosts/tokens.js.
 */

export const windowOptions = [
  { name: "Entire window", value: "month" },
  { name: "Today", value: "today" },
  { name: "Yesterday", value: "yesterday" },
  { name: "Last 24h", value: "24h" },
  { name: "Last 48h", value: "48h" },
  { name: "Week-to-date", value: "week" },
  { name: "Last week", value: "lastweek" },
  { name: "Last 7 days", value: "7d" },
  { name: "Last 14 days", value: "14d" },
];

export const assetTypeTabs = [
  { key: "all", label: "All Assets" },
  { key: "Node", label: "Nodes" },
  { key: "Disk", label: "Disks" },
  { key: "LoadBalancer", label: "Load Balancers" },
  { key: "Network", label: "Network" },
  { key: "ClusterManagement", label: "Management" },
  { key: "Cloud", label: "Cloud" },
];

// Maps asset type to a Carbon Tag color for visual distinction
export const assetTypeTagColor = {
  Node: "blue",
  Disk: "teal",
  LoadBalancer: "purple",
  Network: "cyan",
  ClusterManagement: "warm-gray",
  Cloud: "magenta",
};

// Maps asset category to a human-readable label
export const categoryLabels = {
  Compute: "Compute",
  Storage: "Storage",
  Network: "Network",
  Management: "Management",
  Other: "Other",
};

// Table column definitions for the main assets table
export const tableHeaders = [
  { key: "name", header: "Name" },
  { key: "type", header: "Type" },
  { key: "category", header: "Category" },
  { key: "provider", header: "Provider" },
  { key: "cluster", header: "Cluster" },
  { key: "totalCost", header: "Total Cost" },
];
