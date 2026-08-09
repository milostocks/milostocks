"use client";

// ClaimChipsButton and PlayMarketCard each keep their own copy of the
// internal-wallet balance (separate client components, separate `/api/wallet`
// fetches) — without this, claiming fETH in one doesn't update the other, and
// the bet buttons stay hidden behind "No fETH left" until an unrelated poll
// happens to catch up. Call notifyWalletUpdated() after any action that
// changes the caller's fETH balance (claim, bet) so every mounted listener
// re-fetches immediately instead of waiting on its own poll interval.
export const WALLET_UPDATED_EVENT = "rham:wallet-updated";

export function notifyWalletUpdated() {
  window.dispatchEvent(new Event(WALLET_UPDATED_EVENT));
}
