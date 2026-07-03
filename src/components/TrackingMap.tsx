'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import type { ShipmentCheckpoint } from '@/types/database.types';

// Fix for default Leaflet markers in Next.js
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// A green icon for the current (latest) position
const currentIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface TrackingMapProps {
  checkpoints: ShipmentCheckpoint[];
  liveLocation?: { lat: number; lng: number } | null;
}

export default function TrackingMap({ checkpoints, liveLocation }: TrackingMapProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="h-full w-full bg-slate-100 animate-pulse rounded-xl" />;

  const validCheckpoints = checkpoints.filter((cp) => cp.latitude !== null && cp.longitude !== null);
  
  if (validCheckpoints.length === 0 && !liveLocation) {
    return (
      <div className="h-full w-full bg-slate-100 rounded-xl flex items-center justify-center text-slate-500">
        No location data available for this shipment.
      </div>
    );
  }

  // Use the live location if available, otherwise use the last checkpoint
  const latestValid = validCheckpoints.length > 0 ? validCheckpoints[validCheckpoints.length - 1] : null;
  const currentLat = liveLocation?.lat ?? latestValid?.latitude ?? 0;
  const currentLng = liveLocation?.lng ?? latestValid?.longitude ?? 0;

  const positions: [number, number][] = validCheckpoints.map((cp) => [cp.latitude!, cp.longitude!]);
  
  if (liveLocation && positions.length > 0) {
    positions.push([liveLocation.lat, liveLocation.lng]);
  }

  return (
    <div className="h-full w-full rounded-xl overflow-hidden shadow-inner border border-slate-200">
      <MapContainer
        center={[currentLat, currentLng]}
        zoom={10}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Draw the route */}
        {positions.length > 1 && (
          <Polyline positions={positions} color="#2563eb" weight={4} opacity={0.7} dashArray="10, 10" />
        )}

        {/* Historical checkpoints */}
        {validCheckpoints.map((cp, idx) => {
          const isLatest = !liveLocation && idx === validCheckpoints.length - 1;
          return (
            <Marker 
              key={cp.id} 
              position={[cp.latitude!, cp.longitude!]} 
              icon={isLatest ? currentIcon : defaultIcon}
            >
              <Popup>
                <div className="font-semibold">{cp.location_name}</div>
                <div className="text-sm text-slate-500">{cp.status_description}</div>
                <div className="text-xs text-slate-400 mt-1">
                  {new Date(cp.created_at).toLocaleString()}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Live Location Marker (if driving) */}
        {liveLocation && (
          <Marker position={[liveLocation.lat, liveLocation.lng]} icon={currentIcon}>
            <Popup>
              <div className="font-semibold text-emerald-600">Live Driver Location</div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
