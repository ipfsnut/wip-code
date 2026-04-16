"use client";

import { useState, useEffect, useCallback } from "react";
import {
  useAccount, useBalance, useReadContract, usePublicClient, useWalletClient,
} from "wagmi";
import { formatUnits, parseUnits, encodeFunctionData, encodeAbiParameters } from "viem";
import { ADDRESSES, WIP_HOOKS, wipTokenAbi, makeWipPoolKey } from "@/lib/contracts";
import { useIsSafe, waitForTx } from "@/lib/safe";

const erc20Abi = [
  { name: "balanceOf", type: "function", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "approve", type: "function", stateMutability: "nonpayable", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }] },
  { name: "allowance", type: "function", stateMutability: "view", inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ type: "uint256" }] },
] as const;

const PERMIT2_ABI = [
  { name: "approve", type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "token", type: "address" }, { name: "spender", type: "address" }, { name: "amount", type: "uint160" }, { name: "expiration", type: "uint48" }], outputs: [] },
  { name: "allowance", type: "function", stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }, { name: "token", type: "address" }, { name: "spender", type: "address" }],
    outputs: [{ name: "amount", type: "uint160" }, { name: "expiration", type: "uint48" }, { name: "nonce", type: "uint48" }] },
] as const;

const UNIVERSAL_ROUTER_ABI = [
  { name: "execute", type: "function", stateMutability: "payable",
    inputs: [{ name: "commands", type: "bytes" }, { name: "inputs", type: "bytes[]" }, { name: "deadline", type: "uint256" }], outputs: [] },
] as const;

const QUOTER_ABI = [{
  name: "quoteExactInputSingle", type: "function", stateMutability: "nonpayable",
  inputs: [{ type: "tuple", name: "params", components: [
    { name: "poolKey", type: "tuple", components: [
      { name: "currency0", type: "address" }, { name: "currency1", type: "address" },
      { name: "fee", type: "uint24" }, { name: "tickSpacing", type: "int24" }, { name: "hooks", type: "address" },
    ]},
    { name: "zeroForOne", type: "bool" }, { name: "exactAmount", type: "uint128" }, { name: "hookData", type: "bytes" },
  ]}],
  outputs: [{ name: "amountOut", type: "uint256" }, { name: "gasEstimate", type: "uint256" }],
}] as const;

const POOL_COLORS = ["#f59e0b", "#4e9af0", "#ef4444", "#22c55e"];

type Step = "input" | "approved";

export function TradePanel() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const isSafe = useIsSafe();
  const [poolIdx, setPoolIdx] = useState(0);
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<Step>("input");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [slippageBps] = useState(100); // 1% default, UI hidden for simplicity
  const [quoteOut, setQuoteOut] = useState<bigint | null>(null);
  const [quoteFailed, setQuoteFailed] = useState(false);
  const [safeSuccess, setSafeSuccess] = useState<string | null>(null);

  const h = WIP_HOOKS[poolIdx];
  const poolKey = makeWipPoolKey(h.quote, h.hook);

  // WIP is always currency1. Buy = pay quote (c0) get WIP (c1) = zeroForOne=true
  const spendToken = side === "buy" ? h.quote : ADDRESSES.wip;
  const spendDecimals = side === "buy" ? h.quoteDecimals : 18;
  const spendSymbol = side === "buy" ? h.quoteSymbol : "WIP";
  const outDecimals = side === "buy" ? 18 : h.quoteDecimals;
  const outSymbol = side === "buy" ? "WIP" : h.quoteSymbol;
  const zeroForOne = side === "buy";
  const isNativeEthBuy = h.quoteSymbol === "WETH" && side === "buy";

  const parsedAmount = amount && !isNaN(Number(amount))
    ? parseUnits(amount, spendDecimals) : 0n;

  useEffect(() => { setStep("input"); setError(null); setSafeSuccess(null); }, [amount, poolIdx, side]);

  const { data: spendBalance, refetch: refetchSpend } = useReadContract({
    address: spendToken, abi: erc20Abi, functionName: "balanceOf",
    args: address ? [address] : undefined, query: { enabled: !!address },
  });

  const { data: wipBalance, refetch: refetchWip } = useReadContract({
    address: ADDRESSES.wip, abi: wipTokenAbi, functionName: "balanceOf",
    args: address ? [address] : undefined, query: { enabled: !!address },
  });

  const { data: ethData } = useBalance({ address, query: { enabled: !!address } });

  const refetchAll = useCallback(() => { refetchSpend(); refetchWip(); }, [refetchSpend, refetchWip]);

  useEffect(() => {
    setQuoteOut(null);
    setQuoteFailed(false);
    if (parsedAmount === 0n || !publicClient) return;
    publicClient.simulateContract({
      address: ADDRESSES.quoter, abi: QUOTER_ABI,
      functionName: "quoteExactInputSingle",
      args: [{ poolKey, zeroForOne, exactAmount: parsedAmount, hookData: "0x" }],
    }).then((r) => { setQuoteOut(r.result[0]); setQuoteFailed(false); })
      .catch(() => { setQuoteOut(null); setQuoteFailed(true); });
  }, [parsedAmount, poolIdx, side, publicClient, poolKey.hooks, zeroForOne]);

  async function handleApprove() {
    if (parsedAmount === 0n || !address || !walletClient || !publicClient) return;
    setLoading("Checking approvals..."); setError(null);
    try {
      if (isNativeEthBuy) { setStep("approved"); setLoading(null); return; }

      const permit2Allow = await publicClient.readContract({
        address: spendToken, abi: erc20Abi, functionName: "allowance",
        args: [address, ADDRESSES.permit2],
      });
      if ((permit2Allow as bigint) < parsedAmount) {
        setLoading(`Approving ${amount} ${spendSymbol} to Permit2...`);
        const hash = await walletClient.writeContract({
          address: spendToken, abi: erc20Abi, functionName: "approve",
          args: [ADDRESSES.permit2, parsedAmount],
          chain: walletClient.chain, account: walletClient.account,
        });
        await waitForTx(publicClient, hash, isSafe);
      }

      const [routerAllow] = await publicClient.readContract({
        address: ADDRESSES.permit2, abi: PERMIT2_ABI, functionName: "allowance",
        args: [address, spendToken, ADDRESSES.universalRouter],
      });
      if (routerAllow < parsedAmount) {
        setLoading(`Approving ${amount} ${spendSymbol} for this trade...`);
        const hash = await walletClient.writeContract({
          address: ADDRESSES.permit2, abi: PERMIT2_ABI, functionName: "approve",
          args: [spendToken, ADDRESSES.universalRouter, parsedAmount, Math.floor(Date.now() / 1000) + 3600],
          chain: walletClient.chain, account: walletClient.account,
        });
        await waitForTx(publicClient, hash, isSafe);
      }
      setStep("approved");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Approval failed");
    } finally { setLoading(null); }
  }

  async function handleTrade() {
    if (parsedAmount === 0n || !address || !walletClient || !publicClient) return;
    setLoading("Swapping..."); setError(null);
    try {
      const tokenIn = side === "buy" ? h.quote : ADDRESSES.wip;
      const tokenOut = side === "buy" ? ADDRESSES.wip : h.quote;

      let minAmountOut: bigint;
      try {
        const r = await publicClient.simulateContract({
          address: ADDRESSES.quoter, abi: QUOTER_ABI,
          functionName: "quoteExactInputSingle",
          args: [{ poolKey, zeroForOne, exactAmount: parsedAmount, hookData: "0x" }],
        });
        minAmountOut = r.result[0] * BigInt(10000 - slippageBps) / 10000n;
      } catch { throw new Error("Unable to get price quote. Please try again."); }

      const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200);

      const swapParams = encodeAbiParameters(
        [{ type: "tuple", components: [
          { type: "tuple", name: "poolKey", components: [
            { name: "currency0", type: "address" }, { name: "currency1", type: "address" },
            { name: "fee", type: "uint24" }, { name: "tickSpacing", type: "int24" },
            { name: "hooks", type: "address" },
          ]},
          { name: "zeroForOne", type: "bool" }, { name: "amountIn", type: "uint128" },
          { name: "amountOutMinimum", type: "uint128" }, { name: "hookData", type: "bytes" },
        ]}],
        [{ poolKey, zeroForOne, amountIn: parsedAmount, amountOutMinimum: minAmountOut, hookData: "0x" }]
      );

      let commands: `0x${string}`;
      let inputs: `0x${string}`[];
      let txValue: bigint;

      if (isNativeEthBuy) {
        const ADDRESS_THIS = "0x0000000000000000000000000000000000000002" as `0x${string}`;
        const wrapInput = encodeAbiParameters(
          [{ type: "address" }, { type: "uint256" }], [ADDRESS_THIS, parsedAmount]
        );
        const actions = "0x060b0f" as `0x${string}`;
        const settleParams = encodeAbiParameters(
          [{ type: "address" }, { type: "uint256" }, { type: "bool" }], [tokenIn, 0n, false]
        );
        const takeParams = encodeAbiParameters(
          [{ type: "address" }, { type: "uint256" }], [tokenOut, minAmountOut]
        );
        const v4Input = encodeAbiParameters(
          [{ type: "bytes" }, { type: "bytes[]" }], [actions, [swapParams, settleParams, takeParams]]
        );
        commands = "0x0b10"; inputs = [wrapInput, v4Input]; txValue = parsedAmount;
      } else {
        const actions = "0x060c0f" as `0x${string}`;
        const settleParams = encodeAbiParameters(
          [{ type: "address" }, { type: "uint256" }], [tokenIn, parsedAmount]
        );
        const takeParams = encodeAbiParameters(
          [{ type: "address" }, { type: "uint256" }], [tokenOut, minAmountOut]
        );
        const v4Input = encodeAbiParameters(
          [{ type: "bytes" }, { type: "bytes[]" }], [actions, [swapParams, settleParams, takeParams]]
        );
        commands = "0x10"; inputs = [v4Input]; txValue = 0n;
      }

      const hash = await walletClient.sendTransaction({
        to: ADDRESSES.universalRouter,
        data: encodeFunctionData({ abi: UNIVERSAL_ROUTER_ABI, functionName: "execute", args: [commands, inputs, deadline] }),
        value: txValue, chain: walletClient.chain, account: walletClient.account, gas: 500_000n,
      });
      await waitForTx(publicClient, hash, isSafe);
      setAmount(""); setStep("input");
      if (isSafe) setSafeSuccess("Transaction submitted to your Safe. Check your Safe app for confirmation.");
      setTimeout(() => refetchAll(), isSafe ? 5000 : 2000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Trade failed"); setStep("input");
    } finally { setLoading(null); }
  }

  const fmt = (val: bigint | undefined, dec: number, dp = 4) =>
    val !== undefined ? Number(formatUnits(val, dec)).toFixed(dp) : "\u2014";

  return (
    <div className="space-y-6">
      {/* Pool selector */}
      <div className="flex gap-2">
        {WIP_HOOKS.map((p, i) => (
          <button key={i}
            onClick={() => { setPoolIdx(i); setAmount(""); setStep("input"); }}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex flex-col items-center leading-tight ${
              poolIdx === i ? "text-white" : "bg-[#1a1a2e] text-[#8892a4] hover:text-white"
            }`}
            style={poolIdx === i ? { background: POOL_COLORS[i] } : {}}
          >
            <span>{p.quoteSymbol}</span>
            <span className={`text-[10px] ${poolIdx === i ? "opacity-80" : "opacity-60"}`}>{p.feePct} fee</span>
          </button>
        ))}
      </div>

      {/* Buy / Sell */}
      <div className="flex gap-2">
        <button onClick={() => { setSide("buy"); setAmount(""); setStep("input"); }}
          className={`flex-1 py-2 rounded-lg font-medium transition-colors ${side === "buy" ? "bg-[#22c55e] text-black" : "bg-[#1a1a2e] text-[#8892a4]"}`}
        >Buy</button>
        <button onClick={() => { setSide("sell"); setAmount(""); setStep("input"); }}
          className={`flex-1 py-2 rounded-lg font-medium transition-colors ${side === "sell" ? "bg-[#ef4444] text-white" : "bg-[#1a1a2e] text-[#8892a4]"}`}
        >Sell</button>
      </div>

      {isNativeEthBuy && (
        <div className="text-xs text-[#22c55e] bg-[#0d1117] rounded-lg p-2 border border-[#22c55e]/30">
          Send native ETH — automatically wrapped to WETH for the swap.
        </div>
      )}

      {/* Input */}
      <div className="bg-[#0d1117] rounded-lg p-4 border border-[#2a2a3e]">
        <div className="flex justify-between text-xs text-[#8892a4] mb-2">
          <span>You {side === "buy" ? "pay" : "sell"}</span>
          <span>
            Balance: {isNativeEthBuy
              ? `${fmt(ethData?.value, 18, 4)} ETH`
              : `${fmt(spendBalance as bigint | undefined, spendDecimals, 4)} ${spendSymbol}`}
          </span>
        </div>
        <div className="flex gap-2 items-center">
          <input type="text" inputMode="decimal" placeholder="0.0"
            value={amount} onChange={(e) => setAmount(e.target.value)}
            disabled={step !== "input"}
            className="flex-1 bg-transparent text-white text-2xl font-mono outline-none disabled:opacity-50"
          />
          <span className="text-[#8892a4] font-medium">{spendSymbol}</span>
        </div>
        <div className="flex gap-1 mt-2">
          {[25, 50, 75, 100].map((pct) => {
            const bal = isNativeEthBuy ? ethData?.value : spendBalance as bigint | undefined;
            return (
              <button key={pct} disabled={!bal || step !== "input"}
                onClick={() => { if (bal) setAmount(formatUnits(pct === 100 ? bal : bal * BigInt(pct) / 100n, spendDecimals)); }}
                className="flex-1 py-1 text-xs rounded bg-[#1a1a2e] text-[#8892a4] hover:text-white disabled:opacity-30"
              >{pct}%</button>
            );
          })}
        </div>
      </div>

      {/* Quote preview */}
      {parsedAmount > 0n && !quoteFailed && (
        <div className="bg-[#1a1a2e] rounded-lg p-4 border border-[#2a2a3e] space-y-3">
          {quoteOut !== null && quoteOut > 0n && (
            <div>
              <div className="text-xs text-[#8892a4] mb-1">You receive</div>
              <div className="text-white text-xl font-mono">{fmt(quoteOut, outDecimals, 4)} {outSymbol}</div>
            </div>
          )}
          <div className="text-xs text-[#8892a4]">
            Slippage: {slippageBps / 100}%
          </div>
        </div>
      )}

      {parsedAmount > 0n && quoteFailed && (
        <div className="text-xs text-[#ef4444] bg-[#1a0a0a] rounded-lg p-3 border border-[#ef4444]/30">
          Pool has no liquidity for this trade. It may not be seeded yet.
        </div>
      )}

      {error && (
        <div className="text-sm text-[#ef4444] bg-[#0d1117] rounded-lg p-3 border border-[#ef4444]/30 break-all">{error}</div>
      )}

      {safeSuccess && (
        <div className="text-sm text-[#22c55e] bg-[#0a1a0a] rounded-lg p-3 border border-[#22c55e]/30">{safeSuccess}</div>
      )}

      {!isConnected ? (
        <div className="text-center text-[#8892a4] py-4">Connect wallet to trade</div>
      ) : step === "input" ? (
        <button onClick={handleApprove} disabled={loading !== null || parsedAmount === 0n}
          className="w-full py-3 rounded-lg bg-[#f59e0b] text-black font-medium disabled:opacity-50"
        >{loading || `Approve ${amount || "0"} ${spendSymbol}`}</button>
      ) : (
        <button onClick={handleTrade} disabled={loading !== null}
          className={`w-full py-3 rounded-lg font-medium disabled:opacity-50 ${side === "buy" ? "bg-[#22c55e] text-black" : "bg-[#ef4444] text-white"}`}
        >{loading || `${side === "buy" ? "Buy" : "Sell"} WIP`}</button>
      )}

      {isConnected && wipBalance !== undefined && (
        <div className="text-center text-sm text-[#8892a4]">
          Your WIP: <span className="text-white font-mono">{fmt(wipBalance, 18, 2)}</span>
        </div>
      )}
    </div>
  );
}
