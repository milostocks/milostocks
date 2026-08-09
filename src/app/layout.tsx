import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import RhamTokenButton from "@/components/RhamTokenButton";
import NeoBackgroundParticles from "@/components/NeoBackgroundParticles";
import "./globals.css";
import miloImg from "./animated/milo.png";
import naviconImg from "./animated/navicon.png";
import Image from "next/image";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jbMono = JetBrains_Mono({
  variable: "--font-jbmono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://milostocks.com"),
  title: "MILO — Stock Vault",
  description:
    "MILO tracks and lets you bet on real-world stocks tokenized on Robinhood Chain — the live premium while markets are closed, and non-custodial prediction markets on whether a stock opens higher or lower, both across the weekend and during the trading session.",
  icons: {
    icon: "/milo.png",
  },
  twitter: { card: "summary_large_image" },
  other: {
    "virtual-protocol-site-verification": "56ac0a87499f8462843bf438560fa211",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jbMono.variable} h-full antialiased`}
    >
      <body className="relative min-h-full flex flex-col bg-[#060a03] text-white">
        <NeoBackgroundParticles />
        <header className="sticky top-0 z-30 border-b border-[#ccff00]/35 bg-[#0e1708]/90 backdrop-blur-xl shadow-[0_6px_24px_rgba(0,0,0,0.6)]">
          <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-3 px-4 py-3 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
            <div className="flex items-center justify-between w-full md:w-auto">
              <Link href="/" className="flex shrink-0 items-center gap-3 group">
                <div className="flex items-center justify-center rounded-xl border border-white/40 bg-gradient-to-br from-[#d4ff2a] via-[#ccff00] to-[#5c7300] p-2 shadow-[0_0_20px_rgba(74,222,128,0.4)] group-hover:scale-105 transition-transform">
                  <Image src={naviconImg} alt="MILO Logo" className="h-8 w-8 object-contain drop-shadow" />
                </div>
                <span className="text-2xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-[#d4ff2a] via-[#ffffff] to-[#ccff00]">MILO</span>
              </Link>

              <div className="flex items-center gap-2 md:hidden">
                <RhamTokenButton />
              </div>
            </div>

            <nav className="flex w-full max-w-full overflow-x-auto no-scrollbar gap-1 rounded-xl border border-[#ccff00]/35 bg-[#0c1406]/90 backdrop-blur-md p-1.5 shadow-lg text-xs font-extrabold whitespace-nowrap md:w-auto">
              <Link
                href="/predict"
                className="shrink-0 rounded-lg border border-transparent px-3 py-1.5 text-white/90 transition-all hover:border-[#ccff00]/50 hover:bg-gradient-to-r hover:from-[#ccff00]/20 hover:to-[#7a9900]/20 hover:text-white"
              >
                Predict
              </Link>
              <Link
                href="/predict/leaderboard"
                className="shrink-0 rounded-lg border border-transparent px-3 py-1.5 text-white/90 transition-all hover:border-[#ccff00]/50 hover:bg-gradient-to-r hover:from-[#ccff00]/20 hover:to-[#7a9900]/20 hover:text-white"
              >
                Leaderboard
              </Link>
              <Link
                href="/how-it-works"
                className="shrink-0 rounded-lg border border-transparent px-3 py-1.5 text-white/90 transition-all hover:border-[#ccff00]/50 hover:bg-gradient-to-r hover:from-[#ccff00]/20 hover:to-[#7a9900]/20 hover:text-white"
              >
                How it works
              </Link>
              <Link
                href="/heatmap"
                className="shrink-0 rounded-lg border border-transparent px-3 py-1.5 text-white/90 transition-all hover:border-[#ccff00]/50 hover:bg-gradient-to-r hover:from-[#ccff00]/20 hover:to-[#7a9900]/20 hover:text-white"
              >
                Heatmap
              </Link>
              <Link
                href="/watchlist"
                className="shrink-0 rounded-lg border border-transparent px-3 py-1.5 text-white/90 transition-all hover:border-[#ccff00]/50 hover:bg-gradient-to-r hover:from-[#ccff00]/20 hover:to-[#7a9900]/20 hover:text-white"
              >
                Watchlist
              </Link>
              <Link
                href="/portfolio"
                className="shrink-0 rounded-lg border border-transparent px-3 py-1.5 text-white/90 transition-all hover:border-[#ccff00]/50 hover:bg-gradient-to-r hover:from-[#ccff00]/20 hover:to-[#7a9900]/20 hover:text-white"
              >
                Portfolio
              </Link>
              <Link
                href="/compare"
                className="shrink-0 rounded-lg border border-transparent px-3 py-1.5 text-white/90 transition-all hover:border-[#ccff00]/50 hover:bg-gradient-to-r hover:from-[#ccff00]/20 hover:to-[#7a9900]/20 hover:text-white"
              >
                Compare
              </Link>
              <Link
                href="/developers"
                className="shrink-0 rounded-lg border border-transparent px-3 py-1.5 text-white/90 transition-all hover:border-[#ccff00]/50 hover:bg-gradient-to-r hover:from-[#ccff00]/20 hover:to-[#7a9900]/20 hover:text-white"
              >
                Developers
              </Link>
            </nav>

            <div className="hidden md:flex shrink-0 items-center gap-2">
              <RhamTokenButton />
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </main>
        <footer className="border-t border-[#ccff00]/30 bg-[#0e1708]/90 backdrop-blur-md">
          <div className="mx-auto flex w-full max-w-[1600px] flex-col md:flex-row items-center justify-between gap-6 px-4 py-8 text-xs font-semibold text-white/70 sm:px-6 lg:px-8">
            <p className="max-w-4xl text-center md:text-left leading-relaxed">
              Token prices from Robinhood Chain DEXes (via Blockscout) · official
              prices from Chainlink feeds on Robinhood Chain · Predict markets
              are Robinhood Chain testnet only, play money · not investment
              advice.
            </p>
            <div className="flex items-center gap-3">
              <a
                href="https://github.com/milostocks/milostocks"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="MILO on GitHub"
                className="neo-btn flex shrink-0 items-center justify-center p-2.5 text-[#0d1406] rounded-lg hover:scale-105 transition-transform"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                </svg>
              </a>
              <a
                href="https://x.com/milostocks"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="MILO on X"
                className="neo-btn flex shrink-0 items-center justify-center p-2.5 text-[#0d1406] rounded-lg hover:scale-105 transition-transform"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M18.9 2H22l-7.5 8.6L23 22h-6.9l-5.4-6.6L4.4 22H1.3l8-9.2L1 2h7.1l4.9 6.1L18.9 2Zm-1.2 18h1.9L7.4 4H5.4l12.3 16Z" />
                </svg>
              </a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
