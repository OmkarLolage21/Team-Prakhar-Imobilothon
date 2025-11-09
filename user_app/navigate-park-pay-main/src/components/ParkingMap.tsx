import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { ParkingOffer } from '@/types/parking';
import { formatINR } from '@/lib/api';

interface IndoorSegment {
  id?: string;
  lat: number;
  lng: number;
  level?: string;
}

interface ParkingMapProps {
  offers: ParkingOffer[];
  origin?: { lat: number; lng: number };
  selectedOfferId?: string;
  onOfferClick?: (offerId: string) => void;
  onEtaChange?: (eta: string | null) => void;
  indoorPath?: { nodes: IndoorSegment[] } | null; // optional indoor overlay
}

const ParkingMap = ({ offers, origin, selectedOfferId, onOfferClick, onEtaChange, indoorPath }: ParkingMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const token = import.meta.env.VITE_MAPBOX_TOKEN || '';
  const routeSourceId = 'route';
  const indoorSourceId = 'indoor';
  const [etaText, setEtaText] = useState<string | null>(null);
  const markersRef = useRef<Record<string, HTMLElement>>({});

  useEffect(() => {
    if (!mapContainer.current || map.current) return;
    if (!token) return; // silently skip init if no token
    mapboxgl.accessToken = token;

    // Center on first offer if available else default Bangalore
    const center: [number, number] = offers.length
      ? [offers[0].location.lng, offers[0].location.lat]
      : [77.5946, 12.9716];

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center,
      zoom: 13,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    map.current.on('load', () => {
      // Add markers
      offers.forEach((offer) => {
        if (!offer.location) return;
        const el = document.createElement('div');
        el.className = 'parking-marker';
        el.style.width = '30px';
        el.style.height = '30px';
        el.style.borderRadius = '50%';
        el.style.backgroundColor = 'hsl(var(--primary))';
        el.style.border = '2px solid white';
        el.style.cursor = 'pointer';
        el.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
        el.style.transition = 'transform 0.15s, background-color 0.2s';

        const label = document.createElement('div');
        label.textContent = formatINR(offer.price).replace('₹', '₹');
        label.style.position = 'absolute';
        label.style.top = '-20px';
        label.style.left = '50%';
        label.style.transform = 'translateX(-50%)';
        label.style.background = 'hsl(var(--card))';
        label.style.padding = '2px 4px';
        label.style.borderRadius = '4px';
        label.style.fontSize = '11px';
        label.style.fontWeight = '600';
        label.style.whiteSpace = 'nowrap';
        label.style.boxShadow = '0 1px 4px rgba(0,0,0,0.2)';
        el.appendChild(label);

        new mapboxgl.Marker({ element: el })
          .setLngLat([offer.location.lng, offer.location.lat])
          .addTo(map.current!);

        el.addEventListener('click', () => onOfferClick && onOfferClick(offer.id));
        markersRef.current[offer.id] = el;
      });
    });
  }, [offers, token, onOfferClick]);

  // Effect: highlight selected marker
  useEffect(() => {
    Object.entries(markersRef.current).forEach(([id, el]) => {
      if (id === selectedOfferId) {
        el.style.backgroundColor = '#f59e0b'; // amber
        el.style.transform = 'scale(1.15)';
        el.style.zIndex = '10';
      } else {
        el.style.backgroundColor = 'hsl(var(--primary))';
        el.style.transform = 'scale(1)';
        el.style.zIndex = '1';
      }
    });
  }, [selectedOfferId]);

  // Effect: (re)draw route whenever origin or selected destination changes
  useEffect(() => {
    if (!map.current || !origin || !token) return;
    const destOffer = offers.find(o => o.id === selectedOfferId) || offers[0];
    if (!destOffer?.location) return;
    const dest = destOffer.location;
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${origin.lng},${origin.lat};${dest.lng},${dest.lat}?overview=full&geometries=geojson&access_token=${token}`;
    fetch(url).then(r=>r.json()).then(data => {
      const route = data.routes?.[0];
      if (!route) return;
      const geojson: any = { type: 'Feature', properties: {}, geometry: route.geometry };
      if (!map.current?.getSource(routeSourceId)) {
        map.current?.addSource(routeSourceId, { type: 'geojson', data: geojson });
        map.current?.addLayer({ id: 'route-line', type: 'line', source: routeSourceId, layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#3b82f6', 'line-width': 4, 'line-opacity': 0.8 } });
      } else {
        (map.current.getSource(routeSourceId) as mapboxgl.GeoJSONSource).setData(geojson as any);
      }
      const coords: [number, number][] = route.geometry.coordinates;
      if (coords?.length) {
        const b = coords.reduce((acc, c) => acc.extend(c as any), new mapboxgl.LngLatBounds(coords[0], coords[0]));
        map.current?.fitBounds(b, { padding: 40 });
      }
      const minutes = Math.round(route.duration / 60);
      const km = Math.round((route.distance / 1000) * 10) / 10;
      const text = `${minutes} min • ${km} km`;
      setEtaText(text);
      onEtaChange?.(text);
    }).catch(()=>{});
  }, [origin, selectedOfferId, offers, token, onEtaChange]);

  // Effect: draw indoor path polyline & markers
  useEffect(() => {
    if (!map.current || !indoorPath || indoorPath.nodes.length < 2) return;
    const coords = indoorPath.nodes.map(n => [n.lng, n.lat]);
    const geojson: any = { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } };
    // source/layer
    if (!map.current.getSource(indoorSourceId)) {
      map.current.addSource(indoorSourceId, { type: 'geojson', data: geojson });
      map.current.addLayer({ id: 'indoor-line', type: 'line', source: indoorSourceId, paint: { 'line-color': '#f97316', 'line-width': 3, 'line-dasharray': [1,1], 'line-opacity': 0.9 } });
    } else {
      (map.current.getSource(indoorSourceId) as mapboxgl.GeoJSONSource).setData(geojson as any);
    }
    // markers for start/end
    const mkClass = 'indoor-node-marker';
    // remove old markers
    document.querySelectorAll(`.${mkClass}`).forEach(el => el.remove());
    indoorPath.nodes.forEach((n, idx) => {
      if (idx === 0 || idx === indoorPath.nodes.length - 1) {
        const el = document.createElement('div');
        el.className = mkClass;
        el.style.width = '18px';
        el.style.height = '18px';
        el.style.borderRadius = '50%';
        el.style.background = idx === 0 ? '#16a34a' : '#dc2626';
        el.style.border = '2px solid white';
        el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.4)';
        if (n.level) {
          el.title = `Level ${n.level}`;
        }
        new mapboxgl.Marker({ element: el }).setLngLat([n.lng, n.lat]).addTo(map.current!);
      }
    });
  }, [indoorPath]);

  useEffect(() => () => { map.current?.remove(); }, []);

  if (!token) {
    return (
      <div className="h-96 bg-muted/40 border rounded-lg flex items-center justify-center text-sm text-muted-foreground">
        Map unavailable (missing token)
      </div>
    );
  }

  return (
    <div className="relative w-full h-96">
      <div ref={mapContainer} className="absolute inset-0 rounded-lg overflow-hidden" />
      {etaText && (
        <div className="absolute top-3 left-3 bg-card/90 backdrop-blur px-3 py-1.5 rounded text-sm shadow">{etaText}</div>
      )}
    </div>
  );
};

export default ParkingMap;
