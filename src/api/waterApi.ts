import { api } from "./axiosClient";

export const addWaterLog = (amount: number) =>
  api.post("/water/add", { amount });

export const getTodayWater = () =>
  api.get("/water/");

export const deleteWaterLog = (id: string) =>
  api.delete(`/water/log/${id}`);
