import Link from "next/link";

export const metadata = {
  title: "How it works — MILO",
  description:
    "How MILO's premium tracker and Predict markets work — real-ETH UP/DOWN bets, weekend-gap predictions, and the fETH internal wallet with its weekly prize draw.",
};

/** Hand-built SVG diagram of the weekend gap — styled for Cyber Gradient theme */
function WeekendGapDiagram() {
  return (
    <div className="neo-card p-6 shadow-xl">
      <svg viewBox="0 0 800 220" className="w-full" xmlns="http://www.w3.org/2000/svg">
        <line x1="60" y1="170" x2="740" y2="170" stroke="rgba(168, 85, 247, 0.4)" strokeWidth="2" />

        <line
          x1="120"
          y1="112"
          x2="680"
          y2="112"
          stroke="#ebff99"
          strokeWidth="2.5"
          strokeDasharray="6 7"
        />
        <circle cx="120" cy="112" r="6" fill="#ccff00" />

        <path
          d="M120,112 C220,100 260,140 320,120 S420,70 480,90 S600,50 680,58"
          fill="none"
          stroke="url(#svgGradient)"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <defs>
          <linearGradient id="svgGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ccff00" />
            <stop offset="50%" stopColor="#7a9900" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
        </defs>
        <circle cx="680" cy="58" r="7" fill="#f59e0b" stroke="#ffffff" strokeWidth="2" />

        <line x1="680" y1="58" x2="680" y2="112" stroke="#f59e0b" strokeWidth="2" strokeDasharray="3 4" />
        <text x="694" y="89" fontSize="14" fill="#f59e0b" fontWeight="900">
          PREMIUM
        </text>

        <line x1="120" y1="178" x2="120" y2="184" stroke="#ccff00" strokeWidth="2" />
        <line x1="680" y1="178" x2="680" y2="184" stroke="#f59e0b" strokeWidth="2" />

        <text x="120" y="204" fontSize="12" fill="#ccff00" fontWeight="800" textAnchor="middle">
          Fri 4:00pm — official close (frozen)
        </text>
        <text x="400" y="204" fontSize="12" fill="#ebff99" fontWeight="800" textAnchor="middle">
          weekend — token keeps trading 24/7
        </text>
        <text x="680" y="204" fontSize="12" fill="#f59e0b" fontWeight="800" textAnchor="middle">
          Mon 9:30am — market reopens
        </text>
      </svg>
    </div>
  );
}

function Section({
  step,
  title,
  children,
}: {
  step: string;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="neo-card p-6 sm:p-8">
      <span className="neo-badge border-[#ccff00]/40 bg-[#ccff00]/20 px-3 py-1 text-xs font-black text-[#ccff00]">{step}</span>
      <h2 className="mt-3 text-2xl font-black text-white">{title}</h2>
      <div className="mt-3 flex flex-col gap-3 text-sm font-semibold text-[#f5ffcc] leading-relaxed sm:text-base">{children}</div>
    </section>
  );
}

export default function HowItWorksPage() {
  return (
    <div className="flex w-full flex-col gap-8">
      <section className="neo-card flex flex-col gap-3 p-6 sm:p-8">
        <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">How MILO works</h1>
        <p className="max-w-4xl text-sm font-semibold text-[#f5ffcc] leading-relaxed sm:text-base">
          MILO has two halves: a live dashboard that tracks the premium
          between Robinhood&apos;s tokenized stocks and their real closing
          price (<Link href="/" className="font-black text-[#ccff00] underline hover:text-[#f59e0b]">Implied Open</Link>), and{" "}
          <Link href="/predict" className="font-black text-[#ccff00] underline hover:text-[#f59e0b]">Predict</Link>,
          where you can actually bet on which way a stock moves — with real
          ETH or with fETH, a free internal-wallet currency that needs no
          wallet at all. Robinhood Chain testnet only.
        </p>
      </section>

      <WeekendGapDiagram />

      <Section step="01 · WATCH IT" title="The premium — Implied Open">
        <p>
          Robinhood&apos;s tokenized stocks (NVDA, AAPL, TSLA, …) trade 24/7 on
          Robinhood Chain, but the real exchange only prices them during
          market hours. The gap between the token&apos;s live price and its
          frozen official close — the <strong className="bg-[#0c1406] px-1.5 py-0.5 border border-[#ccff00]/40 font-black text-[#ccff00]">premium</strong> —
          is the on-chain crowd&apos;s running bet on where the stock reopens.
        </p>
      </Section>

      <Section step="02 · BET ON IT — REAL ETH" title="Predict: UP/DOWN markets">
        <p>
          Every predictable ticker runs non-custodial, pari-mutuel markets:
          put ETH on <strong className="bg-[#ccff00]/20 px-1.5 py-0.5 border border-[#ccff00]/40 font-black text-[#d4ff2a]">UP</strong> or{" "}
          <strong className="bg-[#ea580c]/20 px-1.5 py-0.5 border border-[#ea580c]/40 font-black text-[#ea580c]">DOWN</strong> before the market
          locks. Winners split the losing side&apos;s pool pro-rata to their
          stake — nobody, including MILO, decides the outcome.
        </p>
        <p>Two kinds of market, same mechanic, different window:</p>
        <ul className="list-disc pl-5 flex flex-col gap-2">
          <li>
            <strong className="font-black text-[#ccff00] bg-[#0c1406] px-1.5 border border-[#ccff00]/40 rounded">Trading session</strong> —
            up or down between the open and close of a single NYSE session.
          </li>
          <li>
            <strong className="font-black text-[#f59e0b] bg-[#0c1406] px-1.5 border border-[#f59e0b]/40 rounded">Weekend gap</strong> — bet
            Friday&apos;s close (16:00 ET) against Monday&apos;s open (09:30 ET).
          </li>
        </ul>
      </Section>

      <Section step="03 · BET ON IT — NO WALLET" title="fETH: your internal wallet">
        <p>
          <strong className="font-black text-[#7a9900]">fETH</strong> (fake ETH) lets
          anyone play the same UP/DOWN markets with zero setup —{" "}
          <strong className="bg-[#0c1406] px-1.5 py-0.5 border border-[#7a9900]/40 font-black text-[#7a9900]">no wallet extension, no gas, no signup.</strong>
        </p>
        <p>
          Claim <strong className="font-black text-white bg-[#0c1406] px-1.5 py-0.5 border border-[#7a9900]/40 rounded">0.1 fETH</strong> once a
          week, then bet it on UP or DOWN just like an ETH market.
        </p>
      </Section>

      <Section step="04 · WIN IT" title="Weekly leaderboard + champion bonus">
        <p>
          Every fETH bet counts toward the{" "}
          <Link href="/predict/leaderboard" className="font-black text-[#ccff00] underline hover:text-[#f59e0b]">
            weekly leaderboard
          </Link>{" "}
          — ranked by net (winnings minus stakes) since the current Thursday
          reset.
        </p>
      </Section>

      <div className="neo-card p-4 text-xs font-black text-[#ebff99]">
        Robinhood Chain testnet only. fETH and testnet ETH have no real-world
        value. Nothing here is investment advice.
      </div>
    </div>
  );
}
