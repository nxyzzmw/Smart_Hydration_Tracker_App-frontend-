export const DEFAULT_USER_TYPES = [
  "Athlete",
  "Office worker",
  "Outdoor worker",
  "Pregnant",
  "Senior citizen",
] as const;

export function inferUserTypeFromProfile(data: any): string {
  if (typeof data?.userType === "string" && data.userType.trim()) {
    return data.userType.trim();
  }

  if (data?.pregnancy) return "Pregnant";
  if (Number(data?.age) >= 60) return "Senior citizen";
  if (data?.activity === "high" && data?.climate === "hot") return "Outdoor worker";
  if (data?.activity === "high") return "Athlete";
  return "Office worker";
}

export function applyUserTypePreset(form: any, userType: string) {
  const next = { ...(form || {}), userType };

  if (userType === "Athlete") {
    next.activity = "high";
    next.climate = "moderate";
  } else if (userType === "Office worker") {
    next.activity = "low";
    next.climate = "moderate";
  } else if (userType === "Outdoor worker") {
    next.activity = "high";
    next.climate = "hot";
  } else if (userType === "Pregnant") {
    next.activity = "moderate";
    next.climate = "moderate";
  } else if (userType === "Senior citizen") {
    next.activity = "low";
    next.climate = "moderate";
    if (!next.age || Number(next.age) < 60) next.age = "60";
  }

  return next;
}

export function calculateDailyGoalMl(data: any): number {
  const weight = Number(data?.weight) || 0;
  const gender = String(data?.gender || "").toLowerCase();
  const activity = String(data?.activity || "");
  const climate = String(data?.climate || "");
  const userType = inferUserTypeFromProfile(data);

  let water = weight * 0.033;

  const activityMap: Record<string, number> = {
    low: 0,
    moderate: 0.5,
    high: 1.0,
  };
  water += activityMap[activity] ?? 0;

  const climateMap: Record<string, number> = {
    cold: 0,
    moderate: 0.3,
    hot: 0.7,
  };
  water += climateMap[climate] ?? 0;

  const userTypeMap: Record<string, { baseAdd: number; multiplier: number }> = {
    Athlete: { baseAdd: 0.6, multiplier: 1.2 },
    "Office worker": { baseAdd: 0, multiplier: 1 },
    "Outdoor worker": { baseAdd: 0.6, multiplier: 1.15 },
    Pregnant: { baseAdd: 0.7, multiplier: 1.1 },
    "Senior citizen": { baseAdd: -0.2, multiplier: 0.95 },
  };
  const userTypeConfig = userTypeMap[userType] ?? { baseAdd: 0, multiplier: 1 };
  water += userTypeConfig.baseAdd;
  water *= userTypeConfig.multiplier;

  if (gender === "male") {
    water += 0.2;
  }

  if (water > 6) water = 6;

  return Number((water * 1000).toFixed(0));
}
