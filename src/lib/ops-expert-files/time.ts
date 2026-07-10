import { CUSTOMER_NO_MAX_DAILY_SEQ, CUSTOMER_NO_SUFFIX, OPS_EXPORT_TIME_ZONE } from "@/lib/ops-expert-files/constants";

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

/** Format an instant as YYYYMMDD in Asia/Shanghai. */
export function formatShanghaiDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: OPS_EXPORT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error("Unable to format Shanghai date key.");
  }

  return `${year}${month}${day}`;
}

export function buildCustomerNo(dateKey: string, seq: number) {
  if (!/^\d{8}$/.test(dateKey)) {
    throw new Error("Customer number date key must be YYYYMMDD.");
  }

  if (!Number.isInteger(seq) || seq < 1 || seq > CUSTOMER_NO_MAX_DAILY_SEQ) {
    throw new CustomerNoQuotaExceededError(dateKey);
  }

  return `${dateKey}${pad2(seq)}${CUSTOMER_NO_SUFFIX}`;
}

export class CustomerNoQuotaExceededError extends Error {
  readonly code = "CUSTOMER_NO_DAILY_QUOTA_EXCEEDED";
  readonly dateKey: string;

  constructor(dateKey: string) {
    super(
      `Daily customer number quota exceeded for ${dateKey} (max ${CUSTOMER_NO_MAX_DAILY_SEQ}).`,
    );
    this.name = "CustomerNoQuotaExceededError";
    this.dateKey = dateKey;
  }
}

/** Inclusive Shanghai calendar-day range → UTC Date bounds as [start, endExclusive). */
export function shanghaiDayRangeToUtcBounds(input: {
  startDate?: string | null;
  endDate?: string | null;
}) {
  const start = input.startDate
    ? shanghaiDateStartUtc(input.startDate)
    : undefined;
  const endExclusive = input.endDate
    ? shanghaiDateStartUtc(addCalendarDays(input.endDate, 1))
    : undefined;

  return { start, endExclusive };
}

function addCalendarDays(yyyyMmDd: string, days: number) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(yyyyMmDd);
  if (!match) {
    throw new Error(`Invalid date string: ${yyyyMmDd}`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utc = new Date(Date.UTC(year, month - 1, day));
  utc.setUTCDate(utc.getUTCDate() + days);
  return `${utc.getUTCFullYear()}-${pad2(utc.getUTCMonth() + 1)}-${pad2(utc.getUTCDate())}`;
}

/** Interpret YYYY-MM-DD as Shanghai local midnight, return UTC Date. */
export function shanghaiDateStartUtc(yyyyMmDd: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(yyyyMmDd);
  if (!match) {
    throw new Error(`Invalid date string: ${yyyyMmDd}`);
  }

  // Asia/Shanghai is UTC+8 with no DST.
  return new Date(`${yyyyMmDd}T00:00:00+08:00`);
}

export function formatShanghaiDateTime(date: Date | null | undefined) {
  if (!date) {
    return null;
  }

  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: OPS_EXPORT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

export function shanghaiTodayYmd(now = new Date()) {
  const key = formatShanghaiDateKey(now);
  return `${key.slice(0, 4)}-${key.slice(4, 6)}-${key.slice(6, 8)}`;
}

export function shanghaiDaysAgoYmd(days: number, now = new Date()) {
  const today = shanghaiTodayYmd(now);
  return addCalendarDays(today, -days);
}
