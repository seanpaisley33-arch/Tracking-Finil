'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import type { Shipment, ShipmentCheckpoint } from '@/types/database.types';
import { Package, Truck, CheckCircle2, Clock, MapPin, AlertCircle, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import InvoiceTemplate from '@/components/InvoiceTemplate';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FadeIn from '@/components/animations/FadeIn';

// Helper for Carrier Logos
const CarrierLogo = ({ carrier }: { carrier: string }) => {
  if (carrier === 'FedEx') return <div className="flex font-black text-xl tracking-tighter bg-white px-2 py-0.5 rounded shadow-sm"><span className="text-[#4D148C]">Fed</span><span className="text-[#FF6600]">Ex</span></div>;
  if (carrier === 'UPS') return <div className="flex items-center text-[#351C15] font-black text-xl tracking-tighter border border-[#351C15] px-2 py-0.5 rounded-sm bg-[#FFB500] shadow-sm">UPS</div>;
  if (carrier === 'USPS') return <div className="flex font-black text-xl tracking-tighter text-[#004B87] italic bg-white px-2 py-0.5 rounded shadow-sm border border-slate-200">USPS</div>;
  if (carrier === 'DHL') return <div className="flex font-black text-xl tracking-tighter text-[#D40511] bg-[#FFCC00] px-2 rounded-sm shadow-sm border border-yellow-500">DHL</div>;
  return <span className="font-bold">{carrier}</span>;
};

// Dynamically import the map to avoid SSR issues with Leaflet
const TrackingMap = dynamic(() => import('@/components/TrackingMap'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-slate-100 animate-pulse rounded-xl flex items-center justify-center text-slate-400">
      Loading map...
    </div>
  ),
});

export default function TrackingPage({ params }: { params: { trackingNumber: string } }) {
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [checkpoints, setCheckpoints] = useState<ShipmentCheckpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liveLocation, setLiveLocation] = useState<{ lat: number; lng: number } | null>(null);
  
  // PDF State
  const [isGenerating, setIsGenerating] = useState(false);
  const receiptRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchTrackingData = async () => {
      try {
        setLoading(true);
        // Fetch shipment
        const { data: shipmentData, error: shipmentError } = await supabase
          .from('shipments')
          .select('*')
          .eq('tracking_number', params.trackingNumber)
          .single();

        if (shipmentError || !shipmentData) {
          setError('Shipment not found. Please check the tracking number and try again.');
          return;
        }

        setShipment(shipmentData);

        // Fetch checkpoints
        const { data: checkpointData, error: checkpointError } = await supabase
          .from('shipment_checkpoints')
          .select('*')
          .eq('shipment_id', shipmentData.id)
          .order('created_at', { ascending: true });

        if (checkpointError) throw checkpointError;
        setCheckpoints(checkpointData || []);

      } catch (err: any) {
        console.error(err);
        setError('An error occurred while fetching tracking data.');
      } finally {
        setLoading(false);
      }
    };

    fetchTrackingData();
  }, [params.trackingNumber]);

  useEffect(() => {
    if (!shipment) return;

    // Listen for new checkpoints (inserts)
    const channel = supabase.channel(`tracking_${shipment.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'shipment_checkpoints',
          filter: `shipment_id=eq.${shipment.id}`,
        },
        (payload) => {
          console.log('New checkpoint received!', payload.new);
          setCheckpoints((prev) => [...prev, payload.new as ShipmentCheckpoint]);
          // Update status if provided
          if (payload.new.status) {
            setShipment((prev) => prev ? { ...prev, current_status: payload.new.status } : null);
          }
        }
      )
      // Listen for realtime broadcast of driver coordinates
      .on(
        'broadcast',
        { event: 'driver_location' },
        (payload) => {
          if (payload.payload && payload.payload.lat && payload.payload.lng) {
            setLiveLocation({ lat: payload.payload.lat, lng: payload.payload.lng });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [shipment]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !shipment) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
        <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Tracking Error</h2>
        <p className="text-slate-600 text-center">{error}</p>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    const s = status.toUpperCase();
    if (s.includes('DELIVERED')) return <CheckCircle2 className="h-6 w-6 text-emerald-500" />;
    if (s.includes('TRANSIT')) return <Truck className="h-6 w-6 text-blue-500" />;
    return <Package className="h-6 w-6 text-slate-500" />;
  };

  const sortedCheckpoints = [...checkpoints].reverse(); // Newest first for timeline

  const generateReceipt = async () => {
    if (!shipment || isGenerating) return;
    setIsGenerating(true);
    
    setTimeout(async () => {
      try {
        if (!receiptRef.current) return;
        const canvas = await html2canvas(receiptRef.current, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'px',
          format: [canvas.width / 2, canvas.height / 2]
        });
        
        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
        pdf.save(`Tracking_Receipt_${shipment.tracking_number}.pdf`);
      } catch (err) {
        console.error('Failed to generate receipt', err);
      } finally {
        setIsGenerating(false);
      }
    }, 100);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 p-4 md:p-8 font-sans">
      <FadeIn className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Summary - Deep Blue Gradient */}
        <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 rounded-2xl shadow-lg border border-blue-700 p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
          {/* Subtle Background pattern in header */}
          <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pointer-events-none"></div>
          
          <div className="relative z-10 text-white w-full md:w-auto">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-4 mb-4 md:mb-2">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight drop-shadow-md break-all md:break-normal">
                {shipment.tracking_number}
              </h1>
              {/* Live Indicator */}
              {shipment.current_status !== 'Delivered' && (
                <div className="flex items-center bg-black/30 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 shrink-0">
                  <span className="relative flex h-2.5 w-2.5 mr-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <span className="text-xs font-bold text-emerald-300 tracking-wider uppercase">Live Telemetry</span>
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4 text-blue-100">
              <div className="flex items-center shrink-0">
                <CarrierLogo carrier={shipment.carrier} />
              </div>
              <button onClick={generateReceipt} disabled={isGenerating} className="flex items-center text-sm font-medium hover:text-white transition-colors bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg border border-white/20 shrink-0">
                <Download className="h-4 w-4 mr-2" />
                {isGenerating ? 'Generating...' : 'Download Receipt'}
              </button>
            </div>
          </div>
          
          <div className="bg-white p-5 rounded-2xl border-4 border-blue-400/30 w-full md:w-auto text-center md:text-right min-w-[220px] shadow-[0_0_40px_rgba(255,255,255,0.2)] relative z-10 transform hover:scale-105 transition-transform">
            <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Current Status</p>
            <div className="flex items-center justify-center md:justify-end space-x-2">
              {shipment.current_status === 'Delivered' ? (
                <CheckCircle2 className="h-7 w-7 text-emerald-500 shrink-0" />
              ) : (
                <Truck className="h-7 w-7 text-blue-600 animate-pulse shrink-0" />
              )}
              <span className="text-2xl sm:text-3xl md:text-2xl font-black text-slate-900 tracking-tight leading-none break-words max-w-full">{shipment.current_status}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map & Details Column */}
          <div className="lg:col-span-2 space-y-6">
            <FadeIn delay={0.2} direction="up" className="h-[400px] md:h-[500px] bg-white rounded-2xl shadow-sm border border-slate-200 p-2 relative z-0">
              <TrackingMap checkpoints={checkpoints} liveLocation={liveLocation} />
            </FadeIn>

            {/* Advanced Package Metadata - Emerald/Blue Tint */}
            <FadeIn delay={0.4} direction="up" className="bg-gradient-to-br from-white to-blue-50/50 backdrop-blur-xl rounded-2xl shadow-sm border border-blue-100/60 p-6 md:p-8 hover:shadow-md transition-shadow">
              <h3 className="text-xl font-bold text-slate-900 mb-6 border-b border-blue-100 pb-4 flex items-center">
                <Package className="h-5 w-5 text-blue-600 mr-2" />
                Package Metadata
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white/80 backdrop-blur-md p-6 rounded-xl border border-blue-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_4px_20px_rgb(0,0,0,0.08)] transition-all group">
                  <p className="text-xs font-black text-blue-500 uppercase tracking-widest mb-3 flex items-center">
                    <span className="w-2 h-2 rounded-full bg-blue-500 mr-2 group-hover:scale-150 transition-transform"></span>
                    Sender Details
                  </p>
                  <p className="text-lg font-black text-slate-800 mb-1">{shipment.sender_name || 'N/A'}</p>
                  <p className="text-sm font-medium text-slate-500 leading-relaxed">{shipment.sender_address || 'N/A'}</p>
                </div>
                <div className="bg-white/80 backdrop-blur-md p-6 rounded-xl border border-emerald-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_4px_20px_rgb(0,0,0,0.08)] transition-all group">
                  <p className="text-xs font-black text-emerald-500 uppercase tracking-widest mb-3 flex items-center">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 group-hover:scale-150 transition-transform"></span>
                    Receiver Details
                  </p>
                  <p className="text-lg font-black text-slate-800 mb-1">{shipment.receiver_name}</p>
                  <p className="text-sm font-medium text-slate-500 leading-relaxed">{shipment.destination_address}</p>
                </div>
              </div>
            </FadeIn>
          </div>

          {/* Timeline Column - Dark Mode */}
          <FadeIn delay={0.3} direction="left" className="bg-slate-900 rounded-2xl shadow-xl border border-slate-800 p-6 relative overflow-hidden">
            {/* Subtle background glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none"></div>

            <h3 className="text-xl font-bold text-white mb-6 flex items-center border-b border-slate-800 pb-4 relative z-10">
              <Clock className="h-5 w-5 mr-2 text-blue-400" />
              Live Milestone Radar
            </h3>
            
            {sortedCheckpoints.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No milestones recorded yet.</p>
            ) : (
              <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-blue-500 before:via-blue-900 before:to-transparent z-10">
                <AnimatePresence>
                  {sortedCheckpoints.map((cp, idx) => {
                    const isLatest = idx === 0;
                    return (
                      <motion.div 
                        key={cp.id}
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: idx * 0.1, type: 'spring', stiffness: 100 }}
                        className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
                      >
                        {/* Icon - Glowing Radar if latest */}
                        <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-slate-900 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 relative ${isLatest ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                          {isLatest && (
                            <span className="absolute inset-0 rounded-full bg-blue-500 animate-ping opacity-75"></span>
                          )}
                          <MapPin className="h-4 w-4 relative z-10" />
                        </div>
                        {/* Card */}
                        <motion.div whileHover={{ scale: 1.02 }} className={`w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border shadow-sm hover:shadow-md transition-shadow backdrop-blur-md ${isLatest ? 'bg-blue-900/40 border-blue-500/30' : 'bg-slate-800/50 border-slate-700/50'}`}>
                          <div className="flex justify-between items-start mb-1">
                            <h4 className={`font-bold ${isLatest ? 'text-white' : 'text-slate-200'}`}>{cp.status}</h4>
                          </div>
                          <p className={`text-sm mb-2 ${isLatest ? 'text-blue-200' : 'text-slate-400'}`}>{cp.status_description}</p>
                          <div className={`flex items-center justify-between text-xs font-medium ${isLatest ? 'text-blue-300' : 'text-slate-500'}`}>
                            <span>{cp.location_name}</span>
                            <span>{new Date(cp.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </motion.div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </FadeIn>
        </div>

      </FadeIn>
      
      {/* Hidden container for PDF rendering */}
      <div className="overflow-hidden h-0 w-0 absolute top-[-9999px] left-[-9999px]">
        {shipment && <InvoiceTemplate ref={receiptRef} shipment={shipment} />}
      </div>
    </div>
  );
}
