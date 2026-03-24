const SOUTH_AMERICA_BUENOS_AIRES_UTC_OFFSET = "-03:00";

const CALENDAR_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Calendar date (YYYY-MM-DD) in America/Argentina/Buenos_Aires for the given instant.
 */
export function getCurrentBuenosAiresCalendarDateYyyyMmDd(
  referenceDate: Date = new Date(),
): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(referenceDate);
}

export function isValidCalendarDateYyyyMmDd(
  calendarDateYyyyMmDd: string,
): boolean {
  if (!CALENDAR_DATE_REGEX.test(calendarDateYyyyMmDd)) {
    return false;
  }

  const interpretedInstant = new Date(
    `${calendarDateYyyyMmDd}T00:00:00.000${SOUTH_AMERICA_BUENOS_AIRES_UTC_OFFSET}`,
  );

  if (Number.isNaN(interpretedInstant.getTime())) {
    return false;
  }

  return (
    getCurrentBuenosAiresCalendarDateYyyyMmDd(interpretedInstant) ===
    calendarDateYyyyMmDd
  );
}

/**
 * Inclusive start and exclusive end of the reporting day, as UTC ISO strings for PostgREST.
 */
export function getBuenosAiresZonedDayBoundsUtcIsoStrings(
  calendarDateYyyyMmDd: string,
): {
  rangeStartInclusiveUtcIso: string;
  rangeEndExclusiveUtcIso: string;
} {
  const rangeStartMilliseconds = new Date(
    `${calendarDateYyyyMmDd}T00:00:00.000${SOUTH_AMERICA_BUENOS_AIRES_UTC_OFFSET}`,
  ).getTime();
  const rangeEndExclusiveMilliseconds = rangeStartMilliseconds + 24 * 60 * 60 * 1000;

  return {
    rangeStartInclusiveUtcIso: new Date(rangeStartMilliseconds).toISOString(),
    rangeEndExclusiveUtcIso: new Date(rangeEndExclusiveMilliseconds).toISOString(),
  };
}
