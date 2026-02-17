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

export type ExportFormat = "json" | "pdf";

type ExportParams = {
  start?: string;
  end?: string;
};

export const getExport = async (
  format: ExportFormat,
  params?: ExportParams
) => {
  const res = await api.get("/analytics/export", {
    params: {
      format,
      ...(params?.start ? { start: params.start } : {}),
      ...(params?.end ? { end: params.end } : {}),
    },
    responseType: format === "pdf" ? "arraybuffer" : "json",
  });

  return res;
};
