import { getMockData } from "./allocation.mock";

class AllocationService {
  async fetchAllocation(win, aggregate, options) {
    const { filters } = options;
    // Return mock data only (Netlify/demo deployments cannot reach the API).
    return getMockData(aggregate, filters);

    /*
    try {
      const result = await client.get("/allocation/compute", {
        params,
      });
      return result.data;
    } catch (error) {
      if (error.message && (error.message.includes("Network Error") || error.message.includes("ECONNREFUSED"))) {
        console.warn("Backend not available, using mock data");
        return getMockData(aggregate, filters);
      }
      throw error;
    }
    */
  }
}

export default new AllocationService();
