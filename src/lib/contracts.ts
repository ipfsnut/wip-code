import { parseAbi } from "viem";

// ── Deployed addresses (Base mainnet) ──────────────────────────────
export const ADDRESSES = {
  wip: "0xE21ec3068a538a064FF0BdD69db0204306fc00a0" as `0x${string}`,
  stakingHub: "0xF402f09C67cb85A1aB002733B72dA8c0B075f318" as `0x${string}`,
  multisig: "0x13a41Ee5ED0b3150e0db1Fd9156D5359c03699B1" as `0x${string}`,
  // V8 hooks (deployed 2026-04-16)
  hookUsdc: "0x1497c6fa188daf7ef1c567392b235829277e0888" as `0x${string}`,
  hookWeth: "0xdfe40d764f72ef4cbf823b71486d30a0ba188888" as `0x${string}`,
  hookClanker: "0x3d439AfC898529eD5216F517b76Ca4f8D93E8888" as `0x${string}`,
  hookTrini: "0x90862F197B7b7DaEF68fAB648b28f55f08924888" as `0x${string}`,
  // Quote assets
  usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as `0x${string}`,
  weth: "0x4200000000000000000000000000000000000006" as `0x${string}`,
  clanker: "0x1bc0c42215582d5A085795f4baDbaC3ff36d1Bcb" as `0x${string}`,
  trini: "0x17790eFD4896A981Db1d9607A301BC4F7407F3dF" as `0x${string}`,
  // V4 infrastructure on Base
  universalRouter: "0x6ff5693b99212da76ad316178a184ab56d299b43" as `0x${string}`,
  permit2: "0x000000000022D473030F116dDEE9F6B43aC78BA3" as `0x${string}`,
  quoter: "0x0d5e0F971ED27FBfF6c2837bf31316121532048D" as `0x${string}`,
} as const;

export const WIP_HOOKS = [
  { label: "WIP / USDC", hook: ADDRESSES.hookUsdc, quote: ADDRESSES.usdc, quoteSymbol: "USDC", quoteDecimals: 6, feePct: "1%", wipAmount: 675_000_000n * 10n ** 18n, wipAmountLabel: "675M" },
  { label: "WIP / WETH", hook: ADDRESSES.hookWeth, quote: ADDRESSES.weth, quoteSymbol: "WETH", quoteDecimals: 18, feePct: "2%", wipAmount: 135_000_000n * 10n ** 18n, wipAmountLabel: "135M" },
  { label: "WIP / Clanker", hook: ADDRESSES.hookClanker, quote: ADDRESSES.clanker, quoteSymbol: "CLANKER", quoteDecimals: 18, feePct: "2%", wipAmount: 81_000_000n * 10n ** 18n, wipAmountLabel: "81M" },
  { label: "WIP / TRINI", hook: ADDRESSES.hookTrini, quote: ADDRESSES.trini, quoteSymbol: "TRINI", quoteDecimals: 18, feePct: "2%", wipAmount: 9_000_000n * 10n ** 18n, wipAmountLabel: "9M" },
] as const;

export function makeWipPoolKey(quoteAddr: `0x${string}`, hookAddr: `0x${string}`) {
  return { currency0: quoteAddr, currency1: ADDRESSES.wip, fee: 0, tickSpacing: 200, hooks: hookAddr } as const;
}

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

export const hookV8Abi = parseAbi([
  "function owner() view returns (address)",
  "function token() view returns (address)",
  "function feeBps() view returns (uint256)",
  "function tickLower() view returns (int24)",
  "function tickUpper() view returns (int24)",
  "function liquidity() view returns (uint128)",
  "function feeRecipient() view returns (address)",
  "function tokenIsCurrency0() view returns (bool)",
  "function initialized() view returns (bool)",
  "function seeded() view returns (bool)",
  "function poolId() view returns (bytes32)",
  "function getPosition() view returns (int24, int24, uint128)",
  "function addLiquidity((address,address,uint24,int24,address) key) external",
  "function emergencyWithdraw((address,address,uint24,int24,address) key) external",
  "function updateFeeRecipient(address newRecipient) external",
  "function withdrawTokens(address token, uint256 amount, address to) external",
]);
