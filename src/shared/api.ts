export type Rank = {
  name: string;
  threshold: number; // fraction of maxScore, 0..1
};

export type InitResponse = {
  type: 'init';
  dayIndex: number;
  letters: string; // 7 letters, [0] = center
  totalAnswers: number;
  maxScore: number;
  found: string[];
  score: number;
  streak: number;
  best: number;
  playersToday: number;
  leaderboard: { user: string; score: number }[];
};

export type SubmitResponse =
  | { ok: true; word: string; gained: number; pangram: boolean; score: number; foundCount: number; ranks: { name: string; at: number }[] }
  | { ok: false; reason: 'short' | 'nocenter' | 'badletters' | 'notfound' | 'dup' };

export type ErrorResponse = { status: 'error'; message: string };
