import { useCallback, useEffect, useState } from "react";
import {
  addWaterLog,
  deleteWaterLog,
  getDailyWater,
  updateWaterLog,
} from "../src/api/waterApi";
import {
  emitWaterChanged,
  subscribeWaterChanged,
} from "../src/events/waterEvents";
import {
  extractWaterLog,
  extractWaterLogs,
  normalizeWaterLog,
  type WaterLog,
} from "../src/utils/waterLogs";

export function useWater() {
  const [logs, setLogs] = useState<WaterLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await getDailyWater();
      const normalized = extractWaterLogs(payload).map(normalizeWaterLog);
      setLogs(normalized);
    } catch (error) {
      console.log("Water logs fetch error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const unsubscribe = subscribeWaterChanged(() => {
      refresh();
    });
    return unsubscribe;
  }, [refresh]);

  const addLog = async (amountMl: number) => {
    setSaving(true);
    try {
      const payload = await addWaterLog(amountMl);
      const created = extractWaterLog(payload);

      if (created) {
        setLogs((prev) => [...prev, normalizeWaterLog(created)]);
      } else {
        await refresh();
      }
      emitWaterChanged();
    } catch (error) {
      console.log("Add water log error:", error);
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const updateLog = async (id: string, amountMl: number) => {
    setSaving(true);
    try {
      const payload = await updateWaterLog(id, amountMl);
      const updated = extractWaterLog(payload);

      if (updated) {
        const normalized = normalizeWaterLog(updated);
        setLogs((prev) =>
          prev.map((log) =>
            log.id === id ? { ...log, ...normalized } : log
          )
        );
      } else {
        setLogs((prev) =>
          prev.map((log) =>
            log.id === id ? { ...log, amountMl } : log
          )
        );
      }
      emitWaterChanged();
    } catch (error) {
      console.log("Update water log error:", error);
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const deleteLog = async (id: string) => {
    setSaving(true);
    try {
      await deleteWaterLog(id);
      setLogs((prev) => prev.filter((log) => log.id !== id));
      emitWaterChanged();
    } catch (error) {
      console.log("Delete water log error:", error);
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const total = logs.reduce((sum, log) => sum + log.amountMl, 0);

  return {
    logs,
    total,
    loading,
    saving,
    addLog,
    updateLog,
    deleteLog,
    refresh,
  };
}
