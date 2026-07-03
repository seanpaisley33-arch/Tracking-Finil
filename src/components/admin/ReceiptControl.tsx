'use client';

import React, { useState } from 'react';
import { Search, Save, ShieldCheck, FileText, Mail, Stamp } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function ReceiptControl() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [shipment, setShipment] = useState<any>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Stamp States
  const [stampTsa, setStampTsa] = useState(true);
  const [stampCustoms, setStampCustoms] = useState(true);
  const [stampPostage, setStampPostage] = useState(true);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setError('');
    setSuccess('');
    
    try {
      const { data, error } = await supabase
        .from('shipments')
        .select('*')
        .eq('tracking_number', searchQuery.toUpperCase())
        .single();

      if (error || !data) {
        setError('No shipment found with that tracking number.');
        setShipment(null);
      } else {
        setShipment(data);
        // Default to true if the column was just created and is null
        setStampTsa(data.stamp_tsa !== false);
        setStampCustoms(data.stamp_customs !== false);
        setStampPostage(data.stamp_postage !== false);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during search.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSave = async () => {
    if (!shipment) return;
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      const { error } = await supabase
        .from('shipments')
        .update({
          stamp_tsa: stampTsa,
          stamp_customs: stampCustoms,
          stamp_postage: stampPostage
        })
        .eq('id', shipment.id);

      if (error) throw error;
      setSuccess('Receipt stamp settings successfully updated!');
    } catch (err: any) {
      setError(err.message || 'Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-black text-slate-900 flex items-center mb-2">
          <Stamp className="h-6 w-6 mr-3 text-blue-600" />
          Receipt Stamp Control
        </h2>
        <p className="text-slate-500">Configure which official stamps appear on the PDF receipt for a specific shipment.</p>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="flex space-x-4 mb-8">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
            placeholder="Enter Tracking Number..."
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:ring-2 focus:ring-blue-500 outline-none"
            required
          />
        </div>
        <button 
          type="submit" 
          disabled={isSearching}
          className="bg-blue-900 hover:bg-blue-800 text-white px-8 py-3 rounded-xl font-bold transition-colors disabled:opacity-50"
        >
          {isSearching ? 'Searching...' : 'Search'}
        </button>
      </form>

      {error && <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 mb-8 font-medium">{error}</div>}
      {success && <div className="p-4 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 mb-8 font-medium">{success}</div>}

      {/* Configuration Area */}
      {shipment && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex justify-between items-center">
            <div>
              <p className="text-sm font-bold text-slate-500 uppercase">Target Shipment</p>
              <p className="text-xl font-black text-slate-900">{shipment.tracking_number}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-slate-600">{shipment.receiver_name}</p>
              <p className="text-xs text-slate-500">{shipment.destination_address}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* TSA Stamp Toggle */}
            <div 
              onClick={() => setStampTsa(!stampTsa)}
              className={`cursor-pointer p-6 rounded-2xl border-2 transition-all ${stampTsa ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 bg-white opacity-60 grayscale'}`}
            >
              <div className="flex justify-between items-start mb-4">
                <ShieldCheck className={`h-8 w-8 ${stampTsa ? 'text-blue-600' : 'text-slate-400'}`} />
                <div className={`w-12 h-6 rounded-full flex items-center px-1 transition-colors ${stampTsa ? 'bg-blue-500 justify-end' : 'bg-slate-300 justify-start'}`}>
                  <div className="w-4 h-4 bg-white rounded-full"></div>
                </div>
              </div>
              <h3 className="font-bold text-slate-900">TSA Screened</h3>
              <p className="text-xs text-slate-500 mt-1">Applies the official blue TSA screening approval stamp.</p>
            </div>

            {/* Customs Stamp Toggle */}
            <div 
              onClick={() => setStampCustoms(!stampCustoms)}
              className={`cursor-pointer p-6 rounded-2xl border-2 transition-all ${stampCustoms ? 'border-red-500 bg-red-50/50' : 'border-slate-200 bg-white opacity-60 grayscale'}`}
            >
              <div className="flex justify-between items-start mb-4">
                <FileText className={`h-8 w-8 ${stampCustoms ? 'text-red-600' : 'text-slate-400'}`} />
                <div className={`w-12 h-6 rounded-full flex items-center px-1 transition-colors ${stampCustoms ? 'bg-red-500 justify-end' : 'bg-slate-300 justify-start'}`}>
                  <div className="w-4 h-4 bg-white rounded-full"></div>
                </div>
              </div>
              <h3 className="font-bold text-slate-900">U.S. Customs</h3>
              <p className="text-xs text-slate-500 mt-1">Applies the bold red CBP Port Clearance stamp.</p>
            </div>

            {/* Postage Stamp Toggle */}
            <div 
              onClick={() => setStampPostage(!stampPostage)}
              className={`cursor-pointer p-6 rounded-2xl border-2 transition-all ${stampPostage ? 'border-slate-800 bg-slate-100' : 'border-slate-200 bg-white opacity-60 grayscale'}`}
            >
              <div className="flex justify-between items-start mb-4">
                <Mail className={`h-8 w-8 ${stampPostage ? 'text-slate-800' : 'text-slate-400'}`} />
                <div className={`w-12 h-6 rounded-full flex items-center px-1 transition-colors ${stampPostage ? 'bg-slate-800 justify-end' : 'bg-slate-300 justify-start'}`}>
                  <div className="w-4 h-4 bg-white rounded-full"></div>
                </div>
              </div>
              <h3 className="font-bold text-slate-900">Postage Paid</h3>
              <p className="text-xs text-slate-500 mt-1">Applies the commercial base pricing barcode stamp.</p>
            </div>

          </div>

          <div className="mt-8 flex justify-end">
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-10 py-4 rounded-xl font-bold shadow-lg transition-colors flex items-center"
            >
              <Save className="h-5 w-5 mr-2" />
              {isSaving ? 'Saving Changes...' : 'Save Stamp Configuration'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
