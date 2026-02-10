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
