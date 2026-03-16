'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useParams } from 'next/navigation';

type Match = {
  id: string;
  player1_id: string;
  player2_id: string;
  player1_name: string;
  player2_name: string;
  discipline: string;
  status: string;
  player1_score?: number;
  player2_score?: number;
  started_at?: string;
};

type GameState = {
  phase: 'waiting' | 'memorize' | 'recall' | 'finished';
  deck: string[];
  currentIndex: number;
  timeLeft: number;
  score: number;
  recalledCards: string[];
  isPlayer1Turn: boolean;
};

const CARD_SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const CARD_RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function generateDeck(size: number = 52): string[] {
  const deck: string[] = [];
  for (const suit of CARD_SUITS) {
    for (const rank of CARD_RANKS) {
      deck.push(`${rank}${suit.charAt(0).toUpperCase()}`);
      if (deck.length >= size) break;
    }
    if (deck.length >= size) break;
  }
  return deck.slice(0, size);
}

export default function MatchPage() {
  const params = useParams();
  const matchId = params.id as string;

  const [match, setMatch] = useState<Match | null>(null);
  const [gameState, setGameState] = useState<GameState>({
    phase: 'waiting',
    deck: [],
    currentIndex: 0,
    timeLeft: 60,
    score: 0,
    recalledCards: [],
    isPlayer1Turn: true
  });
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isMyTurn, setIsMyTurn] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    async function fetchMatch() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);

        const { data: matchData, error } = await supabase
          .from('matches')
          .select('*')
          .eq('id', matchId)
          .single();

        if (error || !matchData) {
          console.error('Match not found:', error);
          return;
        }

        setMatch(matchData);

        // Determine if it's the user's turn
        const isPlayer1 = user?.id === matchData.player1_id;
        setIsMyTurn(isPlayer1 ? gameState.isPlayer1Turn : !gameState.isPlayer1Turn);

        // Set up real-time subscription
        const channel = supabase
          .channel(`match-${matchId}`)
          .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'matches',
            filter: `id=eq.${matchId}`
          }, (payload) => {
            setMatch(payload.new as Match);
          })
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      } catch (error) {
        console.error('Failed to fetch match:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchMatch();
  }, [matchId, supabase]);

  // Game timer
  useEffect(() => {
    if (gameState.phase === 'memorize' && gameState.timeLeft > 0) {
      const timer = setTimeout(() => {
        setGameState(prev => ({ ...prev, timeLeft: prev.timeLeft - 1 }));
      }, 1000);
      return () => clearTimeout(timer);
    } else if (gameState.phase === 'memorize' && gameState.timeLeft === 0) {
      // Time's up, move to recall phase
      setGameState(prev => ({ ...prev, phase: 'recall' }));
    }
  }, [gameState.phase, gameState.timeLeft]);

  const startGame = () => {
    const deck = generateDeck(52);
    setGameState(prev => ({
      ...prev,
      phase: 'memorize',
      deck,
      timeLeft: 60,
      currentIndex: 0
    }));
  };

  const nextCard = () => {
    if (gameState.currentIndex < gameState.deck.length - 1) {
      setGameState(prev => ({
        ...prev,
        currentIndex: prev.currentIndex + 1
      }));
    } else {
      // End of deck, move to recall
      setGameState(prev => ({ ...prev, phase: 'recall' }));
    }
  };

  const submitRecall = (recalledCards: string[]) => {
    // Calculate score based on correct recall
    const correctCards = gameState.deck.slice(0, gameState.currentIndex + 1);
    const correctCount = recalledCards.filter(card =>
      correctCards.includes(card)
    ).length;

    const score = Math.round((correctCount / correctCards.length) * 100);

    setGameState(prev => ({
      ...prev,
      phase: 'finished',
      score,
      recalledCards
    }));

    // Submit score to database
    submitScore(score);
  };

  const submitScore = async (score: number) => {
    if (!user || !match) return;

    try {
      const isPlayer1 = user.id === match.player1_id;
      const updateData = isPlayer1
        ? { player1_score: score }
        : { player2_score: score };

      await supabase
        .from('matches')
        .update(updateData)
        .eq('id', matchId);

      // Also save to game_results
      await fetch('/api/game-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discipline: match.discipline,
          score: score
        })
      });
    } catch (error) {
      console.error('Failed to submit score:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#212121] text-white flex items-center justify-center">
        <div className="text-xl">Loading match...</div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-[#212121] text-white flex items-center justify-center">
        <div className="text-xl">Match not found</div>
      </div>
    );
  }

  const isPlayer1 = user?.id === match.player1_id;
  const opponentName = isPlayer1 ? match.player2_name : match.player1_name;

  return (
    <div className="min-h-screen bg-[#212121] text-white font-sans">
      {/* Header */}
      <div className="bg-[#1f1f1f] border-b border-[#2e2e2e] px-4 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{match.discipline} Match</h1>
              <div className="text-sm text-gray-400">
                You vs {opponentName || 'Waiting for opponent...'}
              </div>
            </div>
            <div className="text-right">
              <div className="text-emerald-400 font-bold">
                {match.status === 'playing' ? 'LIVE' : match.status.toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {match.status === 'waiting' && (
          <div className="text-center py-12">
            <div className="text-2xl mb-4">Waiting for opponent...</div>
            <div className="text-gray-400">Share this link to invite someone to play:</div>
            <div className="mt-2 p-4 bg-[#2e2e2e] rounded font-mono text-sm">
              {window.location.href}
            </div>
          </div>
        )}

        {match.status === 'playing' && (
          <>
            {gameState.phase === 'waiting' && (
              <div className="text-center py-12">
                <div className="text-2xl mb-4">Ready to start?</div>
                <button
                  onClick={startGame}
                  className="bg-emerald-600 hover:bg-emerald-500 px-8 py-4 rounded-lg font-bold text-xl transition"
                >
                  Start Game
                </button>
              </div>
            )}

            {gameState.phase === 'memorize' && (
              <div className="text-center">
                <div className="text-6xl font-bold mb-8">
                  {gameState.deck[gameState.currentIndex]}
                </div>
                <div className="text-2xl text-emerald-400 mb-4">
                  Time: {gameState.timeLeft}s
                </div>
                <div className="text-gray-400 mb-8">
                  Card {gameState.currentIndex + 1} of {gameState.deck.length}
                </div>
                <button
                  onClick={nextCard}
                  className="bg-emerald-600 hover:bg-emerald-500 px-8 py-4 rounded-lg font-bold text-xl transition"
                >
                  Next Card
                </button>
              </div>
            )}

            {gameState.phase === 'recall' && (
              <RecallPhase
                deck={gameState.deck}
                onSubmit={submitRecall}
                timeLimit={300} // 5 minutes for recall
              />
            )}

            {gameState.phase === 'finished' && (
              <div className="text-center py-12">
                <div className="text-4xl font-bold mb-4">Game Finished!</div>
                <div className="text-2xl text-emerald-400 mb-8">
                  Your Score: {gameState.score}%
                </div>
                <div className="text-gray-400 mb-8">
                  Correctly recalled {gameState.recalledCards.filter(card =>
                    gameState.deck.includes(card)
                  ).length} out of {gameState.deck.length} cards
                </div>
                <button
                  onClick={() => window.location.href = '/live'}
                  className="bg-emerald-600 hover:bg-emerald-500 px-8 py-4 rounded-lg font-bold transition"
                >
                  Back to Live Matches
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function RecallPhase({ deck, onSubmit, timeLimit }: {
  deck: string[];
  onSubmit: (cards: string[]) => void;
  timeLimit: number;
}) {
  const [recalledCards, setRecalledCards] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      onSubmit(recalledCards);
    }
  }, [timeLeft, recalledCards, onSubmit]);

  const addCard = () => {
    if (inputValue.trim() && !recalledCards.includes(inputValue.trim())) {
      setRecalledCards([...recalledCards, inputValue.trim()]);
      setInputValue('');
    }
  };

  const removeCard = (card: string) => {
    setRecalledCards(recalledCards.filter(c => c !== card));
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-4">Recall Phase</h2>
        <div className="text-xl text-emerald-400 mb-4">
          Time Left: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
        </div>
        <p className="text-gray-400">
          Enter the cards you remember seeing, one at a time
        </p>
      </div>

      <div className="mb-8">
        <div className="flex gap-4 mb-4">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addCard()}
            placeholder="Enter card (e.g., AH, 2S, QD)"
            className="flex-1 px-4 py-3 bg-[#2e2e2e] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            onClick={addCard}
            className="bg-emerald-600 hover:bg-emerald-500 px-6 py-3 rounded-lg font-bold transition"
          >
            Add
          </button>
        </div>

        <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
          {recalledCards.map((card, index) => (
            <button
              key={index}
              onClick={() => removeCard(card)}
              className="bg-[#3e3e3e] hover:bg-red-600 px-3 py-2 rounded text-sm font-bold transition"
            >
              {card}
            </button>
          ))}
        </div>
      </div>

      <div className="text-center">
        <button
          onClick={() => onSubmit(recalledCards)}
          className="bg-emerald-600 hover:bg-emerald-500 px-8 py-4 rounded-lg font-bold text-xl transition"
        >
          Submit Recall ({recalledCards.length} cards)
        </button>
      </div>
    </div>
  );
}