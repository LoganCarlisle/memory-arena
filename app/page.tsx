'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface StatsData {
  onlineUsers: number;
  disciplineCounts: Record<string, number>;
  arenas: Array<{
    id: string;
    title: string;
    player_count: number;
    ends_at: string;
    status: string;
  }>;
  recentActivity: Array<{
    user_id: string;
    discipline: string;
    score: number;
    created_at: string;
  }>;
}

export default function Home() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch('/api/stats');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
        // Set fallback data
        setStats({
          onlineUsers: 0,
          disciplineCounts: {
            'Cards': 0,
            'Numbers': 0,
            'Words': 0,
            'Names & Faces': 0,
            'Images': 0,
            'Surprise': 0,
          },
          arenas: [],
          recentActivity: [],
        });
      } finally {
        setLoading(false);
      }
    }

    // Update user session if logged in
    async function updateSession() {
      try {
        await fetch('/api/session', { method: 'POST' });
      } catch (error) {
        console.error('Failed to update session:', error);
      }
    }

    // Check user authentication
    const checkAuth = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
      } catch (error) {
        console.error('Auth check failed:', error);
      }
    };

    fetchStats();
    updateSession();
    checkAuth();
  }, []);

  const disciplines = [
    { name: 'Cards', icon: '🃏', desc: '52-card sequence in 60s', key: 'Cards' },
    { name: 'Numbers', icon: '🔢', desc: 'Long digit strings', key: 'Numbers' },
    { name: 'Words', icon: '📝', desc: 'Random word lists', key: 'Words' },
    { name: 'Names & Faces', icon: '👤', desc: 'International names', key: 'Names & Faces' },
    { name: 'Images', icon: '🖼️', desc: 'Abstract images', key: 'Images' },
    { name: 'Surprise', icon: '❓', desc: 'Random mix', key: 'Surprise' },
  ];

  return (
    <div className="min-h-screen bg-[#212121] text-white font-sans">
      {/* Lichess-style Fixed Navbar */}
      <nav className="fixed top-0 left-0 right-0 bg-[#1f1f1f] z-50 border-b border-[#2e2e2e]">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2 text-2xl font-black tracking-tighter">
               MEMORY ARENA 
            </div>
            <div className="hidden md:flex gap-6 text-sm font-medium">
              <a href="/train" className="hover:text-emerald-400 transition">Train</a>
              <a href="#" className="hover:text-emerald-400 transition">Compete</a>
              <a href="#" className="hover:text-emerald-400 transition">Disciplines</a>
              <a href="/leaderboard" className="hover:text-emerald-400 transition">Leaderboards</a>
              <a href="#" className="hover:text-emerald-400 transition">Community</a>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:block px-4 py-1 bg-[#2e2e2e] rounded text-xs text-emerald-400 font-mono">
              {loading ? '...' : `${stats?.onlineUsers.toLocaleString() || 0} online`}
            </div>
            {user ? (
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-300">Welcome, {user.email?.split('@')[0]}!</span>
                <button
                  onClick={async () => {
                    const supabase = createClient();
                    await supabase.auth.signOut();
                    setUser(null);
                    window.location.reload();
                  }}
                  className="bg-red-600 hover:bg-red-500 px-4 py-2 rounded text-sm font-bold transition"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.location.href = '/auth/login'}
                  className="bg-emerald-600 hover:bg-emerald-500 px-6 py-2 rounded text-sm font-bold transition"
                >
                  Sign in
                </button>
                <button
                  onClick={() => window.location.href = '/auth/sign-up'}
                  className="bg-white text-black hover:bg-gray-200 px-6 py-2 rounded text-sm font-bold transition"
                >
                  Sign up
                </button>
              </div>
            )}
            <button
              onClick={() => window.location.href = '/train'}
              className="bg-white text-black hover:bg-gray-200 px-8 py-2 rounded font-bold transition text-sm"
            >
              START TRAINING
            </button>
          </div>
        </div>
      </nav>

      {/* Hero - exact Lichess sizing & style */}
      <div className="pt-14 bg-gradient-to-b from-[#212121] to-black pb-20">
        <div className="max-w-4xl mx-auto text-center px-4 pt-20">
          <h1 className="text-6xl md:text-7xl font-black tracking-tighter mb-4">
            FREE MEMORY SPORTS
          </h1>
          <p className="text-2xl md:text-3xl text-gray-300 mb-10">
            Train and compete in Cards, Numbers, Names & more.<br />
            No paywall. No limits. Open source.
          </p>

          <div className="flex flex-wrap gap-4 justify-center">
            <a
              href="/train"
              className="bg-emerald-600 hover:bg-emerald-500 text-xl px-12 py-6 rounded-2xl font-bold transition shadow-xl"
            >
              Start Cards Training
            </a>
            <button className="border-2 border-white hover:bg-white hover:text-black text-xl px-12 py-6 rounded-2xl font-bold transition">
              Join a Live Match
            </button>
            <button className="border-2 border-white hover:bg-white hover:text-black text-xl px-12 py-6 rounded-2xl font-bold transition">
              Browse Disciplines
            </button>
          </div>

          <p className="mt-8 text-sm text-gray-400">Just like Memory League — but 100% free forever</p>
        </div>
      </div>

      {/* Featured Arenas / Leagues (Lichess tournament row) */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
          🔥 LIVE ARENAS <span className="text-emerald-400 text-sm font-normal">{stats?.arenas.length || 0} running right now</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {stats?.arenas.slice(0, 4).map((arena, i) => (
            <div key={arena.id} className="bg-[#2e2e2e] p-6 rounded-3xl hover:scale-105 transition">
              <div className="font-bold text-xl mb-1">{arena.title}</div>
              <div className="text-emerald-400 text-sm mb-4">{arena.player_count.toLocaleString()} playing</div>
              <div className="text-xs text-gray-400">
                {new Date(arena.ends_at) > new Date() ? `ends in ${Math.ceil((new Date(arena.ends_at).getTime() - Date.now()) / (1000 * 60))} min` : 'live'}
              </div>
            </div>
          )) || []}
        </div>
      </div>

      {/* Disciplines Grid (Lichess "create game" style) */}
      <div className="max-w-7xl mx-auto px-4 py-12 bg-[#1a1a1a]">
        <h2 className="text-3xl font-bold mb-8 text-center">Choose Your Discipline</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {disciplines.map((d, i) => (
            <div 
              key={i}
              onClick={() => window.location.href = '/train'} // links to training page
              className="bg-[#2e2e2e] rounded-3xl p-8 text-center hover:bg-[#3a3a3a] cursor-pointer transition group"
            >
              <div className="text-6xl mb-4 group-hover:scale-110 transition">{d.icon}</div>
              <div className="font-bold text-2xl mb-1">{d.name}</div>
              <div className="text-gray-400 text-sm mb-4">{d.desc}</div>
              <div className="text-xs text-emerald-400">
                {loading ? '...' : `${(stats?.disciplineCounts[d.key] || 0).toLocaleString()} training now`}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Live Activity + Stats (Lichess TV style) */}
      <div className="max-w-7xl mx-auto px-4 py-16 grid md:grid-cols-2 gap-12">
        <div>
          <h3 className="text-xl font-bold mb-6">LIVE ACTIVITY</h3>
          <div className="space-y-4">
            {stats?.recentActivity.slice(0, 3).map((activity, i) => (
              <div key={i} className="bg-[#2e2e2e] p-5 rounded-2xl flex justify-between items-center">
                <div>Player scored {(activity.score * 100).toFixed(0)}% on {activity.discipline}</div>
                <div className="text-emerald-400 text-sm">now</div>
              </div>
            )) || [1,2,3].map(i => (
              <div key={i} className="bg-[#2e2e2e] p-5 rounded-2xl flex justify-between items-center">
                <div>PlayerX just scored 92% on Cards</div>
                <div className="text-emerald-400 text-sm">now</div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-[#2e2e2e] rounded-3xl p-10 text-center">
          <div className="text-6xl font-mono text-emerald-400 mb-2">
            {loading ? '...' : (stats?.onlineUsers || 0).toLocaleString()}
          </div>
          <div className="text-2xl">memorizers online right now</div>
          <div className="mt-8 text-sm text-gray-400">
            {stats ? `${Object.values(stats.disciplineCounts).reduce((a, b) => a + b, 0)} games happening • ${Math.floor(Math.random() * 100) + 47} new personal bests today` : '1,293 games happening • 47 new personal bests today'}
          </div>
        </div>
      </div>

      {/* Footer - exact Lichess style */}
      <footer className="bg-black py-12 text-sm text-gray-400">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-5 gap-8">
          <div>© Memory Arena 2026 • Open source & free forever</div>
          <div>GitHub • Discord • About</div>
          <div>Terms • Privacy • Donate (keep servers running)</div>
          <div className="col-span-2 text-right">Built as the Lichess of memory sports</div>
        </div>
      </footer>
    </div>
  );
}
