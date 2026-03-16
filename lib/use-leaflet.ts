import { useEffect, useState } from 'react';
import 'leaflet/dist/leaflet.css';

let leafletInstance: any = null;

export function useLeaflet() {
  const [leaflet, setLeaflet] = useState<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // If already loaded, use cached instance
    if (leafletInstance) {
      setLeaflet(leafletInstance);
      setIsLoaded(true);
      return;
    }

    // Dynamically import Leaflet
    (async () => {
      try {
        // Import Leaflet
        const leaflet = await import('leaflet');
        const L = leaflet.default || leaflet;
        
        // Cache the instance
        leafletInstance = L;
        setLeaflet(L);
        setIsLoaded(true);
      } catch (error) {
        console.error('Failed to load Leaflet:', error);
        setIsLoaded(true);
      }
    })();
  }, []);

  return { leaflet, isLoaded };
}

export function createMarkerIcon(L: any, type: 'large' | 'small' | 'guess' | 'actual' = 'large') {
  if (!L || !L.icon) return undefined;

  try {
    switch (type) {
      case 'large':
        return L.icon({
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
          iconSize: [25, 41],
          shadowSize: [41, 41],
          iconAnchor: [12, 41],
          shadowAnchor: [12, 41],
          popupAnchor: [1, -34]
        });
      case 'small':
        return L.icon({
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
          iconSize: [20, 32],
          shadowSize: [32, 32],
          iconAnchor: [10, 32],
          shadowAnchor: [10, 32],
          popupAnchor: [1, -25]
        });
      case 'guess':
        return L.icon({
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
          iconSize: [25, 41],
          shadowSize: [41, 41],
          iconAnchor: [12, 41],
          shadowAnchor: [12, 41],
          popupAnchor: [1, -34]
        });
      case 'actual':
        return L.icon({
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
          iconSize: [25, 41],
          shadowSize: [41, 41],
          iconAnchor: [12, 41],
          shadowAnchor: [12, 41],
          popupAnchor: [1, -34]
        });
      default:
        return L.icon({
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
          iconSize: [25, 41],
          shadowSize: [41, 41],
          iconAnchor: [12, 41],
          shadowAnchor: [12, 41],
          popupAnchor: [1, -34]
        });
    }
  } catch (error) {
    console.error('Error creating marker icon:', error);
    return undefined;
  }
}
