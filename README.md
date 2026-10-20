# LivingHUD

Your real life as an RPG. Daily quests, levels, stats and a Reward Wallet that pays real dollars toward real rewards.

This is **Phase 1**: the Awakening signup, the player HUD, daily quests with check-off and the bad-day "minimum" version, XP and levels, 30-day stats, player rank, the Reward Wallet and Vault, and a save file for backups. Data stays in your browser for now.

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
| `src/db/` | Saving to the browser's database, plus every action that changes data (complete a quest, undo, save file). |
| `src/ui/` | The screens: Awakening signup, HUD, settings and System pop-ups. |

Every action is announced on an event bus (`src/engine/events.ts`), such as `quest.completed` or `level.up`. Screens only listen, which is how the smart-glasses notifications will plug in later.

## Roadmap

1. **Core loop** (this version)
2. Reward shop, E–S ranks, savings gate
3. Stat decay, streak badges and multipliers, penalty modes, unlockable dailies
4. Quest timers and the Party list
5. Accounts and cloud sync (Supabase)
6. Loot and cosmetics
7. AI System quest master
8. Native apps, health data, smart glasses
