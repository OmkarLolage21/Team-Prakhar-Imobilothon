import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ParkingOffer } from '@/types/parking';

interface ParkingMapProps {
  offers: ParkingOffer[];
  onOfferClick?: (offerId: string) => void;
}

const ParkingMap = ({ offers, onOfferClick }: ParkingMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [token, setToken] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);

  const initializeMap = () => {
    if (!mapContainer.current || !token) return;

    mapboxgl.accessToken = token;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [77.5946, 12.9716], // Bangalore coordinates
      zoom: 12,
    });

    map.current.addControl(
      new mapboxgl.NavigationControl(),
      'top-right'
    );

    // Add markers for parking offers
    offers.forEach((offer) => {
      const el = document.createElement('div');
      el.className = 'parking-marker';
      el.style.width = '32px';
      el.style.height = '32px';
      el.style.borderRadius = '50%';
      el.style.backgroundColor = 'hsl(var(--primary))';
      el.style.border = '3px solid white';
      el.style.cursor = 'pointer';
      el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
      
      // Add price label
      const label = document.createElement('div');
      label.textContent = `${offer.currency}${offer.price}`;
      label.style.position = 'absolute';
      label.style.top = '-24px';
      label.style.left = '50%';
      label.style.transform = 'translateX(-50%)';
      label.style.background = 'hsl(var(--card))';
      label.style.padding = '2px 6px';
      label.style.borderRadius = '4px';
      label.style.fontSize = '12px';
      label.style.fontWeight = '600';
      label.style.whiteSpace = 'nowrap';
      label.style.boxShadow = '0 1px 4px rgba(0,0,0,0.2)';
      el.appendChild(label);

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([77.5946 + (Math.random() - 0.5) * 0.05, 12.9716 + (Math.random() - 0.5) * 0.05])
        .addTo(map.current!);

      el.addEventListener('click', () => {
        if (onOfferClick) {
          onOfferClick(offer.id);
        }
      });
    });

    setIsInitialized(true);
  };

  useEffect(() => {
    return () => {
      map.current?.remove();
    };
  }, []);

  if (!isInitialized) {
    return (
      <div className="h-96 bg-card border rounded-lg p-6 flex flex-col items-center justify-center gap-4">
        <div className="text-center max-w-md">
          <h3 className="text-lg font-semibold mb-2">Mapbox Integration</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Enter your Mapbox public token to view the map
          </p>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="pk.eyJ1..."
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="flex-1"
            />
            <Button onClick={initializeMap} disabled={!token}>
              Load Map
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Get your token at{' '}
            <a
              href="https://account.mapbox.com/access-tokens/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              mapbox.com
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-96">
      <div ref={mapContainer} className="absolute inset-0 rounded-lg overflow-hidden" />
    </div>
  );
};

export default ParkingMap;
