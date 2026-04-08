# WIP Staking

Staking frontend for $WIP on Base. Connect a wallet, stake WIP, earn rewards.

## Contracts (Base Mainnet)

| Contract | Address |
|---|---|
| WIP Token | `0xE21ec3068a538a064FF0BdD69db0204306fc00a0` |
| WIPStakingHub | `0xF402f09C67cb85A1aB002733B72dA8c0B075f318` |
| Owner (Multisig) | `0x13a41Ee5ED0b3150e0db1Fd9156D5359c03699B1` |

All contracts are verified on [Basescan](https://basescan.org/address/0xF402f09C67cb85A1aB002733B72dA8c0B075f318).

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy

Static export for Cloudflare Pages (or any static host):

```bash
npm run build
```

Output is in `out/`. Deploy with:

```bash
npx wrangler pages deploy out
```

## Stack

- Next.js 16 (static export)
- wagmi + viem (on-chain reads + transactions)
- RainbowKit (wallet connection)
- Farcaster Auth Kit (Farcaster sign-in)
- Tailwind CSS 4

## How It Works

The staking hub is a Synthetix-style StakingRewards contract with a hub-and-spokes architecture. Users stake $WIP into the hub. The hub can distribute its own reward stream, and spoke gauges can be registered by the multisig to distribute additional reward tokens.

### For the multisig

- **Fund rewards**: Approve WIP to the hub, then call `notifyRewardAmount(amount)`. Rewards distribute over 180 days.
- **Add gauges**: Deploy a `WIPRewardGauge` for each additional reward token, then call `hub.addExtraReward(gaugeAddress)`.
- **Important**: Wait until there are stakers before funding. If `totalSupply` is 0 when rewards are notified, those rewards are lost.

## License

MIT
