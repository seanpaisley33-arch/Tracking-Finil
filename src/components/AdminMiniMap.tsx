'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

const adminIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface AdminMiniMapProps {
  lat: number;
  lng: number;
  onMapClick: (lat: number, lng: number) => void;
}

// Sub-component to handle map clicks and re-centering
function MapEvents({ onMapClick, center }: { onMapClick: (lat: number, lng: number) => void, center: [number, number] }) {
  const map = useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    }
  });

  // Re-center map when props change
  useEffect(() => {
    map.flyTo(center, map.getZoom(), { animate: true, duration: 0.5 });
  }, [center, map]);

  return null;
}

export default function AdminMiniMap({ lat, lng, onMapClick }: AdminMiniMapProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-full w-full bg-slate-100 animate-pulse rounded-lg flex items-center justify-center text-slate-400 text-sm">Loading map preview...</div>;
  }

  return (
    <div className="h-full w-full rounded-lg overflow-hidden shadow-inner border border-slate-200">
      <MapContainer
        center={[lat, lng]}
        zoom={12}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <Marker position={[lat, lng]} icon={adminIcon} />
        
        <MapEvents onMapClick={onMapClick} center={[lat, lng]} />
      </MapContainer>
    </div>
  );
}
