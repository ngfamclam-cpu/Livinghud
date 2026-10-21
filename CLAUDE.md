# LivingHUD: notes for Claude

A Solo Leveling-style RPG HUD for real life. Real tasks are quests, progress shows as levels and stats, and quests pay real dollars toward real rewards.

- **Full design doc:** https://claude.ai/artifact/WqMKCWp6aLyHbD3nHLb5S2 (read it with the docs tools before planning a new phase)
- **Planning session:** https://claude.ai/code/session_01PQeFGVB85UubwfeCcxCbVN

## About the owner
- New to coding: explain steps in plain language and keep setup minimal.
- Starts as a personal tool but will become a public product, so build with scaling in mind (accounts, sync, multi-user).

## Decisions already made
- **Stack:** React + TypeScript + Vite as an installable PWA; IndexedDB via Dexie now; Supabase for login and sync in Phase 5; native wrapper later.
- **Architecture:** game rules live only in `src/engine/` (no React, no DB). Every action emits an event on the bus in `src/engine/events.ts`; screens, and later smart glasses and the AI System, only listen.
- **Data:** totals are derived from the completion log, never stored. Every record carries `userId` and timestamps.
- **Stats:** STR (fitness/posture), VIT (sleep/water/nutrition), INT (learning/reflection), CHA (friends/family/dating), AGI (discipline/life admin), WLT (money/career/side income). Each is a 0–100 score over the last 30 days and can go down.
- **Quests:** daily, side (weekly), main (multi-stage). Each has a "minimum version" for bad days that pays half and keeps the streak.
- **Rewards in dollars, no gold:** a monthly budget ($150 default) that about 80% completion earns in full. Overflow goes to the Vault, the only way to buy A/S rewards. The wallet unlocks only after the month's savings goal is met. Rewards are ranked E–S by price: E <$10, D $10–30, C $30–75, B $75–200, A $200–500, S $500+, each with a minimum level.
- **Special rules:** dates cost wallet money and also earn CHA XP. Buying a rave or big night out grants a Recovery Day token.
- **Penalties:** configurable Casual / Normal / Hardcore.
- **Onboarding ("Awakening"):** every preference is asked at signup, not hard-coded. The quest and reward lists are a template library.
- **Smart glasses** (Meta Ray-Ban Display style): Phase 8. Keep the event bus clean so notifications, a mini-HUD and voice check-off plug in.
- **AI System:** Phase 7 add-on, not core.
- **Style:** an original look *inspired by* Solo Leveling. No copyrighted names, art or exact text.

## Phases
1. **Done:** Awakening signup, HUD, dailies with complete/minimum/undo, XP/levels, stats, rank, wallet/Vault, save file, PWA.
2. **Next:** reward shop with E–S ranks and level gates, savings gate, Vault spending, side and main quests (first main quest: side income), owner's real reward list.
3. Stat decay, streak badges and multipliers, penalty modes in effect, unlockable INT/AGI dailies.
4. Quest timers / focus sessions, Party list (days since contact with each friend).
5. Supabase accounts and sync.
6. Loot and cosmetics.
7. AI System quest master.
8. Native apps, health data, smart glasses.

## Commands
`npm install` · `npm run dev` · `npm test` · `npm run build` · `npm run lint`
