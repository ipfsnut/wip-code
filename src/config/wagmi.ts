"use client";

import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  walletConnectWallet,
  coinbaseWallet,
  metaMaskWallet,
  rainbowWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { base } from "wagmi/chains";
import { http, fallback, createConfig } from "wagmi";
import { safe } from "wagmi/connectors";

const PROJECT_ID = "2efb2aeae04a72cb733a24ae9efaaf0e";

const connectors = connectorsForWallets(
  [
    {
      groupName: "Connect",
      wallets: [walletConnectWallet, coinbaseWallet, metaMaskWallet, rainbowWallet],
    },
  ],
  { appName: "WIP Staking", projectId: PROJECT_ID }
);

export const config = createConfig({
  connectors: [...connectors, safe({ allowedDomains: [/safe\.global$/] })],
  chains: [base],
  transports: {
    [base.id]: fallback([
      http("https://base.llamarpc.com", { batch: false }),
      http("https://base.drpc.org", { batch: false }),
      http("https://base-rpc.publicnode.com", { batch: false }),
      http("https://1rpc.io/base", { batch: false }),
      http("https://mainnet.base.org", { batch: false }),
    ]),
  },
  ssr: false,
});
