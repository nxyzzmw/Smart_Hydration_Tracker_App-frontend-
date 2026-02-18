import { api } from "./axiosClient";

export type ReminderPayload = {
  interval: number;
  startTime: string;
  endTime: string;
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

export const pauseReminder = async (paused: boolean) => {
  try {
    // FORCE boolean (important)
    const payload = { paused: Boolean(paused) };

    const res = await api.put("/reminder/pause", payload);

    return res.data;
  } catch (error: any) {
    console.error(
      "PAUSE reminder error:",
      error.response?.data || error.message
    );
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
