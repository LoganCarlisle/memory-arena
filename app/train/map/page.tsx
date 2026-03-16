'use client';

import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase/client';
import { haversineDistance, calculateLocationScore } from '@/lib/haversine';
import { useLeaflet, createMarkerIcon } from '@/lib/use-leaflet';

// Dynamically import Leaflet components to avoid SSR issues with window object
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false, loading: () => <div className="h-full w-full bg-muted animate-pulse" /> }
);

const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);

const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);

const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);

type Place = {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  url: string;
};

type GuessResult = {
  place: Place;
  guessLat: number;
  guessLon: number;
  distance: number;
  score: number;
  percentage: number;
};

type Stage = 'intro' | 'memorize' | 'recall' | 'results';

const DEFAULT_MAP_CENTER: [number, number] = [20, 0]; // World center
const MEMORIZE_TIME = 120; // 2 minutes to memorize

// Map click handler component - only rendered on client
const RecallMapContent = dynamic(
  () => import('../recall-map'),
  { ssr: false }
);

export default function MapDisciplinePage() {
  const { leaflet, isLoaded } = useLeaflet();
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [stage, setStage] = useState<Stage>('intro');
  const [places, setPlaces] = useState<Place[]>([]);
  const [currentPlaceIndex, setCurrentPlaceIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(MEMORIZE_TIME);
  const [placeCount, setPlaceCount] = useState(5);
  const [guesses, setGuesses] = useState<GuessResult[]>([]);
  const [currentGuessPlace, setCurrentGuessPlace] = useState<Place | null>(null);
  const [currentGuess, setCurrentGuess] = useState<{ lat: number; lon: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then((res) => setUser(res.data.user));
    setMounted(true);
  }, []);

  // Fetch places from Wikipedia
  const fetchPlaces = async (count: number) => {
    setLoading(true);
    try {
      const response = await fetch('/api/places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getPlaces', count })
      });
      const data = await response.json();
      setPlaces(data.places || []);
    } catch (error) {
      console.error('Error fetching places:', error);
      setMessage('Failed to load places from Wikipedia');
    } finally {
      setLoading(false);
    }
  };

  // Start game
  const startGame = async () => {
    await fetchPlaces(placeCount);
    setStage('memorize');
    setTimeLeft(MEMORIZE_TIME);
    setCurrentPlaceIndex(0);
    setGuesses([]);
  };

  // Timer for memorization phase
  useEffect(() => {
    if (stage !== 'memorize') return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setStage('recall');
          setCurrentGuessPlace(places[0] || null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [stage, places]);

  // Skip timer and go to recall phase
  const skipToRecall = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setStage('recall');
    setCurrentGuessPlace(places[0] || null);
  };

  // Navigate through places during memorization
  const goToNextPlace = () => {
    if (currentPlaceIndex < places.length - 1) {
      setCurrentPlaceIndex(currentPlaceIndex + 1);
    }
  };

  const goToPreviousPlace = () => {
    if (currentPlaceIndex > 0) {
      setCurrentPlaceIndex(currentPlaceIndex - 1);
    }
  };

  // Handle map click for guessing
  const handleMapClick = (lat: number, lon: number) => {
    if (!currentGuessPlace) return;

    setCurrentGuess({ lat, lon });
  };

  // Submit the current guess
  const submitGuess = () => {
    if (!currentGuessPlace || !currentGuess) return;

    const distance = haversineDistance(
      currentGuess.lat,
      currentGuess.lon,
      currentGuessPlace.latitude,
      currentGuessPlace.longitude
    );
    const score = calculateLocationScore(distance);

    const result: GuessResult = {
      place: currentGuessPlace,
      guessLat: currentGuess.lat,
      guessLon: currentGuess.lon,
      distance,
      score: Math.round(score),
      percentage: Math.round((score / 1000) * 100)
    };

    setGuesses([...guesses, result]);
    setCurrentGuess(null);

    // Move to next place
    const nextIndex = places.findIndex((p) => p.id === currentGuessPlace.id) + 1;
    if (nextIndex < places.length) {
      setCurrentGuessPlace(places[nextIndex]);
    } else {
      setStage('results');
    }
  };

  // Save results to database
  const saveResults = async () => {
    if (!user) return;

    setSubmitting(true);
    try {
      const totalScore = guesses.reduce((sum, g) => sum + g.score, 0);
      const averagePercentage =
        guesses.length > 0
          ? Math.round(guesses.reduce((sum, g) => sum + g.percentage, 0) / guesses.length)
          : 0;

      const response = await fetch('/api/game-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          discipline: 'map',
          score: totalScore,
          percentage: averagePercentage
        })
      });

      if (response.ok) {
        setMessage('Results saved successfully!');
      }
    } catch (error) {
      console.error('Error saving results:', error);
      setMessage('Failed to save results');
    } finally {
      setSubmitting(false);
    }
  };

  const currentPlace = places[currentPlaceIndex];
  const totalScore = guesses.reduce((sum, g) => sum + g.score, 0);
  const averagePercentage =
    guesses.length > 0
      ? Math.round(guesses.reduce((sum, g) => sum + g.percentage, 0) / guesses.length)
      : 0;

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">Map Discipline</h1>
        <p className="text-muted-foreground mb-6">
          Memorize the locations of famous places from Wikipedia and guess where they are on
          the map.
        </p>

        {/* INTRO STAGE */}
        {stage === 'intro' && (
          <div className="bg-card rounded-lg shadow-lg p-8 max-w-md">
            <h2 className="text-2xl font-bold mb-4">Game Setup</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Number of Places:</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={placeCount}
                  onChange={(e) => setPlaceCount(Math.max(1, parseInt(e.target.value) || 5))}
                  className="w-full px-3 py-2 border rounded-md bg-background"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Time to memorize: {MEMORIZE_TIME} seconds
              </p>
              <button
                onClick={startGame}
                disabled={loading}
                className="w-full bg-primary text-primary-foreground py-2 rounded-md font-medium hover:bg-primary/90 transition disabled:opacity-50"
              >
                {loading ? 'Loading Places...' : 'Start Game'}
              </button>
            </div>
          </div>
        )}

        {/* MEMORIZE STAGE */}
        {stage === 'memorize' && currentPlace && (
          <div className="space-y-4">
            <div className="bg-card rounded-lg shadow-lg p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left side: Place info and timer */}
              <div>
                <div className="mb-6">
                  <p className="text-sm text-muted-foreground mb-2">
                    Place {currentPlaceIndex + 1} of {places.length}
                  </p>
                  <h2 className="text-3xl font-bold mb-4">{currentPlace.title}</h2>
                  <p className="text-lg text-muted-foreground mb-4">
                    📍 {currentPlace.latitude.toFixed(4)}°, {currentPlace.longitude.toFixed(4)}°
                  </p>
                  <a
                    href={currentPlace.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Read on Wikipedia →
                  </a>
                </div>

                {/* Timer */}
                <div className="mb-6 p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">Time Remaining</p>
                  <p className="text-4xl font-bold font-mono">{timeLeft}s</p>
                </div>

                {/* Navigation buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={goToPreviousPlace}
                    disabled={currentPlaceIndex === 0}
                    className="flex-1 bg-secondary text-secondary-foreground py-2 rounded-md font-medium hover:bg-secondary/90 transition disabled:opacity-50"
                  >
                    ← Previous
                  </button>
                  <button
                    onClick={goToNextPlace}
                    disabled={currentPlaceIndex === places.length - 1}
                    className="flex-1 bg-secondary text-secondary-foreground py-2 rounded-md font-medium hover:bg-secondary/90 transition disabled:opacity-50"
                  >
                    Next →
                  </button>
                </div>

                {/* Skip to recall button */}
                <button
                  onClick={skipToRecall}
                  className="w-full bg-primary text-primary-foreground py-2 rounded-md font-medium hover:bg-primary/90 transition mt-4"
                >
                  Skip Timer & Start Guessing
                </button>
              </div>

              {/* Right side: Map showing the place */}
              <div className="rounded-lg overflow-hidden shadow-md h-96 lg:h-auto">
                {mounted && isLoaded && (
                  <MapContainer
                    center={[currentPlace.latitude, currentPlace.longitude]}
                    zoom={5}
                    style={{ height: '100%', width: '100%' }}
                    key={`place-${currentPlace.id}`}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; OpenStreetMap contributors'
                    />
                    {isLoaded && leaflet && (
                      <Marker
                        position={[currentPlace.latitude, currentPlace.longitude]}
                        icon={createMarkerIcon(leaflet, 'large')}
                      >
                        <Popup>{currentPlace.title}</Popup>
                      </Marker>
                    )}
                  </MapContainer>
                )}
              </div>
            </div>
          </div>
        )}

        {/* RECALL STAGE */}
        {stage === 'recall' && currentGuessPlace && (
          <div className="space-y-4">
            <div className="bg-card rounded-lg shadow-lg p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left side: Current place and progress */}
                <div>
                  <div className="mb-6">
                    <p className="text-sm text-muted-foreground mb-2">
                      Place {guesses.length + 1} of {places.length}
                    </p>
                    <h2 className="text-3xl font-bold mb-4">Guess the Location</h2>
                    <p className="text-muted-foreground mb-4">
                      Click on the map to guess where this place is located.
                    </p>
                    {currentGuess && (
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="text-sm font-medium">Your Guess:</p>
                        <p className="text-sm text-muted-foreground">
                          {currentGuess.lat.toFixed(4)}°, {currentGuess.lon.toFixed(4)}°
                        </p>
                        <button
                          onClick={submitGuess}
                          className="mt-2 w-full bg-primary text-primary-foreground py-1 px-3 rounded text-sm font-medium hover:bg-primary/90 transition"
                        >
                          Submit Guess
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div className="mb-6 bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${((guesses.length) / places.length) * 100}%` }}
                    ></div>
                  </div>

                  {/* Previous guesses */}
                  {guesses.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2">Previous Guesses</h3>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {guesses.map((guess, idx) => (
                          <div
                            key={idx}
                            className="p-2 bg-muted rounded text-sm flex justify-between"
                          >
                            <span>{guess.place.title}</span>
                            <span className="font-medium">{guess.score} pts</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right side: Map for guessing */}
                <div className="rounded-lg overflow-hidden shadow-md h-96 lg:h-auto">
                  {mounted && isLoaded && (
                    <MapContainer
                      center={DEFAULT_MAP_CENTER}
                      zoom={2}
                      style={{ height: '100%', width: '100%' }}
                      key={`recall-${currentGuessPlace.id}`}
                    >
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; OpenStreetMap contributors'
                      />
                      {/* Show previous correct guesses */}
                      {isLoaded && leaflet && guesses.map((guess, idx) => (
                        <Marker
                          key={`correct-${idx}`}
                          position={[guess.place.latitude, guess.place.longitude]}
                          icon={createMarkerIcon(leaflet, 'small')}
                        >
                          <Popup>
                            <div className="text-center">
                              <p className="font-semibold">{guess.place.title}</p>
                              <p className="text-sm text-green-600">✓ Correct Location</p>
                              <p className="text-sm">{guess.distance.toFixed(1)} km away</p>
                            </div>
                          </Popup>
                        </Marker>
                      ))}
                      {/* Show current guess */}
                      {currentGuess && isLoaded && leaflet && (
                        <Marker
                          position={[currentGuess.lat, currentGuess.lon]}
                          icon={createMarkerIcon(leaflet, 'guess')}
                        >
                          <Popup>
                            <div className="text-center">
                              <p className="font-semibold text-blue-600">Your Guess</p>
                              <p className="text-sm">{currentGuess.lat.toFixed(4)}°, {currentGuess.lon.toFixed(4)}°</p>
                            </div>
                          </Popup>
                        </Marker>
                      )}
                      {/* Show actual location after guess is submitted */}
                      {currentGuess && isLoaded && leaflet && (
                        <Marker
                          position={[currentGuessPlace.latitude, currentGuessPlace.longitude]}
                          icon={createMarkerIcon(leaflet, 'actual')}
                        >
                          <Popup>
                            <div className="text-center">
                              <p className="font-semibold text-red-600">Actual Location</p>
                              <p className="text-sm">{currentGuessPlace.title}</p>
                              <p className="text-sm">{currentGuessPlace.latitude.toFixed(4)}°, {currentGuessPlace.longitude.toFixed(4)}°</p>
                              {(() => {
                                const distance = haversineDistance(
                                  currentGuess.lat, currentGuess.lon,
                                  currentGuessPlace.latitude, currentGuessPlace.longitude
                                );
                                return <p className="text-sm font-medium">{distance.toFixed(1)} km away</p>;
                              })()}
                            </div>
                          </Popup>
                        </Marker>
                      )}
                      <RecallMapContent onMapClick={handleMapClick} />
                    </MapContainer>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* RESULTS STAGE */}
        {stage === 'results' && (
          <div className="space-y-4">
            <div className="bg-card rounded-lg shadow-lg p-8">
              <h2 className="text-3xl font-bold mb-6">Your Results</h2>

              {/* Summary stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-muted rounded-lg p-4">
                  <p className="text-sm text-muted-foreground mb-1">Total Score</p>
                  <p className="text-3xl font-bold">{totalScore}</p>
                </div>
                <div className="bg-muted rounded-lg p-4">
                  <p className="text-sm text-muted-foreground mb-1">Average Accuracy</p>
                  <p className="text-3xl font-bold">{averagePercentage}%</p>
                </div>
                <div className="bg-muted rounded-lg p-4">
                  <p className="text-sm text-muted-foreground mb-1">Places Guessed</p>
                  <p className="text-3xl font-bold">{guesses.length}</p>
                </div>
              </div>

              {/* Detailed results */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold mb-4">Detailed Results</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {guesses.map((guess, idx) => (
                    <div
                      key={idx}
                      className="bg-muted rounded-lg p-4 flex justify-between items-center"
                    >
                      <div>
                        <p className="font-medium">{guess.place.title}</p>
                        <p className="text-sm text-muted-foreground">
                          Distance: {guess.distance.toFixed(1)} km
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">{guess.score}</p>
                        <p className="text-sm text-muted-foreground">{guess.percentage}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3">
                <button
                  onClick={saveResults}
                  disabled={submitting}
                  className="flex-1 bg-primary text-primary-foreground py-2 rounded-md font-medium hover:bg-primary/90 transition disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Results'}
                </button>
                <button
                  onClick={() => {
                    setStage('intro');
                    setPlaces([]);
                    setGuesses([]);
                    setCurrentPlaceIndex(0);
                    setTimeLeft(MEMORIZE_TIME);
                    setMessage(null);
                  }}
                  className="flex-1 bg-secondary text-secondary-foreground py-2 rounded-md font-medium hover:bg-secondary/90 transition"
                >
                  Play Again
                </button>
              </div>

              {message && (
                <p className="mt-4 text-sm text-muted-foreground text-center">{message}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
