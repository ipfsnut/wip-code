"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { formatUnits, encodeFunctionData } from "viem";
import { Nav } from "@/components/Nav";
import {
  ADDRESSES, WIP_HOOKS,
  hookV8Abi, wipTokenAbi, makeWipPoolKey,
} from "@/lib/contracts";
import { useIsSafe, waitForTx } from "@/lib/safe";
import { useSearchParams } from "next/navigation";

export default function AdminPageWrapper() {
  return (
    <Suspense>
      <AdminPage />
    </Suspense>
  );
}

interface HookState {
  owner: string;
  initialized: boolean;
  seeded: boolean;
  liquidity: bigint;
  tickLower: number;
  tickUpper: number;
  wipInHook: bigint;
}

function AdminPage() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const searchParams = useSearchParams();
  const isSafe = useIsSafe();

  const preview = searchParams.get("preview") === "true";
  const isAuthorized = preview || (isConnected && address?.toLowerCase() === ADDRESSES.multisig.toLowerCase());

  const [hookStates, setHookStates] = useState<(HookState | null)[]>(WIP_HOOKS.map(() => null));
  const [safeWipBalance, setSafeWipBalance] = useState<bigint | null>(null);
  const [loading, setLoading] = useState<Record<number, string>>({});
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [successes, setSuccesses] = useState<Record<number, string>>({});

  const refresh = useCallback(async () => {
    if (!publicClient) return;
    try {
      const bal = await publicClient.readContract({
        address: ADDRESSES.wip, abi: wipTokenAbi, functionName: "balanceOf", args: [ADDRESSES.multisig],
      });
      setSafeWipBalance(bal);
    } catch { /* ignore */ }

    const states = await Promise.all(
      WIP_HOOKS.map(async (h) => {
        try {
          const [owner, initialized, seeded, liquidity, tickLower, tickUpper, wipInHook] = await Promise.all([
            publicClient.readContract({ address: h.hook, abi: hookV8Abi, functionName: "owner" }),
            publicClient.readContract({ address: h.hook, abi: hookV8Abi, functionName: "initialized" }),
            publicClient.readContract({ address: h.hook, abi: hookV8Abi, functionName: "seeded" }),
            publicClient.readContract({ address: h.hook, abi: hookV8Abi, functionName: "liquidity" }),
            publicClient.readContract({ address: h.hook, abi: hookV8Abi, functionName: "tickLower" }),
            publicClient.readContract({ address: h.hook, abi: hookV8Abi, functionName: "tickUpper" }),
            publicClient.readContract({ address: ADDRESSES.wip, abi: wipTokenAbi, functionName: "balanceOf", args: [h.hook] }),
          ]);
          return {
            owner: owner as string,
            initialized: initialized as boolean,
            seeded: seeded as boolean,
            liquidity: liquidity as bigint,
            tickLower: tickLower as number,
            tickUpper: tickUpper as number,
            wipInHook: wipInHook as bigint,
          };
        } catch {
          return null;
        }
      }),
    );
    setHookStates(states);
  }, [publicClient]);

  useEffect(() => { refresh(); }, [refresh]);

  async function sendTx(to: `0x${string}`, data: `0x${string}`) {
    if (!walletClient || !publicClient) throw new Error("No wallet");
    const hash = await walletClient.sendTransaction({
      to, data, chain: walletClient.chain, account: walletClient.account,
    });
    const ok = await waitForTx(publicClient, hash, isSafe);
    if (!ok) throw new Error("Transaction reverted");
    return hash;
  }

  const transferAbi = [{ type: "function" as const, name: "transfer", inputs: [{ type: "address", name: "to" }, { type: "uint256", name: "amount" }], outputs: [{ type: "bool" }], stateMutability: "nonpayable" as const }];

  async function handleTransferAndSeed(idx: number) {
    const h = WIP_HOOKS[idx];
    const state = hookStates[idx];
    setErrors(e => ({ ...e, [idx]: "" }));
    setSuccesses(s => ({ ...s, [idx]: "" }));

    try {
      if (!state?.seeded && state?.wipInHook === 0n) {
        setLoading(l => ({ ...l, [idx]: `Transferring ${h.wipAmountLabel} WIP to hook...` }));
        await sendTx(ADDRESSES.wip, encodeFunctionData({
          abi: transferAbi, functionName: "transfer", args: [h.hook, h.wipAmount],
        }));
      }

      setLoading(l => ({ ...l, [idx]: "Seeding liquidity..." }));
      const key = makeWipPoolKey(h.quote, h.hook);
      await sendTx(h.hook, encodeFunctionData({
        abi: hookV8Abi, functionName: "addLiquidity",
        args: [[key.currency0, key.currency1, key.fee, key.tickSpacing, key.hooks]],
      }));

      setSuccesses(s => ({ ...s, [idx]: isSafe ? "Submitted to Safe — check your Safe app for confirmation." : "Seeded!" }));
      setTimeout(() => refresh(), isSafe ? 5000 : 500);
    } catch (e: unknown) {
      setErrors(er => ({ ...er, [idx]: e instanceof Error ? e.message : "Failed" }));
    } finally {
      setLoading(l => { const n = { ...l }; delete n[idx]; return n; });
    }
  }

  async function handleEmergencyWithdraw(idx: number) {
    const h = WIP_HOOKS[idx];
    setErrors(e => ({ ...e, [idx]: "" }));
    try {
      setLoading(l => ({ ...l, [idx]: "Emergency withdrawing..." }));
      const key = makeWipPoolKey(h.quote, h.hook);
      await sendTx(h.hook, encodeFunctionData({
        abi: hookV8Abi, functionName: "emergencyWithdraw",
        args: [[key.currency0, key.currency1, key.fee, key.tickSpacing, key.hooks]],
      }));
      setSuccesses(s => ({ ...s, [idx]: isSafe ? "Submitted to Safe — check your Safe app for confirmation." : "Withdrawn to owner" }));
      setTimeout(() => refresh(), isSafe ? 5000 : 500);
    } catch (e: unknown) {
      setErrors(er => ({ ...er, [idx]: e instanceof Error ? e.message : "Failed" }));
    } finally {
      setLoading(l => { const n = { ...l }; delete n[idx]; return n; });
    }
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex flex-col">
        <Nav active="home" />
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="text-center space-y-4 max-w-md">
            <h1 className="text-xl font-bold text-white">Hook Admin</h1>
            <p className="text-sm text-[#8892a4]">
              This page is only accessible to the Safe that owns the WIP hook contracts.
              Connect with the Safe wallet, or add <code className="text-[#f59e0b]">?preview=true</code> to the URL to review.
            </p>
            <ConnectButton />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Nav active="home" />
      <main className="flex-1 flex items-start justify-center pt-8 px-4 pb-12">
        <div className="w-full max-w-2xl space-y-6">
          <div>
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-white">$WIP Hook Admin</h1>
              {preview && (
                <span className="text-xs bg-[#f59e0b]/20 text-[#f59e0b] px-2 py-1 rounded">Preview mode</span>
              )}
            </div>
            <p className="text-sm text-[#8892a4] mt-1">
              Manage the V8 continuous-curve hooks for $WIP. Only the Safe owner can execute transactions.
            </p>
          </div>

          {/* Instructions */}
          <div className="bg-[#1a1a2e] rounded-xl p-5 border border-[#2a2a3e] space-y-3 text-sm">
            <div className="text-white font-medium">Launch Instructions</div>
            <ol className="list-decimal list-inside space-y-2 text-[#8892a4]">
              <li>
                <span className="text-[#e0e0e0]">Transfer + Seed each pool.</span> Click the button on each hook below.
                This sends the designated WIP from your Safe to the hook contract,
                then calls <code className="text-[#f59e0b]">addLiquidity()</code> to mint the
                continuous liquidity position. Two transactions per pool.
              </li>
              <li>
                <span className="text-[#e0e0e0]">Buy into each pool.</span> After seeding, WIP starts
                at the bottom of the range (cheapest price). Make a small buy on
                each pool via the Trade page to get the pools indexed on GeckoTerminal
                and set the initial market price (~$0.0007).
              </li>
              <li>
                <span className="text-[#e0e0e0]">Verify.</span> Check Basescan for each hook to confirm
                reserves and ownership look correct.
              </li>
            </ol>
            <div className="text-xs text-[#8892a4]/60 mt-2">
              These hooks are tunable — you can Emergency Withdraw all liquidity
              at any time to adjust ranges or reallocate. Buy fees go to this Safe
              in the quote token. Sell fees burn WIP to 0xdead.
            </div>
          </div>

          {/* Safe balance */}
          <div className="bg-[#0d1117] rounded-xl p-4 border border-[#2a2a3e]">
            <div className="flex justify-between items-center text-sm">
              <span className="text-[#8892a4]">Safe WIP Balance</span>
              <span className="text-white font-mono">
                {safeWipBalance !== null
                  ? `${Number(formatUnits(safeWipBalance, 18)).toLocaleString(undefined, { maximumFractionDigits: 0 })} WIP`
                  : "Loading..."
                }
              </span>
            </div>
            <div className="flex justify-between items-center text-xs mt-1">
              <span className="text-[#8892a4]/60">Safe</span>
              <code className="text-[#f59e0b] text-[10px]">{ADDRESSES.multisig}</code>
            </div>
          </div>

          {/* Hook cards */}
          {WIP_HOOKS.map((h, idx) => {
            const state = hookStates[idx];
            const isSeeded = state?.seeded ?? false;
            const hasWip = (state?.wipInHook ?? 0n) > 0n;

            return (
              <div key={idx} className="bg-[#0d1117] rounded-xl p-4 border border-[#2a2a3e] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-white font-medium">{h.label}</span>
                    <span className="text-[#8892a4] text-sm ml-2">({h.feePct} fee)</span>
                  </div>
                  <div>
                    {isSeeded ? (
                      <span className="text-xs bg-[#22c55e]/20 text-[#22c55e] px-2 py-0.5 rounded">Live</span>
                    ) : hasWip ? (
                      <span className="text-xs bg-[#f59e0b]/20 text-[#f59e0b] px-2 py-0.5 rounded">WIP loaded, needs seed</span>
                    ) : state ? (
                      <span className="text-xs bg-[#ef4444]/20 text-[#ef4444] px-2 py-0.5 rounded">Empty</span>
                    ) : (
                      <span className="text-xs bg-[#8892a4]/20 text-[#8892a4] px-2 py-0.5 rounded">Loading...</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-[#1a1a2e] rounded p-2">
                    <div className="text-[#8892a4]">Hook</div>
                    <code className="text-[#f59e0b] text-[10px] break-all">{h.hook}</code>
                  </div>
                  <div className="bg-[#1a1a2e] rounded p-2">
                    <div className="text-[#8892a4]">Planned</div>
                    <div className="text-white font-mono">{h.wipAmountLabel} WIP</div>
                  </div>
                  {state && (
                    <>
                      <div className="bg-[#1a1a2e] rounded p-2">
                        <div className="text-[#8892a4]">WIP in hook</div>
                        <div className="text-white font-mono">
                          {Number(formatUnits(state.wipInHook, 18)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </div>
                      </div>
                      <div className="bg-[#1a1a2e] rounded p-2">
                        <div className="text-[#8892a4]">Liquidity</div>
                        <div className="text-white font-mono">
                          {state.liquidity > 0n ? state.liquidity.toString() : "0"}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {errors[idx] && (
                  <div className="text-xs text-[#ef4444] bg-[#1a0a0a] rounded p-2 border border-[#ef4444]/30 break-all">
                    {errors[idx]}
                  </div>
                )}
                {successes[idx] && (
                  <div className="text-xs text-[#22c55e] bg-[#0a1a0a] rounded p-2 border border-[#22c55e]/30">
                    {successes[idx]}
                  </div>
                )}

                <div className="flex gap-2">
                  {!isSeeded && (
                    <button
                      onClick={() => handleTransferAndSeed(idx)}
                      disabled={preview || !!loading[idx]}
                      className="flex-1 py-2 rounded-lg bg-[#f59e0b] text-black text-sm font-medium disabled:opacity-50"
                    >
                      {loading[idx] || `Transfer ${h.wipAmountLabel} & Seed`}
                    </button>
                  )}
                  {isSeeded && (
                    <button
                      onClick={() => handleEmergencyWithdraw(idx)}
                      disabled={preview || !!loading[idx]}
                      className="flex-1 py-2 rounded-lg bg-[#ef4444]/20 text-[#ef4444] text-sm font-medium border border-[#ef4444]/30 disabled:opacity-50"
                    >
                      {loading[idx] || "Emergency Withdraw"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
