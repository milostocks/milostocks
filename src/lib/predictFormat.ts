import { formatEther, hexToString } from "viem";

/** Decodes a bytes32 ticker (e.g. from Market.ticker) to a display string. */
export function tickerFromBytes32(hex: `0x${string}`): string {
  return hexToString(hex).replace(/\0+$/, "");
}

export function truncateAddress(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

/** Chainlink-style price: 8 decimals. */
export function formatFeedPrice(answer: bigint): string {
  return (Number(answer) / 1e8).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatEth(wei: bigint): string {
  const eth = Number(formatEther(wei));
  return `${eth.toLocaleString("en-US", { maximumFractionDigits: 4 })} ETH`;
}

/** Same math as formatEth, but labeled "fETH" (fake ETH) — PlayMarket/off-chain-wallet amounts are a virtual unit, not real ETH, and must never read as if they were. */
export function formatChips(wei: bigint): string {
  const chips = Number(formatEther(wei));
  return `${chips.toLocaleString("en-US", { maximumFractionDigits: 4 })} fETH`;
}

export function formatCountdown(targetUnix: number, nowUnix: number): string {
  const diff = targetUnix - nowUnix;
  if (diff <= 0) return "now";
  const m = Math.floor(diff / 60);
  const s = diff % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

/** Weekend gap markets span a Friday close → Monday open (~65h); session markets are much shorter. */
export function isWeekendGapMarket(locksAtUnix: number, resolvesAtUnix: number): boolean {
  return resolvesAtUnix - locksAtUnix > 20 * 3600;
}

/** e.g. "Jul 20, 04:31 – 05:31 UTC" */
export function formatSessionWindow(locksAtUnix: number, resolvesAtUnix: number): string {
  const locks = new Date(locksAtUnix * 1000);
  const resolves = new Date(resolvesAtUnix * 1000);
  const day = locks.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  const time = (d: Date) => d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" });
  return `${day}, ${time(locks)} – ${time(resolves)} UTC`;
}
