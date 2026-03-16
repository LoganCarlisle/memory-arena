import { NextRequest, NextResponse } from 'next/server';

// Haversine distance calculation
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

type Place = {
  title: string;
  latitude: number;
  longitude: number;
  url: string;
  id: string;
};

type GeoSearchItem = {
  pageid: number;
  title: string;
  lat: string;
  lon: string;
};

// Fetch random places from Wikipedia with coordinates
async function getRandomPlacesFromWikipedia(count: number = 5): Promise<Place[]> {
  try {
    // Use randomized search coordinates from different continents for maximum diversity
    const baseCoords = [
      { lat: 40.7128, lon: -74.0060, region: 'North America' },
      { lat: 51.5074, lon: -0.1278, region: 'Europe' },
      { lat: -33.8688, lon: 151.2093, region: 'Australia' },
      { lat: 35.6762, lon: 139.6503, region: 'Asia' },
      { lat: -22.9068, lon: -43.1729, region: 'South America' },
      { lat: 30.0444, lon: 31.2357, region: 'Africa' },
      { lat: 55.7558, lon: 37.6173, region: 'Europe/Asia' }, // Moscow
      { lat: -33.9249, lon: 18.4241, region: 'Africa' }, // Cape Town
      { lat: 19.4326, lon: -99.1332, region: 'North America' }, // Mexico City
      { lat: 39.9042, lon: 116.4074, region: 'Asia' }, // Beijing
    ];

    // Shuffle the coordinates and add random variation
    const searchCoords = baseCoords
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.min(count + 2, baseCoords.length)) // Get more than needed
      .map(coord => ({
        lat: coord.lat + (Math.random() - 0.5) * 10, // Add ±5 degrees random variation
        lon: coord.lon + (Math.random() - 0.5) * 10,
        region: coord.region
      }));

    const allPlaces: Place[] = [];

    // Fetch from randomized regions to ensure diversity
    for (const coord of searchCoords) {
      if (allPlaces.length >= count) break;

      const searchUrl = new URL('https://en.wikipedia.org/w/api.php');
      searchUrl.searchParams.append('action', 'query');
      searchUrl.searchParams.append('format', 'json');
      searchUrl.searchParams.append('list', 'geosearch');
      searchUrl.searchParams.append('gsradius', '3000'); // Smaller radius for more specific results
      searchUrl.searchParams.append('gslimit', String(Math.min(count - allPlaces.length + 2, 8)));
      searchUrl.searchParams.append('gscoord', `${coord.lat}|${coord.lon}`);

      const response = await fetch(searchUrl.toString(), {
        headers: {
          'User-Agent': 'MemoryArena/1.0'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.query?.geosearch) {
          const places = data.query.geosearch.map((item: GeoSearchItem) => ({
            id: item.pageid.toString(),
            title: item.title,
            latitude: parseFloat(item.lat),
            longitude: parseFloat(item.lon),
            url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title)}`
          }));
          allPlaces.push(...places);
        }
      }

      // Small delay to be respectful to the API
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Remove duplicates and shuffle
    const uniquePlaces = allPlaces.filter((place, index, self) =>
      index === self.findIndex(p => p.id === place.id)
    );

    const shuffled = uniquePlaces.sort(() => Math.random() - 0.5);
    const selectedPlaces = shuffled.slice(0, count);

    return selectedPlaces.length > 0 ? selectedPlaces : getDefaultPlaces(count);
  } catch (error) {
    console.error('Error fetching from Wikipedia:', error);
    return getDefaultPlaces(count);
  }
}

// Fallback list of notable places with verified coordinates - diverse global locations
function getDefaultPlaces(count: number): Place[] {
  const defaultPlaces: Place[] = [
    {
      id: '1',
      title: 'Eiffel Tower',
      latitude: 48.8584,
      longitude: 2.2945,
      url: 'https://en.wikipedia.org/wiki/Eiffel_Tower'
    },
    {
      id: '2',
      title: 'Great Wall of China',
      latitude: 40.6769,
      longitude: 117.2319,
      url: 'https://en.wikipedia.org/wiki/Great_Wall_of_China'
    },
    {
      id: '3',
      title: 'Statue of Liberty',
      latitude: 40.6892,
      longitude: -74.0445,
      url: 'https://en.wikipedia.org/wiki/Statue_of_Liberty'
    },
    {
      id: '4',
      title: 'Christ the Redeemer',
      latitude: -22.9519,
      longitude: -43.2105,
      url: 'https://en.wikipedia.org/wiki/Christ_the_Redeemer'
    },
    {
      id: '5',
      title: 'Colosseum',
      latitude: 41.8902,
      longitude: 12.4924,
      url: 'https://en.wikipedia.org/wiki/Colosseum'
    },
    {
      id: '6',
      title: 'Big Ben',
      latitude: 51.4975,
      longitude: -0.1247,
      url: 'https://en.wikipedia.org/wiki/Big_Ben'
    },
    {
      id: '7',
      title: 'Leaning Tower of Pisa',
      latitude: 43.3631,
      longitude: 12.5853,
      url: 'https://en.wikipedia.org/wiki/Leaning_Tower_of_Pisa'
    },
    {
      id: '8',
      title: 'Taj Mahal',
      latitude: 27.1751,
      longitude: 78.0421,
      url: 'https://en.wikipedia.org/wiki/Taj_Mahal'
    },
    {
      id: '9',
      title: 'Sagrada Familia',
      latitude: 41.4036,
      longitude: 2.1744,
      url: 'https://en.wikipedia.org/wiki/Sagrada_Familia'
    },
    {
      id: '10',
      title: 'Sydney Opera House',
      latitude: -33.8568,
      longitude: 151.2153,
      url: 'https://en.wikipedia.org/wiki/Sydney_Opera_House'
    },
    {
      id: '11',
      title: 'Mount Fuji',
      latitude: 35.3606,
      longitude: 138.7278,
      url: 'https://en.wikipedia.org/wiki/Mount_Fuji'
    },
    {
      id: '12',
      title: 'Pyramids of Giza',
      latitude: 29.9792,
      longitude: 31.1342,
      url: 'https://en.wikipedia.org/wiki/Pyramids_of_Giza'
    },
    {
      id: '13',
      title: 'Machu Picchu',
      latitude: -13.1631,
      longitude: -72.5450,
      url: 'https://en.wikipedia.org/wiki/Machu_Picchu'
    },
    {
      id: '14',
      title: 'Stonehenge',
      latitude: 51.1789,
      longitude: -1.8262,
      url: 'https://en.wikipedia.org/wiki/Stonehenge'
    },
    {
      id: '15',
      title: 'Burj Khalifa',
      latitude: 25.1972,
      longitude: 55.2744,
      url: 'https://en.wikipedia.org/wiki/Burj_Khalifa'
    },
    {
      id: '16',
      title: 'Petra',
      latitude: 30.3285,
      longitude: 35.4444,
      url: 'https://en.wikipedia.org/wiki/Petra'
    },
    {
      id: '17',
      title: 'Angkor Wat',
      latitude: 13.4125,
      longitude: 103.8670,
      url: 'https://en.wikipedia.org/wiki/Angkor_Wat'
    },
    {
      id: '18',
      title: 'Niagara Falls',
      latitude: 43.0962,
      longitude: -79.0377,
      url: 'https://en.wikipedia.org/wiki/Niagara_Falls'
    },
    {
      id: '19',
      title: 'Victoria Falls',
      latitude: -17.9243,
      longitude: 25.8572,
      url: 'https://en.wikipedia.org/wiki/Victoria_Falls'
    },
    {
      id: '20',
      title: 'Galápagos Islands',
      latitude: -0.8293,
      longitude: -90.9821,
      url: 'https://en.wikipedia.org/wiki/Gal%C3%A1pagos_Islands'
    }
  ];

  // Shuffle and return requested count
  const shuffled = [...defaultPlaces].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, defaultPlaces.length));
}

// POST /api/places - Get random places and calculate score
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, count = 5, guessLat, guessLon, actualLat, actualLon } =
      body;

    if (action === 'getPlaces') {
      const places = await getRandomPlacesFromWikipedia(count);
      return NextResponse.json({ places });
    }

    if (action === 'calculateScore') {
      const distance = haversineDistance(
        guessLat,
        guessLon,
        actualLat,
        actualLon
      );

      // Scoring: perfect = 1000 points, degrades with distance
      // At 1000km away: ~100 points
      // At 10000km away: ~1 point
      const score = Math.max(0, 1000 * Math.exp(-distance / 1000));

      return NextResponse.json({
        distance,
        score: Math.round(score),
        percentage: Math.round((score / 1000) * 100)
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
