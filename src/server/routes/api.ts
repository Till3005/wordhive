import { Hono } from 'hono';
import { context, redis, reddit } from '@devvit/web/server';
import { puzzles } from '../puzzles';
import type { InitResponse, SubmitResponse, ErrorResponse } from '../../shared/api';

type Puzzle = { l: string; a: string[] };
const EPOCH = Date.UTC(2026, 0, 1) / 86400000;
const dayIndex = () => Math.floor(Date.now() / 86400000 - EPOCH);

const RANKS = [
  { name: 'Curious', at: 0 },
  { name: 'Good Start', at: 0.02 },
  { name: 'Moving Up', at: 0.08 },
  { name: 'Solid', at: 0.15 },
  { name: 'Nice', at: 0.25 },
  { name: 'Great', at: 0.4 },
  { name: 'Amazing', at: 0.5 },
  { name: 'Genius', at: 0.7 },
  { name: 'Queen Bee', at: 1 },
];

const wordScore = (w: string) => (w.length === 4 ? 1 : w.length) + (new Set(w).size === 7 ? 7 : 0);
const puzzle = (): Puzzle => puzzles[dayIndex() % puzzles.length]!;

export const api = new Hono();

api.get('/init', async (c) => {
  const { postId } = context;
  if (!postId) return c.json<ErrorResponse>({ status: 'error', message: 'no postId' }, 400);
  const day = dayIndex();
  const p = puzzle();
  const username = (await reddit.getCurrentUsername()) ?? 'anon';
  const uk = `wh:u:${username}:d:${day}`;
  const found = (await redis.hGetAll(uk)) ?? {};
  const foundWords = Object.keys(found);
  const score = foundWords.reduce((s, w) => s + wordScore(w), 0);
  const [streak, best] = await Promise.all([
    redis.get(`wh:streak:${username}`),
    redis.get(`wh:best:${username}`),
  ]);
  const lbRaw = await redis.zRange(`wh:lb:${day}`, 0, 9, { reverse: true, by: 'rank' }) as { member: string; score: number }[];
  const leaderboard = lbRaw.map((e) => ({ user: e.member, score: e.score }));
  const players = (await redis.get(`wh:players:${day}`)) ?? '0';
  if (!players || players === '0') await redis.set(`wh:players:${day}`, '1');
  else await redis.incrBy(`wh:players:${day}`, 1);
  return c.json<InitResponse>({
    type: 'init',
    dayIndex: day,
    letters: p.l,
    totalAnswers: p.a.length,
    maxScore: p.a.reduce((s, w) => s + wordScore(w), 0),
    found: foundWords,
    score,
    streak: parseInt(streak ?? '0'),
    best: parseInt(best ?? '0'),
    playersToday: parseInt(players ?? '1') + 1,
    leaderboard,
  });
});

api.post('/submit', async (c) => {
  const { postId } = context;
  if (!postId) return c.json<ErrorResponse>({ status: 'error', message: 'no postId' }, 400);
  const body = await c.req.json<{ word: string }>();
  const w = (body.word ?? '').toLowerCase().trim();
  const p = puzzle();
  const center = p.l[0]!;
  const fail = (reason: 'short' | 'nocenter' | 'badletters' | 'notfound' | 'dup') => c.json<SubmitResponse>({ ok: false, reason });
  if (w.length < 4) return fail('short');
  if (!w.includes(center)) return fail('nocenter');
  if (![...w].every((ch) => p.l.includes(ch))) return fail('badletters');
  if (!p.a.includes(w)) return fail('notfound');
  const day = dayIndex();
  const username = (await reddit.getCurrentUsername()) ?? 'anon';
  const uk = `wh:u:${username}:d:${day}`;
  if (await redis.hGet(uk, w)) return fail('dup');
  await redis.hSet(uk, { [w]: '1' });
  const gained = wordScore(w);
  const score = await redis.incrBy(`wh:score:${username}:${day}`, gained);
  await redis.zAdd(`wh:lb:${day}`, { member: username, score });
  // streak: increment when first word today; yesterday check handled lazily
  const yk = `wh:u:${username}:d:${day - 1}`;
  if (score === gained) {
    const playedYesterday = await redis.hLen(yk);
    const prev = parseInt((await redis.get(`wh:streak:${username}`)) ?? '0');
    await redis.set(`wh:streak:${username}`, String(playedYesterday > 0 ? prev + 1 : 1));
  }
  const best = parseInt((await redis.get(`wh:best:${username}`)) ?? '0');
  if (score > best) await redis.set(`wh:best:${username}`, String(score));
  return c.json<SubmitResponse>({
    ok: true,
    word: w,
    gained,
    pangram: new Set(w).size === 7,
    score,
    foundCount: (await redis.hLen(uk)) ?? 1,
    ranks: RANKS,
  });
});
