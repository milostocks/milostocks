import { NextResponse } from "next/server";
import { getLastWeekChampion, getWeeklyLeaderboardView } from "@/lib/offchainWallet";

/** GET the current week's fETH leaderboard plus last week's champion (if anyone finished net-positive). */
export async function GET() {
  const [entries, champion] = await Promise.all([getWeeklyLeaderboardView(), getLastWeekChampion()]);
  return NextResponse.json({ entries, champion });
}
