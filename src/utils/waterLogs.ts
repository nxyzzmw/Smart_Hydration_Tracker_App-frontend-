import { extractArrayData, toNumber } from "./apiParsers";

export type WaterLog = {
  id: string;
  amountMl: number;
  timestamp: string;
};

export type RawWaterLog = {
  id?: string | number;
  _id?: string | number;
  amountMl?: number | string;
  amount?: number | string;
  timestamp?: string;
  createdAt?: string;
};

export function normalizeWaterLog(raw: RawWaterLog): WaterLog {
  return {
    id: String(raw.id ?? raw._id ?? Date.now()),
    amountMl: toNumber(raw.amountMl ?? raw.amount),
    timestamp:
      raw.timestamp ?? raw.createdAt ?? new Date().toISOString(),
  };
}

export function extractWaterLogs(payload: any): RawWaterLog[] {
  return extractArrayData(payload) as RawWaterLog[];
}

export function extractWaterLog(payload: any): RawWaterLog | null {
  if (!payload) return null;
  if (payload.log) return payload.log;
  if (payload.entry) return payload.entry;
  if (payload.data && !Array.isArray(payload.data)) return payload.data;
  if (payload.result && !Array.isArray(payload.result)) return payload.result;
  if (
    payload.id ||
    payload._id ||
    payload.amountMl !== undefined ||
    payload.amount !== undefined
  ) {
    return payload;
  }
  return null;
}
