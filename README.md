# 🐝 WordHive

A daily word game for Reddit, built on Devvit. Every day at midnight UTC a new
7-letter hive drops into the community — everyone plays the same puzzle.

## How to play

Find words of **4+ letters** using only the hive letters. Every word must
include the **center letter**. Longer words score more; a word using all 7
letters is a **pangram** and earns +7 bonus.

- Score tiers from Curious → Queen Bee (a percentage bar, like NYT Spelling Bee)
- 🔥 Streaks, 🏆 personal best, 👥 player count
- Daily leaderboard — the whole subreddit competes on the same hive
- Tap the hexagons or type; space shuffles
- Share button copies your result card

## Stack

React 19 + Tailwind 4 client inside a Reddit post iframe, Hono API on Devvit's
serverless backend, Redis for per-user progress, streaks and the daily
leaderboard. 87 curated daily puzzles pre-solved from a 370k-word dictionary
(≥7 common answers, ≥18 total, common-word pangram seeds).

## Development

`npm run dev` → `devvit playtest` URL opens a test subreddit.
`npm run deploy` uploads a version; `npm run launch` publishes.
