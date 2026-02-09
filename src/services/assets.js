import client from "./api_client";

/**
 * Generates per-day mock cost snapshots for an asset over a date range.
 * Returns array of { date: "2026-02-01", cost, cpuCost, ramCost, ... }
 * This lets the dashboard charts display real timestamped data.
 */
function generateDailySnapshots(totalCost, days, startDate, extra = {}) {
  const snapshots = [];
  const base = totalCost / days;
  for (let i = 0; i < days; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    // Deterministic daily variance using a simple sine wave
    const variance =
      1 + Math.sin(i * 1.8 + days) * 0.18 + Math.cos(i * 0.7) * 0.08;
    const dayCost = Math.max(0, base * variance);
    const snap = {
      date: d.toISOString().slice(0, 10),
      cost: Number(dayCost.toFixed(4)),
    };
    // Spread cost sub-components proportionally
    if (extra.cpuCost)
      snap.cpuCost = Number(((extra.cpuCost / days) * variance).toFixed(4));
    if (extra.ramCost)
      snap.ramCost = Number(((extra.ramCost / days) * variance).toFixed(4));
    if (extra.gpuCost)
      snap.gpuCost = Number(((extra.gpuCost / days) * variance).toFixed(4));
    snapshots.push(snap);
  }
  return snapshots;
}

/**
 * Compute a { start, end, days } range from a window string.
 * Mirrors the real OpenCost API behaviour for each window keyword.
 */
function windowToRange(win) {
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);

  let start, end, days;

  switch (win) {
    case "month": {
      // Entire window - current calendar month
      start = new Date(now);
      start.setUTCDate(1);
      end = new Date(now);
      end.setUTCMonth(end.getUTCMonth() + 1);
      end.setUTCDate(1);
      days = Math.ceil((end - start) / 86400000);
      break;
    }
    case "today": {
      start = new Date(now);
      end = new Date(now);
      end.setUTCDate(end.getUTCDate() + 1);
      days = 1;
      break;
    }
    case "yesterday": {
      end = new Date(now);
      start = new Date(now);
      start.setUTCDate(start.getUTCDate() - 1);
      days = 1;
      break;
    }
    case "24h": {
      end = new Date(now);
      end.setUTCDate(end.getUTCDate() + 1);
      start = new Date(now);
      days = 1;
      break;
    }
    case "48h": {
      end = new Date(now);
      end.setUTCDate(end.getUTCDate() + 1);
      start = new Date(now);
      start.setUTCDate(start.getUTCDate() - 1);
      days = 2;
      break;
    }
    case "week": {
      start = new Date(now);
      start.setUTCDate(start.getUTCDate() - start.getUTCDay());
      end = new Date(now);
      end.setUTCDate(end.getUTCDate() + 1);
      days = Math.max(1, Math.ceil((end - start) / 86400000));
      break;
    }
    case "lastweek": {
      end = new Date(now);
      end.setUTCDate(end.getUTCDate() - end.getUTCDay());
      start = new Date(end);
      start.setUTCDate(start.getUTCDate() - 7);
      days = 7;
      break;
    }
    case "14d": {
      end = new Date(now);
      end.setUTCDate(end.getUTCDate() + 1);
      start = new Date(now);
      start.setUTCDate(start.getUTCDate() - 13);
      days = 14;
      break;
    }
    case "7d":
    default: {
      end = new Date(now);
      end.setUTCDate(end.getUTCDate() + 1);
      start = new Date(now);
      start.setUTCDate(start.getUTCDate() - 6);
      days = 7;
      break;
    }
  }

  return {
    start,
    end,
    days,
    winStart: start.toISOString(),
    winEnd: end.toISOString(),
  };
}

/**
 * Scale a base 7-day cost to the requested window duration.
 * This gives visually different data for each window.
 */
function scaleCost(baseCost, days) {
  return Number(((baseCost / 7) * days).toFixed(4));
}

/**
 * Mock asset data matching the real /assets API response format.
 * Covers all 6 asset types: Node, Disk, LoadBalancer, Network, Cloud, ClusterManagement.
 * Structure mirrors: https://www.opencost.io/docs/integrations/api-examples#assets-example
 *
 * Each asset now includes a `dailyCosts` array with timestamped cost data for charts.
 * The window parameter controls the date range and scales costs accordingly.
 */
function getMockAssets(win) {
  const { start: startD, days, winStart, winEnd } = windowToRange(win);
  const minutes = days * 1440;

  return {
    "GCP/__undefined__/demo-project/Compute/demo-cluster/Node/Kubernetes/gke-demo-pool-a1b2c3d4-x1y2/gke-demo-pool-a1b2c3d4-x1y2":
      {
        type: "Node",
        properties: {
          category: "Compute",
          provider: "GCP",
          account: "demo-gcp-account",
          project: "demo-project",
          service: "Kubernetes",
          cluster: "demo-cluster",
          name: "gke-demo-pool-a1b2c3d4-x1y2",
          providerID: "gke-demo-pool-a1b2c3d4-x1y2",
        },
        labels: {
          kubernetes_io_arch: "amd64",
          kubernetes_io_os: "linux",
          node_kubernetes_io_instance_type: "e2-medium",
          topology_kubernetes_io_region: "us-central1",
          topology_kubernetes_io_zone: "us-central1-a",
          cloud_google_com_gke_nodepool: "demo-pool",
        },
        window: { start: winStart, end: winEnd },
        start: winStart,
        end: winEnd,
        minutes,
        nodeType: "e2-medium",
        pool: "demo-pool",
        cpuCores: 2,
        ramBytes: 4294967296,
        cpuCoreHours: scaleCost(336, days),
        ramByteHours: scaleCost(1441151880806.4, days),
        GPUHours: 0,
        cpuBreakdown: { idle: 0.62, other: 0.03, system: 0.12, user: 0.23 },
        ramBreakdown: { idle: 0.45, other: 0.05, system: 0.18, user: 0.32 },
        preemptible: 0,
        discount: 0.3,
        cpuCost: scaleCost(8.42, days),
        gpuCost: 0,
        gpuCount: 0,
        ramCost: scaleCost(4.18, days),
        adjustment: scaleCost(-0.25, days),
        totalCost: scaleCost(12.35, days),
        overhead: {
          cpuOverheadFraction: 0.06,
          ramOverheadFraction: 0.09,
          overheadCostFraction: 0.075,
        },
        dailyCosts: generateDailySnapshots(
          scaleCost(12.35, days),
          days,
          startD,
          {
            cpuCost: scaleCost(8.42, days),
            ramCost: scaleCost(4.18, days),
          },
        ),
      },
    "GCP/__undefined__/demo-project/Compute/demo-cluster/Node/Kubernetes/gke-demo-pool-e5f6g7h8-a3b4/gke-demo-pool-e5f6g7h8-a3b4":
      {
        type: "Node",
        properties: {
          category: "Compute",
          provider: "GCP",
          account: "demo-gcp-account",
          project: "demo-project",
          service: "Kubernetes",
          cluster: "demo-cluster",
          name: "gke-demo-pool-e5f6g7h8-a3b4",
          providerID: "gke-demo-pool-e5f6g7h8-a3b4",
        },
        labels: {
          kubernetes_io_arch: "amd64",
          kubernetes_io_os: "linux",
          node_kubernetes_io_instance_type: "e2-standard-4",
          topology_kubernetes_io_region: "us-central1",
          topology_kubernetes_io_zone: "us-central1-b",
          cloud_google_com_gke_nodepool: "demo-pool",
        },
        window: { start: winStart, end: winEnd },
        start: winStart,
        end: winEnd,
        minutes,
        nodeType: "e2-standard-4",
        pool: "demo-pool",
        cpuCores: 4,
        ramBytes: 17179869184,
        cpuCoreHours: scaleCost(672, days),
        ramByteHours: scaleCost(5764607523034.112, days),
        GPUHours: 0,
        cpuBreakdown: { idle: 0.35, other: 0.05, system: 0.15, user: 0.45 },
        ramBreakdown: { idle: 0.28, other: 0.02, system: 0.2, user: 0.5 },
        preemptible: 0,
        discount: 0.3,
        cpuCost: scaleCost(16.84, days),
        gpuCost: 0,
        gpuCount: 0,
        ramCost: scaleCost(16.72, days),
        adjustment: scaleCost(-0.5, days),
        totalCost: scaleCost(33.06, days),
        overhead: {
          cpuOverheadFraction: 0.04,
          ramOverheadFraction: 0.07,
          overheadCostFraction: 0.055,
        },
        dailyCosts: generateDailySnapshots(
          scaleCost(33.06, days),
          days,
          startD,
          {
            cpuCost: scaleCost(16.84, days),
            ramCost: scaleCost(16.72, days),
          },
        ),
      },
    "AWS/__undefined__/prod-account/Compute/prod-cluster/Node/Kubernetes/ip-10-0-1-42.ec2.internal/ip-10-0-1-42.ec2.internal":
      {
        type: "Node",
        properties: {
          category: "Compute",
          provider: "AWS",
          account: "prod-account",
          project: "prod-account",
          service: "Kubernetes",
          cluster: "prod-cluster",
          name: "ip-10-0-1-42.ec2.internal",
          providerID: "i-0abc123def456789a",
        },
        labels: {
          kubernetes_io_arch: "amd64",
          kubernetes_io_os: "linux",
          node_kubernetes_io_instance_type: "m5.xlarge",
          topology_kubernetes_io_region: "us-east-1",
          topology_kubernetes_io_zone: "us-east-1a",
          eks_amazonaws_com_nodegroup: "prod-workers",
        },
        window: { start: winStart, end: winEnd },
        start: winStart,
        end: winEnd,
        minutes,
        nodeType: "m5.xlarge",
        pool: "prod-workers",
        cpuCores: 4,
        ramBytes: 17179869184,
        cpuCoreHours: scaleCost(672, days),
        ramByteHours: scaleCost(5764607523034.112, days),
        GPUHours: 0,
        cpuBreakdown: { idle: 0.2, other: 0.05, system: 0.1, user: 0.65 },
        ramBreakdown: { idle: 0.15, other: 0.05, system: 0.1, user: 0.7 },
        preemptible: 0,
        discount: 0,
        cpuCost: scaleCost(22.68, days),
        gpuCost: 0,
        gpuCount: 0,
        ramCost: scaleCost(18.14, days),
        adjustment: 0,
        totalCost: scaleCost(40.82, days),
        overhead: {
          cpuOverheadFraction: 0.05,
          ramOverheadFraction: 0.08,
          overheadCostFraction: 0.065,
        },
        dailyCosts: generateDailySnapshots(
          scaleCost(40.82, days),
          days,
          startD,
          {
            cpuCost: scaleCost(22.68, days),
            ramCost: scaleCost(18.14, days),
          },
        ),
      },
    "GCP/__undefined__/demo-project/Storage/demo-cluster/Disk/Kubernetes/pvc-abc123/pvc-abc123":
      {
        type: "Disk",
        properties: {
          category: "Storage",
          provider: "GCP",
          project: "demo-project",
          service: "Kubernetes",
          cluster: "demo-cluster",
          name: "pvc-abc123",
          providerID: "pvc-abc123",
        },
        labels: {},
        window: { start: winStart, end: winEnd },
        start: winStart,
        end: winEnd,
        minutes,
        byteHours: scaleCost(1443109011456, days),
        bytes: 10737418240,
        byteHoursUsed: scaleCost(432932703436.8, days),
        byteUsageMax: 3221225472,
        breakdown: { idle: 0.7, other: 0, system: 0.1, user: 0.2 },
        adjustment: 0,
        totalCost: scaleCost(1.47, days),
        storageClass: "standard-rwo",
        volumeName: "pvc-abc123",
        claimName: "prometheus-server",
        claimNamespace: "prometheus-system",
        local: 0,
        dailyCosts: generateDailySnapshots(scaleCost(1.47, days), days, startD),
      },
    "GCP/__undefined__/demo-project/Storage/demo-cluster/Disk/Kubernetes/pvc-def456/pvc-def456":
      {
        type: "Disk",
        properties: {
          category: "Storage",
          provider: "GCP",
          project: "demo-project",
          service: "Kubernetes",
          cluster: "demo-cluster",
          name: "pvc-def456",
          providerID: "pvc-def456",
        },
        labels: {},
        window: { start: winStart, end: winEnd },
        start: winStart,
        end: winEnd,
        minutes,
        byteHours: scaleCost(5772436045824, days),
        bytes: 53687091200,
        byteHoursUsed: scaleCost(2886218022912, days),
        byteUsageMax: 26843545600,
        breakdown: { idle: 0.5, other: 0, system: 0, user: 0.5 },
        adjustment: 0,
        totalCost: scaleCost(5.88, days),
        storageClass: "pd-ssd",
        volumeName: "pvc-def456",
        claimName: "data-postgres-0",
        claimNamespace: "database",
        local: 0,
        dailyCosts: generateDailySnapshots(scaleCost(5.88, days), days, startD),
      },
    "AWS/__undefined__/prod-account/Network/prod-cluster/LoadBalancer/Kubernetes/ab1234-elb/ab1234-elb":
      {
        type: "LoadBalancer",
        properties: {
          category: "Network",
          provider: "AWS",
          project: "prod-account",
          service: "Kubernetes",
          cluster: "prod-cluster",
          name: "ab1234-elb",
          providerID: "ab1234-elb",
        },
        labels: {},
        window: { start: winStart, end: winEnd },
        start: winStart,
        end: winEnd,
        minutes,
        adjustment: 0,
        totalCost: scaleCost(18.14, days),
        private: false,
        ip: "52.14.23.189",
        dailyCosts: generateDailySnapshots(
          scaleCost(18.14, days),
          days,
          startD,
        ),
      },
    "GCP/__undefined__/demo-project/Network/demo-cluster/Network/Kubernetes/__unmounted__/__unmounted__":
      {
        type: "Network",
        properties: {
          category: "Network",
          provider: "GCP",
          project: "demo-project",
          service: "Kubernetes",
          cluster: "demo-cluster",
          name: "__unmounted__",
          providerID: "__unmounted__",
        },
        labels: {},
        window: { start: winStart, end: winEnd },
        start: winStart,
        end: winEnd,
        minutes,
        adjustment: 0,
        totalCost: scaleCost(2.34, days),
        dailyCosts: generateDailySnapshots(scaleCost(2.34, days), days, startD),
      },
    "GCP/__undefined__/demo-project/Management/demo-cluster/ClusterManagement/Kubernetes/demo-cluster/demo-cluster":
      {
        type: "ClusterManagement",
        properties: {
          category: "Management",
          provider: "GCP",
          project: "demo-project",
          service: "Kubernetes",
          cluster: "demo-cluster",
          name: "demo-cluster",
          providerID: "demo-cluster",
        },
        labels: {},
        window: { start: winStart, end: winEnd },
        start: winStart,
        end: winEnd,
        minutes,
        adjustment: 0,
        totalCost: scaleCost(24.36, days),
        dailyCosts: generateDailySnapshots(
          scaleCost(24.36, days),
          days,
          startD,
        ),
      },
    "AWS/__undefined__/prod-account/Other/prod-cluster/Cloud/AWS/nat-gateway-prod/nat-gateway-prod":
      {
        type: "Cloud",
        properties: {
          category: "Other",
          provider: "AWS",
          project: "prod-account",
          service: "AWS",
          cluster: "prod-cluster",
          name: "nat-gateway-prod",
          providerID: "nat-gateway-prod",
        },
        labels: {},
        window: { start: winStart, end: winEnd },
        start: winStart,
        end: winEnd,
        minutes,
        adjustment: 0,
        credit: scaleCost(-1.25, days),
        totalCost: scaleCost(6.72, days),
        dailyCosts: generateDailySnapshots(scaleCost(6.72, days), days, startD),
      },
  };
}

class AssetsService {
  /**
   * Fetches asset data from the OpenCost API.
   * @param {string} win - Time window (e.g., "7d", "today", "lastweek")
   * @returns {Promise<{data: object, isMock: boolean}>}
   */
  async fetchAssets(win) {
    const params = { window: win };

    try {
      const result = await client.get("/model/assets", { params });
      return { data: result.data, isMock: false };
    } catch (error) {
      console.warn(
        "Assets API unavailable, using mock data for development:",
        error.message,
      );
      return {
        data: { code: 200, data: [getMockAssets(win)] },
        isMock: true,
      };
    }
  }
}

export default new AssetsService();
