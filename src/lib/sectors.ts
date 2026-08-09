// Hand-maintained ticker → sector map for the 34-ticker registry (lib/registry.ts).
// No sector taxonomy exists in Blockscout or Chainlink's feed list, so this is
// curated the same way lib/predictContracts.ts's PREDICTABLE_TICKERS is —
// update by hand when gen-registry.mjs adds a new ticker (a missing entry
// just falls into "Other", it never breaks the build).

export const SECTORS = [
  "Semiconductors",
  "Big Tech",
  "AI / Data Center",
  "Auto & Aerospace",
  "Fintech & Crypto",
  "Consumer & Retail",
  "ETF & Macro",
  "Other",
] as const;

export type Sector = (typeof SECTORS)[number];

const TICKER_SECTOR: Record<string, Sector> = {
  NVDA: "Semiconductors",
  AMD: "Semiconductors",
  INTC: "Semiconductors",
  MU: "Semiconductors",
  SNDK: "Semiconductors",
  TSM: "Semiconductors",
  ASML: "Semiconductors",

  AAPL: "Big Tech",
  GOOGL: "Big Tech",
  MSFT: "Big Tech",
  META: "Big Tech",
  AMZN: "Big Tech",
  ORCL: "Big Tech",
  BABA: "Big Tech",

  PLTR: "AI / Data Center",
  CRWV: "AI / Data Center",
  NBIS: "AI / Data Center",
  IONQ: "AI / Data Center",
  RGTI: "AI / Data Center",

  TSLA: "Auto & Aerospace",
  SPCX: "Auto & Aerospace",
  RKLB: "Auto & Aerospace",

  COIN: "Fintech & Crypto",
  CRCL: "Fintech & Crypto",
  MSTR: "Fintech & Crypto",
  CLSK: "Fintech & Crypto",
  GME: "Fintech & Crypto",

  USAR: "Consumer & Retail",

  SPY: "ETF & Macro",
  QQQ: "ETF & Macro",
  USO: "ETF & Macro",
  SLV: "ETF & Macro",
  SGOV: "ETF & Macro",
  EWY: "ETF & Macro",
};

export function getSector(ticker: string): Sector {
  return TICKER_SECTOR[ticker] ?? "Other";
}
