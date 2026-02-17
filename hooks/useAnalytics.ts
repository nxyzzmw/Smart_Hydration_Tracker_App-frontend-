import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getHydrationScoreAnalytics,
  getMonthlyAnalytics,
  getStreakAnalytics,
  getWeeklyAnalytics,
} from "../src/api/analyticsApi";
import { getDailyWater } from "../src/api/waterApi";
import { subscribeWaterChanged } from "../src/events/waterEvents";
import { subscribeProfileChanged } from "../src/events/profileEvents";
import { extractArrayData, toNumber } from "../src/utils/apiParsers";

type AnalyticsPoint = {
  date: string;
  amountMl: number;
  goalMl: number;
  completionPct: number;
};

type AnalyticsState = {
  weekly: AnalyticsPoint[];
  monthly: AnalyticsPoint[];
  streakDays: number;
  performancePct: number;
  todayCompletionPct: number;
  todayIntakeMl: number;
  todayGoalMl: number;
};

type RawPoint = {
  _id?: string;
  date?: string;
  day?: string;
  total?: number | string;
  amountMl?: number | string;
  amount?: number | string;
  totalMl?: number | string;
  intakeMl?: number | string;
  goalMl?: number | string;
  targetMl?: number | string;
  completionPct?: number | string;
  completion?: number | string;
  percentage?: number | string;
  dailyCompletionPct?: number | string;
};

function clampPct(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function toLocalDayKey(input?: string | Date) {
  if (!input) return "";
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  ).toDateString();
}

function isTodayLocalDate(input?: string | Date) {
  if (!input) return false;
  return toLocalDayKey(input) === toLocalDayKey(new Date());
}

function normalizePoint(raw: RawPoint): AnalyticsPoint {
  const amountMl = toNumber(
    raw.amountMl ??
      raw.amount ??
      raw.total ??
      raw.totalMl ??
      raw.intakeMl
  );
  const goalMl = toNumber(raw.goalMl ?? raw.targetMl);
  const pctFromPayload = toNumber(
    raw.completionPct ?? raw.completion ?? raw.percentage
  );
  const fallbackPct =
    goalMl > 0 ? (amountMl / goalMl) * 100 : 0;

  return {
    date: String(raw.date ?? raw.day ?? raw._id ?? ""),
    amountMl,
    goalMl,
    completionPct: clampPct(pctFromPayload || fallbackPct),
  };
}

function applyGoalFallback(
  points: AnalyticsPoint[],
  fallbackGoal: number
) {
  if (!fallbackGoal || fallbackGoal <= 0) return points;
  return points.map((point) => {
    if (point.goalMl > 0) return point;
    const completionPct = clampPct(
      (point.amountMl / fallbackGoal) * 100
    );
    return {
      ...point,
      goalMl: fallbackGoal,
      completionPct,
    };
  });
}

function computePerformance(weekly: AnalyticsPoint[], payload: any) {
  const payloadScore = toNumber(
    payload?.performancePct ??
      payload?.performance ??
      payload?.hydrationScore ??
      payload?.score ??
      payload?.percentage
  );
  if (payloadScore > 0) return clampPct(payloadScore);

  if (weekly.length === 0) return 0;
  const total = weekly.reduce(
    (sum, day) => sum + day.completionPct,
    0
  );
  return clampPct(total / weekly.length);
}

function extractStreak(payload: any) {
  return toNumber(
    payload?.streakDays ??
      payload?.currentStreak ??
      payload?.streak ??
      payload?.days ??
      payload?.data?.streakDays
  );
}

function extractHydration(payload: any) {
  return {
    dailyGoal: toNumber(
      payload?.dailyGoal ?? payload?.goal ?? payload?.data?.dailyGoal
    ),
    todayTotal: toNumber(
      payload?.todayTotal ?? payload?.total ?? payload?.data?.todayTotal
    ),
    percentage: clampPct(
      toNumber(
        payload?.percentage ??
          payload?.completionPct ??
          payload?.data?.percentage
      )
    ),
    score: clampPct(
      toNumber(payload?.score ?? payload?.data?.score)
    ),
  };
}

function extractDailyFromWater(payload: any) {
  const logs = extractArrayData(payload);
  const todayLogs = logs.filter((raw) =>
    isTodayLocalDate(
      raw?.timestamp ??
        raw?.createdAt ??
        raw?.date ??
        raw?.day
    )
  );
  const totalFromTodayLogs = todayLogs.reduce((sum, raw) => {
    const amount = toNumber(raw?.amountMl ?? raw?.amount ?? raw?.intakeMl);
    return sum + amount;
  }, 0);

  const payloadDate =
    payload?.date ??
    payload?.day ??
    payload?.data?.date ??
    payload?.data?.day;
  const payloadIsToday = isTodayLocalDate(payloadDate);
  const payloadAmount = toNumber(
    payload?.amountMl ??
      payload?.amount ??
      payload?.intakeMl ??
      payload?.total ??
      payload?.totalMl ??
      payload?.data?.amountMl ??
      payload?.data?.amount ??
      payload?.data?.total
  );

  const amountMl =
    totalFromTodayLogs > 0
      ? totalFromTodayLogs
      : payloadIsToday
        ? payloadAmount
        : 0;
  const goalMl = toNumber(
    payload?.goalMl ??
      payload?.targetMl ??
      payload?.goal ??
      payload?.dailyGoal ??
      payload?.data?.goalMl ??
      payload?.data?.targetMl ??
      payload?.data?.goal ??
      payload?.data?.dailyGoal
  );
  const completionPct = clampPct(goalMl > 0 ? (amountMl / goalMl) * 100 : 0);

  return { amountMl, goalMl, completionPct };
}

export function useAnalytics() {
  const [state, setState] = useState<AnalyticsState>({
    weekly: [],
    monthly: [],
    streakDays: 0,
    performancePct: 0,
    todayCompletionPct: 0,
    todayIntakeMl: 0,
    todayGoalMl: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [
        dailyPayload,
        weeklyPayload,
        monthlyPayload,
        streakPayload,
        scorePayload,
      ] =
        await Promise.all([
          getDailyWater(),
          getWeeklyAnalytics(),
          getMonthlyAnalytics(),
          getStreakAnalytics(),
          getHydrationScoreAnalytics(),
        ]);

      let weekly = extractArrayData(weeklyPayload).map(normalizePoint);
      let monthly = extractArrayData(monthlyPayload).map(normalizePoint);
      const streakDays = extractStreak(streakPayload);
      const hydration = extractHydration(scorePayload);
      weekly = applyGoalFallback(weekly, hydration.dailyGoal);
      monthly = applyGoalFallback(monthly, hydration.dailyGoal);
      const daily = extractDailyFromWater(dailyPayload);
      const today = weekly.find((item) => isTodayLocalDate(item.date));
      const todayIntakeMl = daily.amountMl || today?.amountMl || 0;
      const todayGoalMl =
        daily.goalMl || hydration.dailyGoal || today?.goalMl || 0;
      const todayCompletionPct =
        todayGoalMl > 0
          ? clampPct((todayIntakeMl / todayGoalMl) * 100)
          : 0;
      const performancePct =
        todayIntakeMl > 0
          ? hydration.score ||
            todayCompletionPct ||
            computePerformance(weekly, scorePayload)
          : 0;

      setState({
        weekly,
        monthly,
        streakDays,
        performancePct,
        todayCompletionPct,
        todayIntakeMl,
        todayGoalMl,
      });
    } catch (fetchError) {
      console.log("Analytics fetch error:", fetchError);
      setError(fetchError);
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

  useEffect(() => {
    const unsubscribe = subscribeProfileChanged(() => {
      refresh();
    });

    return unsubscribe;
  }, [refresh]);

  const hasData = useMemo(
    () =>
      state.weekly.some((d) => d.amountMl > 0) ||
      state.monthly.some((d) => d.amountMl > 0) ||
      state.streakDays > 0,
    [state]
  );

  return {
    ...state,
    hasData,
    loading,
    error,
    refresh,
  };
}
