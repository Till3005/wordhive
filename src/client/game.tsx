import './index.css';
import { StrictMode, useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { context } from '@devvit/web/client';
import type { InitResponse, SubmitResponse } from '../shared/api';

const RANK_NAMES = ['Curious', 'Good Start', 'Moving Up', 'Solid', 'Nice', 'Great', 'Amazing', 'Genius', 'Queen Bee'];
const RANK_AT = [0, 0.02, 0.08, 0.15, 0.25, 0.4, 0.5, 0.7, 1];

const rankFor = (score: number, max: number) => {
  const f = max ? score / max : 0;
  let i = 0;
  for (let j = 0; j < RANK_AT.length; j++) if (f >= (RANK_AT[j] ?? 0)) i = j;
  return i;
};

type State = {
  data: InitResponse | null;
  found: string[];
  score: number;
  input: string;
  msg: { text: string; kind: 'good' | 'bad' | 'pangram' } | null;
  shake: boolean;
  tab: 'words' | 'board';
  pop: string | null;
};

const REASONS: Record<string, string> = {
  short: 'Too short — 4+ letters',
  nocenter: 'Must use the center letter',
  badletters: 'Only hive letters allowed',
  notfound: 'Not in word list',
  dup: 'Already found',
};

export const App = () => {
  const [s, setS] = useState<State>({ data: null, found: [], score: 0, input: '', msg: null, shake: false, tab: 'words', pop: null });
    const p = s.data;

  useEffect(() => {
    void fetch('/api/init').then((r) => r.json()).then((d: InitResponse) => {
      setS((x) => ({ ...x, data: d, found: d.found, score: d.score }));
    });
  }, []);

  const letters = p?.letters.split('') ?? [];
  const center = letters[0] ?? '';
  const outer = letters.slice(1);
  const max = p?.maxScore ?? 1;
  const rank = rankFor(s.score, max);

  const flash = (text: string, kind: 'good' | 'bad' | 'pangram') => {
    setS((x) => ({ ...x, msg: { text, kind } }));
    window.setTimeout(() => setS((x) => ({ ...x, msg: null })), 2200);
  };

  const submit = useCallback(async () => {
    const w = s.input.trim().toLowerCase();
    if (!w) return;
    const r = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ word: w }),
    });
    const d = (await r.json()) as SubmitResponse;
    if (d.ok) {
      setS((x) => ({ ...x, found: [...x.found, w].sort(), score: d.score, input: '', pop: `+${d.gained}` }));
      window.setTimeout(() => setS((x) => ({ ...x, pop: null })), 900);
      if (d.pangram) flash(`PANGRAM! +${d.gained}`, 'pangram');
      else flash(`+${d.gained}  "${w}"`, 'good');
    } else {
      flash(REASONS[d.reason] ?? 'Nope', 'bad');
      setS((x) => ({ ...x, shake: true }));
      window.setTimeout(() => setS((x) => ({ ...x, shake: false })), 400);
    }
  }, [s.input]);

  const press = (ch: string) => setS((x) => ({ ...x, input: x.input + ch }));
  const del = () => setS((x) => ({ ...x, input: x.input.slice(0, -1) }));
  const shuffle = useCallback(() => setS((x) => {
    const o = [...outer].sort(() => Math.random() - 0.5).join('');
    return { ...x, data: x.data ? { ...x.data, letters: center + o } : x.data };
  }), [outer, center]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Enter') { void submit(); return; }
      if (/^[a-z]$/i.test(e.key)) press(e.key.toLowerCase());
      else if (e.key === 'Backspace') del();
      else if (e.key === ' ') { e.preventDefault(); shuffle(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [submit, outer, shuffle]);

  const share = () => {
    const txt = `🐝 WordHive #${p?.dayIndex}: ${s.score} pts · ${s.found.length} words · Rank: ${RANK_NAMES[rank]}${rank >= 7 ? ' 👑' : ''}\nPlay: https://reddit.com/r/dailyriddlequest_dev`;
    void navigator.clipboard?.writeText(txt);
    flash('Copied to clipboard!', 'good');
  };

  if (!p) return <div className="min-h-screen bg-[#14110b] flex items-center justify-center text-amber-200 font-mono">loading hive…</div>;

  const hexPos = (i: number) => {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    return { x: 50 + 34 * Math.cos(a), y: 46 + 34 * Math.sin(a) };
  };

  return (
    <div className="min-h-screen bg-[#14110b] text-amber-50 flex flex-col items-center select-none overflow-x-hidden">
      {/* header */}
      <div className="w-full max-w-md flex items-center justify-between px-4 pt-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🐝</span>
          <div>
            <div className="font-bold text-amber-300 leading-4">WordHive</div>
            <div className="text-[10px] text-amber-200/50">daily puzzle #{p.dayIndex}</div>
          </div>
        </div>
        <div className="flex gap-3 text-[11px] text-amber-200/70">
          <span>🔥 {p.streak} day{p.streak === 1 ? '' : 's'}</span>
          <span>🏆 {p.best}</span>
          <span>👥 {p.playersToday}</span>
        </div>
      </div>

      {/* rank bar */}
      <div className="w-full max-w-md px-6 mt-4">
        <div className="flex justify-between text-[10px] text-amber-200/60 mb-1">
          <span className="font-bold text-amber-300">{RANK_NAMES[rank]}</span>
          <span>{s.score} / {max} pts · {s.found.length}/{p.totalAnswers} words</span>
        </div>
        <div className="relative h-2 rounded-full bg-amber-950">
          <div className="absolute h-2 rounded-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-500" style={{ width: `${Math.min(100, (s.score / max) * 100)}%` }} />
          {RANK_AT.slice(1).map((t, i) => (
            <div key={i} className="absolute w-0.5 h-2 bg-amber-200/40" style={{ left: `${t * 100}%` }} />
          ))}
        </div>
      </div>

      {/* toast */}
      <div className="h-9 mt-2 flex items-center">
        {s.msg && (
          <div className={`px-4 py-1.5 rounded-full text-sm font-bold animate-bounce ${s.msg.kind === 'pangram' ? 'bg-amber-400 text-black' : s.msg.kind === 'good' ? 'bg-emerald-600 text-white' : 'bg-red-800/80 text-red-100'}`}>
            {s.msg.text}
          </div>
        )}
      </div>

      {/* input */}
      <div className={`h-10 text-3xl font-bold tracking-[0.2em] uppercase ${s.shake ? 'animate-[shake_.35s]' : ''} ${s.pop ? 'relative' : ''}`}>
        {s.input.split('').map((ch, i) => (
          <span key={i} className={ch === center ? 'text-amber-400' : 'text-amber-100'}>{ch}</span>
        ))}
        {!s.input && <span className="text-amber-200/25 text-lg font-normal tracking-normal">type or tap letters</span>}
        {s.pop && <span className="absolute -right-12 text-emerald-400 text-xl animate-ping">{s.pop}</span>}
      </div>

      {/* hive */}
      <div className="relative w-[300px] h-[260px] mt-2">
        <svg viewBox="0 0 100 92" className="w-full h-full">
          {outer.map((ch, i) => {
            const { x, y } = hexPos(i);
            return (
              <g key={i + ch} onClick={() => press(ch)} className="cursor-pointer">
                <polygon points="0,-11 9.5,-5.5 9.5,5.5 0,11 -9.5,5.5 -9.5,-5.5" transform={`translate(${x},${y})`} className="fill-[#2a2416] stroke-amber-700/60" strokeWidth="0.8" />
                <text x={x} y={y} textAnchor="middle" dy="1.8" className="fill-amber-100 text-[9px] font-bold uppercase pointer-events-none">{ch}</text>
              </g>
            );
          })}
          <g onClick={() => press(center)} className="cursor-pointer">
            <polygon points="0,-12 10.4,-6 10.4,6 0,12 -10.4,6 -10.4,-6" transform="translate(50,46)" className="fill-amber-400 stroke-amber-200" strokeWidth="0.8" />
            <text x="50" y="46" textAnchor="middle" dy="1.8" className="fill-black text-[10px] font-black uppercase pointer-events-none">{center}</text>
          </g>
        </svg>
      </div>

      {/* controls */}
      <div className="flex gap-4 mt-1">
        <button onClick={del} className="px-5 py-2 rounded-full border border-amber-700/60 text-amber-200 text-sm font-bold hover:bg-amber-900/40">DELETE</button>
        <button onClick={shuffle} className="w-10 h-10 rounded-full border border-amber-700/60 text-amber-200 text-lg hover:bg-amber-900/40">⟳</button>
        <button onClick={() => void submit()} className="px-5 py-2 rounded-full bg-amber-400 text-black text-sm font-black hover:bg-amber-300">ENTER</button>
      </div>

      {/* tabs */}
      <div className="w-full max-w-md mt-5 px-4 flex-1 pb-6">
        <div className="flex gap-2 text-xs mb-3">
          <button onClick={() => setS((x) => ({ ...x, tab: 'words' }))} className={`px-3 py-1 rounded-full font-bold ${s.tab === 'words' ? 'bg-amber-400 text-black' : 'bg-amber-950 text-amber-200'}`}>Your words ({s.found.length})</button>
          <button onClick={() => setS((x) => ({ ...x, tab: 'board' }))} className={`px-3 py-1 rounded-full font-bold ${s.tab === 'board' ? 'bg-amber-400 text-black' : 'bg-amber-950 text-amber-200'}`}>🏆 Today's hive</button>
          <button onClick={share} className="ml-auto px-3 py-1 rounded-full bg-emerald-700 text-white font-bold">Share</button>
        </div>
        {s.tab === 'words' ? (
          <div className="grid grid-cols-3 gap-1.5">
            {s.found.length === 0 && <div className="col-span-3 text-center text-amber-200/30 text-sm py-8">find words of 4+ letters — every word needs the center letter</div>}
            {s.found.map((w) => (
              <div key={w} className={`px-2 py-1 rounded text-center text-sm font-semibold ${new Set(w).size === 7 ? 'bg-amber-400/90 text-black' : 'bg-amber-950 text-amber-100'}`}>{w}</div>
            ))}
          </div>
        ) : (
          <div className="bg-amber-950/60 rounded-lg p-3">
            {p.leaderboard.length === 0 && <div className="text-amber-200/40 text-sm text-center py-6">no scores yet — be the first bee on the board</div>}
            {p.leaderboard.map((e, i) => (
              <div key={e.user} className={`flex justify-between py-1.5 px-2 rounded ${e.user === context.username ? 'bg-amber-400/20' : ''}`}>
                <span className="text-amber-100 text-sm">{i + 1}. {e.user}</span>
                <span className="text-amber-300 font-bold text-sm">{e.score}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
