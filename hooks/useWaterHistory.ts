import { useCallback, useEffect, useState } from "react";
import { getWaterHistory } from "../src/api/waterApi";
import { subscribeWaterChanged } from "../src/events/waterEvents";
import {
  extractWaterLogs,
  normalizeWaterLog,
  type WaterLog,
} from "../src/utils/waterLogs";

export function useWaterHistory() {
  const [logs, setLogs] = useState<WaterLog[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await getWaterHistory();
      setLogs(extractWaterLogs(payload).map(normalizeWaterLog));
    } catch (error) {
      console.log("Water history fetch error:", error);
      setLogs([]);
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

  return { logs, loading, refresh };
}
