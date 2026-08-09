import PredictProviders from "./providers";

export default function PredictTickerLayout({ children }: { children: React.ReactNode }) {
  return <PredictProviders>{children}</PredictProviders>;
}
