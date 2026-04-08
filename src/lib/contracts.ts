import { parseAbi } from "viem";

// ── Deployed addresses (Base mainnet) ──────────────────────────────
export const ADDRESSES = {
  wip: "0xE21ec3068a538a064FF0BdD69db0204306fc00a0" as `0x${string}`,
  stakingHub: "0xF402f09C67cb85A1aB002733B72dA8c0B075f318" as `0x${string}`,
  multisig: "0x13a41Ee5ED0b3150e0db1Fd9156D5359c03699B1" as `0x${string}`,
} as const;

// ── ABIs ────────────────────────────────────────────────────────────
export const wipTokenAbi = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
]);

export const stakingHubAbi = parseAbi([
  "function stake(uint256 amount)",
  "function withdraw(uint256 amount)",
  "function getReward()",
  "function exit()",
  "function earned(address account) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function rewardRate() view returns (uint256)",
  "function periodFinish() view returns (uint256)",
  "function rewardsDuration() view returns (uint256)",
  "function extraRewards(uint256 index) view returns (address)",
  "function extraRewardsLength() view returns (uint256)",
]);
