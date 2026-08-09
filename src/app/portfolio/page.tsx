import type { Metadata } from "next";
import WalletSearch from "@/components/WalletSearch";

export const metadata: Metadata = {
  title: "Portfolio — Implied Open",
  description: "See any wallet's holdings of Robinhood Chain tokenized stocks and its Predict bet history — no login, no wallet connect required.",
};

export default function PortfolioLandingPage() {
  return (
    <div className="flex flex-col items-center gap-6 py-16 text-center">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Portfolio</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-text-secondary">
          Paste any wallet address to see its tokenized-stock holdings (priced
          live, same data as the dashboard) and everything it&apos;s bet on
          Predict — read straight from the chain, no login needed.
        </p>
      </div>
      <WalletSearch basePath="/portfolio" />
    </div>
  );
}
