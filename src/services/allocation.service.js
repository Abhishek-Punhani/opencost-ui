/**
 * Allocation Service — wraps /allocation/compute API with rich mock fallback.
 *
 * The OpenCost backend endpoint:
 *   GET /allocation/compute?window=7d&aggregate=namespace&step=1d&includeIdle=true
 *
 * Response shape (range mode): { data: [ AllocationSet, ... ] }
 *   AllocationSet = [ { name, cpuCost, gpuCost, ramCost, pvCost, networkCost,
 *                       sharedCost, externalCost, totalCost, cpuEfficiency,
 *                       ramEfficiency, totalEfficiency, minutes, ... }, ... ]
 *
 * When the backend is not reachable we generate realistic mock data that
 * matches this shape so the UI can be developed / demoed standalone.
 */

import client from "./api_client";
import { parseFilters } from "../util";

/* ═══════════════════════════════════════════════════════════════════
   Window → Date helpers (shared with assets service)
   ═══════════════════════════════════════════════════════════════════ */

function windowToRange(win) {
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  let start, end, days;

  switch (win) {
    case "month": {
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

function sc(base7d, days) {
  return Number(((base7d / 7) * days).toFixed(4));
}

/* ═══════════════════════════════════════════════════════════════════
   Mock data generator — realistic Kubernetes allocation data
   ═══════════════════════════════════════════════════════════════════ */

const NAMESPACE_DEFS = [
  {
    name: "production",
    cpu: 52.1,
    gpu: 0,
    ram: 40.5,
    pv: 12.3,
    net: 3.2,
    eff: 0.78,
  },
  {
    name: "folding-at-home",
    cpu: 51.55,
    gpu: 322.18,
    ram: 12.08,
    pv: 0,
    net: 0.01,
    eff: 0.82,
  },
  { name: "__idle__", cpu: 157.83, gpu: 0, ram: 108.66, pv: 0, net: 0, eff: 0 },
  {
    name: "prometheus-system",
    cpu: 14.83,
    gpu: 0,
    ram: 1.03,
    pv: 0.27,
    net: 0.01,
    eff: 0.062,
  },
  {
    name: "kube-system",
    cpu: 12.25,
    gpu: 0,
    ram: 0.76,
    pv: 0,
    net: 0.03,
    eff: 0.087,
  },
  {
    name: "load-generator",
    cpu: 10.87,
    gpu: 0,
    ram: 0.44,
    pv: 0,
    net: 0.34,
    eff: 0.568,
  },
  {
    name: "opencost",
    cpu: 1.77,
    gpu: 0,
    ram: 0.9,
    pv: 0,
    net: 0.01,
    eff: 0.42,
  },
  { name: "default", cpu: 0.42, gpu: 0, ram: 0.18, pv: 0, net: 0, eff: 0.15 },
  {
    name: "ingress-nginx",
    cpu: 3.45,
    gpu: 0,
    ram: 1.22,
    pv: 0,
    net: 1.8,
    eff: 0.55,
  },
  {
    name: "cert-manager",
    cpu: 0.88,
    gpu: 0,
    ram: 0.32,
    pv: 0,
    net: 0.01,
    eff: 0.35,
  },
  { name: "logging", cpu: 5.2, gpu: 0, ram: 8.4, pv: 6.5, net: 0.1, eff: 0.72 },
  {
    name: "database",
    cpu: 18.3,
    gpu: 0,
    ram: 24.6,
    pv: 15.8,
    net: 0.5,
    eff: 0.68,
  },
];

const CONTROLLER_MAP = {
  production: [
    { name: "deployment:api-gateway", cpu: 18.4, ram: 12.2, pv: 0, eff: 0.82 },
    { name: "deployment:web-frontend", cpu: 12.8, ram: 10.3, pv: 0, eff: 0.75 },
    { name: "deployment:auth-service", cpu: 8.5, ram: 6.8, pv: 0, eff: 0.79 },
    {
      name: "statefulset:redis-cluster",
      cpu: 6.2,
      ram: 5.6,
      pv: 8.3,
      eff: 0.7,
    },
    { name: "deployment:worker-pool", cpu: 6.2, ram: 5.6, pv: 4.0, eff: 0.8 },
  ],
  "kube-system": [
    { name: "daemonset:kube-proxy", cpu: 4.1, ram: 0.3, pv: 0, eff: 0.12 },
    { name: "deployment:coredns", cpu: 3.8, ram: 0.26, pv: 0, eff: 0.09 },
    {
      name: "deployment:metrics-server",
      cpu: 2.15,
      ram: 0.1,
      pv: 0,
      eff: 0.06,
    },
    { name: "daemonset:fluentd", cpu: 2.2, ram: 0.1, pv: 0, eff: 0.05 },
  ],
  database: [
    {
      name: "statefulset:postgres-primary",
      cpu: 10.5,
      ram: 16.4,
      pv: 10.8,
      eff: 0.72,
    },
    {
      name: "statefulset:postgres-replica",
      cpu: 7.8,
      ram: 8.2,
      pv: 5.0,
      eff: 0.64,
    },
  ],
  logging: [
    { name: "daemonset:fluentbit", cpu: 2.8, ram: 3.2, pv: 0, eff: 0.68 },
    {
      name: "statefulset:elasticsearch",
      cpu: 2.4,
      ram: 5.2,
      pv: 6.5,
      eff: 0.76,
    },
  ],
};

const POD_MAP = {
  "deployment:api-gateway": [
    { name: "api-gateway-7b8f9c6d5-x2k4m", cpu: 6.2, ram: 4.1, eff: 0.84 },
    { name: "api-gateway-7b8f9c6d5-a8b2n", cpu: 6.1, ram: 4.05, eff: 0.81 },
    { name: "api-gateway-7b8f9c6d5-c3d7p", cpu: 6.1, ram: 4.05, eff: 0.8 },
  ],
  "deployment:web-frontend": [
    { name: "web-frontend-5f4e3d2c1-q9w8e", cpu: 6.4, ram: 5.15, eff: 0.76 },
    { name: "web-frontend-5f4e3d2c1-r7t6y", cpu: 6.4, ram: 5.15, eff: 0.74 },
  ],
};

function buildAlloc(def, days, winStart, winEnd) {
  const total =
    (def.cpu || 0) +
    (def.gpu || 0) +
    (def.ram || 0) +
    (def.pv || 0) +
    (def.net || 0);
  return {
    name: def.name,
    cpuCost: sc(def.cpu || 0, days),
    gpuCost: sc(def.gpu || 0, days),
    ramCost: sc(def.ram || 0, days),
    pvCost: sc(def.pv || 0, days),
    networkCost: sc(def.net || 0, days),
    sharedCost: 0,
    externalCost: 0,
    totalCost: sc(total, days),
    cpuEfficiency: def.eff * (0.9 + Math.random() * 0.2),
    ramEfficiency: def.eff * (0.85 + Math.random() * 0.3),
    totalEfficiency: def.eff,
    minutes: days * 1440,
    cpuCoreRequestAverage: ((def.cpu || 0) / 24) * 0.8,
    cpuCoreUsageAverage: ((def.cpu || 0) / 24) * 0.8 * (def.eff || 0.5),
    ramByteRequestAverage: (def.ram || 0) * 1e8,
    ramByteUsageAverage: (def.ram || 0) * 1e8 * (def.eff || 0.5),
    window: { start: winStart, end: winEnd },
    start: winStart,
    end: winEnd,
  };
}

function generateDailyRange(defs, days, startDate, winStart, winEnd) {
  const range = [];
  for (let d = 0; d < days; d++) {
    const date = new Date(startDate);
    date.setUTCDate(date.getUTCDate() + d);
    const dayStart = date.toISOString();
    const dayEnd = new Date(date);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
    const allocSet = defs.map((def) => {
      const variance = 1 + Math.sin(d * 1.5 + defs.indexOf(def) * 0.7) * 0.15;
      return {
        ...buildAlloc(def, 1, dayStart, dayEnd.toISOString()),
        cpuCost: Number((((def.cpu || 0) / 7) * variance).toFixed(4)),
        gpuCost: Number((((def.gpu || 0) / 7) * variance).toFixed(4)),
        ramCost: Number((((def.ram || 0) / 7) * variance).toFixed(4)),
        pvCost: Number((((def.pv || 0) / 7) * variance).toFixed(4)),
        networkCost: Number((((def.net || 0) / 7) * variance).toFixed(4)),
        totalCost: Number(
          (
            (((def.cpu || 0) +
              (def.gpu || 0) +
              (def.ram || 0) +
              (def.pv || 0) +
              (def.net || 0)) /
              7) *
            variance
          ).toFixed(4),
        ),
        minutes: 1440,
      };
    });
    range.push(allocSet);
  }
  return range;
}

function getMockAllocations(win, aggregate, options = {}) {
  const { start: startD, days, winStart, winEnd } = windowToRange(win);
  const { accumulate = false, filters = [] } = options;

  let defs;
  switch (aggregate) {
    case "controllerKind": {
      const kinds = {};
      Object.values(CONTROLLER_MAP)
        .flat()
        .forEach((c) => {
          const kind = c.name.split(":")[0];
          if (!kinds[kind])
            kinds[kind] = {
              name: kind,
              cpu: 0,
              ram: 0,
              pv: 0,
              net: 0,
              eff: 0,
              _count: 0,
            };
          kinds[kind].cpu += c.cpu;
          kinds[kind].ram += c.ram;
          kinds[kind].pv += c.pv;
          kinds[kind].eff += c.eff;
          kinds[kind]._count++;
        });
      defs = Object.values(kinds).map((k) => ({ ...k, eff: k.eff / k._count }));
      break;
    }
    case "controller": {
      const nsFilter = filters.find((f) => f.property === "namespace");
      const ns = nsFilter ? nsFilter.value : null;
      if (ns && CONTROLLER_MAP[ns]) {
        defs = CONTROLLER_MAP[ns];
      } else {
        defs = Object.values(CONTROLLER_MAP).flat();
      }
      break;
    }
    case "pod": {
      const ctrlFilter = filters.find((f) => f.property === "controllerName");
      const ctrl = ctrlFilter ? ctrlFilter.value : null;
      if (ctrl) {
        const fullKey = Object.keys(POD_MAP).find(
          (k) => k.endsWith(`:${ctrl}`) || k === ctrl,
        );
        defs = fullKey
          ? POD_MAP[fullKey]
          : [{ name: `${ctrl}-pod-1`, cpu: 2, ram: 1.5, pv: 0, eff: 0.7 }];
      } else {
        defs = Object.values(POD_MAP).flat();
      }
      break;
    }
    case "container": {
      const podFilter = filters.find((f) => f.property === "pod");
      const podName = podFilter ? podFilter.value : "unknown-pod";
      defs = [
        {
          name: podName.split("-").slice(0, -2).join("-") || "main",
          cpu: 3,
          ram: 2,
          pv: 0,
          eff: 0.8,
        },
        { name: "istio-proxy", cpu: 0.4, ram: 0.2, pv: 0, eff: 0.5 },
      ];
      break;
    }
    case "cluster":
      defs = [
        {
          name: "demo-cluster",
          cpu: 180,
          gpu: 322,
          ram: 120,
          pv: 35,
          net: 5.5,
          eff: 0.65,
        },
        {
          name: "prod-cluster",
          cpu: 95,
          gpu: 0,
          ram: 80,
          pv: 20,
          net: 3.0,
          eff: 0.72,
        },
      ];
      break;
    case "node":
      defs = [
        {
          name: "gke-demo-pool-a1b2c3d4-x1y2",
          cpu: 40,
          ram: 30,
          pv: 0,
          net: 1.2,
          eff: 0.58,
        },
        {
          name: "gke-demo-pool-e5f6g7h8-a3b4",
          cpu: 65,
          ram: 45,
          pv: 0,
          net: 1.8,
          eff: 0.68,
        },
        {
          name: "ip-10-0-1-42.ec2.internal",
          cpu: 50,
          ram: 38,
          pv: 0,
          net: 2.0,
          eff: 0.72,
        },
        {
          name: "ip-10-0-2-55.ec2.internal",
          cpu: 25,
          ram: 17,
          pv: 0,
          net: 0.5,
          eff: 0.62,
        },
      ];
      break;
    case "namespace":
    default:
      defs = NAMESPACE_DEFS;
      break;
  }

  if (accumulate) {
    return { data: [defs.map((d) => buildAlloc(d, days, winStart, winEnd))] };
  }
  return { data: generateDailyRange(defs, days, startD, winStart, winEnd) };
}

/* ═══════════════════════════════════════════════════════════════════
   Service class
   ═══════════════════════════════════════════════════════════════════ */

class AllocationService {
  async fetchAllocation(win, aggregate, options = {}) {
    const { accumulate, filters = [], includeIdle = true } = options;
    const params = { window: win, aggregate, includeIdle, step: "1d" };
    if (typeof accumulate === "boolean") params.accumulate = accumulate;
    if (filters.length > 0) params.filter = parseFilters(filters);

    try {
      const result = await client.get("/allocation/compute", { params });
      return { ...result.data, isMock: false };
    } catch (error) {
      console.warn(
        "Allocation API unavailable, using mock data:",
        error.message,
      );
      return { ...getMockAllocations(win, aggregate, options), isMock: true };
    }
  }
}

export default new AllocationService();
