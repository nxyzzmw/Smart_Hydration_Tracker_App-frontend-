import { useState } from "react";

export function useWater() {
  // ✅ Fake logs for now
  const [logs, setLogs] = useState<any[]>([]);
  const [loading] = useState(false);

  const addLog = (amount: number) => {
    const newLog = {
      _id: Date.now().toString(),
      amount,
    };

    setLogs((prev) => [...prev, newLog]);
  };

  const removeLog = (id: string) => {
    setLogs((prev) =>
      prev.filter((log) => log._id !== id)
    );
  };

  const total = logs.reduce(
    (sum, l) => sum + l.amount,
    0
  );

  return { logs, total, loading, addLog, removeLog };
}
