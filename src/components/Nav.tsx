"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { SignInButton, useProfile } from "@farcaster/auth-kit";
import Link from "next/link";

export function Nav({ active }: { active: "home" | "stake" }) {
  const { isAuthenticated, profile } = useProfile();

  return (
    <nav className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a3e]">
      <div className="flex items-center gap-6">
        <span className="text-xl font-bold text-white">WIP</span>
        <div className="flex gap-4 text-sm">
          <Link href="/" className={active === "home" ? "text-[#f59e0b] font-medium" : "text-[#8892a4] hover:text-white transition-colors"}>
            Home
          </Link>
          <Link href="/stake" className={active === "stake" ? "text-[#f59e0b] font-medium" : "text-[#8892a4] hover:text-white transition-colors"}>
            Stake
          </Link>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {isAuthenticated && profile?.username && (
          <span className="text-xs text-[#8892a4] mr-1">@{profile.username}</span>
        )}
        {!isAuthenticated && (
          <div className="[&_button]:!py-1.5 [&_button]:!px-3 [&_button]:!text-xs [&_button]:!rounded-lg">
            <SignInButton />
          </div>
        )}
        <ConnectButton />
      </div>
    </nav>
  );
}
