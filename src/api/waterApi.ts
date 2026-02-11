import { api } from "./axiosClient";

export const addWaterLog = (amount: number) =>
  api.post("/water/add", { amount });

export const getDailyWater = () =>
  api.get("/water/daily");

export const deleteWaterLog = (id: string) =>
  api.delete(`/water/${id}`);

export const updateWaterLog = (
  id: string,
  amount: number
) => api.put(`/water/${id}`, { amount });
