"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";

export function useIsSafe(): boolean {
  const { connector } = useAccount();
  const [isSafe, setIsSafe] = useState(false);

  useEffect(() => {
    if (connector?.id === "safe") {
      setIsSafe(true);
      return;
    }
    // Fallback: detect Safe iframe via SDK
    let cancelled = false;
    (async () => {
      try {
        const { default: SafeAppsSDK } = await import("@safe-global/safe-apps-sdk");
        const sdk = new SafeAppsSDK();
        const info = await Promise.race([
          sdk.safe.getInfo(),
          new Promise<null>((r) => setTimeout(() => r(null), 2000)),
        ]);
        if (!cancelled && info?.safeAddress) setIsSafe(true);
      } catch {
        // not in Safe context
      }
    })();
    return () => { cancelled = true; };
  }, [connector]);

  return isSafe;
}

/**
 * Wait for a transaction receipt, with Safe-aware handling.
 * Safe txs return a proposal hash, not an on-chain hash — we can't poll for a receipt.
 * Instead we wait briefly and return true (optimistic).
 */
export async function waitForTx(
  publicClient: { waitForTransactionReceipt: (opts: { hash: `0x${string}`; timeout?: number }) => Promise<{ status: string }> },
  hash: `0x${string}`,
  isSafe: boolean,
): Promise<boolean> {
  if (isSafe) {
    await new Promise((r) => setTimeout(r, 2000));
    return true;
  }
  const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 60_000 });
  return receipt.status === "success";
}
