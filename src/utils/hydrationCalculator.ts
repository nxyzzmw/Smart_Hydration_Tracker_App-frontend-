export function calculateDailyGoal(profile: any) {
  let base = profile.weight * 35;

  if (profile.activity === "high") base += 700;
  if (profile.activity === "moderate") base += 400;

  if (profile.climate === "hot") base += 500;
  if (profile.climate === "cold") base -= 200;

  if (profile.pregnancy) base += 700;

  if (profile.age > 55) base -= 200;

  return Math.max(base, 1500);
}

export function toDisplayAmount(
  amountMl: number,
  unit: "ml" | "oz"
) {
  if (unit === "oz") {
    return Math.round((amountMl / 29.5735) * 10) / 10;
  }
  return Math.round(amountMl);
}

export function fromDisplayAmount(
  value: number,
  unit: "ml" | "oz"
) {
  if (unit === "oz") {
    return Math.round(value * 29.5735);
  }
  return Math.round(value);
}
