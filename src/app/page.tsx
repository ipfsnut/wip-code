"use client";

import { Nav } from "@/components/Nav";
import Link from "next/link";
import { ADDRESSES } from "@/lib/contracts";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Nav active="home" />

      <main className="flex-1 flex items-start justify-center pt-12 px-4">
        <div className="w-full max-w-md space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-white">$WIP</h1>
            <p className="text-sm text-[#8892a4]">
              Stake WIP. Earn rewards.
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

          <Link
            href="/stake"
            className="block w-full py-3 rounded-lg bg-[#f59e0b] text-black font-medium text-center hover:bg-[#d97706] transition-colors"
          >
            Stake $WIP
          </Link>

          {/* Contracts */}
          <div className="bg-[#0d1117] rounded-xl p-4 border border-[#2a2a3e] space-y-2 text-xs">
            <div className="text-[#8892a4] font-medium mb-2">Verified Contracts (Base)</div>
            {[
              { label: "WIP Token", addr: ADDRESSES.wip },
              { label: "Staking Hub", addr: ADDRESSES.stakingHub },
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
        </div>
      </main>
    </div>
  );
}
