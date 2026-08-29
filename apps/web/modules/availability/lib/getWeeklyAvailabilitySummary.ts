type WeeklyAvailability = {
  days: number[];
  startTime: Date;
  endTime: Date;
};

type DayAvailabilitySummary = {
  day: number;
  minutes: number;
};

export function getWeeklyAvailabilitySummary(availabilities: WeeklyAvailability[]): DayAvailabilitySummary[] {
  const minutesByDay = Array.from({ length: 7 }, () => 0);

  for (const availability of availabilities) {
    const durationMinutes = Math.max(
      (availability.endTime.getTime() - availability.startTime.getTime()) / 60_000,
      0
    );

    for (const day of availability.days) {
      if (day < 0 || day > 6) continue;
      minutesByDay[day] += durationMinutes;
    }
  }

  return minutesByDay.map((minutes, day) => ({ day, minutes }));
}

export function orderWeekdays<T extends { day: number }>(days: T[], weekStart?: string): T[] {
  if (weekStart !== "Monday") return days;
  const [sunday, ...restOfWeek] = days;
  if (!sunday) return days;
  return [...restOfWeek, sunday];
}
