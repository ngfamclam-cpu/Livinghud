# LivingHUD

Your real life as an RPG. Daily quests, levels, stats and a Reward Wallet that pays real dollars toward real rewards.

This is **Phase 2**. On top of Phase 1 (the Awakening signup, the player HUD, daily quests with a bad-day "minimum" version, XP and levels, 30-day stats, player rank, the Reward Wallet and a save file), it adds:

- **Reward Shop**: your own reward list, ranked E–S by price, with level gates (E any, D 5, C 10, B 20, A 35, S 50) and optional stat gates such as "running shoes need STR 40".
- **Savings gate**: log what you saved (and your income for a % goal). The shop stays locked until the month's savings goal is met.
- **Vault spending**: E–B rewards spend the wallet first, then the Vault. A and S rewards are Vault-only, and S also needs a cleared main quest. Wallet money left unspent at month end rolls into the Vault.
- **Special rewards**: dates earn CHA XP; a rave or big night out grants a Recovery Day for the next day (streaks and stats are protected).
- **Side quests** (reset every Monday) and **main quests** cleared stage by stage. The first suggested main quest is Side income.

## Workout rep counter

Tap **Workout** on the strength routine. Prop your phone up side-on, tap **Start camera**, and the counter tracks pushups, squats and glute bridges, and times your plank while your body is straight. It counts out loud and clears the quest when you hit every target. The tracking runs entirely on your phone; no video leaves it. Pull-ups, or anything the camera misses, can be added by hand.

## Cloud sync

Your progress saves to the cloud by itself, stored in this project's own Vercel Blob storage (no other service). Each character has a secret **sync code**, shown in Settings. Enter it on another phone or computer to load the same character there.

One-time setup in Vercel: open the project, go to **Storage**, create a **Blob** store (choose Private if asked) and connect it to this project. Sync only runs on the live site; `npm run dev` works offline without it.

## Run it on your computer

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install      # once, downloads the libraries
npm run dev      # starts the app at http://localhost:5173
```

Other commands:

| Command | What it does |
| --- | --- |
| `npm test` | Runs the game-rule tests |
| `npm run build` | Builds the installable app into `dist/` |
| `npm run lint` | Checks the code for common mistakes |

## How the code is organized

| Folder | What lives there |
| --- | --- |
| `src/engine/` | The game rules: XP, levels, pay, stats, ranks, events. No screens, so the phone app, glasses and AI System can reuse it later. |
| `src/db/` | Saving to the browser's database, every action that changes data (complete a quest, undo, save file), and cloud sync. |
| `api/` | The Vercel Function that stores cloud saves. |
| `src/ui/` | The screens: Awakening signup, HUD, Quest board, Reward Shop, settings and System pop-ups. |

Every action is announced on an event bus (`src/engine/events.ts`), such as `quest.completed` or `level.up`. Screens only listen, which is how the smart-glasses notifications will plug in later.

## Roadmap

1. Core loop
2. **Reward shop, E–S ranks, savings gate, side and main quests** (this version)
3. Stat decay, streak badges and multipliers, penalty modes, unlockable dailies
4. Quest timers and the Party list
5. Accounts (real logins on top of cloud sync)
6. Loot and cosmetics
7. AI System quest master
8. Native apps, health data, smart glasses
