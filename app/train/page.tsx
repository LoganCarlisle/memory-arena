'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

type Card = {
  id: string;
  label: string;
  suit: string;
  rank: string;
};

const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function shuffle<T>(arr: T[]) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildDeck(): Card[] {
  return SUITS.flatMap((suit) =>
    RANKS.map((rank) => ({
      id: `${rank}${suit}`,
      label: `${rank}${suit}`,
      suit,
      rank
    })),
  );
}

type Stage = 'intro' | 'memorize' | 'recall' | 'done';

export default function TrainPage() {
  const [user, setUser] = useState<any>(null);
  const [stage, setStage] = useState<Stage>('intro');
  const [timeLeft, setTimeLeft] = useState(60);
  const [viewCount, setViewCount] = useState(3);
  const [memorizeCount, setMemorizeCount] = useState(12);
  const [memorizeDeck, setMemorizeDeck] = useState<Card[]>([]);
  const [memorizeIndex, setMemorizeIndex] = useState(0);
  const [recallPool, setRecallPool] = useState<Card[]>([]);
  const [recallOrder, setRecallOrder] = useState<Card[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [lastPlacedIndex, setLastPlacedIndex] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const memorizedCount = memorizeDeck.length;
  const currentSlice = memorizeDeck.slice(memorizeIndex, memorizeIndex + viewCount);
  const percentComplete = useMemo(() => {
    if (!memorizedCount) return 0;
    return Math.min(1, recallOrder.length / memorizedCount);
  }, [memorizedCount, recallOrder.length]);

  const cardOverlap = useMemo(() => {
    // More cards => less overlap (so higher recall length doesn’t become too crowded)
    const maxOverlap = -8; // Less overlap for better readability
    const minOverlap = -2; // Even less overlap at high counts
    const fraction = Math.min(1, memorizeDeck.length / 52);
    return Math.round(maxOverlap + (minOverlap - maxOverlap) * fraction);
  }, [memorizeDeck.length]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then((res) => setUser(res.data.user));
  }, []);

  useEffect(() => {
    if (stage !== 'memorize') return;

    if (timeLeft <= 0) {
      setStage('recall');
      return;
    }

    timerRef.current = setTimeout(() => {
      setTimeLeft((t) => Math.max(0, t - 1));
    }, 1000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [stage, timeLeft]);

  const startMemorization = () => {
    const deck = shuffle(buildDeck());
    const slice = deck.slice(0, memorizeCount); // memorization set
    setMemorizeDeck(slice);
    setMemorizeIndex(0);
    setRecallOrder(Array(slice.length).fill(undefined));
    setRecallPool([]);
    setSelectedSlot(0);
    setLastPlacedIndex(null);
    setScore(0);
    setMessage(null);
    setTimeLeft(60);
    setStage('memorize');
  };

  const beginRecall = () => {
    setRecallPool(buildDeck()); // Use full deck in order
    setRecallOrder(Array(memorizeDeck.length).fill(undefined));
    setSelectedSlot(0);
    setStage('recall');
  };

  const handleCardClick = (card: Card) => {
    if (stage !== 'recall') return;
    if (recallOrder.filter((c) => c !== undefined).length >= memorizeDeck.length) return;

    const findNextEmpty = (startIndex: number) => {
      // Only search forward from the startIndex, don't wrap around
      for (let i = startIndex; i < memorizeDeck.length; i++) {
        if (!recallOrder[i]) return i;
      }
      return -1;
    };

    // If the user has selected a slot, use it. Otherwise fill in order starting from the last placed card.
    const baseIndex =
      selectedSlot !== null
        ? selectedSlot
        : lastPlacedIndex !== null
        ? lastPlacedIndex + 1
        : 0;

    const targetSlot = findNextEmpty(baseIndex);
    if (targetSlot === -1) return;

    const newRecallOrder = [...recallOrder];
    newRecallOrder[targetSlot] = card;
    setRecallOrder(newRecallOrder);
    setRecallPool((prev) => prev.filter((c) => c.id !== card.id));

    setLastPlacedIndex(targetSlot);

    // Auto-select the next slot forward (don't wrap to the beginning)
    const nextEmpty = findNextEmpty(targetSlot + 1);
    setSelectedSlot(nextEmpty !== -1 ? nextEmpty : null);
  };

  const handleRemoveSlot = (index: number) => {
    if (stage !== 'recall') return;

    const card = recallOrder[index];
    if (!card) {
      // Empty slot - just select it
      setSelectedSlot(index);
      return;
    }

    // Remove card from slot and add back to pool
    const newRecallOrder = [...recallOrder];
    newRecallOrder[index] = undefined as any;
    setRecallOrder(newRecallOrder);
    setRecallPool((prev) => [...prev, card]);

    setSelectedSlot(index); // Select the now-empty slot

    // Update lastPlacedIndex - find the highest index that still has a card
    let newLastPlacedIndex = null;
    for (let i = memorizeDeck.length - 1; i >= 0; i--) {
      if (newRecallOrder[i]) {
        newLastPlacedIndex = i;
        break;
      }
    }
    setLastPlacedIndex(newLastPlacedIndex);
  };

  const finishRecall = () => {
    const correct = recallOrder.reduce((acc, card, idx) => {
      if (!card) return acc; // Skip empty slots
      return acc + (card.id === memorizeDeck[idx]?.id ? 1 : 0);
    }, 0);

    setScore(correct);
    setStage('done');
  };

  const handleSubmitScore = async () => {
    if (!user) {
      setMessage('Sign in to save your score.');
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch('/api/game-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discipline: 'Cards',
          score,
          percentage: memorizedCount ? (score / memorizedCount) * 100 : 0,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      setMessage('Score saved! Check the leaderboard to see where you rank.');
    } catch (err) {
      setMessage('Could not save score right now. Try again later.');
    } finally {
      setSubmitting(false);
    }
  };

  const isMemorizeComplete = memorizeIndex + viewCount >= memorizeDeck.length;

  // Card image function using Kenney card pack
  const getCardImage = (card: Card) => {
    // Map our suit names to the pack's naming convention
    const suitMap: Record<string, string> = {
      '♠': 'spades',
      '♥': 'hearts',
      '♦': 'diamonds',
      '♣': 'clubs'
    };

    // Map our rank names to the pack's naming convention
    const rankMap: Record<string, string> = {
      'A': 'A',
      '2': '02',
      '3': '03',
      '4': '04',
      '5': '05',
      '6': '06',
      '7': '07',
      '8': '08',
      '9': '09',
      '10': '10',
      'J': 'J',
      'Q': 'Q',
      'K': 'K'
    };

    const suitName = suitMap[card.suit];
    const rankName = rankMap[card.rank];

    if (!suitName || !rankName) {
      return '/kenney_playing-cards-pack/PNG/Cards (large)/card_empty.png';
    }

    return `/kenney_playing-cards-pack/PNG/Cards (large)/card_${suitName}_${rankName}.png`;
  };

  return (
    <div className="min-h-screen bg-[#111] text-white">
      {/* Header */}
      <div className="border-b border-[#2e2e2e] bg-[#1f1f1f]">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 text-2xl font-black tracking-tighter">
              🧠 MEMORY ARENA ⚔️
            </Link>
            <div className="hidden md:flex gap-6 text-sm font-medium">
              <Link href="/" className="hover:text-emerald-400 transition">Home</Link>
              <Link href="/leaderboard" className="hover:text-emerald-400 transition">Leaderboards</Link>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-300">
              {user ? `Welcome, ${user.email?.split('@')[0]}!` : 'Sign in to save scores'}
            </div>
            {user ? (
              <button
                onClick={async () => {
                  const supabase = createClient();
                  await supabase.auth.signOut();
                  setUser(null);
                  window.location.href = '/';
                }}
                className="bg-red-600 hover:bg-red-500 px-4 py-2 rounded text-sm font-bold transition"
              >
                Sign out
              </button>
            ) : (
              <Link
                href="/auth/login"
                className="bg-emerald-600 hover:bg-emerald-500 px-6 py-2 rounded text-sm font-bold transition"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-black mb-2">Card Memory Training</h1>
            <p className="text-gray-400">Memorize the sequence, then recreate it from memory</p>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-xs text-gray-400">Time remaining</div>
              <div className="text-3xl font-bold">{timeLeft}s</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-400">Score</div>
              <div className="text-3xl font-bold">{score}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Game Area */}
          <div className="lg:col-span-3">
            {stage === 'intro' && (
              <div className="bg-[#1a1a1a] rounded-3xl p-12 text-center">
                <div className="text-6xl mb-6">🃏</div>
                <h2 className="text-3xl font-bold mb-4">Card Memory Challenge</h2>
                <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
                  You'll see a sequence of cards. Memorize them in order, then recreate the sequence from memory.
                  Choose how many cards to show at once during memorization.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <span className="text-sm text-gray-300">Cards to memorize:</span>
                    {[12, 16, 24, 52].map((n) => (
                      <button
                        key={n}
                        className={`px-5 py-2 rounded-xl font-semibold transition ${
                          memorizeCount === n
                            ? 'bg-emerald-600 text-black'
                            : 'bg-white/10 text-gray-200 hover:bg-white/20'
                        }`}
                        onClick={() => setMemorizeCount(n)}
                      >
                        {n}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <span className="text-sm text-gray-300">Cards per view:</span>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        className={`px-5 py-2 rounded-xl font-semibold transition ${
                          viewCount === n
                            ? 'bg-emerald-600 text-black'
                            : 'bg-white/10 text-gray-200 hover:bg-white/20'
                        }`}
                        onClick={() => setViewCount(n)}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={startMemorization}
                  className="px-12 py-4 bg-emerald-600 hover:bg-emerald-500 rounded-2xl font-bold text-black transition text-xl"
                >
                  Start Training
                </button>
              </div>
            )}

            {stage === 'memorize' && (
              <div className="bg-[#1a1a1a] rounded-3xl p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold">Memorize Phase</h3>
                  <div className="text-sm text-gray-400">
                    Cards {memorizeIndex + 1}–{Math.min(memorizeIndex + viewCount, memorizeDeck.length)} of {memorizeDeck.length}
                  </div>
                </div>

                {/* Current cards display */}
                <div className="flex flex-wrap justify-center gap-6 mb-8">
                  {currentSlice.map((card, idx) => (
                    <div
                      key={card?.id || idx}
                      className="relative w-56 h-72 rounded-3xl bg-white p-4 flex items-center justify-center shadow-2xl"
                    >
                      {card ? (
                        <img
                          src={getCardImage(card)}
                          alt={card.label}
                          className="w-full h-full object-contain rounded"
                        />
                      ) : (
                        <div className="text-gray-500 text-3xl">?</div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Navigation controls */}
                <div className="flex items-center justify-center gap-4 mb-8">
                  <button
                    onClick={() => setMemorizeIndex((i) => Math.max(0, i - viewCount))}
                    disabled={memorizeIndex === 0}
                    className="px-4 py-2 rounded-xl font-semibold bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ← Previous
                  </button>

                  <div className="text-sm text-gray-400">
                    Cards {memorizeIndex + 1}–{Math.min(memorizeIndex + viewCount, memorizeDeck.length)}
                  </div>

                  <button
                    onClick={() => setMemorizeIndex((i) => Math.min(memorizeDeck.length - viewCount, i + viewCount))}
                    disabled={isMemorizeComplete}
                    className="px-4 py-2 rounded-xl font-semibold bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next →
                  </button>
                </div>

                {/* Card sequence overview */}
                <div className="mb-8">
                  <div className="text-sm text-gray-400 mb-3">Full sequence:</div>
                  <div className="flex items-center justify-center gap-2 overflow-x-auto pb-2">
                    {memorizeDeck.map((card, idx) => {
                      const isCurrent = idx >= memorizeIndex && idx < memorizeIndex + viewCount;
                      const isPast = idx < memorizeIndex;
                      const isFuture = idx >= memorizeIndex + viewCount;

                      return (
                        <div
                          key={card.id}
                          className={`relative w-16 h-24 rounded-lg border-2 flex-shrink-0 transition-all ${
                            isCurrent
                              ? 'border-emerald-400 bg-emerald-400/10 scale-110'
                              : isPast
                              ? 'border-gray-500 bg-gray-800/50 opacity-60'
                              : 'border-white/20 bg-white/5'
                          }`}
                        >
                          <img
                            src={getCardImage(card)}
                            alt={card.label}
                            className="w-full h-full object-cover rounded"
                          />
                          {isCurrent && (
                            <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-xs font-bold">
                              {idx + 1}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-center gap-4">
                  <button
                    onClick={beginRecall}
                    className="px-8 py-3 rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-500 text-black transition"
                  >
                    Start Recall Phase
                  </button>
                </div>
              </div>
            )}

            {stage === 'recall' && (
              <div className="bg-[#1a1a1a] rounded-3xl p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold">Recall Phase</h3>
                  <div className="text-sm text-gray-400">{recallOrder.filter(card => card !== undefined).length}/{memorizeDeck.length} placed</div>
                </div>

                {/* Instructions */}
                <div className="text-center mb-6">
                  <p className="text-gray-400">
                    Click on a slot to select it, then click on a card below to place it there.
                  </p>
                </div>

                {/* Placeholder row (stacked cards) */}
                <div className="mb-10">
                  <div className="text-sm text-gray-400 mb-3">Recreate the order</div>
                  <div className="flex flex-wrap justify-center gap-4">
                    {Array.from({ length: memorizeDeck.length }).map((_, idx) => {
                      const selected = recallOrder[idx];
                      const isSelected = selectedSlot === idx;

                      return (
                        <div key={idx} className="flex flex-col items-center">
                          <div className="text-xs text-gray-400 mb-1">{idx + 1}</div>
                          <button
                            onClick={() => setSelectedSlot(idx)}
                            className={`relative w-20 h-28 rounded-2xl border-2 p-1 transition cursor-pointer ${
                              isSelected
                                ? 'border-blue-300 bg-blue-300/15'
                                : 'border-white/20 bg-white/5 hover:border-white/35'
                            }`}
                            style={{ marginRight: idx === memorizeDeck.length - 1 ? 0 : -24, zIndex: idx + 10 }}
                          >
                            {selected ? (
                              <img
                                src={getCardImage(selected)}
                                alt={selected.label}
                                className="w-full h-full object-cover rounded"
                              />
                            ) : (
                              <div className="flex h-full w-full flex-col items-center justify-center text-gray-400">
                                <div className="text-xs">Slot</div>
                                <div className="text-lg font-semibold">{idx + 1}</div>
                              </div>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* All 52 cards (small, stacked) */}
                <div className="mb-6">
                  <div className="text-sm text-gray-400 mb-3">All cards</div>
                  <div className="flex items-center justify-center overflow-x-auto pb-2">
                    {recallPool.map((card, idx) => {
                      const isRed = card.suit === '♥' || card.suit === '♦';
                      return (
                        <button
                          key={card.id}
                          onClick={() => handleCardClick(card)}
                          className="relative w-14 h-16 rounded-lg border border-gray-300 bg-white text-sm font-bold transition hover:scale-110 hover:border-gray-400"
                          style={{ marginLeft: idx === 0 ? 0 : cardOverlap, zIndex: idx }}
                        >
                          <div className="flex h-full w-full flex-col items-center justify-center" style={{ color: isRed ? '#dc2626' : '#000000' }}>
                            <span className="text-base">{card.rank}</span>
                            <span className="text-xl">{card.suit}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-center gap-4">
                  <button
                    onClick={finishRecall}
                    disabled={recallOrder.filter(card => card !== undefined).length !== memorizeDeck.length}
                    className="px-8 py-3 rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-500 text-black transition disabled:opacity-50"
                  >
                    Submit Answer
                  </button>
                  <button
                    onClick={startMemorization}
                    className="px-8 py-3 rounded-xl font-semibold bg-white/10 hover:bg-white/20"
                  >
                    Restart
                  </button>
                </div>
              </div>
            )}

            {stage === 'done' && (
              <div className="bg-[#1a1a1a] rounded-3xl p-8">
                <div className="text-center mb-6">
                  <div className="text-6xl mb-4">🎉</div>
                  <h3 className="text-3xl font-bold mb-2">Training Complete!</h3>
                  <div className="text-6xl font-black text-emerald-400 mb-2">{score}</div>
                  <div className="text-xl text-gray-400 mb-8">correct out of {memorizeDeck.length} cards</div>
                </div>

                {/* Show correct order with highlighting */}
                <div className="mb-8">
                  <div className="text-sm text-gray-400 mb-4 text-center">Your answers vs correct order</div>
                  <div className="flex items-center justify-center gap-2 overflow-x-auto pb-4">
                    {memorizeDeck.map((correctCard, idx) => {
                      const userCard = recallOrder[idx];
                      const isCorrect = userCard && userCard.id === correctCard.id;
                      const hasAnswer = userCard !== undefined;

                      return (
                        <div key={idx} className="flex flex-col items-center min-w-0">
                          <div className="text-xs text-gray-400 mb-1">{idx + 1}</div>
                          <div className="relative">
                            {/* User's answer */}
                            <div className={`w-16 h-24 rounded-lg border-2 mb-1 ${
                              hasAnswer
                                ? isCorrect
                                  ? 'border-emerald-400 bg-emerald-400/10'
                                  : 'border-rose-400 bg-rose-400/10'
                                : 'border-gray-600 bg-gray-600/10'
                            }`}>
                              {hasAnswer ? (
                                <img
                                  src={getCardImage(userCard)}
                                  alt={userCard.label}
                                  className="w-full h-full object-cover rounded"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-gray-500 text-lg">
                                  ?
                                </div>
                              )}
                            </div>
                            {/* Correct answer */}
                            <div className="w-16 h-24 rounded-lg border-2 border-blue-400 bg-blue-400/10">
                              <img
                                src={getCardImage(correctCard)}
                                alt={correctCard.label}
                                className="w-full h-full object-cover rounded"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="text-center text-xs text-gray-400 mt-2">
                    <div className="flex items-center justify-center gap-4">
                      <span>Your answers (top)</span>
                      <span>Correct order (bottom)</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap justify-center gap-4">
                  <button
                    onClick={handleSubmitScore}
                    disabled={submitting}
                    className="px-8 py-3 rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-500 text-black transition disabled:opacity-50"
                  >
                    {submitting ? 'Saving…' : 'Save Score'}
                  </button>
                  <button
                    onClick={startMemorization}
                    className="px-8 py-3 rounded-xl font-semibold bg-white/10 hover:bg-white/20"
                  >
                    Try Again
                  </button>
                  <Link
                    href="/leaderboard"
                    className="px-8 py-3 rounded-xl font-semibold bg-blue-600 hover:bg-blue-500 text-white transition"
                  >
                    View Leaderboard
                  </Link>
                </div>

                {message && (
                  <div className="text-center mt-4">
                    <div className="text-sm text-gray-200">{message}</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-[#1a1a1a] rounded-3xl p-6">
              <h4 className="font-semibold mb-4">Progress</h4>
              <div className="h-3 w-full bg-zinc-800 rounded-full overflow-hidden mb-4">
                <div
                  className="h-full bg-emerald-400 transition-all duration-300"
                  style={{ width: `${percentComplete * 100}%` }}
                />
              </div>

              <div className="space-y-2 text-sm text-gray-300">
                <div className="flex justify-between">
                  <span>Stage:</span>
                  <span className="capitalize">{stage}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cards to memorize:</span>
                  <span>{memorizeDeck.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cards per view:</span>
                  <span>{viewCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Time left:</span>
                  <span>{timeLeft}s</span>
                </div>
              </div>
            </div>

            {stage === 'intro' ? (
              <div className="bg-[#1a1a1a] rounded-3xl p-6">
                <h4 className="font-semibold mb-4">How to Play</h4>
                <div className="space-y-3 text-sm text-gray-400">
                  <div>
                    <strong className="text-white">Memorize:</strong> View cards in sequence
                  </div>
                  <div>
                    <strong className="text-white">Recall:</strong> Place cards in correct order
                  </div>
                  <div>
                    <strong className="text-white">Score:</strong> Points for each correct position
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}