import { api } from "./axiosClient";

export const getWeeklyAnalytics = async () => {
  const res = await api.get("/analytics/weekly");
  return res.data;
};

export const getMonthlyAnalytics = async () => {
  const res = await api.get("/analytics/monthly");
  return res.data;
};

export const getStreakAnalytics = async () => {
  const res = await api.get("/analytics/streak");
  return res.data;
};

export const getHydrationScoreAnalytics = async () => {
  const res = await api.get("/analytics/hydration");
  return res.data;
};

export const getExport =async ()=>{
  const res =await api.get("/analytics/export");
  return res.data
}
