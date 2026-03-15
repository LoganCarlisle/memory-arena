'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Card = {
  id: string;
  label: string;
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
    RANKS.map((rank) => ({ id: `${rank}${suit}`, label: `${rank}${suit}` })),
  );
}

type Stage = 'intro' | 'memorize' | 'recall' | 'done';

export default function TrainerModal({ onClose }: { onClose: () => void }) {
  const [user, setUser] = useState<any>(null);
  const [stage, setStage] = useState<Stage>('intro');
  const [timeLeft, setTimeLeft] = useState(60);
  const [viewCount, setViewCount] = useState(3);
  const [memorizeDeck, setMemorizeDeck] = useState<Card[]>([]);
  const [memorizeIndex, setMemorizeIndex] = useState(0);
  const [recallPool, setRecallPool] = useState<Card[]>([]);
  const [recallOrder, setRecallOrder] = useState<Card[]>([]);
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
    const slice = deck.slice(0, 12); // memorization set
    setMemorizeDeck(slice);
    setMemorizeIndex(0);
    setRecallOrder([]);
    setRecallPool([]);
    setScore(0);
    setMessage(null);
    setTimeLeft(60);
    setStage('memorize');
  };

  const beginRecall = () => {
    setRecallPool(shuffle(memorizeDeck));
    setRecallOrder([]);
    setStage('recall');
  };

  const handleCardClick = (card: Card) => {
    if (stage !== 'recall') return;
    if (recallOrder.length >= memorizeDeck.length) return;

    setRecallOrder((prev) => [...prev, card]);
    setRecallPool((prev) => prev.filter((c) => c.id !== card.id));
  };

  const handleRemoveSlot = (index: number) => {
    if (stage !== 'recall') return;

    const removed = recallOrder[index];
    if (!removed) return;

    setRecallOrder((prev) => prev.filter((_, i) => i !== index));
    setRecallPool((prev) => [...prev, removed]);
  };

  const finishRecall = () => {
    const correct = recallOrder.reduce((acc, card, idx) => {
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

  return (
    <div className="fixed inset-0 bg-black/75 z-[100] flex items-center justify-center p-4">
      <div className="w-full max-w-5xl bg-zinc-950 rounded-3xl overflow-hidden relative shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-3xl text-gray-400 hover:text-white z-10"
          aria-label="Close"
        >
          ✕
        </button>

        <div className="p-10">
          <div className="flex flex-col md:flex-row items-start justify-between gap-6">
            <div>
              <h2 className="text-4xl font-black">Card Training</h2>
              <p className="mt-2 text-gray-300 max-w-xl">
                Memorize the cards, then recreate the order from memory.
              </p>
              <p className="mt-4 text-sm text-gray-400">
                {user ? (
                  <>
                    Logged in as <span className="font-semibold">{user.email}</span>.
                  </>
                ) : (
                  <>Sign in to save your score and appear on the leaderboard.</>
                )}
              </p>
            </div>

            <div className="flex items-center gap-3">
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

          <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-[#1a1a1a] rounded-3xl p-10">
              {stage === 'intro' && (
                <div className="space-y-6">
                  <p className="text-gray-400">
                    Choose how many cards to show at once while you memorize them.
                    When the timer ends (or you finish), you will have to recreate the order.
                  </p>

                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm text-gray-300">Cards per view:</span>
                    {[1, 2, 3].map((n) => (
                      <button
                        key={n}
                        className={`px-4 py-2 rounded-xl font-semibold transition ${
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

                  <button
                    onClick={startMemorization}
                    className="mt-6 w-full px-6 py-4 bg-emerald-600 hover:bg-emerald-500 rounded-2xl font-bold text-black transition"
                  >
                    Start memorizing
                  </button>
                </div>
              )}

              {stage === 'memorize' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-400">Memorize these cards</div>
                    <div className="text-xs text-gray-400">
                      {memorizeIndex + 1}–{Math.min(memorizeIndex + viewCount, memorizeDeck.length)} of {memorizeDeck.length}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {currentSlice.map((card) => (
                      <div
                        key={card.id}
                        className="relative aspect-[4/5] rounded-2xl bg-white/10 border border-white/10 p-6 flex items-center justify-center text-7xl font-black text-white"
                      >
                        {card.label}
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => setMemorizeIndex((i) => Math.min(i + viewCount, memorizeDeck.length))}
                      disabled={isMemorizeComplete}
                      className="px-6 py-3 rounded-xl font-semibold transition bg-white/10 hover:bg-white/20 disabled:opacity-50"
                    >
                      {isMemorizeComplete ? 'Ready to recall' : 'Next'}
                    </button>

                    {isMemorizeComplete && (
                      <button
                        onClick={beginRecall}
                        className="px-6 py-3 rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-500 text-black transition"
                      >
                        Start recall
                      </button>
                    )}
                  </div>
                </div>
              )}

              {stage === 'recall' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-400">Recreate the order</div>
                    <div className="text-xs text-gray-400">{recallOrder.length}/{memorizeDeck.length}</div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    {Array.from({ length: memorizeDeck.length }).map((_, idx) => {
                      const selected = recallOrder[idx];
                      return (
                        <button
                          key={idx}
                          onClick={() => handleRemoveSlot(idx)}
                          className={`aspect-[4/5] rounded-2xl border border-white/10 p-4 text-7xl font-black transition ${
                            selected ? 'bg-emerald-500/20 text-emerald-200' : 'bg-white/5 text-white/30'
                          }`}
                        >
                          {selected ? selected.label : '?'}
                        </button>
                      );
                    })}
                  </div>

                  <div>
                    <div className="text-sm text-gray-400 mb-2">Tap cards below to fill the placeholders</div>
                    <div className="grid grid-cols-4 gap-3">
                      {recallPool.map((card) => (
                        <button
                          key={card.id}
                          onClick={() => handleCardClick(card)}
                          className="aspect-[4/5] rounded-2xl bg-white/10 border border-white/10 text-5xl font-black text-white hover:bg-white/20 transition"
                        >
                          {card.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={finishRecall}
                      disabled={recallOrder.length !== memorizeDeck.length}
                      className="px-6 py-3 rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-500 text-black transition disabled:opacity-50"
                    >
                      Submit recall
                    </button>
                    <button
                      onClick={startMemorization}
                      className="px-6 py-3 rounded-xl font-semibold bg-white/10 hover:bg-white/20"
                    >
                      Restart
                    </button>
                  </div>
                </div>
              )}

              {stage === 'done' && (
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="text-6xl font-black text-emerald-400">{score}</div>
                    <div className="text-sm text-gray-400">cards correct out of {memorizeDeck.length}</div>
                  </div>

                  <div className="flex flex-wrap gap-3 justify-center">
                    <button
                      onClick={handleSubmitScore}
                      disabled={submitting}
                      className="px-6 py-3 rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-500 text-black transition disabled:opacity-50"
                    >
                      {submitting ? 'Saving…' : 'Save score'}
                    </button>
                    <button
                      onClick={startMemorization}
                      className="px-6 py-3 rounded-xl font-semibold bg-white/10 hover:bg-white/20"
                    >
                      Try again
                    </button>
                  </div>

                  {message ? (
                    <div className="text-center text-sm text-gray-200">{message}</div>
                  ) : null}
                </div>
              )}
            </div>

            <div className="bg-[#1a1a1a] rounded-3xl p-6">
              <div className="text-sm text-gray-400 mb-3">Progress</div>
              <div className="h-4 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-400"
                  style={{ width: `${percentComplete * 100}%` }}
                />
              </div>

              <div className="mt-6 text-sm text-gray-300">
                <div className="flex justify-between">
                  <span>Memorized cards</span>
                  <span>{memorizeDeck.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cards views</span>
                  <span>{viewCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Timer</span>
                  <span>{timeLeft}s</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
