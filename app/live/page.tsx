'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

type Arena = {
  id: string;
  title: string;
  discipline: string;
  player_count: number;
  max_players: number;
  starts_at: string;
  ends_at: string;
  status: string;
};

type LiveMatch = {
  id: string;
  arena_id: string;
  player1_id: string;
  player2_id: string;
  player1_name: string;
  player2_name: string;
  status: string; // 'waiting', 'playing', 'finished'
  discipline: string;
  created_at: string;
};

export default function LivePage() {
  const [arenas, setArenas] = useState<Arena[]>([]);
  const [liveMatches, setLiveMatches] = useState<LiveMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>('Cards');

  useEffect(() => {
    async function fetchData() {
      try {
        const supabase = createClient();

        // Get user
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);

        // Fetch arenas
        const arenasResponse = await fetch('/api/arenas');
        if (arenasResponse.ok) {
          const arenasData = await arenasResponse.json();
          setArenas(arenasData.arenas || []);
        }

        // Fetch live matches
        const matchesResponse = await fetch('/api/matches');
        if (matchesResponse.ok) {
          const matchesData = await matchesResponse.json();
          setLiveMatches(matchesData.matches || []);
        }

      } catch (error) {
        console.error('Failed to fetch live data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const joinArena = async (arenaId: string) => {
    if (!user) {
      window.location.href = '/auth/login';
      return;
    }

    // For now, joining an arena creates a quick match in that discipline
    const arena = arenas.find(a => a.id === arenaId);
    if (arena) {
      setSelectedDiscipline(arena.discipline || 'Cards');
      await createQuickMatch();
    }
  };

  const createQuickMatch = async () => {
    if (!user) {
      window.location.href = '/auth/login';
      return;
    }

    try {
      const response = await fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discipline: selectedDiscipline })
      });

      if (response.ok) {
        const data = await response.json();
        // Redirect to the match
        window.location.href = `/live/match/${data.match.id}`;
      } else {
        alert('Failed to create/join match. Please try again.');
      }
    } catch (error) {
      console.error('Failed to create match:', error);
      alert('Failed to create match. Please try again.');
    }
  };

  const disciplines = [
    { name: 'Cards', icon: '🃏' },
    { name: 'Numbers', icon: '🔢' },
    { name: 'Words', icon: '📝' },
    { name: 'Names & Faces', icon: '👤' },
    { name: 'Images', icon: '🖼️' },
    { name: 'Surprise', icon: '❓' },
  ];

  return (
    <div className="min-h-screen bg-[#212121] text-white font-sans">
      {/* Header */}
      <div className="bg-[#1f1f1f] border-b border-[#2e2e2e] px-4 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Live Matches</h1>
            <div className="flex gap-4">
              <button
                onClick={createQuickMatch}
                className="bg-emerald-600 hover:bg-emerald-500 px-6 py-2 rounded font-bold transition"
              >
                Quick Match
              </button>
              <Link
                href="/train"
                className="bg-white text-black hover:bg-gray-200 px-6 py-2 rounded font-bold transition"
              >
                Practice
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Discipline Filter */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Choose Discipline</h2>
          <div className="flex flex-wrap gap-4">
            {disciplines.map((discipline) => (
              <button
                key={discipline.name}
                onClick={() => setSelectedDiscipline(discipline.name)}
                className={`px-6 py-3 rounded-lg font-bold transition ${
                  selectedDiscipline === discipline.name
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[#2e2e2e] hover:bg-[#3e3e3e] text-gray-300'
                }`}
              >
                {discipline.icon} {discipline.name}
              </button>
            ))}
          </div>
        </div>

        {/* Active Arenas */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Active Arenas</h2>
          {loading ? (
            <div className="text-center py-12">Loading arenas...</div>
          ) : arenas.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              No active arenas right now. Check back later!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {arenas
                .filter(arena => !arena.discipline || arena.discipline === selectedDiscipline)
                .map((arena) => (
                <div key={arena.id} className="bg-[#2e2e2e] p-6 rounded-xl hover:scale-105 transition">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold mb-1">{arena.title}</h3>
                      <p className="text-emerald-400 text-sm">{arena.discipline || selectedDiscipline}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-emerald-400">
                        {arena.player_count.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-400">playing</div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="text-sm text-gray-400">
                      Ends: {new Date(arena.ends_at).toLocaleTimeString()}
                    </div>
                  </div>

                  <button
                    onClick={() => joinArena(arena.id)}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 py-3 rounded-lg font-bold transition"
                  >
                    Join Arena
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live Matches */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Live Matches</h2>
          {liveMatches.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              No live matches right now. Be the first to start one!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {liveMatches.map((match) => (
                <div key={match.id} className="bg-[#2e2e2e] p-6 rounded-xl">
                  <div className="text-center mb-4">
                    <div className="text-emerald-400 font-bold">{match.discipline}</div>
                    <div className="text-sm text-gray-400">Live Match</div>
                  </div>

                  <div className="flex justify-between items-center mb-4">
                    <div className="text-center">
                      <div className="font-bold">{match.player1_name}</div>
                      <div className="text-xs text-gray-400">Player 1</div>
                    </div>
                    <div className="text-emerald-400 font-bold">VS</div>
                    <div className="text-center">
                      <div className="font-bold">{match.player2_name}</div>
                      <div className="text-xs text-gray-400">Player 2</div>
                    </div>
                  </div>

                  <div className="text-center">
                    <span className="inline-block px-3 py-1 bg-emerald-600 rounded-full text-sm font-bold">
                      {match.status === 'playing' ? 'LIVE' : match.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}