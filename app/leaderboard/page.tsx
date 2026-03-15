'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type LeaderboardRow = {
  id?: string;
  user_id?: string;
  discipline: string;
  score: number;
  percentage?: number;
  created_at?: string;
  rank?: number;
  user?: string;
  when?: string;
};

export default function LeaderboardPage() {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLeaderboard() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch('/api/leaderboard');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const items = (data.leaderboard as any[]) || [];
        setRows(
          items.map((item, idx) => ({
            rank: idx + 1,
            user: item.user || item.user_id || `Player ${idx + 1}`,
            discipline: item.discipline || 'Cards',
            score: item.score ?? 0,
            percentage: item.percentage,
            when: item.when || (item.created_at ? new Date(item.created_at).toLocaleString() : 'now'),
          })),
        );
      } catch (err) {
        console.error('Failed to load leaderboard', err);
        setError('Could not load leaderboard right now.');
      } finally {
        setLoading(false);
      }
    }

    fetchLeaderboard();
  }, []);

  return (
    <div className="min-h-screen bg-[#111] text-white">
      <div className="max-w-6xl mx-auto px-6 py-14">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black">Leaderboard</h1>
            <p className="mt-2 text-gray-400 max-w-xl">
              See who is crushing the Cards discipline right now. Play a round and
              submit your score to climb up the rankings.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-black hover:bg-emerald-500"
          >
            Back to Home
          </Link>
        </div>

        <div className="mt-10 bg-[#1c1c1c] rounded-3xl p-8">
          {loading ? (
            <div className="text-center text-gray-300">Loading leaderboard…</div>
          ) : error ? (
            <div className="text-center text-red-400">{error}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="text-xs uppercase text-gray-400">
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Player</th>
                    <th className="px-4 py-3">Score</th>
                    <th className="px-4 py-3">Discipline</th>
                    <th className="px-4 py-3">When</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.rank} className="border-t border-white/10 hover:bg-white/5">
                      <td className="px-4 py-4 font-mono text-sm text-gray-200">{row.rank}</td>
                      <td className="px-4 py-4 text-sm text-gray-100">{row.user}</td>
                      <td className="px-4 py-4 text-sm font-semibold text-emerald-400">{row.score}</td>
                      <td className="px-4 py-4 text-sm text-gray-200">{row.discipline}</td>
                      <td className="px-4 py-4 text-sm text-gray-400">{row.when}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
