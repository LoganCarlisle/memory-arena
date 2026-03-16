'use client';

import { useMapEvents } from 'react-leaflet';
import { useLeaflet } from '@/lib/use-leaflet';

type RecallMapProps = {
  onMapClick: (lat: number, lon: number) => void;
};

export default function RecallMapContent({ onMapClick }: RecallMapProps) {
  const { isLoaded } = useLeaflet();

  useMapEvents({
    click(e: any) {
      if (isLoaded) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    }
  });

  return null;
}
