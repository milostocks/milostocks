// US equity market session, DST-aware via the America/New_York timezone.
// Regular session: Mon–Fri 9:30–16:00 ET. Exchange holidays are not modeled
// yet — on a holiday the site says "open" while feeds stay frozen.

export interface MarketStatus {
  open: boolean;
  /** e.g. "Weekend", "After hours", "Pre-market", "Regular session" */
  label: string;
}

export function getMarketStatus(now: Date = new Date()): MarketStatus {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(now);

  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "";
  const weekday = get("weekday");
  const minutes =
    (Number(get("hour")) % 24) * 60 + Number(get("minute"));

  if (weekday === "Sat" || weekday === "Sun") {
    return { open: false, label: "Weekend" };
  }
  const openMin = 9 * 60 + 30;
  const closeMin = 16 * 60;
  if (minutes < openMin) return { open: false, label: "Pre-market" };
  if (minutes >= closeMin) return { open: false, label: "After hours" };
  return { open: true, label: "Regular session" };
}
