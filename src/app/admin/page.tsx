'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { PackagePlus, UploadCloud, ListChecks, QrCode, LogOut, MapPin, Copy, FileText, Printer, Check, Stamp } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import InvoiceTemplate from '@/components/InvoiceTemplate';
import LocationAutocomplete, { LocationData } from '@/components/LocationAutocomplete';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import CustomInvoiceGenerator from '@/components/admin/CustomInvoiceGenerator';
import ReceiptControl from '@/components/admin/ReceiptControl';

const AdminMiniMap = dynamic(() => import('@/components/AdminMiniMap'), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-slate-100 animate-pulse rounded-lg flex items-center justify-center text-slate-400">Loading map...</div>
});

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'create' | 'registry' | 'bulk' | 'status' | 'barcode' | 'invoice' | 'receipt'>('create');
  const [session, setSession] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/admin/login');
      } else {
        setSession(session);
      }
    });
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/admin/login');
  };

  if (!session) return null;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white/80 backdrop-blur-xl border-r border-slate-200/60 flex flex-col shadow-sm z-10 relative">
        <div className="p-4 md:p-6 border-b border-slate-100 md:border-none">
          <h2 className="text-xl font-bold text-slate-900">Admin Portal</h2>
          <p className="text-sm text-slate-500">{session.user.email}</p>
        </div>
        <nav className="flex-1 px-4 py-2 md:py-0 flex flex-row md:flex-col gap-2 overflow-x-auto scrollbar-hide md:space-y-2">
          <button onClick={() => setActiveTab('create')} className={`flex-shrink-0 flex items-center space-x-2 md:space-x-3 px-4 py-2 md:py-3 rounded-lg font-medium transition-colors ${activeTab === 'create' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}>
            <PackagePlus className="h-5 w-5" />
            <span className="text-sm md:text-base">Manual Create</span>
          </button>
          <button onClick={() => setActiveTab('registry')} className={`flex-shrink-0 flex items-center space-x-2 md:space-x-3 px-4 py-2 md:py-3 rounded-lg font-medium transition-colors ${activeTab === 'registry' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}>
            <ListChecks className="h-5 w-5" />
            <span className="text-sm md:text-base">Registry</span>
          </button>
          <button onClick={() => setActiveTab('bulk')} className={`flex-shrink-0 flex items-center space-x-2 md:space-x-3 px-4 py-2 md:py-3 rounded-lg font-medium transition-colors ${activeTab === 'bulk' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}>
            <UploadCloud className="h-5 w-5" />
            <span className="text-sm md:text-base">Bulk Ingestion</span>
          </button>
          <button onClick={() => setActiveTab('status')} className={`flex-shrink-0 flex items-center space-x-2 md:space-x-3 px-4 py-2 md:py-3 rounded-lg font-medium transition-colors ${activeTab === 'status' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}>
            <MapPin className="h-5 w-5" />
            <span className="text-sm md:text-base">Status Engine</span>
          </button>
          <button onClick={() => setActiveTab('barcode')} className={`flex-shrink-0 flex items-center space-x-2 md:space-x-3 px-4 py-2 md:py-3 rounded-lg font-medium transition-colors ${activeTab === 'barcode' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}>
            <QrCode className="h-5 w-5" />
            <span className="text-sm md:text-base">Barcode</span>
          </button>
          <button onClick={() => setActiveTab('invoice')} className={`flex-shrink-0 flex items-center space-x-2 md:space-x-3 px-4 py-2 md:py-3 rounded-lg font-medium transition-colors ${activeTab === 'invoice' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}>
            <FileText className="h-5 w-5" />
            <span className="text-sm md:text-base">Invoice Generator</span>
          </button>
          <button onClick={() => setActiveTab('receipt')} className={`flex-shrink-0 flex items-center space-x-2 md:space-x-3 px-4 py-2 md:py-3 rounded-lg font-medium transition-colors ${activeTab === 'receipt' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}>
            <Stamp className="h-5 w-5" />
            <span className="text-sm md:text-base">Receipt Control</span>
          </button>
        </nav>
        <div className="hidden md:block p-4 border-t border-slate-200">
          <button onClick={handleLogout} className="w-full flex items-center justify-center space-x-2 text-red-600 hover:bg-red-50 py-2 rounded-lg transition-colors font-medium">
            <LogOut className="h-5 w-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-10 overflow-y-auto bg-slate-50/50">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'create' && <ManualCreateForm />}
            {activeTab === 'registry' && <ShipmentRegistry />}
            {activeTab === 'bulk' && <BulkIngestionWorker />}
            {activeTab === 'status' && <BulkStatusEngine />}
            {activeTab === 'barcode' && <BarcodeSimulator />}
            {activeTab === 'invoice' && <CustomInvoiceGenerator />}
            {activeTab === 'receipt' && <ReceiptControl />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

// --- Tab Components ---

function ManualCreateForm() {
  const [formData, setFormData] = useState({
    receiver_name: '',
    receiver_email: '',
    destination_address: '',
    carrier: 'UPS',
    weight: '',
    dimensions: '',
    service_type: 'Standard Ground',
    sender_name: '',
    sender_address: '',
    declared_value: '',
  });
  const [status, setStatus] = useState({ type: '', message: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus({ type: 'loading', message: 'Generating tracking number...' });
    
    const prefix = formData.carrier === 'UPS' ? '1Z' : formData.carrier === 'FedEx' ? 'FDX' : 'US';
    const random = Array.from(crypto.getRandomValues(new Uint8Array(8)))
      .map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    const tracking_number = `${prefix}${random}`;

    try {
      const { error } = await supabase.from('shipments').insert({
        tracking_number,
        receiver_name: formData.receiver_name,
        receiver_email: formData.receiver_email,
        destination_address: formData.destination_address,
        carrier: formData.carrier,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        dimensions: formData.dimensions || null,
        service_type: formData.service_type || null,
        sender_name: formData.sender_name || null,
        sender_address: formData.sender_address || null,
        declared_value: formData.declared_value ? parseFloat(formData.declared_value) : null,
      });

      if (error) throw error;
      setStatus({ type: 'success', message: `Shipment created! Tracking Number: ${tracking_number}` });
      setFormData({ receiver_name: '', receiver_email: '', destination_address: '', carrier: 'UPS', weight: '', dimensions: '', service_type: 'Standard Ground', sender_name: '', sender_address: '', declared_value: '' });
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message });
    }
  };

  return (
    <div className="max-w-4xl bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
      <h3 className="text-2xl font-bold mb-6">Create New Shipment</h3>
      {status.message && (
        <div className={`p-4 rounded-lg mb-6 font-medium ${status.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {status.message}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="font-bold text-slate-900 border-b pb-2">Sender Information</h4>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Sender Name</label>
              <input type="text" value={formData.sender_name} onChange={e => setFormData({...formData, sender_name: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Sender Address</label>
              <textarea value={formData.sender_address} onChange={e => setFormData({...formData, sender_address: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" rows={2}></textarea>
            </div>
            <h4 className="font-bold text-slate-900 border-b pb-2 mt-6">Logistics Details</h4>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Carrier</label>
              <select value={formData.carrier} onChange={e => setFormData({...formData, carrier: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500">
                <option value="UPS">UPS</option>
                <option value="FedEx">FedEx</option>
                <option value="USPS">USPS</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Service Type</label>
              <input type="text" value={formData.service_type} onChange={e => setFormData({...formData, service_type: e.target.value})} placeholder="e.g. Next Day Air" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Weight (lbs)</label>
                <input type="number" step="any" value={formData.weight} onChange={e => setFormData({...formData, weight: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Dimensions</label>
                <input type="text" placeholder="12x12x12" value={formData.dimensions} onChange={e => setFormData({...formData, dimensions: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h4 className="font-bold text-slate-900 border-b pb-2">Receiver Information</h4>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Receiver Name</label>
              <input required type="text" value={formData.receiver_name} onChange={e => setFormData({...formData, receiver_name: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Receiver Email</label>
              <input type="email" value={formData.receiver_email} onChange={e => setFormData({...formData, receiver_email: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Destination Address</label>
              <textarea required value={formData.destination_address} onChange={e => setFormData({...formData, destination_address: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" rows={2}></textarea>
            </div>
            <h4 className="font-bold text-slate-900 border-b pb-2 mt-6">Financials</h4>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Declared Value ($)</label>
              <input type="number" step="any" value={formData.declared_value} onChange={e => setFormData({...formData, declared_value: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>
        
        <button type="submit" disabled={status.type === 'loading'} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors mt-6">
          Create Advanced Shipment
        </button>
      </form>
    </div>
  );
}

function BulkIngestionWorker() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState('');
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const processFile = () => {
    if (!file) return;
    setStatus('Processing...');
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as any[];
        // Validate and map to schema
        const validShipments = rows.map(r => ({
          tracking_number: r.tracking_number,
          receiver_name: r.receiver_name,
          destination_address: r.destination_address,
          carrier: r.carrier || 'UPS',
          current_status: 'CREATED'
        })).filter(r => r.tracking_number && r.receiver_name && r.destination_address);

        try {
          const { error } = await supabase.from('shipments').insert(validShipments);
          if (error) throw error;
          setStatus(`Successfully ingested ${validShipments.length} shipments.`);
        } catch (err: any) {
          setStatus(`Error: ${err.message}`);
        }
      }
    });
  };

  return (
    <div className="max-w-2xl bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
      <h3 className="text-2xl font-bold mb-6">Bulk CSV Ingestion</h3>
      <div className="mb-6">
        <p className="text-sm text-slate-600 mb-4">Upload a CSV file with columns: <code>tracking_number</code>, <code>receiver_name</code>, <code>destination_address</code>, <code>carrier</code>.</p>
        <input type="file" accept=".csv" onChange={handleFileUpload} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
      </div>
      <button onClick={processFile} disabled={!file} className="bg-blue-600 disabled:bg-slate-300 text-white font-bold py-2 px-6 rounded-lg transition-colors">
        Process CSV
      </button>
      {status && <p className="mt-4 font-medium text-slate-700">{status}</p>}
    </div>
  );
}

function BulkStatusEngine() {
  const [trackingNumbers, setTrackingNumbers] = useState('');
  const [checkpoint, setCheckpoint] = useState({
    status: 'ARRIVED_AT_HUB',
    status_description: 'Package arrived at sorting facility',
    location_name: '',
    latitude: '',
    longitude: '',
    created_at: ''
  });
  const [result, setResult] = useState('');

  const handleUpdate = async () => {
    setResult('Updating...');
    const tns = trackingNumbers.split(/[,\n ]+/).map(t => t.trim()).filter(Boolean);
    
    try {
      // 1. Get shipment IDs
      const { data: shipments, error: fetchErr } = await supabase
        .from('shipments')
        .select('id, tracking_number')
        .in('tracking_number', tns);
        
      if (fetchErr) throw fetchErr;
      if (!shipments || shipments.length === 0) throw new Error('No valid shipments found.');

      // 2. Prepare checkpoints
      const newCheckpoints = shipments.map(s => ({
        shipment_id: s.id,
        status: checkpoint.status,
        status_description: checkpoint.status_description,
        location_name: checkpoint.location_name,
        latitude: parseFloat(checkpoint.latitude) || null,
        longitude: parseFloat(checkpoint.longitude) || null,
        ...(checkpoint.created_at ? { created_at: new Date(checkpoint.created_at).toISOString() } : {})
      }));

      // 3. Insert checkpoints
      const { error: insertErr } = await supabase.from('shipment_checkpoints').insert(newCheckpoints);
      if (insertErr) throw insertErr;

      // 4. Update shipment current status
      for (const s of shipments) {
        await supabase.from('shipments').update({ current_status: checkpoint.status }).eq('id', s.id);
      }

      setResult(`Successfully updated ${shipments.length} shipments.`);
      setTrackingNumbers('');
    } catch (err: any) {
      setResult(`Error: ${err.message}`);
    }
  };

  const handleLocationSelect = (loc: LocationData) => {
    setCheckpoint({
      ...checkpoint,
      location_name: loc.display_name,
      latitude: loc.lat.toString(),
      longitude: loc.lon.toString()
    });
  };

  const handleMapClick = async (lat: number, lng: number) => {
    // Reverse Geocode the clicked location
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
      const data = await response.json();
      
      const newName = data.address?.city || data.address?.town || data.address?.village || data.address?.county || 'Custom Location';
      
      setCheckpoint({
        ...checkpoint,
        location_name: newName,
        latitude: lat.toString(),
        longitude: lng.toString()
      });
    } catch (err) {
      console.error('Reverse geocoding failed', err);
      // Still update coordinates even if name fetch fails
      setCheckpoint({
        ...checkpoint,
        latitude: lat.toString(),
        longitude: lng.toString()
      });
    }
  };

  return (
    <div className="max-w-6xl bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
      <h3 className="text-2xl font-bold mb-6">Bulk Status Engine</h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Tracking IDs & Status */}
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tracking Numbers (comma or newline separated)</label>
            <textarea 
              value={trackingNumbers} 
              onChange={e => setTrackingNumbers(e.target.value)} 
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg h-32 outline-none focus:ring-2 focus:ring-blue-500" 
              placeholder="1Z...\nFDX..."
            />
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">New Status</label>
              <input type="text" value={checkpoint.status} onChange={e => setCheckpoint({...checkpoint, status: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg" />
            </div>
            <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <input type="text" value={checkpoint.status_description} onChange={e => setCheckpoint({...checkpoint, status_description: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Custom Date & Time (Leave blank for current time)</label>
            <input type="datetime-local" value={checkpoint.created_at} onChange={e => setCheckpoint({...checkpoint, created_at: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg" />
          </div>
          <button onClick={handleUpdate} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors mt-4">
            Apply Status Update
          </button>
          {result && <div className="mt-2 text-sm font-medium text-slate-700 bg-slate-100 p-3 rounded">{result}</div>}
          </div>
        </div>
        
        {/* Right Column: Smart Location */}
        <div className="space-y-4 bg-slate-50 p-6 rounded-xl border border-slate-200">
          <div className="flex items-center space-x-2 mb-2">
            <MapPin className="h-5 w-5 text-blue-600" />
            <h4 className="font-bold text-slate-900">Smart Location Configuration</h4>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Search US City</label>
            <LocationAutocomplete onSelect={handleLocationSelect} defaultValue={checkpoint.location_name} />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">Latitude</label>
              <input type="text" readOnly value={checkpoint.latitude} className="w-full p-2 bg-slate-100 border border-slate-200 rounded text-sm text-slate-500 font-mono" />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">Longitude</label>
              <input type="text" readOnly value={checkpoint.longitude} className="w-full p-2 bg-slate-100 border border-slate-200 rounded text-sm text-slate-500 font-mono" />
            </div>
          </div>

          <div className="h-64 mt-4 relative rounded-lg overflow-hidden border border-slate-200">
            {checkpoint.latitude && checkpoint.longitude ? (
              <AdminMiniMap 
                lat={parseFloat(checkpoint.latitude)} 
                lng={parseFloat(checkpoint.longitude)} 
                onMapClick={handleMapClick}
              />
            ) : (
              <div className="h-full w-full bg-slate-200 flex items-center justify-center text-slate-500 text-sm p-6 text-center">
                Search for a city above to generate the map preview. You can click on the map to fine-tune the exact location.
              </div>
            )}
          </div>
          
          <div className="text-xs text-slate-500 mt-2">
            <strong>Hint:</strong> Click anywhere on the map to adjust the pin and reverse-geocode the location name automatically.
          </div>
        </div>
      </div>
    </div>
  );
}

function BarcodeSimulator() {
  const router = useRouter();
  
  return (
    <div className="max-w-2xl bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center">
      <QrCode className="h-16 w-16 text-blue-600 mx-auto mb-4" />
      <h3 className="text-2xl font-bold mb-4">Barcode Scanner</h3>
      <p className="text-slate-600 mb-8">Access the camera scanner utility on a dedicated route.</p>
      <button onClick={() => router.push('/admin/scanner')} className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-8 rounded-full transition-colors">
        Launch Scanner
      </button>
    </div>
  );
}

function ShipmentRegistry() {
  const [shipments, setShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // State for PDF generation
  const [printingPkg, setPrintingPkg] = useState<any | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchShipments();
  }, []);

  const fetchShipments = async () => {
    const { data, error } = await supabase.from('shipments').select('*').order('created_at', { ascending: false });
    if (!error && data) setShipments(data);
    setLoading(false);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const generateInvoice = async (pkg: any) => {
    if (isGenerating) return;
    setIsGenerating(true);
    setPrintingPkg(pkg);
    
    // Give React a moment to render the hidden template with the new package data
    setTimeout(async () => {
      try {
        if (!invoiceRef.current) return;
        const canvas = await html2canvas(invoiceRef.current, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'px',
          format: [canvas.width / 2, canvas.height / 2] // Scale back down
        });
        
        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
        pdf.save(`Commercial_Invoice_${pkg.tracking_number}.pdf`);
      } catch (err) {
        console.error('Failed to generate PDF', err);
      } finally {
        setIsGenerating(false);
        setPrintingPkg(null);
      }
    }, 100); // 100ms delay for DOM update
  };

  const generateLabel = (pkg: any) => {
    const doc = new jsPDF({ format: [101.6, 152.4] }); // 4x6 inches
    doc.setFontSize(18);
    doc.text(pkg.carrier, 10, 15);
    doc.setFontSize(10);
    doc.text(`${pkg.service_type || 'Standard Ground'}`, 10, 22);
    doc.line(10, 25, 91.6, 25);
    
    doc.setFontSize(8);
    doc.text('SHIP TO:', 10, 35);
    doc.setFontSize(10);
    doc.text(pkg.receiver_name, 10, 42);
    doc.text(pkg.destination_address, 10, 48);
    
    doc.line(10, 60, 91.6, 60);
    doc.setFontSize(8);
    doc.text('TRACKING #:', 10, 70);
    doc.setFontSize(14);
    doc.text(pkg.tracking_number, 10, 78);
    
    doc.save(`Label_${pkg.tracking_number}.pdf`);
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading Registry...</div>;

  return (
    <div className="max-w-6xl bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
      <h3 className="text-2xl font-bold mb-6">Shipment Registry</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-sm text-slate-600">
              <th className="p-4 font-medium">Tracking #</th>
              <th className="p-4 font-medium">Receiver</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {shipments.map((pkg) => (
              <tr key={pkg.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <td className="p-4 font-mono text-sm">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-900">{pkg.tracking_number}</span>
                    <button onClick={() => copyToClipboard(pkg.tracking_number, pkg.id)} className="text-slate-400 hover:text-blue-600 transition-colors" title="Copy">
                      {copiedId === pkg.id ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </td>
                <td className="p-4 text-sm text-slate-700">{pkg.receiver_name}</td>
                <td className="p-4">
                  <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-semibold">{pkg.current_status}</span>
                </td>
                <td className="p-4 text-right space-x-2">
                  <button onClick={() => generateInvoice(pkg)} className="inline-flex items-center space-x-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-md text-sm font-medium hover:bg-blue-100 transition-colors">
                    <FileText className="h-4 w-4" />
                    <span>Invoice</span>
                  </button>
                  <button onClick={() => generateLabel(pkg)} className="inline-flex items-center space-x-1 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-md text-sm font-medium hover:bg-slate-200 transition-colors">
                    <Printer className="h-4 w-4" />
                    <span>Label</span>
                  </button>
                </td>
              </tr>
            ))}
            {shipments.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-slate-500">No shipments found. Create one first!</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Hidden container for PDF rendering */}
      <div className="overflow-hidden h-0 w-0 absolute top-[-9999px] left-[-9999px]">
        {printingPkg && <InvoiceTemplate ref={invoiceRef} shipment={printingPkg} />}
      </div>
    </div>
  );
}
