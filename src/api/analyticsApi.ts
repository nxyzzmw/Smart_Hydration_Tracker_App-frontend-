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

export type HistoryByDateItem = {
  id: string;
  amountMl: number;
  timestamp: string;
};

function mapHistoryItem(raw: any, index: number): HistoryByDateItem | null {
  const timestamp =
    raw?.timestamp ??
    raw?.createdAt ??
    raw?.time ??
    raw?.date ??
    "";
  const amountRaw =
    raw?.amountMl ??
    raw?.amount_ml ??
    raw?.amount ??
    raw?.ml ??
    0;
  const amountMl = Number(amountRaw);
  const id = String(
    raw?.id ??
      raw?._id ??
      raw?.logId ??
      `${timestamp || "history"}_${index}`
  );

  if (!timestamp || Number.isNaN(new Date(timestamp).getTime())) return null;
  if (!Number.isFinite(amountMl) || amountMl <= 0) return null;

  return {
    id,
    amountMl,
    timestamp,
  };
}

function extractHistoryList(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.history)) return payload.history;
  if (Array.isArray(payload?.logs)) return payload.logs;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.history)) return payload.data.history;
  if (Array.isArray(payload?.data?.logs)) return payload.data.logs;
  return [];
}

export const getHistoryByDate = async (date: string): Promise<HistoryByDateItem[]> => {
  const res = await api.get("/analytics/history-by-date", {
    params: { date },
  });

  const list = extractHistoryList(res.data);
  return list
    .map((item, idx) => mapHistoryItem(item, idx))
    .filter(Boolean) as HistoryByDateItem[];
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
