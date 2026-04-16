"use client";

import { TradePanel } from "@/components/TradePanel";
import { Nav } from "@/components/Nav";
import { ADDRESSES } from "@/lib/contracts";

export default function TradePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Nav active="trade" />

      <main className="flex-1 flex items-start justify-center pt-12 px-4">
        <div className="w-full max-w-md">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white">Trade $WIP</h1>
            <p className="text-sm text-[#8892a4]">
              Buy & sell WIPcoin here.
            </p>
            <div className="mt-2 flex items-center gap-2 text-xs text-[#8892a4] bg-[#0d1117] rounded-lg px-3 py-2 border border-[#2a2a3e]">
              <span>WIP:</span>
              <code className="text-[#f59e0b] font-mono text-[10px]">{ADDRESSES.wip}</code>
              <a
                href={`https://basescan.org/token/${ADDRESSES.wip}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#4e9af0] hover:underline ml-auto"
              >
                Basescan
              </a>
            </div>
          </div>
          <div className="bg-[#1a1a2e] rounded-xl p-5 border border-[#2a2a3e]">
            <TradePanel />
          </div>

          {/* Contracts */}
          <div className="mt-6 bg-[#0d1117] rounded-xl p-4 border border-[#2a2a3e] space-y-2 text-xs">
            <div className="text-[#8892a4] font-medium mb-2">Verified Contracts (Base)</div>
            {[
              { label: "WIP Token", addr: ADDRESSES.wip },
              { label: "WIP / USDC (1%)", addr: ADDRESSES.hookUsdc },
              { label: "WIP / WETH (2%)", addr: ADDRESSES.hookWeth },
              { label: "WIP / Clanker (2%)", addr: ADDRESSES.hookClanker },
              { label: "WIP / TRINI (2%)", addr: ADDRESSES.hookTrini },
            ].map((c) => (
              <div key={c.addr} className="flex justify-between items-center">
                <span className="text-[#8892a4]">{c.label}</span>
                <a
                  href={`https://basescan.org/address/${c.addr}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#4e9af0] hover:underline font-mono"
                >
                  {c.addr.slice(0, 6)}...{c.addr.slice(-4)}
                </a>
              </div>
            ))}
          </div>

          <div className="mt-4 bg-[#1a0a0a] rounded-xl p-4 border border-[#ef4444]/30 text-xs text-[#ef4444]/80 space-y-2">
            <div className="font-medium text-[#ef4444]">Trade at your own risk</div>
            <p>
              Experimental DeFi. Contracts verified on Basescan but not independently audited.
              Don&apos;t put in more than you&apos;re comfortable losing.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
