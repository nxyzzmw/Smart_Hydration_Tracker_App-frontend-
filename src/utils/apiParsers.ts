export function toNumber(value: unknown) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

export function extractArrayData(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.logs)) return payload.logs;
  if (Array.isArray(payload?.entries)) return payload.entries;
  if (Array.isArray(payload?.result)) return payload.result;
  if (Array.isArray(payload?.weekly)) return payload.weekly;
  if (Array.isArray(payload?.monthly)) return payload.monthly;
  return [];
}
