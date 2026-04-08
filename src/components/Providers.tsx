"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { AuthKitProvider } from "@farcaster/auth-kit";
import { config } from "@/config/wagmi";
import "@rainbow-me/rainbowkit/styles.css";
import "@farcaster/auth-kit/styles.css";

const queryClient = new QueryClient();

const authKitConfig = {
  rpcUrl: "https://mainnet.optimism.io",
  domain: "wip-staking.pages.dev",
  siweUri: "https://wip-staking.pages.dev",
};

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: "#f59e0b",
            borderRadius: "medium",
          })}
        >
          <AuthKitProvider config={authKitConfig}>
            {children}
          </AuthKitProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
