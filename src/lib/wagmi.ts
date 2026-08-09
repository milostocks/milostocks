// `injected()` targets window.ethereum directly — both MetaMask and Rabby
// inject there as standard EIP-1193 providers, so one connector covers both
// without wallet-specific code. No WalletConnect (would need a project ID /
// external account we don't have yet) — extension wallets only for v1.
import { createConfig, http, injected } from "wagmi";
import { robinhoodTestnet } from "./chains";

export const wagmiConfig = createConfig({
  chains: [robinhoodTestnet],
  connectors: [injected()],
  transports: {
    [robinhoodTestnet.id]: http(),
  },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
