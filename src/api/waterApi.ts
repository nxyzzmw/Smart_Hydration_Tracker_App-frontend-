import { api } from "./axiosClient";

export const addWaterLog = async (amount: number) => {
  const res = await api.post("/water/add", { amount });
  return res.data;
};

export const getDailyWater = async () => {
  const res = await api.get("/water/daily");
  return res.data;
};

export const getWaterHistory = async () => {
  const candidates = ["/water/history", "/water/logs", "/water/all"];

  for (const path of candidates) {
    try {
      const res = await api.get(path);
      return res.data;
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 404) continue;
      throw error;
    }
  }

  throw new Error("No water history endpoint found");
};

export const deleteWaterLog = async (id: string) => {
  const res = await api.delete(`/water/${id}`);
  return res.data;
};

export const updateWaterLog = async (
  id: string,
  amount: number
) => {
  const res = await api.put(`/water/${id}`, { amount });
  return res.data;
};
