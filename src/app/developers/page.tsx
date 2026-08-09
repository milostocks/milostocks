import type { Metadata } from "next";
import EmbedSnippet from "@/components/EmbedSnippet";

export const metadata: Metadata = {
  title: "Developers — API docs — Implied Open",
  description:
    "Free, unauthenticated JSON API and embeddable widgets for Robinhood Chain tokenized-stock premium data.",
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://milostocks.com";

export default function DevelopersPage() {
  return (
    <div className="flex w-full flex-col gap-8">
      <section className="neo-card flex flex-col gap-3 p-6 sm:p-8">
        <span className="neo-badge border-[#ccff00]/40 bg-[#ccff00]/20 px-3 py-1 text-xs font-black text-[#ccff00] w-max">API & EMBED</span>
        <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">Developers</h1>
        <p className="max-w-3xl text-sm font-semibold text-[#f5ffcc] leading-relaxed sm:text-base">
          Every number on this site comes from two public endpoints below —
          no API key, no auth, open CORS (<code className="mono bg-[#0c1406] px-1.5 py-0.5 border border-[#7a9900]/30 font-black text-[#ccff00]">Access-Control-Allow-Origin: *</code>),
          refreshed every 30s.
        </p>
      </section>

      <Endpoint
        method="GET"
        path="/api/premium"
        description="Every tracked ticker's live premium in one call — this is exactly what powers the homepage table."
        example={`curl ${SITE_URL}/api/premium`}
        response={`{
  "updatedAt": 1753142400,
  "stocks": [
    {
      "ticker": "NVDA",
      "name": "NVIDIA",
      "tokenPrice": 213.96,
      "official": 207.04,
      "officialUpdatedAt": 1753056000,
      "premiumPct": 3.34,
      "volume24h": 3589862.74,
      "liquid": true
    },
    ...
  ]
}`}
      />

      <Endpoint
        method="GET"
        path="/api/premium/{ticker}"
        description={`Same shape as above, scoped to one ticker. Returns 404 with { "error": ... } if the ticker isn't tracked or has no live price right now.`}
        example={`curl ${SITE_URL}/api/premium/NVDA`}
        response={`{
  "ticker": "NVDA",
  "name": "NVIDIA",
  "tokenPrice": 213.96,
  "official": 207.04,
  "officialUpdatedAt": 1753056000,
  "premiumPct": 3.34,
  "volume24h": 3589862.74,
  "liquid": true,
  "updatedAt": 1753142400
}`}
      />

      <section className="neo-card p-6 sm:p-8 flex flex-col gap-4">
        <h2 className="text-xl font-black text-white uppercase">Field reference</h2>
        <div className="neo-box overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="bg-[#0c1406] text-left text-xs uppercase font-black text-[#f5ffcc] border-b border-[#7a9900]/30">
                <th className="px-4 py-3 border-r border-[#7a9900]/30 text-[#ccff00]">Field</th>
                <th className="px-4 py-3">Meaning</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#7a9900]/20 font-extrabold text-[#f5ffcc]">
              {[
                ["tokenPrice", "Live DEX price the token trades at on Robinhood Chain, USD."],
                ["official", "Frozen Chainlink close — only updates during NYSE hours."],
                ["officialUpdatedAt", "Unix seconds the Chainlink feed last updated."],
                ["premiumPct", "(tokenPrice − official) / official × 100."],
                ["volume24h", "24h onchain volume, USD, or null if Blockscout doesn't know it."],
                ["liquid", "false below $1,000 24h volume — DEX price may be stale."],
              ].map(([field, meaning]) => (
                <tr key={field} className="hover:bg-[#1f113a] transition-colors">
                  <td className="mono px-4 py-3 font-black text-[#ccff00] border-r border-[#7a9900]/20">{field}</td>
                  <td className="px-4 py-3 text-[#f5ffcc]">{meaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="neo-card p-6 sm:p-8 flex flex-col gap-4">
        <h2 className="text-xl font-black text-white uppercase">Embeddable widget</h2>
        <p className="text-sm font-semibold text-[#f5ffcc]">
          <code className="mono bg-gradient-to-r from-[#ccff00] to-[#f59e0b] px-2 py-0.5 border border-white/20 font-black text-white rounded">/embed/{"{ticker}"}</code> is a bare, iframe-able
          HTML card — same data, refreshed every 30s. Try it below:
        </p>
        <EmbedSnippet ticker="NVDA" />
      </section>

      <section className="neo-card p-4 text-xs font-black text-[#ebff99] flex flex-col gap-2">
        <p>No rate limit is enforced today — be a reasonable citizen.</p>
        <p>Found a bug or want a field added? Reach out via X (@noc_vault).</p>
      </section>
    </div>
  );
}

function Endpoint({
  method,
  path,
  description,
  example,
  response,
}: {
  method: string;
  path: string;
  description: string;
  example: string;
  response: string;
}) {
  return (
    <section className="neo-card p-6 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="neo-badge border-[#ccff00]/40 bg-[#ccff00]/20 px-3 py-1 text-xs font-black text-[#ccff00]">{method}</span>
        <code className="mono text-base font-black text-white bg-[#0c1406] px-2 py-0.5 border border-[#7a9900]/30 rounded">{path}</code>
      </div>
      <p className="text-sm font-semibold text-[#f5ffcc]">{description}</p>
      <div className="flex flex-col gap-2">
        <p className="text-xs uppercase font-black text-[#ebff99]">REQUEST</p>
        <code className="mono block overflow-x-auto whitespace-pre neo-box bg-[#091104] p-4 text-xs font-bold text-[#ccff00]">
          {example}
        </code>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-xs uppercase font-black text-[#ebff99]">RESPONSE</p>
        <code className="mono block overflow-x-auto whitespace-pre neo-box bg-[#091104] p-4 text-xs font-bold text-[#f5ffcc]">
          {response}
        </code>
      </div>
    </section>
  );
}
