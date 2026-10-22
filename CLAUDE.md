# LivingHUD: notes for Claude

A Solo Leveling-style RPG HUD for real life. Real tasks are quests, progress shows as levels and stats, and quests pay real dollars toward real rewards.

- **Full design doc:** https://claude.ai/artifact/WqMKCWp6aLyHbD3nHLb5S2 (read it with the docs tools before planning a new phase)
- **Planning session:** https://claude.ai/code/session_01PQeFGVB85UubwfeCcxCbVN

## About the owner
- New to coding: explain steps in plain language and keep setup minimal.
- Starts as a personal tool but will become a public product, so build with scaling in mind (accounts, sync, multi-user).

## Decisions already made
- **Stack:** React + TypeScript + Vite as an installable PWA, hosted on Vercel (every merge to `main` deploys). IndexedDB via Dexie is the working copy; native wrapper later.
- **Cloud sync (owner wants no extra services, so no Supabase):** `api/sync.ts` is a Vercel Function that stores the whole save in the project's Vercel Blob store. A secret 25-character sync code links devices; the server only stores its SHA-256 hash. `src/db/sync.ts` uploads ~1.5s after any change and pulls on open/focus; the device with unsynced changes wins. Real logins come later (Phase 5) on the same Vercel storage.
- **Architecture:** game rules live only in `src/engine/` (no React, no DB). Every action emits an event on the bus in `src/engine/events.ts`; screens, and later smart glasses and the AI System, only listen.
- **Data:** totals are derived from the completion log, never stored. Every record carries `userId` and timestamps.
- **Stats:** STR (fitness/posture), VIT (sleep/water/nutrition), INT (learning/reflection), CHA (friends/family/dating), AGI (discipline/life admin), WLT (money/career/side income). Each is a 0–100 score over the last 30 days and can go down.
- **Quests:** daily, side (weekly), main (multi-stage). Each has a "minimum version" for bad days that pays half and keeps the streak.
- **Rewards in dollars, no gold:** a monthly budget ($150 default) that about 80% completion earns in full. Overflow goes to the Vault, the only way to buy A/S rewards. The wallet unlocks only after the month's savings goal is met. Rewards are ranked E–S by price: E <$10, D $10–30, C $30–75, B $75–200, A $200–500, S $500+, each with a minimum level.
- **Special rules:** dates cost wallet money and also earn CHA XP. Buying a rave or big night out grants a Recovery Day token.
- **Phase 2 rulings:** E–B rewards spend wallet then Vault; A/S are Vault-only; S also needs one cleared main quest. Unspent wallet money rolls into the Vault when the month ends. Side quests pay $10 (budget/15) and 40 XP, reset Mondays; main quest stages pay their template amount scaled to budget/150 and have no minimum version. Side/main pay is on top of dailies, so it mostly lands in the Vault. Purchases can be refunded the same game day.
- **Live tracking, no paid AI (owner is on Android):** the strength routine has a camera rep counter. `src/capture/pose.ts` runs Google MediaPipe pose tracking on-device (engine wasm bundled from the npm package, model in `public/models`, nothing sent anywhere); `src/engine/workout.ts` turns body points into reps/plank seconds, so glasses can feed the same counter later. Sets are logged to the `sets` table (split across the day) and the quest auto-completes when every target is hit (and un-clears if a correction drops below). Training is `player.plan` (`TrainingPlan`): a cycle (default Push, Pull, Legs, Push, Pull, Rest; legs and rest alternate) plus a daily posture routine for forward head posture and anterior pelvic tilt (chin tucks, wall slides, prone Y, chest and neck stretches, hip flexor stretch with posterior tilt, glute bridges, dead bugs). `planDay` walks from `startedOn`: trained days and rest days advance the cycle, missed workouts wait. Without a saved plan it's a default from the fitness test; an older `player.routine` shows as a single 'full' day with a switch offer. Custom exercises are manual; holds have a timer; "Fix today's count" logs a `correction` set (honour system). Progression per the design doc: after 21 full-routine days in a row (Recovery Days skip) the HUD offers ~+25% targets; Accept/Not now both set `routineReviewedOn` and restart the 3-week count. Nothing changes without the player accepting. Auto-complete links: `api/trigger.ts` queues `{questId, version, at}` in one inbox blob per player (hash of `settings.triggerToken`, version-checked writes via `server/blob.ts`); `src/db/triggers.ts` applies them on open/focus and every 2 min, counting each for the game day it happened. Settings has the links and MacroDroid steps. Photo/AI checks wait until the owner wants AI costs. Watch Vercel Blob operation counts on the free plan.
- **Updates:** the service worker uses `skipWaiting`/`clientsClaim`, and `src/pwa.ts` checks for a new version on open/focus and reloads when it's ready (an installed Android app rarely closes fully, so a waiting worker would never take over). Settings shows the deployed commit (`VERCEL_GIT_COMMIT_SHA`) and build time.
- **Penalties:** configurable Casual / Normal / Hardcore.
- **Onboarding ("Awakening"):** every preference is asked at signup, not hard-coded. The quest and reward lists are a template library.
- **Smart glasses** (Meta Ray-Ban Display style): Phase 8. Keep the event bus clean so notifications, a mini-HUD and voice check-off plug in.
- **AI System:** Phase 7 add-on, not core.
- **Style:** an original look *inspired by* Solo Leveling. No copyrighted names, art or exact text.

## Phases
1. **Done:** Awakening signup, HUD, dailies with complete/minimum/undo, XP/levels, stats, rank, wallet/Vault, save file, PWA.
2. **Done:** reward shop with E–S ranks and level gates, savings gate, Vault spending, side and main quests (first main quest: side income), owner's real reward list.
3. **Next:** stat decay, streak badges and multipliers, penalty modes in effect, unlockable INT/AGI dailies.
4. Quest timers / focus sessions, Party list (days since contact with each friend).
5. Real accounts (replace the sync code with logins) on Vercel storage.
6. Loot and cosmetics.
7. AI System quest master.
8. Native apps, health data, smart glasses.

## Commands
`npm install` · `npm run dev` · `npm test` · `npm run build` · `npm run lint`
