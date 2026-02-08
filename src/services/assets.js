import client from "./api_client";

/**
 * Mock asset data matching the real /assets API response format.
 * Covers all 6 asset types: Node, Disk, LoadBalancer, Network, Cloud, ClusterManagement.
 * Structure mirrors: https://www.opencost.io/docs/integrations/api-examples#assets-example
 */
function getMockAssets() {
  return {
    "GCP/__undefined__/demo-project/Compute/demo-cluster/Node/Kubernetes/gke-demo-pool-a1b2c3d4-x1y2/gke-demo-pool-a1b2c3d4-x1y2":
      {
        type: "Node",
        properties: {
          category: "Compute",
          provider: "GCP",
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
        },
        window: { start: "2026-02-01T00:00:00Z", end: "2026-02-08T00:00:00Z" },
        start: "2026-02-01T00:00:00Z",
        end: "2026-02-08T00:00:00Z",
        minutes: 10080,
        nodeType: "e2-medium",
        cpuCores: 2,
        ramBytes: 4294967296,
        cpuCoreHours: 336,
        ramByteHours: 1441151880806.4,
        GPUHours: 0,
        cpuBreakdown: { idle: 0.62, other: 0.03, system: 0.12, user: 0.23 },
        ramBreakdown: { idle: 0.45, other: 0.05, system: 0.18, user: 0.32 },
        preemptible: 0,
        discount: 0.3,
        cpuCost: 8.42,
        gpuCost: 0,
        gpuCount: 0,
        ramCost: 4.18,
        adjustment: -0.25,
        totalCost: 12.35,
      },
    "GCP/__undefined__/demo-project/Compute/demo-cluster/Node/Kubernetes/gke-demo-pool-e5f6g7h8-a3b4/gke-demo-pool-e5f6g7h8-a3b4":
      {
        type: "Node",
        properties: {
          category: "Compute",
          provider: "GCP",
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
        },
        window: { start: "2026-02-01T00:00:00Z", end: "2026-02-08T00:00:00Z" },
        start: "2026-02-01T00:00:00Z",
        end: "2026-02-08T00:00:00Z",
        minutes: 10080,
        nodeType: "e2-standard-4",
        cpuCores: 4,
        ramBytes: 17179869184,
        cpuCoreHours: 672,
        ramByteHours: 5764607523034.112,
        GPUHours: 0,
        cpuBreakdown: { idle: 0.35, other: 0.05, system: 0.15, user: 0.45 },
        ramBreakdown: { idle: 0.28, other: 0.02, system: 0.2, user: 0.5 },
        preemptible: 0,
        discount: 0.3,
        cpuCost: 16.84,
        gpuCost: 0,
        gpuCount: 0,
        ramCost: 16.72,
        adjustment: -0.5,
        totalCost: 33.06,
      },
    "AWS/__undefined__/prod-account/Compute/prod-cluster/Node/Kubernetes/ip-10-0-1-42.ec2.internal/ip-10-0-1-42.ec2.internal":
      {
        type: "Node",
        properties: {
          category: "Compute",
          provider: "AWS",
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
        },
        window: { start: "2026-02-01T00:00:00Z", end: "2026-02-08T00:00:00Z" },
        start: "2026-02-01T00:00:00Z",
        end: "2026-02-08T00:00:00Z",
        minutes: 10080,
        nodeType: "m5.xlarge",
        cpuCores: 4,
        ramBytes: 17179869184,
        cpuCoreHours: 672,
        ramByteHours: 5764607523034.112,
        GPUHours: 0,
        cpuBreakdown: { idle: 0.2, other: 0.05, system: 0.1, user: 0.65 },
        ramBreakdown: { idle: 0.15, other: 0.05, system: 0.1, user: 0.7 },
        preemptible: 0,
        discount: 0,
        cpuCost: 22.68,
        gpuCost: 0,
        gpuCount: 0,
        ramCost: 18.14,
        adjustment: 0,
        totalCost: 40.82,
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
        window: { start: "2026-02-01T00:00:00Z", end: "2026-02-08T00:00:00Z" },
        start: "2026-02-01T00:00:00Z",
        end: "2026-02-08T00:00:00Z",
        minutes: 10080,
        byteHours: 1443109011456,
        bytes: 10737418240,
        byteHoursUsed: 432932703436.8,
        byteUsageMax: 3221225472,
        breakdown: { idle: 0.7, other: 0, system: 0.1, user: 0.2 },
        adjustment: 0,
        totalCost: 1.47,
        storageClass: "standard-rwo",
        volumeName: "pvc-abc123",
        claimName: "prometheus-server",
        claimNamespace: "prometheus-system",
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
        window: { start: "2026-02-01T00:00:00Z", end: "2026-02-08T00:00:00Z" },
        start: "2026-02-01T00:00:00Z",
        end: "2026-02-08T00:00:00Z",
        minutes: 10080,
        byteHours: 5772436045824,
        bytes: 53687091200,
        byteHoursUsed: 2886218022912,
        byteUsageMax: 26843545600,
        breakdown: { idle: 0.5, other: 0, system: 0, user: 0.5 },
        adjustment: 0,
        totalCost: 5.88,
        storageClass: "pd-ssd",
        volumeName: "pvc-def456",
        claimName: "data-postgres-0",
        claimNamespace: "database",
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
        window: { start: "2026-02-01T00:00:00Z", end: "2026-02-08T00:00:00Z" },
        start: "2026-02-01T00:00:00Z",
        end: "2026-02-08T00:00:00Z",
        minutes: 10080,
        adjustment: 0,
        totalCost: 18.14,
        private: false,
        ip: "52.14.23.189",
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
        window: { start: "2026-02-01T00:00:00Z", end: "2026-02-08T00:00:00Z" },
        start: "2026-02-01T00:00:00Z",
        end: "2026-02-08T00:00:00Z",
        minutes: 10080,
        adjustment: 0,
        totalCost: 2.34,
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
        window: { start: "2026-02-01T00:00:00Z", end: "2026-02-08T00:00:00Z" },
        start: "2026-02-01T00:00:00Z",
        end: "2026-02-08T00:00:00Z",
        minutes: 10080,
        adjustment: 0,
        totalCost: 24.36,
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
        window: { start: "2026-02-01T00:00:00Z", end: "2026-02-08T00:00:00Z" },
        start: "2026-02-01T00:00:00Z",
        end: "2026-02-08T00:00:00Z",
        minutes: 10080,
        adjustment: 0,
        totalCost: 6.72,
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
        data: { code: 200, data: [getMockAssets()] },
        isMock: true,
      };
    }
  }
}

export default new AssetsService();
