import { api } from "./axiosClient";

export type ReminderPayload = {
  interval: number;
  startTime: string;
  endTime: string;
  notificationMessage?: string;
};

export const createReminder = async () => {
  try {
    const res = await api.post("/reminder", {
      interval: 60,
      startTime: "01:00",
      endTime: "22:00",
    });
    return res.data;
  } catch (error: any) {
    console.error("CREATE reminder error:", error.response?.data || error.message);
    throw error;
  }
};

export const getReminder = async () => {
  try {
    const res = await api.get("/reminder");
    return res.data;
  } catch (error: any) {
    console.error("GET reminder error:", error.response?.data || error.message);
    throw error;
  }
};

export const updateReminder = async (data: ReminderPayload) => {
  try {
    const res = await api.put("/reminder/update", data);
    return res.data;
  } catch (error: any) {
    console.error("UPDATE reminder error:", error.response?.data || error.message);
    throw error;
  }
};

const HHMM_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

const toHHmm = (value?: string) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (HHMM_REGEX.test(trimmed)) return trimmed;

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;

  const hours = String(parsed.getHours()).padStart(2, "0");
  const minutes = String(parsed.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

export const pauseReminder = async (
  paused: boolean,
  pauseStartTime?: string,
  pauseEndTime?: string
) => {
  try {
    const payload: Record<string, unknown> = { paused: Boolean(paused) };

    if (!paused) {
      payload.pauseStartTime = null;
      payload.pauseEndTime = null;
    } else {
      payload.pauseStartTime = toHHmm(pauseStartTime);
      payload.pauseEndTime = toHHmm(pauseEndTime);
    }

    const res = await api.put("/reminder/pause", payload);

    return res.data;
  } catch (error: any) {
    console.error("PAUSE reminder error:", error.response?.data || error.message);
    throw error;
  }
};

export const toggleSleepMode = async () => {
  try {
    const res = await api.put("/reminder/toggle-sleep-mode");
    return res.data;
  } catch (error: any) {
    console.error("SLEEP reminder error:", error.response?.data || error.message);
    throw error;
  }
};
