import './index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { context, requestExpandedMode } from '@devvit/web/client';

const HiveMark = () => (
  <svg viewBox="0 0 100 92" className="w-40 h-36 drop-shadow-[0_0_20px_rgba(251,191,36,0.35)]">
    {[
      [50, 12], [79, 29], [79, 63], [50, 80], [21, 63], [21, 29],
    ].map(([x, y], i) => (
      <polygon key={i} points="0,-11 9.5,-5.5 9.5,5.5 0,11 -9.5,5.5 -9.5,-5.5" transform={`translate(${x},${y})`} className="fill-[#2a2416] stroke-amber-600/70" strokeWidth="0.8" />
    ))}
    <polygon points="0,-14 12.1,-7 12.1,7 0,14 -12.1,7 -12.1,-7" transform="translate(50,46)" className="fill-amber-400 stroke-amber-200" strokeWidth="0.8" />
    <text x="50" y="46" textAnchor="middle" dy="2" className="fill-black text-[11px] font-black">W</text>
  </svg>
);

export const Splash = () => (
  <div className="min-h-screen bg-[#14110b] flex flex-col items-center justify-center gap-4 select-none">
    <HiveMark />
    <div className="text-center">
      <h1 className="text-3xl font-black text-amber-300 tracking-tight">WordHive</h1>
      <p className="text-amber-200/60 text-sm mt-1">One new hive every day. How many words can you find?</p>
    </div>
    <button
      className="mt-2 px-8 py-3 rounded-full bg-amber-400 text-black font-black text-base hover:bg-amber-300 transition-colors"
      onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
    >
      ▶ Play today's hive
    </button>
    <p className="text-[11px] text-amber-200/40">hey u/{context.username ?? 'bee'} — the queen is waiting</p>
  </div>
);

createRoot(document.getElementById('root')!).render(<StrictMode><Splash /></StrictMode>);
