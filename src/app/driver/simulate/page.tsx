'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Play, Square, Navigation, Truck } from 'lucide-react';

export default function DriverSimulator() {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [shipmentId, setShipmentId] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [status, setStatus] = useState('');
  const [location, setLocation] = useState({ lat: 40.7128, lng: -74.0060 }); // Start near NYC
  
  const simulationInterval = useRef<NodeJS.Timeout | null>(null);

  // Stop simulation on unmount
  useEffect(() => {
    return () => stopSimulation();
  }, []);

  const lookupShipment = async () => {
    if (!trackingNumber) return;
    setStatus('Looking up shipment...');
    
    const { data, error } = await supabase
      .from('shipments')
      .select('id, current_status')
      .eq('tracking_number', trackingNumber)
      .single();

    if (error || !data) {
      setStatus('Shipment not found.');
      setShipmentId(null);
    } else {
      setShipmentId(data.id);
      setStatus(`Found shipment. Current status: ${data.current_status}`);
    }
  };

  const emitLocation = async (lat: number, lng: number) => {
    if (!shipmentId) return;

    // We use Supabase Realtime Broadcast to emit live coordinates without writing to the DB constantly.
    // The tracking page listens to this channel for 'driver_location' events.
    const channel = supabase.channel(`tracking_${shipmentId}`);
    
    await channel.send({
      type: 'broadcast',
      event: 'driver_location',
      payload: { lat, lng, bearing: 0 },
    });
  };

  const startSimulation = () => {
    if (!shipmentId) return;
    setSimulating(true);
    setStatus('Simulation started. Emitting live coordinates...');

    let currentLat = location.lat;
    let currentLng = location.lng;

    // Simulate movement
    simulationInterval.current = setInterval(() => {
      // Move slightly north-east
      currentLat += 0.0005 + (Math.random() * 0.0002);
      currentLng += 0.0005 + (Math.random() * 0.0002);
      
      setLocation({ lat: currentLat, lng: currentLng });
      emitLocation(currentLat, currentLng);
    }, 2000); // Emit every 2 seconds
  };

  const stopSimulation = () => {
    if (simulationInterval.current) {
      clearInterval(simulationInterval.current);
      simulationInterval.current = null;
    }
    setSimulating(false);
    setStatus('Simulation stopped.');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 p-4 md:p-8 flex flex-col items-center justify-center">
      <div className="max-w-xl w-full bg-slate-800 p-8 rounded-3xl shadow-2xl border border-slate-700">
        <div className="flex items-center space-x-3 mb-6 border-b border-slate-700 pb-6">
          <div className="bg-blue-600/20 p-3 rounded-full text-blue-400">
            <Navigation className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Driver Stream Simulator</h2>
            <p className="text-slate-400 text-sm">Emit live GPS coordinates via WebSockets.</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Step 1: Bind to Shipment */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Target Tracking Number</label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                disabled={simulating}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="1Z..."
              />
              <button
                onClick={lookupShipment}
                disabled={simulating || !trackingNumber}
                className="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white px-6 py-3 rounded-lg transition-colors font-medium"
              >
                Lookup
              </button>
            </div>
          </div>

          {/* Status Panel */}
          {status && (
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 text-sm text-slate-300 font-mono">
              &gt; {status}
            </div>
          )}

          {/* Location Panel */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
              <span className="block text-xs text-slate-500 mb-1 font-mono uppercase tracking-wider">Latitude</span>
              <span className="text-lg text-white font-mono">{location.lat.toFixed(6)}</span>
            </div>
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
              <span className="block text-xs text-slate-500 mb-1 font-mono uppercase tracking-wider">Longitude</span>
              <span className="text-lg text-white font-mono">{location.lng.toFixed(6)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="pt-4 flex gap-4">
            <button
              onClick={startSimulation}
              disabled={!shipmentId || simulating}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600 text-white font-bold py-4 rounded-xl transition-colors flex items-center justify-center space-x-2"
            >
              <Play className="h-5 w-5 fill-current" />
              <span>Start Transmission</span>
            </button>
            <button
              onClick={stopSimulation}
              disabled={!simulating}
              className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:hover:bg-red-600 text-white font-bold py-4 rounded-xl transition-colors flex items-center justify-center space-x-2"
            >
              <Square className="h-5 w-5 fill-current" />
              <span>Stop</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
